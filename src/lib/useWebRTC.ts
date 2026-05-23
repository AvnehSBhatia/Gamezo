"use client";

/**
 * WebRTC peer hook.
 *
 * - Joins the signaling channel once roomId + userId are known
 * - Adds the local MediaStream as soon as it's available
 * - Negotiates offer/answer/ICE with the peer
 * - Exposes a callback ref (attachPeerStream) for the opponent <video>
 *
 * The signaling server is already running and proxied at /ws/signaling
 * on the same origin as the page.
 */
import { useCallback, useEffect, useRef } from "react";

function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }
  return servers;
}

interface UseWebRTCOpts {
  roomId: string;
  userId: string;
  getLocalStream: () => MediaStream | null;
  enabled: boolean; // only start once we have a room + local stream
}

export function useWebRTC({ roomId, userId, getLocalStream, enabled }: UseWebRTCOpts) {
  const pcRef      = useRef<RTCPeerConnection | null>(null);
  const wsRef      = useRef<WebSocket | null>(null);
  const peerVideos = useRef<Set<HTMLVideoElement>>(new Set());
  const isCaller   = useRef(false); // playerA initiates

  const attachPeerStream = useCallback((el: HTMLVideoElement | null) => {
    if (!el) return;
    peerVideos.current.add(el);
    // If we already have a remote stream, attach it
    const pc = pcRef.current;
    if (pc) {
      pc.getReceivers().forEach((r) => {
        if (r.track && r.track.kind === "video") {
          const s = new MediaStream([r.track]);
          el.srcObject = s;
          el.play().catch(() => {});
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!enabled || !roomId || !userId) return;

    // Derive WS base from current page
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsBase = `${proto}//${window.location.host}`;
    const ws = new WebSocket(`${wsBase}/ws/signaling`);
    wsRef.current = ws;

    const pc = new RTCPeerConnection({ iceServers: getIceServers() });
    pcRef.current = pc;

    // Add local tracks once stream is available
    function addLocalTracks() {
      const stream = getLocalStream();
      if (!stream) return;
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    // Handle incoming remote track → show in peer video elements
    pc.ontrack = (ev) => {
      const remoteStream = ev.streams[0];
      if (!remoteStream) return;
      peerVideos.current.forEach((el) => {
        el.srcObject = remoteStream;
        el.play().catch(() => {});
      });
    };

    // ICE candidates → send via signaling
    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "ice-candidate",
          roomId, userId,
          candidate: ev.candidate,
        }));
      }
    };

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "join-room",
        userId,
        roomId,
        matchToken: sessionStorage.getItem("gamezo_matchToken") ?? "",
      }));
    };

    ws.onmessage = async (ev) => {
      const msg = JSON.parse(ev.data as string) as Record<string, unknown>;

      if (msg["type"] === "signaling-joined") {
        // playerA is caller (slot stored in sessionStorage)
        const slot = sessionStorage.getItem("gamezo_yourSlot") ?? "";
        isCaller.current = slot === "playerA";

        addLocalTracks();

        if (isCaller.current) {
          // Short delay so playerB has time to join
          await new Promise((r) => setTimeout(r, 800));
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          ws.send(JSON.stringify({ type: "offer", roomId, userId, sdp: offer.sdp }));
        }
        return;
      }

      if (msg["type"] === "offer") {
        addLocalTracks();
        await pc.setRemoteDescription(new RTCSessionDescription({
          type: "offer", sdp: msg["sdp"] as string,
        }));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: "answer", roomId, userId, sdp: answer.sdp }));
        return;
      }

      if (msg["type"] === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription({
          type: "answer", sdp: msg["sdp"] as string,
        }));
        return;
      }

      if (msg["type"] === "ice-candidate" && msg["candidate"]) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(
            msg["candidate"] as RTCIceCandidateInit
          ));
        } catch {}
        return;
      }
    };

    ws.onerror = (e) => console.warn("[webrtc] signaling error", e);

    return () => {
      ws.close();
      pc.close();
      wsRef.current  = null;
      pcRef.current  = null;
    };
  }, [enabled, roomId, userId, getLocalStream]);

  return { attachPeerStream };
}
