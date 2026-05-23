"use client";

import {
  getOrCreateUserId,
  getSessionValue,
  getYourSlot,
} from "@/components/gamezo/game/session";
import { useEffect, useState } from "react";

export function useMatchSession() {
  const [roomId, setRoomId] = useState("");
  const [userId, setUserId] = useState("");
  const [yourSlot, setYourSlot] = useState<"playerA" | "playerB" | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setRoomId(getSessionValue("gamezo_roomId"));
    setUserId(getOrCreateUserId());
    setYourSlot(getYourSlot());
    setHydrated(true);
  }, []);

  return { roomId, userId, yourSlot, hydrated };
}
