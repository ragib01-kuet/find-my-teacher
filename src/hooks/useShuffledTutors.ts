import { useMemo } from "react";
import { mockTutors, Tutor } from "@/data/mockTutors";

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function useShuffledTutors(): Tutor[] {
  // useMemo with empty deps = shuffle once per mount (page visit)
  return useMemo(() => shuffleArray(mockTutors), []);
}
