import { Smartphone, BatteryCharging, ShieldCheck, Wifi, Camera, HardDrive, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type QuickTip = {
  day: string;
  title: string;
  detail: string;
  icon: LucideIcon;
};

/** ৭ দিনের স্মার্টফোন/গ্যাজেট দ্রুত টিপস — প্রযুক্তি ক্যাটাগরির আলাদা সেকশনে দেখানো হয়। */
export const gadgetQuickTips: QuickTip[] = [
  {
    day: "১ম দিন",
    title: "ব্যাটারি দীর্ঘস্থায়ী করুন",
    detail: "চার্জ ২০%–৮০% এর মধ্যে রাখুন এবং রাতভর ১০০% চার্জে রাখা এড়িয়ে চলুন — এতে ব্যাটারির আয়ু বাড়ে।",
    icon: BatteryCharging,
  },
  {
    day: "২য় দিন",
    title: "স্টোরেজ খালি করুন",
    detail: "ক্যাশ, ডুপ্লিকেট ছবি ও অব্যবহৃত অ্যাপ মুছে ফেলুন; ছবি ক্লাউডে ব্যাকআপ রেখে ফোনের জায়গা বাঁচান।",
    icon: HardDrive,
  },
  {
    day: "৩য় দিন",
    title: "অ্যাকাউন্ট নিরাপদ রাখুন",
    detail: "টু-ফ্যাক্টর অথেনটিকেশন চালু করুন এবং প্রতিটি অ্যাপে শক্তিশালী আলাদা পাসওয়ার্ড ব্যবহার করুন।",
    icon: ShieldCheck,
  },
  {
    day: "৪র্থ দিন",
    title: "ডেটা খরচ কমান",
    detail: "ব্যাকগ্রাউন্ড ডেটা সীমিত করুন এবং শুধু নির্ভরযোগ্য Wi-Fi-তে বড় আপডেট ডাউনলোড করুন।",
    icon: Wifi,
  },
  {
    day: "৫ম দিন",
    title: "ভালো ছবি তুলুন",
    detail: "গ্রিডলাইন চালু করে রুল-অব-থার্ডস মেনে চলুন এবং লেন্স পরিষ্কার রাখলেই ছবির মান বাড়বে।",
    icon: Camera,
  },
  {
    day: "৬ষ্ঠ দিন",
    title: "ফোন দ্রুত রাখুন",
    detail: "অপ্রয়োজনীয় অ্যানিমেশন কমান, ব্যবহার না হওয়া অ্যাপ বন্ধ রাখুন এবং নিয়মিত রিস্টার্ট দিন।",
    icon: Zap,
  },
  {
    day: "৭ম দিন",
    title: "সফটওয়্যার আপডেট দিন",
    detail: "সর্বশেষ সিস্টেম ও অ্যাপ আপডেট ইনস্টল করুন — নিরাপত্তা প্যাচ ও নতুন ফিচার পাবেন।",
    icon: Smartphone,
  },
];
