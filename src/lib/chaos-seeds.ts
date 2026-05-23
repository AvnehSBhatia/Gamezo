import seeds from "../../shared/chaos-seeds.json";

export const CHAOS_SEEDS = seeds as readonly string[];

export function pickChaosSeed(): string {
  return CHAOS_SEEDS[Math.floor(Math.random() * CHAOS_SEEDS.length)]!;
}
