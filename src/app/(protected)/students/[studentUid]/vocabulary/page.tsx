'use client'

import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  Sparkles,
  Download,
  Plus,
  MoreHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ---------------------------------------------------------------------------
// Types & mock data
// ---------------------------------------------------------------------------

type VocabStatus = 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARNING'

const MOCK_WORDS: {
  id: string
  english: string
  spanish: string
  status: VocabStatus
  lastReviewed: string | null
}[] = [
  { id: '1',  english: 'passport',     spanish: 'el pasaporte',              status: 'REVIEW',     lastReviewed: '2h ago' },
  { id: '2',  english: 'suitcase',     spanish: 'la maleta',                 status: 'LEARNING',   lastReviewed: 'Yesterday' },
  { id: '3',  english: 'flight',       spanish: 'el vuelo',                  status: 'NEW',        lastReviewed: null },
  { id: '4',  english: 'boarding pass', spanish: 'la tarjeta de embarque',   status: 'REVIEW',     lastReviewed: '4h ago' },
  { id: '5',  english: 'airport',      spanish: 'el aeropuerto',             status: 'REVIEW',     lastReviewed: '2 days ago' },
  { id: '6',  english: 'customs',      spanish: 'la aduana',                 status: 'RELEARNING', lastReviewed: '1h ago' },
  { id: '7',  english: 'gate',         spanish: 'la puerta',                 status: 'NEW',        lastReviewed: null },
  { id: '8',  english: 'delay',        spanish: 'el retraso',                status: 'LEARNING',   lastReviewed: 'Yesterday' },
  { id: '9',  english: 'luggage',      spanish: 'el equipaje',               status: 'REVIEW',     lastReviewed: '3h ago' },
  { id: '10', english: 'ticket',       spanish: 'el billete',                status: 'LEARNING',   lastReviewed: '2 days ago' },
]

const VOCAB_STATUS_STYLES: Record<VocabStatus, { bg: string; text: string; label: string }> = {
  NEW:        { bg: 'rgba(255,255,255,0.06)', text: '#6B6B6B', label: 'NEW' },
  LEARNING:   { bg: 'rgba(141,206,249,0.18)', text: '#8DCEF9', label: 'LEARNING' },
  REVIEW:     { bg: 'rgba(29,158,117,0.10)',  text: '#61C796', label: 'REVIEW' },
  RELEARNING: { bg: 'rgba(186,117,23,0.10)',  text: '#F09F27', label: 'RELEARNING' },
}

type VocabFilter = 'all' | 'new' | 'learning' | 'review' | 'relearning' | 'due_soon'
type VocabSortKey = 'status' | 'lastReviewed' | null
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 10

const FILTER_LABELS: { id: VocabFilter; label: string }[] = [
  { id: 'all',        label: 'All' },
  { id: 'new',        label: 'New' },
  { id: 'learning',   label: 'Learning' },
  { id: 'review',     label: 'Review' },
  { id: 'relearning', label: 'Relearning' },
  { id: 'due_soon',   label: 'Due soon' },
]

