"use client";
import { ASSETS } from "@/lib/assets";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-[#FFFAF4] flex flex-col items-center overflow-x-hidden relative font-sans">
      {/* Decorative blobs */}
      <img
        src={ASSETS.blueBlobHorizontal}
        alt=""
        className="absolute -top-12 -left-16 w-64 opacity-40 pointer-events-none select-none"
      />
      <img
        src={ASSETS.orangeBlobHorizontal}
        alt=""
        className="absolute -top-12 -right-16 w-64 opacity-40 pointer-events-none select-none"
      />

      {/* Nav */}
      <nav className="w-full flex items-center justify-between px-4 sm:px-6 pt-4 pb-2 relative z-10">
        <div className="flex items-center gap-2">
          <img src={ASSETS.logoMark} alt="Gamezo logo" className="h-10 w-10" />
          <img src={ASSETS.wordmark} alt="Gamezo" className="h-8" />
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:opacity-70 transition-opacity">
            <img src={ASSETS.iconButtonSettings} alt="Settings" className="h-7 w-7" />
          </button>
          <button className="p-2 hover:opacity-70 transition-opacity">
            <img src={ASSETS.iconButtonSound} alt="Sound" className="h-7 w-7" />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-8 pb-4 relative z-10 w-full max-w-xl">
        <img
          src={ASSETS.mascotCodeCard}
          alt="Gamezo mascot"
          className="w-56 h-56 object-contain mb-6 drop-shadow-2xl"
        />

        <h1 className="text-5xl font-black tracking-tight text-neutral-900 leading-[1.1] mb-4">
          Vibe code a game.<br />
          <span className="text-orange-500">Beat a stranger.</span><br />
          <span className="text-blue-500">3 minutes.</span>
        </h1>

        <p className="text-neutral-600 text-lg max-w-md leading-relaxed">
          Get matched with a random opponent. Both of you get the same prompt. The crowd decides who wins.
        </p>

        <img
          src={ASSETS.onlineStatusChip}
          alt="1,247 players online"
          className="mt-6 h-14 object-contain"
        />

        <div className="flex flex-col items-stretch gap-4 mt-8 w-full max-w-sm">
          <button
            onClick={() => router.push("/matchmaking")}
            className="group hover:scale-[1.03] transition-transform active:scale-[0.98]"
          >
            <img
              src={ASSETS.buttonStartMatch}
              alt="Start match"
              className="w-full object-contain drop-shadow-lg group-hover:drop-shadow-2xl transition-all"
            />
          </button>
          <button className="group hover:scale-[1.03] transition-transform active:scale-[0.98]">
            <img
              src={ASSETS.buttonWatchDemo}
              alt="Watch demo"
              className="w-full object-contain drop-shadow-lg group-hover:drop-shadow-2xl transition-all"
            />
          </button>
        </div>

        <div className="mt-8 flex flex-col items-center gap-2">
          <img
            src={ASSETS.avatarRow}
            alt="Recent players"
            className="h-14 object-contain"
          />
          <p className="text-sm text-neutral-500 font-medium">Join 1,247 coders battling right now</p>
        </div>
      </section>

      {/* How it works */}
      <section className="w-full max-w-xl px-6 mt-10 relative z-10">
        <div className="bg-white rounded-3xl border-2 border-neutral-200 shadow-xl p-6">
          <h2 className="text-xs font-black text-neutral-400 uppercase tracking-wider mb-6 text-center">How it works</h2>
          <div className="flex items-center justify-center gap-3">
            <div className="flex flex-col items-center gap-3 flex-1">
              <div className="w-20 h-20 flex items-center justify-center">
                <img src={ASSETS.matchmakingOrb} alt="" className="w-full h-full object-contain" />
              </div>
              <span className="text-sm text-center font-bold text-neutral-700">Get<br/>matched</span>
            </div>
            <img src={ASSETS.dottedLineBlue} alt="" className="w-12 h-3 object-contain opacity-50 flex-shrink-0" />
            <div className="flex flex-col items-center gap-3 flex-1">
              <div className="w-20 h-20 flex items-center justify-center">
                <img src={ASSETS.timerOrange} alt="" className="w-full h-full object-contain" />
              </div>
              <span className="text-sm text-center font-bold text-neutral-700">Build in<br/>3 min</span>
            </div>
            <img src={ASSETS.dottedLineOrange} alt="" className="w-12 h-3 object-contain opacity-50 flex-shrink-0" />
            <div className="flex flex-col items-center gap-3 flex-1">
              <div className="w-20 h-20 flex items-center justify-center">
                <img src={ASSETS.judgeAvatar} alt="" className="w-full h-full object-contain" />
              </div>
              <span className="text-sm text-center font-bold text-neutral-700">Judge<br/>decides</span>
            </div>
          </div>
        </div>
      </section>

      {/* Judge quote */}
      <div className="relative mt-10 mb-12 px-6 flex items-start gap-4 z-10 w-full max-w-xl">
        <img src={ASSETS.judgeAvatar} alt="Judge" className="w-16 h-16 object-contain flex-shrink-0" />
        <img src={ASSETS.judgeSpeechBubble} alt="Be kind. Be chaotic." className="flex-1 h-20 object-contain" />
      </div>

      <img
        src={ASSETS.yellowBlobHorizontal}
        alt=""
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 opacity-20 pointer-events-none select-none"
      />
    </div>
  );
}
