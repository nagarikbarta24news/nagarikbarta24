import * as React from 'react'
import { render } from '@react-email/render'
import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'nagarikbarta24'
const SENDER_DOMAIN = 'notify.nagarikbarta24.com'
const FROM_DOMAIN = 'notify.nagarikbarta24.com'
const TEMPLATE_NAME = 'contact-message'

const bodySchema = z.object({
  name: z.string().trim().min(1, 'নাম আবশ্যক').max(120),
  email: z.string().trim().email('সঠিক ইমেইল দিন').max(255),
  subject: z.string().trim().min(1, 'বিষয় আবশ্যক').max(200),
  message: z.string().trim().min(5, 'বার্তা কমপক্ষে ৫ অক্ষরের হতে হবে').max(4000),
  website: z.string().max(0).optional(), // honeypot
})

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const Route = createFileRoute('/api/public/contact')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !supabaseServiceKey) {
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }

        let payload: z.infer<typeof bodySchema>
        try {
          const parsed = bodySchema.safeParse(await request.json())
          if (!parsed.success) {
            return Response.json(
              { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
              { status: 400 },
            )
          }
          payload = parsed.data
        } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }

        // Honeypot — silently accept spam
        if (payload.website) return Response.json({ success: true })

        const template = TEMPLATES[TEMPLATE_NAME]
        if (!template || !template.to) {
          return Response.json({ error: 'Template misconfigured' }, { status: 500 })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const recipient = template.to
        const messageId = crypto.randomUUID()

        // Ensure unsubscribe token exists for recipient (required by queue processor)
        const { data: existingToken } = await supabase
          .from('email_unsubscribe_tokens')
          .select('token, used_at')
          .eq('email', recipient.toLowerCase())
          .maybeSingle()

        let unsubscribeToken = existingToken?.token ?? ''
        if (!unsubscribeToken) {
          unsubscribeToken = generateToken()
          await supabase
            .from('email_unsubscribe_tokens')
            .upsert(
              { token: unsubscribeToken, email: recipient.toLowerCase() },
              { onConflict: 'email', ignoreDuplicates: true },
            )
          const { data: stored } = await supabase
            .from('email_unsubscribe_tokens')
            .select('token')
            .eq('email', recipient.toLowerCase())
            .maybeSingle()
          if (stored?.token) unsubscribeToken = stored.token
        }

        const templateData = {
          ...payload,
          submittedAt: new Date().toISOString(),
        }
        const element = React.createElement(template.component, templateData)
        const html = await render(element)
        const text = await render(element, { plainText: true })
        const subject =
          typeof template.subject === 'function'
            ? template.subject(templateData)
            : template.subject

        await supabase.from('email_send_log').insert({
          message_id: messageId,
          template_name: TEMPLATE_NAME,
          recipient_email: recipient,
          status: 'pending',
        })

        const { error: enqueueError } = await supabase.rpc('enqueue_email', {
          queue_name: 'transactional_emails',
          payload: {
            message_id: messageId,
            to: recipient,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            reply_to: payload.email,
            subject,
            html,
            text,
            purpose: 'transactional',
            label: TEMPLATE_NAME,
            idempotency_key: `contact-${messageId}`,
            unsubscribe_token: unsubscribeToken,
            queued_at: new Date().toISOString(),
          },
        })

        if (enqueueError) {
          console.error('Contact form enqueue failed', enqueueError)
          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: TEMPLATE_NAME,
            recipient_email: recipient,
            status: 'failed',
            error_message: 'Failed to enqueue contact email',
          })
          return Response.json({ error: 'Failed to send message' }, { status: 500 })
        }

        return Response.json({ success: true })
      },
    },
  },
})
