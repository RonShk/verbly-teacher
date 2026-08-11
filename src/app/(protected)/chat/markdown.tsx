import type { ReactNode } from 'react'

/**
 * Minimal markdown renderer for assistant messages: headings, bullet / numbered
 * lists, bold, inline code. Anything fancier is discouraged by the system prompt.
 */
export function Markdown({ text }: { text: string }) {
  return <div className="flex flex-col gap-2">{renderBlocks(text)}</div>
}

function renderBlocks(text: string): ReactNode[] {
  const lines = text.split('\n')
  const blocks: ReactNode[] = []
  let listItems: string[] = []
  let listOrdered = false

  function flushList(key: number) {
    if (listItems.length === 0) return
    const items = listItems.map((item, i) => (
      <li key={i} className="text-sm leading-relaxed text-[#f0f0f0]">
        {renderInline(item)}
      </li>
    ))
    if (listOrdered) {
      blocks.push(
        <ol key={`list-${key}`} className="list-decimal space-y-1 pl-5">{items}</ol>,
      )
    } else {
      blocks.push(
        <ul key={`list-${key}`} className="list-disc space-y-1 pl-5">{items}</ul>,
      )
    }
    listItems = []
  }

  lines.forEach((rawLine, index) => {
    const line = rawLine.trimEnd()
    const bullet = line.match(/^\s*[-*]\s+(.*)$/)
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)

    if (bullet || numbered) {
      const ordered = Boolean(numbered)
      if (listItems.length > 0 && listOrdered !== ordered) flushList(index)
      listOrdered = ordered
      listItems.push((bullet ?? numbered)![1])
      return
    }
    flushList(index)

    if (!line.trim()) return
    const heading = line.match(/^(#{1,4})\s+(.*)$/)
    if (heading) {
      blocks.push(
        <p key={index} className="pt-1 text-sm font-semibold text-[#f0f0f0]">
          {renderInline(heading[2])}
        </p>,
      )
      return
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      blocks.push(<hr key={index} className="border-white/[0.08]" />)
      return
    }
    blocks.push(
      <p key={index} className="text-sm leading-relaxed text-[#f0f0f0]">
        {renderInline(line)}
      </p>,
    )
  })
  flushList(lines.length)

  return blocks
}

/** Bold (**…**) and inline code (`…`). */
function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="rounded bg-white/[0.08] px-1 py-0.5 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}
