"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useWebcam() {
  const streamRef = useRef<MediaStream | null>(null);
  const videosRef = useRef<Set<HTMLVideoElement>>(new Set());
  const [hasCamera, setHasCamera] = useState(false);
  const [hasMic, setHasMic] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
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

  const requestMedia = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Camera and mic need HTTPS or localhost");
      return false;
    }
    if (requesting) return false;

    setRequesting(true);
    setError(null);

    const videoConstraints = {
      facingMode: "user" as const,
      width: { ideal: 640 },
      height: { ideal: 480 },
    };

    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: true,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });
        setError("Mic unavailable — camera only. Check browser permissions.");
      }

      streamRef.current = stream;
      syncVideos();
      setHasCamera(stream.getVideoTracks().some((t) => t.readyState === "live"));
      setHasMic(stream.getAudioTracks().length > 0);
      setMicEnabled(stream.getAudioTracks().every((t) => t.enabled));
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Media permission denied";
      setError(msg);
      setHasCamera(false);
      setHasMic(false);
      return false;
    } finally {
      setRequesting(false);
    }
  }, [requesting, syncVideos]);

  const requestMic = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;
    if (streamRef.current?.getAudioTracks().length) {
      toggleMicInternal(true);
      return true;
    }

    setRequesting(true);
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioTrack = audioStream.getAudioTracks()[0];
      if (!audioTrack) return false;

      const stream = streamRef.current ?? new MediaStream();
      stream.addTrack(audioTrack);
      streamRef.current = stream;
      syncVideos();
      setHasMic(true);
      setMicEnabled(true);
      setError(null);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Mic permission denied";
      setError(msg);
      return false;
    } finally {
      setRequesting(false);
    }
  }, [syncVideos]);

  function toggleMicInternal(forceOn?: boolean) {
    const stream = streamRef.current;
    if (!stream) return;
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) return;
    const next = forceOn ?? !audioTracks[0].enabled;
    for (const track of audioTracks) track.enabled = next;
    setMicEnabled(next);
    setHasMic(true);
  }

  useEffect(() => {
    const videos = videosRef.current;
    const timer = setTimeout(() => {
      void requestMedia();
    }, 0);
    return () => {
      clearTimeout(timer);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      videos.clear();
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

  const toggleMic = useCallback(() => {
    const stream = streamRef.current;
    if (!stream?.getAudioTracks().length) {
      void requestMic();
      return;
    }
    toggleMicInternal();
  }, [requestMic]);

  const getStream = useCallback(() => streamRef.current, []);

  return {
    attachStream,
    getStream,
    hasCamera,
    hasMic,
    micEnabled,
    toggleMic,
    error,
    requesting,
    requestCamera: requestMedia,
  };
}
