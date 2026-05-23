"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function useSafeNavigate() {
  const router = useRouter();

  return useCallback(
    (href: string) => {
      if (typeof window === "undefined") return;
      try {
        router.push(href);
      } catch {
        window.location.assign(href);
      }
    },
    [router],
  );
}
