'use client'

import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import Link from 'next/link'
import {
  MessageSquare, Clock, ChevronDown, CirclePlus,
  Sparkles, ClipboardList, BarChart2, Lightbulb, ArrowUp,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type VocabCard   = { id: number; type: 'vocab-card' }
type MetricsCard = { id: number; type: 'metrics-card' }
type UserMsg     = { id: number; type: 'user'; content: string }
type AssistantMsg = { id: number; type: 'assistant'; content: string }
type Message = VocabCard | MetricsCard | UserMsg | AssistantMsg

// ── Static data ──────────────────────────────────────────────────────────────

const NAV_TABS = [
  { label: 'Home', href: '/' },
  { label: 'Students', href: '/students' },
  { label: 'Chat', href: '/chat', active: true },
]

const HISTORY = [
  { id: 1, label: 'Maria — travel vocab', icon: 'chat' as const, active: true },
  { id: 2, label: 'James — lesson plan',  icon: 'chat' as const, active: false },
  { id: 3, label: 'Verb conjugation drill', icon: 'clock' as const, active: false },
]

const VOCAB_TABLE = [
  { spanish: 'Facturar equipaje',   english: 'Check-in luggage' },
  { spanish: 'Tarjeta de embarque', english: 'Boarding pass' },
  { spanish: 'Puerta de salida',    english: 'Departure gate' },
]

const ACTION_CHIPS = [
  { icon: Sparkles,      label: 'Suggest vocabulary' },
  { icon: ClipboardList, label: 'Lesson plan' },
  { icon: BarChart2,     label: 'Progress report' },
  { icon: Lightbulb,     label: 'Homework ideas' },
]

const INITIAL_MESSAGES: Message[] = [
  { id: 1, type: 'vocab-card' },
  { id: 2, type: 'user', content: "Thanks! Also, can you check her production accuracy from the last lesson?" },
  { id: 3, type: 'metrics-card' },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function VocabCardMsg() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#161616] p-5">
      <p className="text-sm leading-relaxed text-[#f0f0f0]">
        Based on Maria&apos;s recent conversation transcripts, I&apos;ve identified 10 high-frequency
        vocabulary items she struggled with during her &ldquo;At the Airport&rdquo; roleplay.
      </p>
      <p className="mt-3 text-sm text-[#f0f0f0]">Would you like to add these to her study deck?</p>

      <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.06]">
        <div className="grid grid-cols-2 border-b border-white/[0.06] bg-[#111111] px-4 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6b6b6b]">Spanish</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6b6b6b]">English</span>
        </div>
        {VOCAB_TABLE.map((row, i) => (
          <div key={i} className="grid grid-cols-2 border-b border-white/[0.04] px-4 py-3 last:border-0">
            <span className="text-sm text-[#8DCEF9]">{row.spanish}</span>
            <span className="text-sm text-[#f0f0f0]">{row.english}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl bg-[#8DCEF9] px-4 py-2 text-sm font-medium text-[#0a1a2a] transition-colors hover:bg-[#A8DAFC]"
        >
          <CirclePlus className="h-3.5 w-3.5" />
          Add 10 words to Maria&apos;s vocabulary
        </button>
        <button
          type="button"
          className="rounded-xl border border-white/[0.12] px-4 py-2 text-sm font-medium text-[#f0f0f0] transition-colors hover:bg-white/[0.04]"
        >
          Edit list
        </button>
      </div>
    </div>
  )
}

function MetricsCardMsg() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#161616] p-5">
      <p className="text-sm leading-relaxed text-[#f0f0f0]">
        Maria&apos;s oral production metrics for the &ldquo;Travel Fundamentals&rdquo; module show
        steady improvement:
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-[rgba(29,158,117,0.10)] px-3 py-1 text-xs font-medium text-[#61C796]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#61C796]" />
          Production · 88%
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-[rgba(141,206,249,0.12)] px-3 py-1 text-xs font-medium text-[#8DCEF9]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#8DCEF9]" />
          Fluency · 74%
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-[rgba(29,158,117,0.10)] px-3 py-1 text-xs font-medium text-[#61C796]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#61C796]" />
          Grammar · 92%
        </span>
      </div>
    </div>
  )
}

function UserMsgBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-sm rounded-2xl rounded-tr-sm bg-[#1A7AB5] px-4 py-3">
        <p className="text-sm leading-relaxed text-white">{content}</p>
      </div>
    </div>
  )
}

function AssistantMsgCard({ content }: { content: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#161616] p-5">
      <p className="text-sm leading-relaxed text-[#f0f0f0]">{content}</p>
    </div>
  )
}

function renderMessage(msg: Message) {
  switch (msg.type) {
    case 'vocab-card':   return <VocabCardMsg key={msg.id} />
    case 'metrics-card': return <MetricsCardMsg key={msg.id} />
    case 'user':         return <UserMsgBubble key={msg.id} content={msg.content} />
    case 'assistant':    return <AssistantMsgCard key={msg.id} content={msg.content} />
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export function ChatView() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function send() {
    const text = input.trim()
    if (!text) return
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', content: text }])
    setInput('')
    inputRef.current?.focus()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a]">

      {/* ── Sidebar ── */}
      <aside className="flex w-[240px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0a0a0a]">
        <Link href="/" className="flex h-14 items-center border-b border-white/[0.06] px-5 transition-opacity hover:opacity-80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Verbly" className="h-[28px] w-auto" />
        </Link>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6b6b6b]">
            History
          </p>
          <div className="flex flex-col gap-0.5">
            {HISTORY.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  item.active
                    ? 'bg-white/[0.06] text-[#f0f0f0]'
                    : 'text-[#6b6b6b] hover:bg-white/[0.04] hover:text-[#f0f0f0]'
                }`}
              >
                {item.icon === 'clock'
                  ? <Clock className="h-3.5 w-3.5 shrink-0" />
                  : <MessageSquare className="h-3.5 w-3.5 shrink-0" />}
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Top bar */}
        <div className="relative flex h-14 shrink-0 items-center border-b border-white/[0.06] px-5">
          <nav className="flex items-center gap-1">
            {NAV_TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  tab.active
                    ? 'font-semibold text-[#f0f0f0]'
                    : 'text-[#6b6b6b] hover:text-[#f0f0f0]'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          <div className="absolute left-1/2 -translate-x-1/2">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#161616] px-3.5 py-1.5 text-sm transition-colors hover:bg-[#1e1e1e]"
            >
              <span className="h-2 w-2 rounded-full bg-[#61C796]" />
              <span className="font-medium text-[#f0f0f0]">Maria Lopez</span>
              <ChevronDown className="h-3.5 w-3.5 text-[#6b6b6b]" />
            </button>
          </div>

          <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white">
            TA
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-6">
            {messages.map(renderMessage)}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Bottom */}
        <div className="shrink-0 pb-4">
          <div className="mx-auto w-full max-w-2xl px-6">
            <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
              {ACTION_CHIPS.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setInput(label)}
                  className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#161616] px-3 py-1.5 text-xs font-medium text-[#6b6b6b] transition-colors hover:border-white/[0.15] hover:text-[#f0f0f0]"
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#161616] px-4 py-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="How can I help you with Maria's learning today?"
              className="flex-1 bg-transparent text-sm text-[#f0f0f0] outline-none placeholder:text-[#444]"
            />
            <button
              type="button"
              onClick={send}
              disabled={!input.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#8DCEF9] text-[#0a1a2a] transition-colors hover:bg-[#A8DAFC] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-3 text-center text-xs text-[#444]">
            AskVerbly can make mistakes. Check important info.
          </p>
          </div>
        </div>

      </div>
    </div>
  )
}
