import type { VocabHealth } from '@/types/dashboard'
import type { DashboardSources } from './sources'

/** Builds the Vocabulary Health card from the pre-computed state counts. */
export function buildVocabHealth(sources: DashboardSources): VocabHealth {
  const { stateCounts, totalCards } = sources.vocabParent
  return { ...stateCounts, total: totalCards }
}
