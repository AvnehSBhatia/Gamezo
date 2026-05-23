"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useWebcam() {
  const streamRef = useRef<MediaStream | null>(null);
  const videosRef = useRef<Set<HTMLVideoElement>>(new Set());
  const [hasCamera, setHasCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  const syncVideos = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    for (const el of videosRef.current) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
        void el.play().catch(() => {});
      }
    }
  }, []);

  const requestCamera = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Camera needs HTTPS or localhost");
      return false;
    }
    if (requesting) return false;

    setRequesting(true);
    setError(null);

    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      streamRef.current = stream;
      syncVideos();
      setHasCamera(true);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Camera permission denied";
      setError(msg);
      setHasCamera(false);
      return false;
    } finally {
      setRequesting(false);
    }
  }, [requesting, syncVideos]);

  useEffect(() => {
    void requestCamera();
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      videosRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const attachStream = useCallback(
    (el: HTMLVideoElement | null) => {
      if (!el) return;
      videosRef.current.add(el);
      syncVideos();
    },
    [syncVideos],
  );

  const getStream = useCallback(() => streamRef.current, []);

  return { attachStream, getStream, hasCamera, error, requesting, requestCamera };
}
