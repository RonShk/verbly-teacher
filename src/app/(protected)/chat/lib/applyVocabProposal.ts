import { authedFetch } from '@/lib/client/authedFetch'
import type { ProposedAddition, VocabProposal } from '@/types/chat'

export interface ProposalOutcome {
  /** The one-line result shown on the settled proposal card. */
  summary: string
  /** Hidden "[APP EVENT]" turn that tells the model what the tutor actually did. */
  note: string
}

function count(n: number, noun: string): string {
  if (n === 1) return `${n} ${noun}`
  return `${n} ${noun}s`
}

/**
 * Writes a confirmed (and possibly tutor-edited) proposal through the vocab API.
 * Throws if the write failed, leaving the card for the tutor to retry.
 */
export async function applyVocabProposal(
  studentUid: string,
  proposal: VocabProposal,
): Promise<ProposalOutcome> {
  if (proposal.kind === 'add') return addWords(studentUid, proposal.words)
  return removeWords(studentUid, proposal.words.map((w) => w.cardId))
}

async function addWords(studentUid: string, words: ProposedAddition[]): Promise<ProposalOutcome> {
  const res = await authedFetch(`/api/students/${studentUid}/vocab`, {
    method: 'POST',
    body: JSON.stringify({ words }),
  })
  if (!res?.ok) throw new Error(`Request failed: ${res?.status}`)
  const { added, skippedDuplicates } = (await res.json()) as {
    added: number
    skippedDuplicates: string[]
  }

  let summary = `${count(added, 'word')} added`
  let duplicateNote = ''
  if (skippedDuplicates.length > 0) {
    summary += ` · ${skippedDuplicates.length} already in the deck`
    duplicateNote = `, ${skippedDuplicates.length} skipped as duplicates (${skippedDuplicates.join(', ')})`
  }

  return {
    summary,
    note: `[APP EVENT] The tutor confirmed the vocabulary proposal: ${added} words were added${duplicateNote}.`,
  }
}

async function removeWords(studentUid: string, cardIds: string[]): Promise<ProposalOutcome> {
  const res = await authedFetch(`/api/students/${studentUid}/vocab`, {
    method: 'DELETE',
    body: JSON.stringify({ cardIds }),
  })
  if (!res?.ok) throw new Error(`Request failed: ${res?.status}`)
  const { removed } = (await res.json()) as { removed: number }

  return {
    summary: `${count(removed, 'word')} removed`,
    note: `[APP EVENT] The tutor confirmed the removal: ${removed} vocabulary cards were deleted.`,
  }
}
