"use client"

import React, { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  TriangleAlert,
  UserPlus,
} from "lucide-react"

import { clientAuth } from "@/lib/firebase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Student = {
  uid: string
  name: string
  email: string
  initials: string
  avatarColor: string
}

const AVATAR_COLORS = [
  "bg-purple-500",
  "bg-blue-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-slate-500",
  "bg-indigo-500",
  "bg-emerald-500",
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

function toStudent(uid: string, name: string, email: string): Student {
  return { uid, name, email, initials: deriveInitials(name), avatarColor: deriveColor(uid) }
}

// ---------------------------------------------------------------------------

const DELETE_DELAY = 3

function RemoveStudentDialog({
  student,
  open,
  onOpenChange,
  onConfirm,
}: {
  student: Student | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const [countdown, setCountdown] = useState(DELETE_DELAY)

  useEffect(() => {
    if (!open) return
    setCountdown(DELETE_DELAY)
    const id = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) { clearInterval(id); return 0 }
        return n - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [open])

  const canDelete = countdown === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 rounded-2xl p-0 sm:max-w-sm"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="items-center px-6 pb-5 pt-8 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(240,149,149,0.1)]">
            <TriangleAlert className="h-5 w-5 text-[#f09595]" />
          </div>
          <DialogTitle className="text-base font-semibold text-foreground">
            Remove {student?.name ?? "Student"}?
          </DialogTitle>
          <DialogDescription
            className="mt-1.5 text-center text-sm text-muted-foreground"
            asChild
          >
            <div>
              <span className="block text-balance">
                All of {student?.name ? `${student.name.split(" ")[0]}'s` : "the student's"} class progress will be permanently deleted.
              </span>
              <span className="mt-1 block font-semibold text-[#f09595]">
                This cannot be undone.
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-row gap-3 border-t border-border px-6 py-4 sm:flex-row sm:justify-stretch">
          <Button
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#1e1e1e] text-[#c0c0c0] hover:bg-[#252525] hover:text-foreground"
          >
            Keep Student
          </Button>
          <Button
            disabled={!canDelete}
            onClick={onConfirm}
            className="flex-1 rounded-xl border border-[rgba(240,149,149,0.3)] bg-[#3d1414] text-[#f09595] hover:bg-[#4d1a1a] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {canDelete ? "Delete Student" : `Delete Student (${countdown})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type AddError = "not_found" | "already_added" | "generic"

const ADD_ERROR_MESSAGES: Record<AddError, string> = {
  not_found: "No student account found for this email. Double-check the spelling.",
  already_added: "This student is already in your class.",
  generic: "Something went wrong. Please try again.",
}

type SearchResult = { uid: string; name: string; email: string; signUpDate: string | null }



function AddStudentDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: (student: Student) => void
}) {
  const [email, setEmail] = useState("")
  const [touched, setTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<AddError | null>(null)
  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noResultsPrefixRef = useRef<string | null>(null)

  const isValid = EMAIL_RE.test(email)
  const showValidationError = touched && email.length > 0 && !isValid

  async function fetchSuggestions(query: string) {
    if (query.length < 4) {
      setSuggestions([])
      setShowSuggestions(false)
      noResultsPrefixRef.current = null
      return
    }
    if (noResultsPrefixRef.current && query.startsWith(noResultsPrefixRef.current)) {
      return
    }
    const currentUser = clientAuth.currentUser
    if (!currentUser) return
    const idToken = await currentUser.getIdToken()
    const res = await fetch(
      `/api/students/search?q=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${idToken}` } },
    )
    if (!res.ok) return
    const { students } = await res.json()
    if (students.length === 0) {
      noResultsPrefixRef.current = query
    } else {
      noResultsPrefixRef.current = null
    }
    setSuggestions(students)
    setShowSuggestions(students.length > 0)
  }

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setEmail(val)
    if (apiError) setApiError(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 220)
  }

  function handleSelect(result: SearchResult) {
    setEmail(result.email)
    setSuggestions([])
    setShowSuggestions(false)
    setTouched(true)
    if (apiError) setApiError(null)
    noResultsPrefixRef.current = null
  }

  function handleClose() {
    setEmail("")
    setTouched(false)
    setLoading(false)
    setApiError(null)
    setSuggestions([])
    setShowSuggestions(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    noResultsPrefixRef.current = null
    onOpenChange(false)
  }

  async function handleAdd() {
    if (!isValid || loading) return
    setShowSuggestions(false)
    setLoading(true)
    setApiError(null)

    try {
      const currentUser = clientAuth.currentUser
      if (!currentUser) throw new Error("Not authenticated")
      const idToken = await currentUser.getIdToken()

      const res = await fetch("/api/students/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ studentEmail: email }),
      })

      const data = await res.json()

      if (res.ok) {
        const { uid, name, email: studentEmail } = data.student
        onAdded(toStudent(uid, name, studentEmail))
        handleClose()
        return
      }

      if (res.status === 404) {
        setApiError("not_found")
      } else if (res.status === 409) {
        setApiError("already_added")
      } else {
        setApiError("generic")
      }
    } catch {
      setApiError("generic")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 rounded-2xl p-0 sm:max-w-sm"
      >
        <DialogHeader className="items-center px-6 pb-5 pt-8 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(141,206,249,0.1)]">
            <UserPlus className="h-5 w-5 text-[#8DCEF9]" />
          </div>
          <DialogTitle className="text-base font-semibold text-foreground">
            Invite a Student
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-center text-sm text-muted-foreground">
            They'll receive an invite to join your class.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5 px-6 py-5">
          <label className="text-sm font-medium text-foreground">Student Email</label>
          <div className="relative">
            <Input
              type="email"
              placeholder="student@email.com"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => {
                setTouched(true)
                // slight delay so click on suggestion registers first
                setTimeout(() => setShowSuggestions(false), 150)
              }}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true)
              }}
              aria-invalid={showValidationError || apiError === "not_found"}
              disabled={loading}
            />
            {showSuggestions && (
              <ul className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
                {suggestions.map((s) => (
                  <li key={s.uid}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect(s)}
                      className="flex w-full flex-col px-3 py-2.5 text-left hover:bg-white/5"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {s.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{s.email}</span>
                      {s.signUpDate && (
                        <span className="mt-0.5 text-xs italic text-muted-foreground/60">
                          Joined Verbly on{" "}
                          {new Date(s.signUpDate).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {showValidationError && (
            <p className="text-xs text-[#f09595]">
              Please enter a valid email address.
            </p>
          )}
          {apiError && (
            <p className="text-xs text-[#f09595]">
              {ADD_ERROR_MESSAGES[apiError]}
            </p>
          )}
        </div>

        <DialogFooter className="flex-row gap-3 border-t border-border px-6 py-4 sm:flex-row sm:justify-stretch">
          <Button
            disabled={!isValid || loading}
            onClick={handleAdd}
            className="flex-1 rounded-xl bg-[#8DCEF9] font-medium text-[#0a1a2a] hover:bg-[#A8DAFC] disabled:opacity-30"
          >
            {loading ? "Adding…" : "Add student"}
          </Button>
          <Button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#1e1e1e] text-[#c0c0c0] hover:bg-[#252525] hover:text-foreground"
          >
            Go back
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------

export function StudentsTable() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [removeTarget, setRemoveTarget] = useState<Student | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  useEffect(() => {
    const unsubscribe = clientAuth.onAuthStateChanged(async (user) => {
      if (!user) return
      const idToken = await user.getIdToken()
      const res = await fetch("/api/students/list", {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      if (!res.ok) { setLoadingStudents(false); return }
      const { students: rows } = await res.json()
      setStudents(
        rows.map(({ uid, name, email }: { uid: string; name: string; email: string }) =>
          toStudent(uid, name, email),
        ),
      )
      setLoadingStudents(false)
    })
    return unsubscribe
  }, [])

  function openRemoveDialog(student: Student) {
    setRemoveTarget(student)
    setDialogOpen(true)
  }

  async function handleRemoveConfirm() {
    if (!removeTarget) return
    const target = removeTarget

    // Optimistically remove from the list
    setStudents((prev) => prev.filter((s) => s.uid !== target.uid))
    setDialogOpen(false)
    setRemoveTarget(null)

    try {
      const currentUser = clientAuth.currentUser
      if (!currentUser) return
      const idToken = await currentUser.getIdToken()

      await fetch("/api/students/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ studentUid: target.uid }),
      })
    } catch {
      // Silently revert on failure
      setStudents((prev) => [...prev, target])
    }
  }

  function handleStudentAdded(student: Student) {
    setStudents((prev) => [...prev, student])
  }

  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: "name",
      header: "Student Name",
      cell: ({ row }) => {
        const student = row.original
        return (
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${student.avatarColor} text-sm font-medium text-white`}
            >
              {student.initials}
            </div>
            <span className="font-medium text-foreground">{student.name}</span>
          </div>
        )
      },
    },
    {
      id: "actions",
      header: () => <span className="flex justify-end pr-1">Action</span>,
      cell: ({ row }) => {
        const student = row.original
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu for {student.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem onSelect={() => router.push(`/students/${student.uid}`)}>
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => openRemoveDialog(student)}
                >
                  Remove Student
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: students,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <>
      <div className="flex flex-col gap-6 p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Students</h1>
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="bg-[#8DCEF9] font-medium text-[#0a1a2a] hover:bg-[#A8DAFC] active:opacity-90"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Student
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-border hover:bg-transparent"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="px-4 py-3 text-xs font-medium tracking-wide text-muted-foreground"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loadingStudents ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={columns.length}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={columns.length}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    You don't have any students at the moment.{" "}
                    <button
                      onClick={() => setAddDialogOpen(true)}
                      className="text-[#8DCEF9] underline-offset-2 hover:underline"
                    >
                      Add one
                    </button>
                    {" "}to get started.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer border-border last:border-0 hover:bg-white/3"
                    onClick={() => router.push(`/students/${row.original.uid}`)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-3">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-sm text-muted-foreground">
              Showing {table.getRowModel().rows.length} of {students.length} students
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <RemoveStudentDialog
        student={removeTarget}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={handleRemoveConfirm}
      />
      <AddStudentDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdded={handleStudentAdded}
      />
    </>
  )
}
