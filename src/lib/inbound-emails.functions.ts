import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

/**
 * Admin-only server functions for the Hostinger inbound email webhook:
 *  - listInboundEmails: paginated listing with status/search filters.
 *  - replayInboundEmail: idempotently reprocess a stored event by event_id.
 *
 * Idempotency guarantees:
 *  - Each row is uniquely keyed on event_id (UNIQUE constraint), so a replay
 *    NEVER creates a duplicate row — it re-runs processing against the
 *    already-stored payload.
 *  - The status is flipped to 'processing' with an atomic UPDATE guarded by
 *    `WHERE status <> 'processing'`, so two concurrent replay clicks cannot
 *    both enter the processing branch.
 */

const LIST_STATUSES = ['pending', 'processing', 'processed', 'failed'] as const

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc('has_role', {
    _user_id: context.userId,
    _role: 'admin',
  })
  if (error) throw new Error('Role check failed')
  if (!data) throw new Error('Forbidden')
}

export const listInboundEmails = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        status: z.enum(LIST_STATUSES).optional(),
        search: z.string().trim().max(200).optional(),
        subject: z.string().trim().max(200).optional(),
        mailbox: z.string().trim().max(200).optional(),
        limit: z.number().int().min(1).max(200).default(50),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    let query = supabaseAdmin
      .from('inbound_emails')
      .select(
        'id, event_id, event, mailbox_address, from_address, subject, email_date, received_at, processed_at, processing_status, retry_count, last_error, last_replayed_at',
      )
      .order('received_at', { ascending: false })
      .limit(data.limit)

    if (data.status) query = query.eq('processing_status', data.status)
    if (data.subject) query = query.ilike('subject', `%${data.subject}%`)
    if (data.mailbox) query = query.ilike('mailbox_address', `%${data.mailbox}%`)
    if (data.search) {
      const s = data.search.replace(/,/g, ' ').trim()
      query = query.or(
        `event_id.ilike.%${s}%,subject.ilike.%${s}%,from_address.ilike.%${s}%,mailbox_address.ilike.%${s}%`,
      )
    }

    const { data: rows, error } = await query
    if (error) throw new Error(error.message)

    const { data: mailboxRows } = await supabaseAdmin
      .from('inbound_emails')
      .select('mailbox_address')
      .not('mailbox_address', 'is', null)
      .limit(500)
    const mailboxes = Array.from(
      new Set((mailboxRows ?? []).map((r) => r.mailbox_address).filter(Boolean) as string[]),
    ).sort()

    return { rows: rows ?? [], mailboxes }
  })

export const getInboundEmail = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ eventId: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: row, error } = await supabaseAdmin
      .from('inbound_emails')
      .select('*')
      .eq('event_id', data.eventId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!row) throw new Error('Event not found')
    return { row }
  })

/**
 * Placeholder processor: re-run any downstream handling from the stored
 * raw_payload. Currently a no-op — extend this when you add auto-triage,
 * ticketing, AI classification, etc. Anything added here MUST be idempotent
 * against event_id (e.g. use `upsert` on downstream tables).
 */
async function runProcessor(_row: { event_id: string; raw_payload: unknown }): Promise<void> {
  // no-op for now
}

export const replayInboundEmail = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ eventId: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    // Atomic claim: only proceeds if the row isn't already 'processing'.
    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from('inbound_emails')
      .update({
        processing_status: 'processing',
        last_replayed_at: new Date().toISOString(),
        last_replayed_by: context.userId,
        last_error: null,
      })
      .eq('event_id', data.eventId)
      .neq('processing_status', 'processing')
      .select('id, event_id, raw_payload, retry_count')
      .maybeSingle()

    if (claimErr) throw new Error(claimErr.message)
    if (!claimed) {
      throw new Error('Event is already being processed or does not exist')
    }

    try {
      await runProcessor({ event_id: claimed.event_id, raw_payload: claimed.raw_payload })
      const { error: updErr } = await supabaseAdmin
        .from('inbound_emails')
        .update({
          processing_status: 'processed',
          processed_at: new Date().toISOString(),
          retry_count: (claimed.retry_count ?? 0) + 1,
          last_error: null,
        })
        .eq('id', claimed.id)
      if (updErr) throw new Error(updErr.message)
      return { ok: true, status: 'processed' as const }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await supabaseAdmin
        .from('inbound_emails')
        .update({
          processing_status: 'failed',
          retry_count: (claimed.retry_count ?? 0) + 1,
          last_error: message.slice(0, 2000),
        })
        .eq('id', claimed.id)
      return { ok: false, status: 'failed' as const, error: message }
    }
  })

export const markInboundEmailProcessed = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ eventId: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { error } = await supabaseAdmin
      .from('inbound_emails')
      .update({
        processing_status: 'processed',
        processed_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('event_id', data.eventId)
    if (error) throw new Error(error.message)
    return { ok: true }
  })
