import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Mail, MapPin } from 'lucide-react'

export const Route = createFileRoute('/contact')({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: 'যোগাযোগ — নাগরিক বার্তা ২৪' },
      {
        name: 'description',
        content:
          'নাগরিক বার্তা ২৪-এর সঙ্গে যোগাযোগ করুন। সংবাদ, মতামত বা মন্তব্য পাঠাতে ফর্মটি ব্যবহার করুন অথবা সরাসরি info@nagarikbarta24.com-এ ইমেইল করুন।',
      },
      { property: 'og:title', content: 'যোগাযোগ — নাগরিক বার্তা ২৪' },
      {
        property: 'og:description',
        content: 'নাগরিক বার্তা ২৪-এর সম্পাদকীয় দলের সঙ্গে যোগাযোগ করুন।',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
})

function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', website: '' })
  const [sending, setSending] = useState(false)

  const onChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'বার্তা পাঠানো যায়নি')
      }
      toast.success('আপনার বার্তা পাঠানো হয়েছে — শীঘ্রই আমরা যোগাযোগ করব।')
      setForm({ name: '', email: '', subject: '', message: '', website: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'বার্তা পাঠানো যায়নি')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="container-news py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground">যোগাযোগ করুন</h1>
        <p className="mt-2 text-muted-foreground">
          সংবাদ, মতামত, অভিযোগ বা সাধারণ জিজ্ঞাসা পাঠাতে নিচের ফর্মটি পূরণ করুন। আমরা যত দ্রুত সম্ভব উত্তর দেব।
        </p>

        <div className="mt-6 grid gap-6 rounded-lg border border-border bg-muted/30 p-5 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold">ইমেইল</p>
              <a href="mailto:info@nagarikbarta24.com" className="text-sm text-muted-foreground hover:underline">
                info@nagarikbarta24.com
              </a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold">সম্পাদকীয় কার্যালয়</p>
              <p className="text-sm text-muted-foreground">Dhaka, Bangladesh</p>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">নাম</Label>
              <Input id="name" required maxLength={120} value={form.name} onChange={onChange('name')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">ইমেইল</Label>
              <Input id="email" type="email" required maxLength={255} value={form.email} onChange={onChange('email')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subject">বিষয়</Label>
            <Input id="subject" required maxLength={200} value={form.subject} onChange={onChange('subject')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="message">বার্তা</Label>
            <Textarea id="message" required rows={7} maxLength={4000} value={form.message} onChange={onChange('message')} />
          </div>
          {/* Honeypot — hidden from users, spam bots fill it */}
          <input
            type="text"
            name="website"
            value={form.website}
            onChange={onChange('website')}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />
          <Button type="submit" disabled={sending} className="w-full sm:w-auto">
            {sending ? 'পাঠানো হচ্ছে…' : 'বার্তা পাঠান'}
          </Button>
        </form>
      </div>
    </main>
  )
}
