import { createFileRoute } from '@tanstack/react-router'
import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Hostinger Agentic Mail inbound webhook.
 * Docs payload shape:
 *   { id, event, timestamp, data: { mailboxAddress, messageId, subject, from, to, date, plainBody, plainHtml, bodyUrl, attachments } }
 *
 * Security:
 *  - Verify HMAC-SHA256 signature if provided in a common header.
 *  - Fallback: accept the shared secret directly in `x-webhook-secret` / `authorization: Bearer <secret>`.
 *  - Dedupe by event id.
 */

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

function verifySignature(rawBody: string, headers: Headers, secret: string): boolean {
  const candidates = [
    headers.get('x-webhook-signature'),
    headers.get('x-hostinger-signature'),
    headers.get('x-signature'),
    headers.get('x-hub-signature-256'),
  ].filter(Boolean) as string[]

  if (candidates.length > 0) {
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
    for (const raw of candidates) {
      const val = raw.replace(/^sha256=/i, '').trim()
      if (safeEqual(val, expected)) return true
    }
  }

  // Fallback: shared-secret token (some providers post the secret directly).
  const tokenHeader =
    headers.get('x-webhook-secret') ||
    headers.get('x-webhook-token') ||
    (headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (tokenHeader && safeEqual(tokenHeader.trim(), secret)) return true

  return false
}

export const Route = createFileRoute('/api/public/agentic-mail/inbound')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.HOSTINGER_INBOUND_WEBHOOK_SECRET
        if (!secret) {
          return new Response('Webhook secret not configured', { status: 500 })
        }

        const rawBody = await request.text()

        if (!verifySignature(rawBody, request.headers, secret)) {
          return new Response('Invalid signature', { status: 401 })
        }

        let payload: {
          id?: string
          event?: string
          timestamp?: string
          data?: {
            mailboxAddress?: string
            messageId?: string
            subject?: string
            from?: string
            to?: string[]
            date?: string
            plainBody?: string
            plainHtml?: string
            bodyUrl?: string
            attachments?: unknown[]
          }
        }
        try {
          payload = JSON.parse(rawBody)
        } catch {
          return new Response('Invalid JSON', { status: 400 })
        }

        if (!payload.id || !payload.event) {
          return new Response('Missing id or event', { status: 400 })
        }

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const d = payload.data ?? {}

        const parsedDate = d.date ? new Date(d.date) : null
        const emailDate = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null

        const row = {
          event_id: payload.id,
          event: payload.event,
          mailbox_address: d.mailboxAddress ?? null,
          message_id: d.messageId ?? null,
          subject: d.subject ?? null,
          from_address: d.from ?? null,
          to_addresses: (Array.isArray(d.to) ? d.to : []) as unknown as never,
          email_date: emailDate,
          plain_body: d.plainBody ?? null,
          plain_html: d.plainHtml ?? null,
          body_url: d.bodyUrl ?? null,
          attachments: (Array.isArray(d.attachments) ? d.attachments : []) as unknown as never,
          raw_payload: payload as unknown as never,
          processing_status: 'pending',
        }

        const { error } = await supabaseAdmin
          .from('inbound_emails')
          .upsert(row, { onConflict: 'event_id', ignoreDuplicates: true })

        if (error) {
          console.error('[agentic-mail/inbound] insert failed', error)
          return new Response('Storage error', { status: 500 })
        }

        return Response.json({ ok: true, id: payload.id })
      },
    },
  },
})
