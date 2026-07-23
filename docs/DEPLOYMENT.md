# নাগরিক বার্তা ২৪ — ডিপ্লয়মেন্ট গাইড

## সময়জোন (SITE_TIMEZONE / VITE_SITE_TIMEZONE) কনফিগারেশন

প্রজেক্টের সব তারিখ-সময় একই সময়জোনে দেখানোর জন্য `Asia/Dhaka` ডিফল্ট হিসেবে ব্যবহৃত হয়। চাইলে এই মান পরিবর্তন করা যাবে।

### কোথায় কোন ভেরিয়েবল কাজ করে

| ভেরিয়েবল | কোথায় কাজ করে | কখন ব্যবহার করবেন |
|---|---|---|
| `SITE_TIMEZONE` | সার্ভার-সাইড (SSR, API, server functions) | ডিপ্লয়/বিল্ড এনভায়রনমেন্টে |
| `VITE_SITE_TIMEZONE` | ক্লায়েন্ট-সাইড (ব্রাউজার) | Vite বিল্ডের সময় inline হয় |

### প্রায়োরিটি ক্রম

1. `SITE_TIMEZONE` (server-side env)
2. `VITE_SITE_TIMEZONE` (client-side env, Vite-bundled)
3. ফলব্যাক: `Asia/Dhaka`

> ভুল বা অকার্যকর IANA নাম দিলে সিস্টেম `Asia/Dhaka`-তে ফিরে যাবে এবং কনসোলে ওয়ার্নিং দেখাবে।

---

## লোকাল ডেভেলপমেন্টে সেটআপ

### ১. `.env` ফাইলে যোগ করুন

প্রজেক্ট রুটে `.env` ফাইল আছে। না থাকলে `.env.example` থেকে কপি করুন।

```bash
# .env
SITE_TIMEZONE=Asia/Dhaka
VITE_SITE_TIMEZONE=Asia/Dhaka
```

### ২. অন্য সময়জোনে টেস্ট করতে চাইলে

```bash
# উদাহরণ: কলকাতা সময়
SITE_TIMEZONE=Asia/Kolkata
VITE_SITE_TIMEZONE=Asia/Kolkata
```

```bash
# উদাহরণ: UTC
SITE_TIMEZONE=UTC
VITE_SITE_TIMEZONE=UTC
```

```bash
# উদাহরণ: নিউইয়র্ক
SITE_TIMEZONE=America/New_York
VITE_SITE_TIMEZONE=America/New_York
```

### ৩. ডেভ সার্ভার রিস্টার্ট করুন

`.env` পরিবর্তনের পর Vite ডেভ সার্ভার রিস্টার্ট করুন:

```bash
bun dev
# অথবা
npm run dev
```

---

## প্রোডাকশন / Lovable Cloud ডিপ্লয়মেন্টে সেটআপ

Lovable Cloud-এ সার্ভার-সাইড এনভায়রনমেন্ট ভেরিয়েবল সরাসরি ব্যবহার করা যায়।

### পদ্ধতি ১: Lovable সিকোক্রেট হিসেবে যোগ করা (সুপারিশকৃত)

1. Lovable এডিটরে **Settings → Secrets** খুলুন।
2. নতুন সিক্রেট যোগ করুন:
   - Name: `SITE_TIMEZONE`
   - Value: `Asia/Dhaka`
3. পুনরায় Publish করুন।

### পদ্ধতি ২: বিল্ড কনফিগে VITE_SITE_TIMEZONE সেট করা

যদি ক্লায়েন্ট-সাইড বান্ডেলে সময়জোন hard-code করতে চান:

```bash
# বিল্ড কমান্ডের আগে
export VITE_SITE_TIMEZONE=Asia/Dhaka
bun run build
```

Lovable-এ বিল্ড স্ক্রিপ্টে এভাবে যোগ করুন:

```json
{
  "scripts": {
    "build": "VITE_SITE_TIMEZONE=Asia/Dhaka bunx --bun vinxi build",
    "build:utc": "VITE_SITEZONE=UTC bunx --bun vinxi build"
  }
}
```

---

## কোডে ব্যবহার

### সময়জোন পড়ুন

```ts
import { getSiteTimezone } from "@/lib/timezone";

const tz = getSiteTimezone(); // "Asia/Dhaka"
```

### আজকের দিন শুরুর সময় (site timezone অনুযায়ী)

```ts
import { todayStartISOInSiteTZ } from "@/lib/timezone";

const startOfToday = todayStartISOInSiteTZ(); // "2026-07-23T00:00:00+06:00"
```

### তারিখ ফরম্যাট করুন

```ts
import { formatBengaliDate } from "@/lib/format";

const dateStr = formatBengaliDate(new Date());
```

---

## বৈধ IANA সময়জোন উদাহরণ

| অঞ্চল | IANA নাম |
|---|---|
| বাংলাদেশ (ডিফল্ট) | `Asia/Dhaka` |
| ভারত | `Asia/Kolkata` |
| পাকিস্তান | `Asia/Karachi` |
| সৌদি আরব | `Asia/Riyadh` |
| যুক্তরাজ্য | `Europe/London` |
| নিউইয়র্ক | `America/New_York` |
| UTC | `UTC` |

সম্পূর্ণ তালিকা: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

---

## সমস্যা সমাধান (Troubleshooting)

### সমস্যা: "Invalid SITE_TIMEZONE" ওয়ার্নিং

**কারণ:** ভুল IANA নাম দেওয়া হয়েছে।

**সমাধান:**

```bash
# সঠিক
SITE_TIMEZONE=Asia/Dhaka

# ভুল — স্পেস/আন্ডারস্কোর নয়
SITE_TIMEZONE=Asia/Dhaka Time
SITE_TIMEZONE=GMT+6
```

### সমস্যা: লোকালে ঠিক আছে কিন্তু লাইভে সময় ভিন্ন

**কারণ:** শুধু `VITE_SITE_TIMEZONE` সেট করা হয়েছে, কিন্তু `SITE_TIMEZONE` নয়।

**সমাধান:** দুটোই একই মানে সেট করুন:

```bash
SITE_TIMEZONE=Asia/Dhaka
VITE_SITE_TIMEZONE=Asia/Dhaka
```

### সমস্যা: `.env` পরিবর্তন কাজ করছে না

**সমাধান:**

```bash
# Vite cache পরিষ্কার করুন
rm -rf node_modules/.vite
bun dev
```

---

## চেকলিস্ট

ডিপ্লয় করার আগে নিশ্চিত করুন:

- [ ] `.env` বা Secrets-এ `SITE_TIMEZONE` সেট আছে
- [ ] `VITE_SITE_TIMEZONE` সেট আছে (ঐচ্ছিক, তবে সুপারিশকৃত)
- [ ] দুটোর মান একই IANA নাম
- [ ] লাইভ সাইটে একটি নিউজের তারিখ সঠিকভাবে দেখা যাচ্ছে
- [ ] SSR এবং CSR উভয় পেজে তারিখ একই

---

## যোগাযোগ

ডিপ্লয়মেন্ট সংক্রান্ত সমস্যায় Lovable ডকুমেন্টেশন দেখুন: https://docs.lovable.dev
