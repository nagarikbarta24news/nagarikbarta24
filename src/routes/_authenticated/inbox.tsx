import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useMemo, useState } from 'react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { listInboundEmails, getInboundEmail } from '@/lib/inbound-emails.functions'
import { DEFAULT_TIMEZONE } from '@/lib/timezone'
import { Mail, RefreshCw, Search, X } from 'lucide-react'

function formatDhaka(d: Date) {
  return d.toLocaleString('bn-BD', {
    timeZone: DEFAULT_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export const Route = createFileRoute('/_authenticated/inbox')({
  head: () => ({
    meta: [
      { title: 'ইনবক্স — নাগরিক বার্তা ২৪' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: InboxPage,
})

type StatusFilter = 'all' | 'pending' | 'processing' | 'processed' | 'failed'

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: 'অপেক্ষমান', className: 'bg-amber-100 text-amber-900 border-amber-200' },
    processing: { label: 'প্রসেসিং', className: 'bg-blue-100 text-blue-900 border-blue-200' },
    processed: { label: 'সম্পন্ন', className: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
    failed: { label: 'ব্যর্থ', className: 'bg-red-100 text-red-900 border-red-200' },
  }
  const cfg = map[status] ?? { label: status, className: '' }
  return (
    <Badge variant="outline" className={cfg.className}>
      {cfg.label}
    </Badge>
  )
}

function InboxPage() {
  const [status, setStatus] = useState<StatusFilter>('all')
  const [subjectInput, setSubjectInput] = useState('')
  const [subject, setSubject] = useState('')
  const [mailbox, setMailbox] = useState<string>('all')
  const [openEventId, setOpenEventId] = useState<string | null>(null)

  const listFn = useServerFn(listInboundEmails)
  const detailFn = useServerFn(getInboundEmail)

  const queryKey = ['inbox', status, subject, mailbox] as const

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      listFn({
        data: {
          status: status === 'all' ? undefined : status,
          subject: subject || undefined,
          mailbox: mailbox === 'all' ? undefined : mailbox,
          limit: 100,
        },
      }),
    staleTime: 15_000,
  })

  const detailQuery = useQuery({
    queryKey: ['inbox', 'detail', openEventId],
    queryFn: () => detailFn({ data: { eventId: openEventId! } }),
    enabled: !!openEventId,
  })

  const rows = data?.rows ?? []
  const mailboxes = useMemo(() => data?.mailboxes ?? [], [data])

  const clearFilters = () => {
    setStatus('all')
    setSubject('')
    setSubjectInput('')
    setMailbox('all')
  }

  const activeFilterCount =
    (status !== 'all' ? 1 : 0) + (subject ? 1 : 0) + (mailbox !== 'all' ? 1 : 0)

  return (
    <DashboardShell title="ইনবক্স">
      <div className="space-y-5">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Mail className="h-6 w-6" /> ইনবক্স
            </h1>
            <p className="text-sm text-muted-foreground">
              Hostinger inbound webhook থেকে আসা সব ইমেইল এখানে। subject বা mailbox
              address দিয়ে ফিল্টার করুন এবং যেকোনো বার্তায় ক্লিক করে সম্পূর্ণ
              বিস্তারিত দেখুন।
            </p>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
          <form
            className="flex flex-1 min-w-64 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              setSubject(subjectInput.trim())
            }}
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Subject দিয়ে খুঁজুন"
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              খুঁজুন
            </Button>
          </form>

          <Select value={mailbox} onValueChange={setMailbox}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Mailbox" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব mailbox</SelectItem>
              {mailboxes.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
              <SelectItem value="pending">অপেক্ষমান</SelectItem>
              <SelectItem value="processing">প্রসেসিং</SelectItem>
              <SelectItem value="processed">সম্পন্ন</SelectItem>
              <SelectItem value="failed">ব্যর্থ</SelectItem>
            </SelectContent>
          </Select>

          {activeFilterCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-4 w-4" /> ফিল্টার ক্লিয়ার
            </Button>
          ) : null}

          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className={`mr-1 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            রিফ্রেশ
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Mailbox</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    লোড হচ্ছে…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    কোনো ইমেইল পাওয়া যায়নি।
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => setOpenEventId(r.event_id)}
                  >
                    <TableCell className="max-w-[320px]">
                      <div className="truncate font-medium" title={r.subject ?? ''}>
                        {r.subject || <span className="text-muted-foreground">(no subject)</span>}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs" title={r.from_address ?? ''}>
                      {r.from_address ?? '—'}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs" title={r.mailbox_address ?? ''}>
                      {r.mailbox_address ?? '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {r.received_at ? formatDhaka(new Date(r.received_at)) : '—'}
                    </TableCell>
                    <TableCell>{statusBadge(r.processing_status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground">
          কোনো সারিতে ক্লিক করলে সম্পূর্ণ বার্তার বিস্তারিত (body, attachments, raw
          payload) দেখা যাবে। রিপ্লে/রিট্রাই করতে চাইলে <a href="/inbound-emails" className="underline">ইনবাউন্ড ওয়েবহুক</a> পেজে যান।
        </p>
      </div>

      <Dialog open={!!openEventId} onOpenChange={(o) => !o && setOpenEventId(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="pr-6">
              {detailQuery.data?.row?.subject || '(no subject)'}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-1 text-xs">
                <div>
                  <span className="text-muted-foreground">From: </span>
                  {detailQuery.data?.row?.from_address ?? '—'}
                </div>
                <div>
                  <span className="text-muted-foreground">Mailbox: </span>
                  {detailQuery.data?.row?.mailbox_address ?? '—'}
                </div>
                <div>
                  <span className="text-muted-foreground">Received: </span>
                  {detailQuery.data?.row?.received_at
                    ? formatDhaka(new Date(detailQuery.data.row.received_at))
                    : '—'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  {detailQuery.data?.row
                    ? statusBadge(detailQuery.data.row.processing_status)
                    : null}
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {detailQuery.data?.row?.event_id}
                  </span>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">লোড হচ্ছে…</p>
          ) : detailQuery.data?.row ? (
            <div className="space-y-4">
              {detailQuery.data.row.plain_body ? (
                <section>
                  <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                    Plain body
                  </h3>
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded border bg-muted/40 p-3 text-xs">
                    {detailQuery.data.row.plain_body}
                  </pre>
                </section>
              ) : null}

              {detailQuery.data.row.plain_html ? (
                <section>
                  <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                    HTML preview
                  </h3>
                  <div
                    className="max-h-72 overflow-auto rounded border bg-white p-3 text-sm"
                    dangerouslySetInnerHTML={{ __html: detailQuery.data.row.plain_html }}
                  />
                </section>
              ) : null}

              {Array.isArray(detailQuery.data.row.attachments) &&
              detailQuery.data.row.attachments.length > 0 ? (
                <section>
                  <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                    Attachments ({detailQuery.data.row.attachments.length})
                  </h3>
                  <pre className="max-h-40 overflow-auto rounded border bg-muted/40 p-3 text-xs">
                    {JSON.stringify(detailQuery.data.row.attachments, null, 2)}
                  </pre>
                </section>
              ) : null}

              {detailQuery.data.row.last_error ? (
                <section>
                  <h3 className="mb-1 text-xs font-semibold uppercase text-red-700">Last error</h3>
                  <pre className="whitespace-pre-wrap rounded border border-red-200 bg-red-50 p-3 text-xs text-red-900">
                    {detailQuery.data.row.last_error}
                  </pre>
                </section>
              ) : null}

              <details>
                <summary className="cursor-pointer text-xs font-semibold uppercase text-muted-foreground">
                  Raw payload
                </summary>
                <pre className="mt-2 max-h-72 overflow-auto rounded border bg-muted/40 p-3 text-[11px]">
                  {JSON.stringify(detailQuery.data.row.raw_payload, null, 2)}
                </pre>
              </details>
            </div>
          ) : detailQuery.error ? (
            <p className="py-4 text-sm text-red-700">
              {detailQuery.error instanceof Error ? detailQuery.error.message : 'ত্রুটি ঘটেছে'}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </DashboardShell>
  )
}
