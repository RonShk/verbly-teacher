import type {
  ChatItem,
  LessonPlanFile,
  ProposalStatus,
  ProposedAddition,
  ProposedRemoval,
  VocabProposal,
} from '@/types/chat'

/**
 * The chat UI owns the thread and PUTs it back whole, so every item is rebuilt
 * here into a known shape before it reaches Firestore — unbounded or oddly
 * nested client JSON would otherwise be written straight into the document.
 */

const MAX_ITEMS = 400
const MAX_TEXT = 20_000
const MAX_SHORT_TEXT = 300
const MAX_WORDS = 100
const MAX_MARKDOWN = 40_000

const PROPOSAL_STATUSES = new Set<ProposalStatus>(['pending', 'working', 'confirmed', 'dismissed'])

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  return value.slice(0, max)
}

function parseAdditions(words: unknown[]): ProposedAddition[] | null {
  const parsed: ProposedAddition[] = []
  for (const word of words) {
    const { spanish, english } = (word ?? {}) as Record<string, unknown>
    const es = text(spanish, MAX_SHORT_TEXT)
    const en = text(english, MAX_SHORT_TEXT)
    if (es === null || en === null) return null
    parsed.push({ spanish: es, english: en })
  }
  return parsed
}

function parseRemovals(words: unknown[]): ProposedRemoval[] | null {
  const parsed: ProposedRemoval[] = []
  for (const word of words) {
    const { cardId, spanish, english } = (word ?? {}) as Record<string, unknown>
    const id = text(cardId, MAX_SHORT_TEXT)
    const es = text(spanish, MAX_SHORT_TEXT)
    const en = text(english, MAX_SHORT_TEXT)
    if (id === null || es === null || en === null) return null
    parsed.push({ cardId: id, spanish: es, english: en })
  }
  return parsed
}

function parseProposal(value: unknown): VocabProposal | null {
  const { kind, words } = (value ?? {}) as Record<string, unknown>
  if (!Array.isArray(words) || words.length > MAX_WORDS) return null

  if (kind === 'add') {
    const parsed = parseAdditions(words)
    if (!parsed) return null
    return { kind: 'add', words: parsed }
  }
  if (kind === 'remove') {
    const parsed = parseRemovals(words)
    if (!parsed) return null
    return { kind: 'remove', words: parsed }
  }
  return null
}

function parsePlan(value: unknown): LessonPlanFile | null {
  const { title, filename, markdown } = (value ?? {}) as Record<string, unknown>
  const parsedTitle = text(title, MAX_SHORT_TEXT)
  const parsedFilename = text(filename, MAX_SHORT_TEXT)
  const parsedMarkdown = text(markdown, MAX_MARKDOWN)
  if (parsedTitle === null || parsedFilename === null || parsedMarkdown === null) return null
  return { title: parsedTitle, filename: parsedFilename, markdown: parsedMarkdown }
}

function parseItem(value: unknown): ChatItem | null {
  const item = (value ?? {}) as Record<string, unknown>
  const id = text(item.id, MAX_SHORT_TEXT)
  if (!id) return null

  switch (item.kind) {
    case 'user': {
      const body = text(item.text, MAX_TEXT)
      if (body === null) return null
      return { id, kind: 'user', text: body }
    }
    case 'assistant': {
      const body = text(item.text, MAX_TEXT)
      if (body === null) return null
      return { id, kind: 'assistant', text: body }
    }
    case 'activity': {
      const label = text(item.label, MAX_SHORT_TEXT)
      if (label === null) return null
      return { id, kind: 'activity', label }
    }
    case 'proposal': {
      const proposal = parseProposal(item.proposal)
      if (!proposal) return null
      if (!PROPOSAL_STATUSES.has(item.status as ProposalStatus)) return null
      const parsed: Extract<ChatItem, { kind: 'proposal' }> = {
        id,
        kind: 'proposal',
        proposal,
        status: item.status as ProposalStatus,
      }
      // Firestore rejects undefined, so an absent summary is left off entirely.
      const summary = text(item.summary, MAX_SHORT_TEXT)
      if (summary !== null) parsed.summary = summary
      return parsed
    }
    case 'lesson-plan': {
      const plan = parsePlan(item.plan)
      if (!plan) return null
      return { id, kind: 'lesson-plan', plan }
    }
    default:
      return null
  }
}

/** Returns null when the payload is not a valid thread. */
export function parseChatItems(value: unknown): ChatItem[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ITEMS) return null
  const items: ChatItem[] = []
  for (const entry of value) {
    const item = parseItem(entry)
    if (!item) return null
    items.push(item)
  }
  return items
}
