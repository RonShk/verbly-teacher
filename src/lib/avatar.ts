const AVATAR_COLORS = [
  'bg-purple-500', 'bg-blue-500', 'bg-pink-500', 'bg-teal-500',
  'bg-orange-500', 'bg-slate-500', 'bg-indigo-500', 'bg-emerald-500',
]

export function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Stable color class derived from the uid, so a student always gets the same one. */
export function deriveColor(uid: string): string {
  let hash = 0
  for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}
