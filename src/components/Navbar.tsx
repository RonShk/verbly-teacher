"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { clientAuth } from "@/lib/firebase/client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Students", href: "/students" },
  { label: "Chat", href: "/chat" },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const user = clientAuth.currentUser

  const initials = (() => {
    const name = user?.displayName ?? ""
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return "?"
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  })()

  async function handleSignOut() {
    await signOut(clientAuth)
    router.replace("/login")
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center border-b border-border bg-card px-6">
      {/* Logo */}
      <Link href="/" className="mr-8 shrink-0 transition-opacity hover:opacity-80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Verbly" className="h-[22px] w-auto" />
      </Link>

      {/* Nav links */}
      <nav className="flex items-center gap-1">
        {NAV_LINKS.map(({ label, href }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={[
                "relative px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "text-[#8DCEF9]"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {label}
              {isActive && (
                <span className="absolute inset-x-3 bottom-0 h-px rounded-full bg-[#8DCEF9]" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Profile menu */}
      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full outline-none ring-offset-background transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#8DCEF9] focus-visible:ring-offset-2"
              aria-label="Open profile menu"
            >
              {user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? "Profile"}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center rounded-full bg-[#1e1e1e] text-xs font-medium text-foreground">
                  {initials}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={handleSignOut}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
