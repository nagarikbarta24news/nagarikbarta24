import { gadgetQuickTips } from "@/lib/gadget-tips";

export function GadgetTips() {
  return (
    <section className="mb-8 rounded-xl border border-border/70 bg-muted/40 p-5">
      <div className="mb-4">
        <h2 className="border-l-4 border-primary pl-3 font-bengali text-xl font-bold">
          ৭ দিনের দ্রুত টিপস: স্মার্টফোন ও গ্যাজেট
        </h2>
        <p className="mt-1 pl-4 text-sm text-muted-foreground">
          প্রতিদিন একটি করে সহজ টিপস — এক সপ্তাহে আপনার ডিভাইস হবে আরও স্মার্ট।
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {gadgetQuickTips.map((tip) => {
          const Icon = tip.icon;
          return (
            <div
              key={tip.day}
              className="flex flex-col rounded-lg border border-border/60 bg-card p-4 transition-shadow hover:shadow-md"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                  {tip.day}
                </span>
              </div>
              <h3 className="font-bengali text-base font-bold leading-snug">{tip.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{tip.detail}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
