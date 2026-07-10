"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-fetches the board every `seconds` so a shop tablet stays current. */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }): null {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
