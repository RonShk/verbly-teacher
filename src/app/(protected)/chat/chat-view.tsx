'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import {
  ArrowUp, BarChart2, ClipboardList, Lightbulb, Loader2, MessageSquare, Sparkles, Square,
} from 'lucide-react'

import { useRouter, useSearchParams } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'

import { clientAuth } from '@/lib/firebase/client'
import { Navbar } from '@/components/Navbar'
import { LessonPlanCard } from './components/LessonPlanCard'
import { StudentPicker, type RosterStudent } from './components/StudentPicker'
import { VocabProposalCard } from './components/VocabProposalCard'
import { Markdown } from './markdown'
import { useChat, type ChatItem } from './useChat'

const ACTION_CHIPS = [
  { icon: Sparkles, label: 'Suggest vocabulary', prompt: 'Suggest new vocabulary words to add based on recent performance.' },
  { icon: ClipboardList, label: 'Lesson plan', prompt: 'Create a lesson plan for our next lesson based on real metrics.' },
  { icon: BarChart2, label: 'Progress report', prompt: 'Give me a progress report: activity, accuracy and trends.' },
  { icon: Lightbulb, label: 'Homework ideas', prompt: 'Suggest homework ideas targeting current weak areas.' },
]

async function fetchRoster(): Promise<RosterStudent[]> {
  const user = clientAuth.currentUser
  if (!user) return []
  const token = await user.getIdToken()
  const res = await fetch('/api/students/list', { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return []
  const data = (await res.json()) as { students: RosterStudent[] }
  return data.students
}

export function ChatView() {
  // Set by "Ask Verbly for suggestions" on the vocabulary page: which student to
  // open on, and the question to ask straight away.
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedUid = searchParams.get('student')
  const requestedPrompt = searchParams.get('prompt')
  const autoSentRef = useRef(false)

  const [students, setStudents] = useState<RosterStudent[] | null>(null)
  const [selectedUid, setSelectedUid] = useState<string | null>(null)
  const [tutorFirstName, setTutorFirstName] = useState('')
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { items, isStreaming, send, stop, confirmProposal, dismissProposal } = useChat(selectedUid)

  const selectedStudent = students?.find((s) => s.uid === selectedUid) ?? null
  const firstName = selectedStudent?.name.split(' ')[0] ?? 'your student'

  useEffect(() => {
    fetchRoster().then((roster) => {
      setStudents(roster)
      setSelectedUid((current) => {
        if (current) return current
        // Only honour ?student if it is actually on this tutor's roster.
        const requested = roster.find((s) => s.uid === requestedUid)
        return requested?.uid ?? roster[0]?.uid ?? null
      })
    })
  }, [requestedUid])

  // Fire the incoming question once, after the right student is selected —
  // useChat clears the thread whenever selectedUid changes.
  useEffect(() => {
    if (!requestedPrompt || autoSentRef.current || !selectedUid) return
    if (requestedUid && selectedUid !== requestedUid) return
    autoSentRef.current = true
    void send(requestedPrompt)
    // Drop the params so a refresh doesn't ask the same thing all over again.
    router.replace('/chat')
  }, [requestedPrompt, requestedUid, selectedUid, send, router])

  // currentUser is still null on the first client render while Firebase restores
  // the session, so the greeting has to wait for the auth callback.
  useEffect(() => {
    return onAuthStateChanged(clientAuth, (user) => {
      const name = user?.displayName ?? ''
      setTutorFirstName(name.trim().split(/\s+/)[0] ?? '')
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [items])

  function submit() {
    const text = input.trim()
    if (!text || isStreaming || !selectedUid) return
    setInput('')
    void send(text)
    inputRef.current?.focus()
  }

  /** Action chips fire their prompt straight away, without touching the input. */
  function sendChipPrompt(prompt: string) {
    if (isStreaming || !selectedUid) return
    void send(prompt)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function renderItem(item: ChatItem) {
    switch (item.kind) {
      case 'user':
        return (
          <div key={item.id} className="flex justify-end">
            <div className="max-w-sm rounded-2xl rounded-tr-sm bg-[#1A7AB5] px-4 py-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-white">{item.text}</p>
            </div>
          </div>
        )
      case 'assistant':
        return (
          <div key={item.id} className="rounded-2xl border border-white/[0.06] bg-[#161616] p-5">
            <Markdown text={item.text} />
          </div>
        )
      case 'activity':
        return (
          <p key={item.id} className="flex items-center gap-2 px-1 text-xs text-[#6b6b6b]">
            <Sparkles className="h-3 w-3" />
            {item.label}
          </p>
        )
      case 'proposal':
        return (
          <VocabProposalCard
            key={item.id}
            proposal={item.proposal}
            status={item.status}
            summary={item.summary}
            studentFirstName={firstName}
            onConfirm={(edited) => confirmProposal(item.id, edited)}
            onDismiss={() => dismissProposal(item.id)}
          />
        )
      case 'lesson-plan':
        return <LessonPlanCard key={item.id} plan={item.plan} />
    }
  }

  const lastItem = items[items.length - 1]
  const showThinking = isStreaming && (!lastItem || lastItem.kind !== 'assistant')

  // The roster is null until it loads, which is the only time we show a spinner
  // in place of the picker.
  let studentSelector = (
    <StudentPicker
      students={students ?? []}
      selectedUid={selectedUid}
      onSelect={setSelectedUid}
      disabled={isStreaming}
    />
  )
  if (students === null) {
    studentSelector = <Loader2 className="h-4 w-4 animate-spin text-[#6b6b6b]" />
  }

  let emptyStateText = 'Ready to dive in?'
  if (tutorFirstName) {
    emptyStateText = `Hi ${tutorFirstName}, ready to dive in?`
  }
  if (students !== null && students.length === 0) {
    emptyStateText = 'Add a student to your roster to start chatting about their learning.'
  }

  let inputPlaceholder = 'Select a student to start chatting'
  if (selectedUid) {
    inputPlaceholder = `How can I help you with ${firstName}'s learning today?`
  }

  // While an answer is streaming the send button becomes a stop button, so the
  // one control is always the useful one.
  let composerAction = (
    <button
      type="button"
      onClick={submit}
      disabled={!input.trim() || !selectedUid}
      aria-label="Send message"
      className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#8DCEF9] text-[#0a1a2a] transition-colors hover:bg-[#A8DAFC] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  )
  if (isStreaming) {
    composerAction = (
      <button
        type="button"
        onClick={stop}
        aria-label="Stop generating"
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#f0f0f0] text-[#0a0a0a] transition-colors hover:bg-white"
      >
        <Square className="h-3 w-3 fill-current" />
      </button>
    )
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#0a0a0a]">

      <Navbar />

      {/* ── Body (sidebar + main) ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="flex w-[240px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0a0a0a]">
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6b6b6b]">
              History
            </p>
            <div className="flex items-start gap-2.5 px-3 py-2.5 text-sm text-[#6b6b6b]">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Saved chats are coming soon.</span>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Student selector */}
          <div className="flex h-12 shrink-0 items-center justify-center">
            {studentSelector}
          </div>

          {/* Messages */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-6">
              {items.length === 0 && !isStreaming && (
                <p className="text-balance py-16 text-center text-3xl font-medium tracking-tight text-[#f0f0f0]">
                  {emptyStateText}
                </p>
              )}
              {items.map(renderItem)}
              {showThinking && (
                <p className="flex items-center gap-2 px-1 text-xs text-[#6b6b6b]">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Thinking…
                </p>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Bottom */}
          <div className="shrink-0 pb-4">
            <div className="mx-auto w-full max-w-2xl px-6">
              <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
                {ACTION_CHIPS.map(({ icon: Icon, label, prompt }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => sendChipPrompt(prompt)}
                    disabled={isStreaming || !selectedUid}
                    className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#161616] px-3 py-1.5 text-xs font-medium text-[#6b6b6b] transition-colors hover:border-white/[0.15] hover:text-[#f0f0f0] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-white/[0.08] disabled:hover:text-[#6b6b6b]"
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
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  disabled={!selectedUid}
                  placeholder={inputPlaceholder}
                  className="flex-1 bg-transparent text-sm text-[#f0f0f0] outline-none placeholder:text-[#444] disabled:cursor-not-allowed"
                />
                {composerAction}
              </div>

              <p className="mt-3 text-center text-xs text-[#444]">
                Verbly can make mistakes. Check important info.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
