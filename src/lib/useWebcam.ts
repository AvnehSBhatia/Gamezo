"use client";

/**
 * Webcam hook — returns a stable callback ref you can attach to any number
 * of <video> elements. Each element gets srcObject set immediately on mount
 * if the stream is already live, or as soon as getUserMedia resolves.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export function useWebcam() {
  const streamRef = useRef<MediaStream | null>(null);
  const videosRef = useRef<Set<HTMLVideoElement>>(new Set());
  const [hasCamera, setHasCamera] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setError("Camera not available in this context");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        streamRef.current = stream;
        videosRef.current.forEach((el) => {
          el.srcObject = stream;
          // Force play in case autoPlay didn't fire (common on mobile)
          el.play().catch(() => {});
        });
        setHasCamera(true);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Camera unavailable";
        setError(msg);
        console.warn("[useWebcam]", msg);
      }
    }

    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  /** Stable callback ref — attach to any <video ref={attachStream} /> */
  const attachStream = useCallback((el: HTMLVideoElement | null) => {
    if (!el) return;
    videosRef.current.add(el);
    if (streamRef.current) {
      el.srcObject = streamRef.current;
      el.play().catch(() => {});
    }
  }, []);

  /** Returns the live MediaStream (null until camera is granted) */
  const getStream = useCallback(() => streamRef.current, []);

  return { attachStream, getStream, hasCamera, error };
}
