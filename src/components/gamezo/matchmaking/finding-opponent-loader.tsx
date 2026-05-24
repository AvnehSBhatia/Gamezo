"use client";

import { useEffect, useState } from "react";

export function FindingOpponentLoader() {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setDotCount((count) => (count % 3) + 1);
    }, 450);

    return () => clearInterval(timer);
  }, []);

  return (
    <span className="inline-flex items-baseline">
      <span>Finding opponent</span>
      <span aria-hidden="true" className="inline-block w-[0.8em] text-left text-orange-500">
        {".".repeat(dotCount)}
      </span>
      <span className="sr-only">Finding opponent...</span>
    </span>
  );
}
