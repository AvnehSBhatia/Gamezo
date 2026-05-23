import seeds from "../shared/chaos-seeds.json" with { type: "json" };

export const CHAOS_SEEDS = seeds;

export function pickChaosSeed() {
  return CHAOS_SEEDS[Math.floor(Math.random() * CHAOS_SEEDS.length)];
}
