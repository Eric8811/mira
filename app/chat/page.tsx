"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useLocale } from "@/components/I18nProvider";
import { loadSession } from "@/lib/session";

export default function ChatPlaceholder() {
  const router = useRouter();
  const { locale } = useLocale();

  useEffect(() => {
    if (!loadSession()) router.replace("/onboarding");
  }, [router]);

  return (
    <main className="mira-stars relative flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <div className="relative z-10 max-w-md space-y-4">
        <p className="font-serif-display text-2xl italic text-white/80">
          {locale === "zh" ? "还没到." : "Not yet."}
        </p>
        <p className="text-sm text-white/50">
          {locale === "zh"
            ? "常驻对话正在搭建中。"
            : "The listening space is being prepared."}
        </p>
      </div>
    </main>
  );
}
