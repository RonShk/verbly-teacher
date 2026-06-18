'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
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
import { clientAuth } from '@/lib/firebase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { VocabCardItem, VocabListResponse, VocabStatusFilter } from '@/types/student-vocab'

const VOCAB_STATUS_STYLES: Record<VocabCardItem['status'], { bg: string; text: string; label: string }> = {
  new:        { bg: 'rgba(255,255,255,0.06)', text: '#6B6B6B', label: 'NEW' },
  learning:   { bg: 'rgba(141,206,249,0.18)', text: '#8DCEF9', label: 'LEARNING' },
  review:     { bg: 'rgba(29,158,117,0.10)',  text: '#61C796', label: 'REVIEW' },
  relearning: { bg: 'rgba(186,117,23,0.10)',  text: '#F09F27', label: 'RELEARNING' },
}

type VocabSortKey = 'status' | 'lastReviewed' | 'dueDate' | null
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 10

const FILTER_LABELS: { id: VocabStatusFilter; label: string }[] = [
  { id: 'all',        label: 'All' },
  { id: 'new',        label: 'New' },
  { id: 'learning',   label: 'Learning' },
  { id: 'review',     label: 'Review' },
  { id: 'relearning', label: 'Relearning' },
  { id: 'due_soon',   label: 'Due soon' },
]

const STATUS_ORDER: Record<VocabCardItem['status'], number> = {
  new: 0, learning: 1, review: 2, relearning: 3,
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

function formatLastReviewed(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

function formatDueDate(iso: string | null): string {
  if (!iso) return '—'
  const diff = new Date(iso).getTime() - Date.now()
  const days = Math.round(diff / 86_400_000)
  if (days < -1) return `${Math.abs(days)} days ago`
  if (days === -1) return 'Yesterday'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}

export default function VocabularyPage() {
  const { studentUid } = useParams<{ studentUid: string }>()
  const [filter, setFilter] = useState<VocabStatusFilter>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortKey, setSortKey] = useState<VocabSortKey>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)

  const [data, setData] = useState<VocabListResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchData = useCallback(async () => {
    const user = clientAuth.currentUser
    if (!user) return
    setLoading(true)
    const token = await user.getIdToken()
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      status: filter,
    })
    if (debouncedSearch) params.set('q', debouncedSearch)
    const res = await fetch(`/api/students/${studentUid}/vocab?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [studentUid, page, filter, debouncedSearch])

  useEffect(() => { fetchData() }, [fetchData])

  const words = data?.words ?? []

  const sorted = sortKey
    ? [...words].sort((a, b) => {
        let cmp = 0
        if (sortKey === 'status') {
          cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
        } else if (sortKey === 'lastReviewed') {
          if (!a.lastReviewedAt && !b.lastReviewedAt) cmp = 0
          else if (!a.lastReviewedAt) cmp = 1
          else if (!b.lastReviewedAt) cmp = -1
          else cmp = a.lastReviewedAt.localeCompare(b.lastReviewedAt)
        } else {
          if (!a.dueAt && !b.dueAt) cmp = 0
          else if (!a.dueAt) cmp = 1
          else if (!b.dueAt) cmp = -1
          else cmp = a.dueAt.localeCompare(b.dueAt)
        }
        return sortDir === 'asc' ? cmp : -cmp
      })
    : words

  const totalWords = data?.counts.totalWords ?? 0
  const totalQueryMatchCount = data?.totalQueryMatchCount ?? 0
  const totalPages = Math.max(1, data?.totalPages ?? 1)
  const pageStart = (page - 1) * PAGE_SIZE

  function handleSort(key: VocabSortKey) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortKey(null); setSortDir('asc') }
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
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
        <span className="text-2xl font-bold font-heading text-foreground">
          {loading && !data ? '—' : `${totalWords} words`}
        </span>
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
            <col className="w-[23%]" />
            <col className="w-[23%]" />
            <col className="w-[14%]" />
            <col className="w-[17%]" />
            <col className="w-[15%]" />
            <col className="w-[8%]" />
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
              <th
                className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => handleSort('dueDate')}
              >
                DUE DATE <SortIcon col="dueDate" />
              </th>
              <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No words found.
                </td>
              </tr>
            ) : sorted.map((word) => {
              const s = VOCAB_STATUS_STYLES[word.status]
              return (
                <tr key={word.id} className="transition-colors hover:bg-white/[0.025]">
                  <td className="px-4 py-2.5 text-sm font-medium text-foreground">{word.englishWord}</td>
                  <td className="px-4 py-2.5 text-sm text-muted-foreground">{word.spanishWord}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{ background: s.bg, color: s.text }}
                    >
                      {s.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-muted-foreground">
                    {formatLastReviewed(word.lastReviewedAt)}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-muted-foreground">
                    {formatDueDate(word.dueAt)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-muted-foreground transition-colors hover:text-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-40">
                        <DropdownMenuItem variant="destructive">
                          Delete card
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Pagination footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {data
              ? `Showing ${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, totalQueryMatchCount)} of ${totalQueryMatchCount}`
              : ''}
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
              disabled={page >= totalPages}
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
