"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

export function useSafeNavigate() {
  const router = useRouter();
  const readyRef = useRef(false);

  useEffect(() => {
    readyRef.current = true;
  }, []);

  const push = useCallback(
    (href: string) => {
      if (!readyRef.current) return;
      queueMicrotask(() => router.push(href));
    },
    [router],
  );

  return push;
}
