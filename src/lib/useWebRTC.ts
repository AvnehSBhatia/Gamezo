"use client";

/**
 * WebRTC peer hook.
 *
 * - Joins the signaling channel once roomId + userId are known
 * - Adds the local MediaStream as soon as it's available
 * - Negotiates offer/answer/ICE with the peer
 * - Exposes a callback ref (attachPeerStream) for the opponent <video>
 *
 * Local dev and production both use same-origin /ws/signaling via server.mjs proxy.
 */
import { getGameWsUrl } from "@/lib/useGameSocket";
import { useCallback, useEffect, useRef, useState } from "react";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

interface UseWebRTCOpts {
  roomId: string;
  userId: string;
  getLocalStream: () => MediaStream | null;
  enabled: boolean;
}

function readCallerSlot(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem("gamezo_yourSlot") === "playerA";
}

export function useWebRTC({ roomId, userId, getLocalStream, enabled }: UseWebRTCOpts) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const peerVideos = useRef<Set<HTMLVideoElement>>(new Set());
  const isCallerRef = useRef(false);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const makingOfferRef = useRef(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);

  const attachPeerStream = useCallback((el: HTMLVideoElement | null) => {
    if (!el) return;
    peerVideos.current.add(el);
    const pc = pcRef.current;
    if (!pc) return;
    pc.getReceivers().forEach((receiver) => {
      if (receiver.track?.kind === "video") {
        el.srcObject = new MediaStream([receiver.track]);
        el.play().catch(() => {});
      }
    });
  }, []);

  useEffect(() => {
    if (!enabled || !roomId || !userId) return;

    let disposed = false;
    isCallerRef.current = readCallerSlot();
    pendingIceRef.current = [];

    const ws = new WebSocket(getGameWsUrl("/ws/signaling"));
    wsRef.current = ws;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    function addLocalTracks() {
      const stream = getLocalStream();
      if (!stream) return false;

      const existingTrackIds = new Set(
        pc.getSenders().map((sender) => sender.track?.id).filter(Boolean),
      );

      let added = false;
      for (const track of stream.getTracks()) {
        if (existingTrackIds.has(track.id)) continue;
        pc.addTrack(track, stream);
        added = true;
      }
      return added;
    }

    async function flushPendingIce() {
      if (!pc.remoteDescription) return;
      const pending = pendingIceRef.current.splice(0);
      for (const candidate of pending) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn("[webrtc] failed to add buffered ICE candidate", err);
        }
      }
    }

    async function createAndSendOffer() {
      if (!isCallerRef.current || makingOfferRef.current) return;
      if (ws.readyState !== WebSocket.OPEN) return;
      if (pc.signalingState !== "stable" && pc.signalingState !== "have-local-offer") return;

      makingOfferRef.current = true;
      try {
        addLocalTracks();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ type: "offer", roomId, userId, sdp: offer.sdp }));
      } catch (err) {
        console.warn("[webrtc] offer failed", err);
      } finally {
        makingOfferRef.current = false;
      }
    }

    pc.ontrack = (ev) => {
      const remoteStream = ev.streams[0];
      if (!remoteStream) return;
      setHasRemoteStream(true);
      peerVideos.current.forEach((el) => {
        el.srcObject = remoteStream;
        el.play().catch(() => {});
      });
    };

    pc.onicecandidate = (ev) => {
      if (!ev.candidate || ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({
        type: "ice-candidate",
        roomId,
        userId,
        candidate: ev.candidate.toJSON(),
      }));
    };

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join-room", userId, roomId }));
    };

    ws.onmessage = async (ev) => {
      const msg = JSON.parse(ev.data as string) as Record<string, unknown>;

      if (msg.type === "signaling-joined") {
        isCallerRef.current = readCallerSlot();
        addLocalTracks();

        const peerIds = (msg.peerIds as string[] | undefined) ?? [];
        if (isCallerRef.current && peerIds.length > 0) {
          await createAndSendOffer();
        }
        return;
      }

      if (msg.type === "peer-joined") {
        if (isCallerRef.current) await createAndSendOffer();
        return;
      }

      if (msg.type === "offer") {
        addLocalTracks();
        await pc.setRemoteDescription(new RTCSessionDescription({
          type: "offer",
          sdp: msg.sdp as string,
        }));
        await flushPendingIce();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: "answer", roomId, userId, sdp: answer.sdp }));
        return;
      }

      if (msg.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription({
          type: "answer",
          sdp: msg.sdp as string,
        }));
        await flushPendingIce();
        return;
      }

      if (msg.type === "ice-candidate" && msg.candidate) {
        const candidate = msg.candidate as RTCIceCandidateInit;
        if (pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn("[webrtc] ICE candidate rejected", err);
          }
        } else {
          pendingIceRef.current.push(candidate);
        }
      }
    };

    ws.onerror = () => {
      if (!disposed) console.warn("[webrtc] signaling socket error");
    };

    const streamPoll = window.setInterval(() => {
      const added = addLocalTracks();
      if (added && isCallerRef.current && pc.signalingState === "stable") {
        void createAndSendOffer();
      }
    }, 400);

    return () => {
      disposed = true;
      window.clearInterval(streamPoll);
      ws.close();
      pc.close();
      wsRef.current = null;
      pcRef.current = null;
      pendingIceRef.current = [];
      setHasRemoteStream(false);
    };
  }, [enabled, roomId, userId, getLocalStream]);

  return { attachPeerStream, hasRemoteStream };
}