const STATUS_ORDER: Record<VocabStatus, number> = {
  NEW: 0, LEARNING: 1, REVIEW: 2, RELEARNING: 3,
}

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const rangeSet = new Set([
    1, total,
    ...[-1, 0, 1].map((d) => current + d).filter((p) => p >= 1 && p <= total),
  ])
  const sorted = Array.from(rangeSet).sort((a, b) => a - b)
  const result: (number | '...')[] = []
  let prev = 0
  for (const p of sorted) {
    if (p - prev > 1) result.push('...')
    result.push(p)
    prev = p
  }
  return result
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function VocabularyPage() {
  const [filter, setFilter] = useState<VocabFilter>('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<VocabSortKey>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)

  const filtered = MOCK_WORDS.filter((w) => {
    if (filter === 'new' && w.status !== 'NEW') return false
    if (filter === 'learning' && w.status !== 'LEARNING') return false
    if (filter === 'review' && w.status !== 'REVIEW') return false
    if (filter === 'relearning' && w.status !== 'RELEARNING') return false
    if (search) {
      const q = search.toLowerCase()
      if (!w.english.includes(q) && !w.spanish.includes(q)) return false
    }
    return true
  })

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        let cmp = 0
        if (sortKey === 'status') {
          cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
        } else {
          if (a.lastReviewed === null && b.lastReviewed === null) cmp = 0
          else if (a.lastReviewed === null) cmp = 1
          else if (b.lastReviewed === null) cmp = -1
          else cmp = a.lastReviewed.localeCompare(b.lastReviewed)
        }
        return sortDir === 'asc' ? cmp : -cmp
      })
    : filtered

  const totalPages = Math.max(1, Math.ceil(312 / PAGE_SIZE))
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = sorted.slice(pageStart, pageStart + PAGE_SIZE)

  function handleSort(key: VocabSortKey) {
    if (sortKey === key) {
      if (sortDir === 'asc') { setSortDir('desc') }
      else { setSortKey(null); setSortDir('asc') }
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  function SortIcon({ col }: { col: VocabSortKey }) {
    if (sortKey !== col)
      return <ChevronsUpDown className="inline h-3 w-3 ml-1 opacity-30" />
    return sortDir === 'asc'
      ? <ChevronUp className="inline h-3 w-3 ml-1" />
      : <ChevronDown className="inline h-3 w-3 ml-1" />
  }

  return (
    <div className="flex flex-col gap-5 p-8">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold font-heading text-foreground">312 words</span>
        <div className="flex items-center gap-2">
          <Button className="border border-[rgba(141,206,249,0.3)] bg-transparent font-medium text-[#C8E8FC] hover:border-[rgba(141,206,249,0.5)] hover:bg-[rgba(141,206,249,0.05)]">
            <Sparkles className="h-3.5 w-3.5" />
            Ask Verbly for suggestions
          </Button>
          <Button className="border border-[rgba(255,255,255,0.08)] bg-[#1e1e1e] font-medium text-[#999] hover:bg-[#252525] hover:text-foreground">
            <Download className="h-3.5 w-3.5" />
            Import
          </Button>
          <Button className="bg-[#8DCEF9] font-medium text-[#0a1a2a] hover:bg-[#A8DAFC]">
            <Plus className="h-3.5 w-3.5" />
            Add word
          </Button>
        </div>
      </div>

      {/* Filters + search */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {FILTER_LABELS.map((f) => (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); setPage(1) }}
              className={[
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                filter === f.id
                  ? 'bg-[#8DCEF9] text-[#0a1a2a]'
                  : 'border border-border bg-card text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-52">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search words..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-8 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[28%]" />
            <col className="w-[18%]" />
            <col className="w-[20%]" />
            <col className="w-[6%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border">
              {(['ENGLISH', 'SPANISH'] as const).map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground">
                  {h}
                </th>
              ))}
              <th
                className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => handleSort('status')}
              >
                STATUS <SortIcon col="status" />
              </th>
              <th
                className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => handleSort('lastReviewed')}
              >
                LAST REVIEWED <SortIcon col="lastReviewed" />
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((word) => {
              const s = VOCAB_STATUS_STYLES[word.status]
              return (
                <tr key={word.id} className="transition-colors hover:bg-white/[0.025]">
                  <td className="px-4 py-2.5 text-sm font-medium text-foreground">{word.english}</td>
                  <td className="px-4 py-2.5 text-sm text-muted-foreground">{word.spanish}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{ background: s.bg, color: s.text }}
                    >
                      {s.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-muted-foreground">
                    {word.lastReviewed ?? 'Never'}
                  </td>
                  <td className="px-4 py-2.5">
                    <button className="text-muted-foreground transition-colors hover:text-foreground">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Pagination footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <span className="text-sm text-muted-foreground">
            Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, 312)} of 312
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {getPaginationPages(page, totalPages).map((n, i) =>
              n === '...' ? (
                <span key={`ellipsis-${i}`} className="flex h-7 w-7 items-center justify-center text-sm text-muted-foreground">…</span>
              ) : (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={[
                    'flex h-7 w-7 items-center justify-center rounded-md text-sm font-medium transition-colors',
                    n === page
                      ? 'bg-[#8DCEF9] text-[#0a1a2a]'
                      : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  {n}
                </button>
              )
            )}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
