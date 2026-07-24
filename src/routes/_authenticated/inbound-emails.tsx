import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { toast } from 'sonner'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import {
  listInboundEmails,
  replayInboundEmail,
  markInboundEmailProcessed,
} from '@/lib/inbound-emails.functions'
import { formatDhaka } from '@/lib/timezone'
import { RefreshCw, RotateCcw, CheckCircle2 } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/inbound-emails')({
  head: () => ({
    meta: [
      { title: 'ইনবাউন্ড ইমেইল ওয়েবহুক — নাগরিক বার্তা ২৪' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: InboundEmailsPage,
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
  return <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
}

function InboundEmailsPage() {
  const [status, setStatus] = useState<StatusFilter>('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const qc = useQueryClient()
  const router = useRouter()

  const listFn = useServerFn(listInboundEmails)
  const replayFn = useServerFn(replayInboundEmail)
  const markFn = useServerFn(markInboundEmailProcessed)

  const queryKey = ['inbound-emails', status, search] as const

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      listFn({
        data: {
          status: status === 'all' ? undefined : status,
          search: search || undefined,
          limit: 100,
        },
      }),
    staleTime: 15_000,
  })

  const replay = useMutation({
    mutationFn: (eventId: string) => replayFn({ data: { eventId } }),
    onSuccess: (res, eventId) => {
      if (res.ok) {
        toast.success(`রিপ্লে সফল: ${eventId}`)
      } else {
        toast.error(`রিপ্লে ব্যর্থ: ${res.error ?? 'অজানা ত্রুটি'}`)
      }
      qc.invalidateQueries({ queryKey: ['inbound-emails'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'রিপ্লে ব্যর্থ')
    },
  })

  const markProcessed = useMutation({
    mutationFn: (eventId: string) => markFn({ data: { eventId } }),
    onSuccess: () => {
      toast.success('সম্পন্ন হিসেবে চিহ্নিত')
      qc.invalidateQueries({ queryKey: ['inbound-emails'] })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'ব্যর্থ')
    },
  })

  const rows = data?.rows ?? []

  return (
    <DashboardShell title="ইনবাউন্ড ইমেইল ওয়েবহুক">
      <div className="space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">ইনবাউন্ড ইমেইল ওয়েবহুক</h1>
          <p className="text-sm text-muted-foreground">
            Hostinger থেকে আসা প্রতিটি ইভেন্ট এখানে সংরক্ষিত। ব্যর্থ ইভেন্ট
            event id দিয়ে যেকোনো সময় নিরাপদে রিপ্লে করা যাবে — ডুপ্লিকেট
            তৈরি হবে না (event_id UNIQUE)।
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
              <SelectItem value="pending">অপেক্ষমান</SelectItem>
              <SelectItem value="processing">প্রসেসিং</SelectItem>
              <SelectItem value="processed">সম্পন্ন</SelectItem>
              <SelectItem value="failed">ব্যর্থ</SelectItem>
            </SelectContent>
          </Select>

          <form
            className="flex flex-1 min-w-64 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              setSearch(searchInput.trim())
            }}
          >
            <Input
              placeholder="event id / subject / from / mailbox দিয়ে খুঁজুন"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Button type="submit" variant="secondary">খুঁজুন</Button>
          </form>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              qc.invalidateQueries({ queryKey: ['inbound-emails'] })
              router.invalidate()
            }}
          >
            <RefreshCw className={`mr-1 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            রিফ্রেশ
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event ID</TableHead>
                <TableHead>Subject / From</TableHead>
                <TableHead>Mailbox</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Retries</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    লোড হচ্ছে…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    কোনো ইভেন্ট পাওয়া যায়নি।
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-[220px] truncate font-mono text-xs" title={r.event_id}>
                      {r.event_id}
                    </TableCell>
                    <TableCell className="max-w-[260px]">
                      <div className="truncate font-medium" title={r.subject ?? ''}>
                        {r.subject || <span className="text-muted-foreground">(no subject)</span>}
                      </div>
                      <div className="truncate text-xs text-muted-foreground" title={r.from_address ?? ''}>
                        {r.from_address ?? '—'}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{r.mailbox_address ?? '—'}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {r.received_at ? formatDhaka(new Date(r.received_at)) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {statusBadge(r.processing_status)}
                        {r.last_error ? (
                          <span className="text-[10px] text-red-700" title={r.last_error}>
                            {r.last_error.slice(0, 60)}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{r.retry_count ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={
                            (replay.isPending && replay.variables === r.event_id) ||
                            r.processing_status === 'processing'
                          }
                          onClick={() => replay.mutate(r.event_id)}
                        >
                          <RotateCcw className="mr-1 h-3.5 w-3.5" />
                          রিপ্লে
                        </Button>
                        {r.processing_status !== 'processed' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={markProcessed.isPending && markProcessed.variables === r.event_id}
                            onClick={() => markProcessed.mutate(r.event_id)}
                          >
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            সম্পন্ন
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground">
          রিপ্লে idempotent: একই event id দিয়ে যতবারই ট্রিগার করুন, নতুন সারি
          তৈরি হবে না — শুধু existing সারির প্রসেসিং আবার চালানো হবে এবং
          retry কাউন্টার বাড়বে।
        </p>
      </div>
    </DashboardShell>
  )
}
