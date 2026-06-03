'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { StudentOverviewResponse } from '@/types/student-overview'
import { clientAuth } from '@/lib/firebase/client'
import {
  ArrowLeft,
  BookOpen,
  Languages,
  FileText,
  BarChart2,
  CirclePlus,
  Users,
  CheckCircle2,
  Zap,
  Download,
  Plus,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  Sparkles,
  MoreHorizontal,
  ShieldOff,
  AlertTriangle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AVATAR_COLORS = [
  'bg-purple-500', 'bg-blue-500', 'bg-pink-500', 'bg-teal-500',
  'bg-orange-500', 'bg-slate-500', 'bg-indigo-500', 'bg-emerald-500',
]

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function deriveColor(uid: string): string {
  let hash = 0
  for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function formatLinkedDate(isoString: string | null): string {
  if (!isoString) return 'Unknown'
  return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatLastActive(isoString: string | null): string {
  if (!isoString) return 'Never'
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

type PracticeStatus = 'done' | 'in_progress' | 'not_started'

function mapStatus(s: string): PracticeStatus {
  if (s === 'complete') return 'done'
  if (s === 'in_progress') return 'in_progress'
  return 'not_started'
}

type ActivityType = 'quiz' | 'vocab' | 'production' | 'words_added'

const MOCK_ACTIVITY: {
  id: string
  type: ActivityType
  title: string
  detail: string
  timestamp: string
  score: number | null
}[] = [
  { id: '1', type: 'quiz', title: 'Translation Quiz', detail: '88% Accuracy', timestamp: '2h ago', score: 88 },
  { id: '2', type: 'vocab', title: 'Vocabulary Practice', detail: '15 cards reviewed', timestamp: '4h ago', score: null },
  { id: '3', type: 'production', title: 'Production Practice', detail: '71% Accuracy', timestamp: 'Yesterday', score: 71 },
  { id: '4', type: 'words_added', title: 'Words Added', detail: '12 new words imported', timestamp: 'Yesterday', score: null },
  { id: '5', type: 'production', title: 'Production Practice', detail: '54% Accuracy', timestamp: '3d ago', score: 54 },
]

// ---------------------------------------------------------------------------
// Vocabulary tab mock data
// ---------------------------------------------------------------------------

type VocabStatus = 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARNING'

const MOCK_WORDS: {
  id: string
  english: string
  spanish: string
  status: VocabStatus
  lastReviewed: string | null
}[] = [
  { id: '1', english: 'passport', spanish: 'el pasaporte', status: 'REVIEW', lastReviewed: '2h ago' },
  { id: '2', english: 'suitcase', spanish: 'la maleta', status: 'LEARNING', lastReviewed: 'Yesterday' },
  { id: '3', english: 'flight', spanish: 'el vuelo', status: 'NEW', lastReviewed: null },
  { id: '4', english: 'boarding pass', spanish: 'la tarjeta de embarque', status: 'REVIEW', lastReviewed: '4h ago' },
  { id: '5', english: 'airport', spanish: 'el aeropuerto', status: 'REVIEW', lastReviewed: '2 days ago' },
  { id: '6', english: 'customs', spanish: 'la aduana', status: 'RELEARNING', lastReviewed: '1h ago' },
  { id: '7', english: 'gate', spanish: 'la puerta', status: 'NEW', lastReviewed: null },
  { id: '8', english: 'delay', spanish: 'el retraso', status: 'LEARNING', lastReviewed: 'Yesterday' },
  { id: '9', english: 'luggage', spanish: 'el equipaje', status: 'REVIEW', lastReviewed: '3h ago' },
  { id: '10', english: 'ticket', spanish: 'el billete', status: 'LEARNING', lastReviewed: '2 days ago' },
]

const VOCAB_STATUS_STYLES: Record<VocabStatus, { bg: string; text: string; label: string }> = {
  NEW:        { bg: 'rgba(255,255,255,0.06)', text: '#6B6B6B', label: 'NEW' },
  LEARNING:   { bg: 'rgba(141,206,249,0.18)', text: '#8DCEF9', label: 'LEARNING' },
  REVIEW:     { bg: 'rgba(29,158,117,0.10)', text: '#61C796', label: 'REVIEW' },
  RELEARNING: { bg: 'rgba(186,117,23,0.10)', text: '#F09F27', label: 'RELEARNING' },
}

// ---------------------------------------------------------------------------
// Progress tab mock data
// ---------------------------------------------------------------------------

const PROGRESS_DAYS = [
  { short: 'MON', date: 19 },
  { short: 'TUE', date: 20 },
  { short: 'WED', date: 21 },
  { short: 'THU', date: 22 },
  { short: 'FRI', date: 23 },
  { short: 'SAT', date: 24 },
  { short: 'SUN', date: 25 },
]

// null = not attempted. -1 = done (vocab, no numeric score). number = score %.
const PROGRESS_ROWS: { label: string; cells: (number | null)[] }[] = [
  { label: 'VOCAB',       cells: [null, -1,   -1,   -1,   -1,   -1,   -1  ] },
  { label: 'PRODUCTION',  cells: [null, null,  82,   54,   88,   71,   90  ] },
  { label: 'TRANSLATION', cells: [null, null, null,  91,   85,   78,   88  ] },
]

// Avg of scored sessions per day — shown as a summary row
const DAILY_AVG: (number | null)[] = [null, null, 82, 73, 87, 75, 89]

const VOCAB_CHART_DATA = [
  { day: 'Mon', cards: 12 },
  { day: 'Tue', cards: 20 },
  { day: 'Wed', cards: 18 },
  { day: 'Thu', cards: 22 },
  { day: 'Fri', cards: 15 },
  { day: 'Sat', cards: 18 },
  { day: 'Sun', cards: 21 },
]

const VOCAB_CHART_CONFIG = {
  cards: { label: 'Cards reviewed', color: '#8DCEF9' },
} satisfies ChartConfig

const PRODUCTION_SCORES: { date: string; score: number }[] = [
  { date: 'May 25', score: 88 },
  { date: 'May 23', score: 54 },
  { date: 'May 21', score: 82 },
  { date: 'May 19', score: 71 },
  { date: 'May 17', score: 90 },
]

const TRANSLATION_SCORES: { date: string; score: number }[] = [
  { date: 'May 25', score: 88 },
  { date: 'May 23', score: 85 },
  { date: 'May 21', score: 78 },
  { date: 'May 19', score: 91 },
  { date: 'May 17', score: 92 },
]

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ActivityIcon({ type }: { type: ActivityType }) {
  const cls = 'h-4 w-4'
  if (type === 'quiz') return <BarChart2 className={cls} />
  if (type === 'vocab') return <BookOpen className={cls} />
  if (type === 'production') return <Users className={cls} />
  return <CirclePlus className={cls} />
}

function PracticeCard({
  label,
  status,
  headline,
  subline,
  icon,
}: {
  label: string
  status: PracticeStatus
  headline: string
  subline: string
  icon: React.ReactNode
}) {
  const done = status === 'done'
  return (
    <div
      className={[
        'relative flex flex-col gap-1 overflow-hidden rounded-lg border bg-card p-5',
        done
          ? 'border-[rgba(29,174,117,0.35)]'
          : 'border-border',
      ].join(' ')}
    >
      {done && (
        <div className="absolute left-0 top-0 h-full w-[3px] rounded-l-lg bg-[#1dae75]" />
      )}
      <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="mt-1 flex items-center gap-2">
        {done ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#1dae75]" />
        ) : null}
        <span
          className={[
            'text-xl font-semibold font-heading',
            done ? 'text-foreground' : 'text-muted-foreground',
          ].join(' ')}
        >
          {headline}
        </span>
      </div>
      <span className="text-sm text-muted-foreground">{subline}</span>
      <div
        className={[
          'absolute right-4 top-4',
          done ? 'text-[#1dae75]/60' : 'text-muted-foreground/30',
        ].join(' ')}
      >
        {icon}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vocabulary tab
// ---------------------------------------------------------------------------

type VocabFilter = 'all' | 'new' | 'learning' | 'review' | 'relearning' | 'due_soon'
type VocabSortKey = 'status' | 'lastReviewed' | null
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 10

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

const FILTER_LABELS: { id: VocabFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'learning', label: 'Learning' },
  { id: 'review', label: 'Review' },
  { id: 'relearning', label: 'Relearning' },
  { id: 'due_soon', label: 'Due soon' },
]

const STATUS_ORDER: Record<VocabStatus, number> = {
  NEW: 0, LEARNING: 1, REVIEW: 2, RELEARNING: 3,
}

function VocabularyTab() {
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

      {/* Filters + search grouped */}
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

// ---------------------------------------------------------------------------
// Progress tab
// ---------------------------------------------------------------------------

// score: null = not attempted, -1 = vocab done (no numeric score), 0–100 = score %
function CalendarDot({ score }: { score: number | null }) {
  const SIZE = 22
  const STROKE = 2.5
  const r = (SIZE - STROKE) / 2
  const circ = 2 * Math.PI * r
  const cx = SIZE / 2
  const cy = SIZE / 2

  const targetPct = score === null ? 0 : score === -1 ? 1 : score / 100
  const [animatedPct, setAnimatedPct] = useState(0)
  useEffect(() => {
    if (score === null) return
    const id = setTimeout(() => setAnimatedPct(targetPct), 30)
    return () => clearTimeout(id)
  }, [score, targetPct])

  if (score === null) {
    return (
      <svg width={SIZE} height={SIZE}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={STROKE} />
      </svg>
    )
  }

  const dash = animatedPct * circ
  const label = score === -1 ? '100% Accuracy' : `${score}% Accuracy`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)', cursor: 'default' }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(141,206,249,0.15)" strokeWidth={STROKE} />
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="#8DCEF9"
            strokeWidth={STROKE}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.65s ease-out' }}
          />
        </svg>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function ScoreBar({ score }: { score: number }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const id = setTimeout(() => setWidth(score), 0)
    return () => clearTimeout(id)
  }, [score])

  const low = score < 70
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${width}%`, backgroundColor: low ? '#E24B4A' : '#8DCEF9' }}
        />
      </div>
      <span
        className="w-9 shrink-0 text-right text-sm font-medium"
        style={{ color: low ? '#E24B4A' : '#f0f0f0' }}
      >
        {score}%
      </span>
    </div>
  )
}

function ProgressTab() {
  const prodAvg = Math.round(PRODUCTION_SCORES.reduce((s, r) => s + r.score, 0) / PRODUCTION_SCORES.length)
  const transAvg = Math.round(TRANSLATION_SCORES.reduce((s, r) => s + r.score, 0) / TRANSLATION_SCORES.length)
  const transLow = Math.min(...TRANSLATION_SCORES.map((r) => r.score))
  const transHigh = Math.max(...TRANSLATION_SCORES.map((r) => r.score))
  const prodLow = Math.min(...PRODUCTION_SCORES.map((r) => r.score))
  const prodHigh = Math.max(...PRODUCTION_SCORES.map((r) => r.score))

  return (
    <div className="flex flex-col gap-5 p-8">
      {/* Practice activity card */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* Card header */}
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="text-xl font-bold font-heading text-foreground">Practice Activity</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">May 19 – May 25, 2024</p>
          </div>
        </div>

        {/* Week navigation */}
        <div className="flex items-center justify-between px-6 py-2.5">
          <button className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous week
          </button>
          <button className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
            Next week
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Calendar grid */}
        <div className="px-6 py-4">
          <table className="w-full">
            <thead>
              <tr>
                <th className="w-36 pb-4 text-left" />
                {PROGRESS_DAYS.map((d) => (
                  <th
                    key={d.short}
                    className="pb-4 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {d.short} {d.date}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PROGRESS_ROWS.map((row) => (
                <tr key={row.label}>
                  <td className="py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {row.label}
                  </td>
                  {row.cells.map((cell, i) => (
                    <td key={i} className="py-4 text-center">
                      <div className="flex justify-center">
                        <CalendarDot score={cell} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
              {/* Daily avg summary row */}
              <tr className="border-t border-border">
                <td className="py-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  DAILY AVG
                </td>
                {DAILY_AVG.map((avg, i) => (
                  <td key={i} className="py-4 text-center">
                    {avg !== null ? (
                      <span
                        className="text-xs font-semibold"
                        style={{ color: avg >= 70 ? '#1dae75' : '#E24B4A' }}
                      >
                        {avg}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">—</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 border-t border-border px-6 py-3">
          <div className="flex items-center gap-2">
            <svg width="14" height="14"><circle cx="7" cy="7" r="5.5" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" /></svg>
            <span className="text-xs text-muted-foreground">Not attempted</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="7" cy="7" r="5.5" fill="none" stroke="rgba(141,206,249,0.15)" strokeWidth="2" />
              <circle cx="7" cy="7" r="5.5" fill="none" stroke="#8DCEF9" strokeWidth="2" strokeDasharray="17 17" strokeLinecap="round" />
            </svg>
            <span className="text-xs text-muted-foreground">Partial</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="7" cy="7" r="5.5" fill="none" stroke="#8DCEF9" strokeWidth="2" />
            </svg>
            <span className="text-xs text-muted-foreground">Complete</span>
          </div>
        </div>
      </div>

      {/* Bottom stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Vocab card */}
        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">VOCAB</span>
            <span className="text-sm font-semibold text-foreground">18 <span className="font-normal text-muted-foreground text-xs">cards / day avg</span></span>
          </div>
          <div className="relative flex-1 min-h-[180px]">
            <div className="absolute inset-0 px-2 pt-2">
              <ChartContainer config={VOCAB_CHART_CONFIG} className="h-full" minHeight={160}>
                <BarChart data={VOCAB_CHART_DATA} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                    domain={[0, 25]}
                    ticks={[0, 5, 10, 15, 20, 25]}
                  />
                  <ChartTooltip
                    isAnimationActive={false}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    content={<ChartTooltipContent />}
                  />
                  <Bar dataKey="cards" fill="#8DCEF9" radius={[3, 3, 0, 0]}>
                    <LabelList
                      dataKey="cards"
                      position="top"
                      style={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <span className="text-xs text-muted-foreground">Accuracy: <span className="font-semibold text-[#1dae75]">92%</span></span>
            <span className="text-xs text-muted-foreground">Due for review: <span className="font-semibold text-foreground">24 words</span></span>
          </div>
        </div>

        {/* Production card */}
        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">PRODUCTION</span>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-sm font-semibold text-foreground">{prodAvg}%</span>
              <span className="text-[10px] text-muted-foreground">7-day avg</span>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-3 px-5 py-4">
            {PRODUCTION_SCORES.map((row) => (
              <div key={row.date} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{row.date}</span>
                  {row.score < 70 ? (
                    <span className="rounded-sm bg-[rgba(226,75,74,0.15)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#E24B4A]">
                      Needs attention
                    </span>
                  ) : null}
                </div>
                <ScoreBar score={row.score} />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <span className="text-xs text-muted-foreground">Lowest: <span className="font-semibold" style={{ color: prodLow >= 70 ? '#1dae75' : '#E24B4A' }}>{prodLow}%</span></span>
            <span className="text-xs text-muted-foreground">Highest: <span className="font-semibold text-foreground">{prodHigh}%</span></span>
          </div>
        </div>

        {/* Translation card */}
        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">TRANSLATION</span>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-sm font-semibold text-foreground">{transAvg}%</span>
              <span className="text-[10px] text-muted-foreground">7-day avg</span>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-3 px-5 py-4">
            {TRANSLATION_SCORES.map((row) => (
              <div key={row.date} className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{row.date}</span>
                <ScoreBar score={row.score} />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <span className="text-xs text-muted-foreground">Lowest: <span className="font-semibold" style={{ color: transLow >= 70 ? '#1dae75' : '#E24B4A' }}>{transLow}%</span></span>
            <span className="text-xs text-muted-foreground">Highest: <span className="font-semibold text-foreground">{transHigh}%</span></span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

const VOCAB_HEALTH_CONFIG = [
  { key: 'new',        label: 'NEW',        color: '#5B9BD5' },
  { key: 'learning',   label: 'LEARNING',   color: '#1dae75' },
  { key: 'review',     label: 'REVIEW',     color: '#8DCEF9' },
  { key: 'relearning', label: 'RELEARNING', color: '#E24B4A' },
] as const

type Tab = 'overview' | 'vocabulary' | 'progress'

export function StudentOverview() {
  const params = useParams()
  const studentUid = params.studentUid as string
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [overview, setOverview] = useState<StudentOverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ status: number; message: string } | null>(null)

  useEffect(() => {
    const user = clientAuth.currentUser
    if (!user) return
    user.getIdToken().then((token) => {
      const tz = -(new Date().getTimezoneOffset())
      return fetch(
        `/api/students/${studentUid}/overview?timezoneOffsetMinutes=${tz}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
    }).then(async (r) => {
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        setError({ status: r.status, message: body.error ?? `Error ${r.status}` })
        return
      }
      setOverview(await r.json())
    }).catch(() => {
      setError({ status: 0, message: 'Network error — please try again.' })
    }).finally(() => setLoading(false))
  }, [studentUid])

  const student = overview?.student
  const firstName = student?.name.split(' ')[0] ?? ''
  const initials = student ? deriveInitials(student.name) : '…'
  const avatarColor = student ? deriveColor(student.uid) : 'bg-slate-500'

  // Build practice cards from real data
  function buildPracticeCards() {
    if (!overview?.today) return []
    const { vocab, production, translation } = overview.today
    return [
      {
        id: 'vocab',
        label: 'VOCAB',
        status: mapStatus(vocab.status),
        headline: vocab.status === 'complete'
          ? 'Done'
          : vocab.status === 'in_progress'
            ? `${vocab.reviewedCount} cards reviewed`
            : 'Not started',
        subline: vocab.status === 'complete'
          ? `${vocab.reviewedCount} cards reviewed`
          : vocab.status === 'in_progress'
            ? 'In progress'
            : 'Pending today',
        icon: <BookOpen className="h-5 w-5" />,
      },
      {
        id: 'production',
        label: 'PRODUCTION',
        status: mapStatus(production.status),
        headline: production.status === 'not_started'
          ? 'Not started'
          : `${production.scorePercent ?? 0}% score`,
        subline: production.status === 'not_started'
          ? 'Pending today'
          : `${production.completedCount}/${production.totalCount} questions completed`,
        icon: <Languages className="h-5 w-5" />,
      },
      {
        id: 'translation',
        label: 'TRANSLATION',
        status: mapStatus(translation.status),
        headline: translation.status === 'not_started'
          ? 'Not started'
          : `${translation.scorePercent ?? 0}% score`,
        subline: translation.status === 'not_started'
          ? 'Pending today'
          : `${translation.completedCount}/${translation.totalCount} questions completed`,
        icon: <FileText className="h-5 w-5" />,
      },
    ]
  }

  const practiceCards = buildPracticeCards()

  const vocabHealth = overview?.vocabHealth
  const healthTotal = vocabHealth?.total ?? 1

  if (!loading && error) {
    const is403 = error.status === 403
    return (
      <div className="flex min-h-screen flex-col">
        <div className="px-8 pt-6">
          <Link
            href="/students"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Students
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-8">
          <Card className="w-full max-w-sm border-border bg-card">
            <CardContent className="flex flex-col items-center gap-4 px-8 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
                {is403
                  ? <ShieldOff className="h-5 w-5 text-muted-foreground" />
                  : <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                }
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-lg font-semibold font-heading text-foreground">
                  {is403 ? 'Student not on your roster' : 'Something went wrong'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {is403
                    ? 'Double-check your roster or ask the student to re-link their account.'
                    : error.message}
                </p>
              </div>
              <Link href="/students">
                <Button className="mt-1 border border-border bg-transparent font-medium text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Students
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Back link */}
      <div className="px-8 pt-6">
        <Link
          href="/students"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Students
        </Link>
      </div>

      {/* Student header */}
      <div className="flex items-start justify-between px-8 pt-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl ${avatarColor} text-lg font-semibold text-white`}
          >
            {initials}
          </div>

          {/* Name / meta */}
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-bold font-heading text-foreground">
              {loading ? <span className="opacity-40">Loading…</span> : (student?.name ?? '—')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {student?.email ?? ''}
              {student?.linkedAt && (
                <>
                  <span className="mx-2 opacity-40">•</span>
                  Linked {formatLinkedDate(student.linkedAt)}
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-muted-foreground">
                Last active {formatLastActive(student?.lastActiveAt ?? null)}
              </span>
              <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-muted-foreground">
                {student?.vocabTotal ?? '—'} words
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          <Button className="bg-[#8DCEF9] font-medium text-[#0a1a2a] hover:bg-[#A8DAFC]">
            <Zap className="h-3.5 w-3.5" />
            {firstName ? `Ask about ${firstName}` : 'Ask Verbly'}
          </Button>
          <Button className="border border-[rgba(141,206,249,0.3)] bg-transparent font-medium text-[#C8E8FC] hover:border-[rgba(141,206,249,0.5)] hover:bg-[rgba(141,206,249,0.05)]">
            <Plus className="h-3.5 w-3.5" />
            Add words
          </Button>
          <Button className="border border-[rgba(255,255,255,0.08)] bg-[#1e1e1e] font-medium text-[#999] hover:bg-[#252525] hover:text-foreground">
            <Download className="h-3.5 w-3.5" />
            Import
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 border-b border-border px-8">
        <nav className="flex gap-6">
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'vocabulary', label: 'Vocabulary' },
              { id: 'progress', label: 'Progress' },
            ] as { id: Tab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'border-b-2 pb-3 text-sm font-medium uppercase tracking-wider transition-colors',
                activeTab === tab.id
                  ? 'border-[#8DCEF9] text-[#8DCEF9]'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-6 p-8">
          {/* Today's Practice */}
          <section className="flex flex-col gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Today&apos;s Practice
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {practiceCards.map((p) => (
                <PracticeCard key={p.id} {...p} />
              ))}
            </div>
          </section>

          {/* Bottom two-column layout */}
          <div className="grid grid-cols-[1fr_360px] gap-4">
            {/* Recent Activity (still mock — future work) */}
            <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-base font-semibold font-heading text-foreground">
                  Recent Activity
                </h2>
                <button className="text-xs font-medium uppercase tracking-wider text-[#8DCEF9] hover:underline">
                  View All
                </button>
              </div>
              <ul className="divide-y divide-border">
                {MOCK_ACTIVITY.map((activity) => (
                  <li
                    key={activity.id}
                    className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.025]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
                      <ActivityIcon type={activity.type} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-medium text-foreground">
                        {activity.title}
                      </span>
                      <span
                        className={
                          activity.score === null
                            ? 'text-xs text-muted-foreground'
                            : activity.score < 70
                              ? 'text-xs text-[#F09F27]'
                              : 'text-xs text-[#1dae75]'
                        }
                      >
                        {activity.detail}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {activity.timestamp}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Vocab Health */}
            <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-base font-semibold font-heading text-foreground">
                  Vocabulary Health
                </h2>
              </div>
              <div className="flex flex-1 flex-col gap-4 px-5 py-5">
                {VOCAB_HEALTH_CONFIG.map(({ key, label, color }) => {
                  const count = vocabHealth?.[key] ?? 0
                  const pct = healthTotal > 0 ? (count / healthTotal) * 100 : 0
                  return (
                    <div key={key} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                          {label}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {count}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="border-t border-border px-5 py-3.5">
                <button className="flex items-center gap-1 text-sm font-medium text-[#8DCEF9] hover:underline">
                  Manage vocabulary
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'vocabulary' && (
        <VocabularyTab />
      )}

      {activeTab === 'progress' && (
        <ProgressTab />
      )}
    </div>
  )
}
