"use client";

import { ASSETS } from "@/lib/assets";

export function DecorativeBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <img
        src={ASSETS.orangeBlobHorizontal}
        alt=""
        className="absolute -left-24 top-16 w-72 opacity-90 sm:w-96"
      />
      <img
        src={ASSETS.blueBlobHorizontal}
        alt=""
        className="absolute -right-24 top-10 w-72 opacity-90 sm:w-96"
      />
      <img
        src={ASSETS.yellowBlobHorizontal}
        alt=""
        className="absolute -bottom-20 left-1/2 w-[34rem] -translate-x-1/2 opacity-70"
      />
      <div className="absolute left-[9%] top-[43%] h-20 w-20 rounded-full bg-blue-500 shadow-[inset_0_10px_18px_rgba(255,255,255,0.55),0_14px_30px_rgba(0,92,255,0.25)]" />
      <div className="absolute right-[13%] top-[35%] h-14 w-14 rounded-full bg-orange-500 shadow-[inset_0_8px_14px_rgba(255,255,255,0.55),0_12px_26px_rgba(255,106,0,0.25)]" />
      <div className="absolute left-[16%] bottom-[18%] h-14 w-14 rounded-[1rem] border-2 border-orange-400 bg-yellow-300 shadow-[inset_0_7px_12px_rgba(255,255,255,0.7),0_12px_24px_rgba(255,184,0,0.22)] rotate-12" />
      <div className="absolute right-[8%] bottom-[14%] h-24 w-24 rounded-full border-[18px] border-blue-500 shadow-[inset_0_8px_10px_rgba(255,255,255,0.45),0_14px_28px_rgba(0,92,255,0.2)]" />
      <div className="absolute left-8 top-1/2 grid grid-cols-4 gap-2 opacity-45">
        {Array.from({ length: 20 }).map((_, index) => (
          <span key={index} className="h-2 w-2 rounded-full bg-blue-500" />
        ))}
      </div>
      <div className="absolute right-8 top-1/3 grid grid-cols-4 gap-2 opacity-45">
        {Array.from({ length: 20 }).map((_, index) => (
          <span key={index} className="h-2 w-2 rounded-full bg-orange-500" />
        ))}
      </div>
    </div>
  );
}
