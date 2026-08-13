'use client'

import { useCallback, useMemo, useRef, useState, type RefObject } from 'react'

import { EMPTY_THREAD, type ThreadState } from './lib/thread'

/** Write access to the open thread, handed to whoever needs to mutate it. */
export interface ThreadHandle {
  /** The working copy — read this inside async work, not the rendered state. */
  ref: RefObject<ThreadState>
  /** Folds an update in, keeping ref and rendered state in lockstep. */
  apply: (update: (prev: ThreadState) => ThreadState) => void
  /** Swaps the whole thread — opening a saved chat, or clearing to a new one. */
  replace: (next: ThreadState) => void
}

/**
 * Holds the open conversation.
 *
 * Saving needs the thread as it stands the instant a turn ends, which React
 * state only reflects on the *next* render — so the ref is the working copy and
 * the state is a mirror of it kept purely for rendering.
 */
export function useThread(): { thread: ThreadState; handle: ThreadHandle } {
  const ref = useRef<ThreadState>(EMPTY_THREAD)
  const [thread, setThread] = useState<ThreadState>(EMPTY_THREAD)

  const apply = useCallback((update: (prev: ThreadState) => ThreadState) => {
    ref.current = update(ref.current)
    setThread(ref.current)
  }, [])

  const replace = useCallback((next: ThreadState) => {
    ref.current = next
    setThread(next)
  }, [])

  const handle = useMemo<ThreadHandle>(() => ({ ref, apply, replace }), [apply, replace])

  return { thread, handle }
}
