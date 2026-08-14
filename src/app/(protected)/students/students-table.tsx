"use client"

import React, { useEffect, useState } from "react"
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
} from "lucide-react"

import { clientAuth } from "@/lib/firebase/client"
import { deriveColor, deriveInitials } from "@/lib/avatar"
import { AddStudentDialog, type AddedStudent } from "@/components/AddStudentDialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  inviteStatus: "pending" | "sent" | "accepted" | "email_failed"
  inviteId: string | null
  initials: string
  avatarColor: string
}

function toStudent(uid: string, name: string, email: string, inviteStatus: Student["inviteStatus"] = "accepted", inviteId: string | null = null): Student {
  return {
    uid,
    name,
    email,
    inviteStatus,
    inviteId,
    initials: inviteStatus === "accepted" ? deriveInitials(name) : "✉",
    avatarColor: deriveColor(email),
  }
}

// ---------------------------------------------------------------------------

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
            onClick={onConfirm}
            className="flex-1 rounded-xl border border-[rgba(240,149,149,0.3)] bg-[#3d1414] text-[#f09595] hover:bg-[#4d1a1a]"
          >
            Delete Student
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
  const [removing, setRemoving] = useState(false)

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
        rows.map(({ uid, name, email, inviteStatus, inviteId }: {
          uid: string
          name: string
          email: string
          inviteStatus?: Student["inviteStatus"]
          inviteId?: string | null
        }) =>
          toStudent(uid, name, email, inviteStatus, inviteId),
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
    if (!removeTarget || removing) return
    const target = removeTarget
    setRemoving(true)

    // Optimistically remove from the list
    setStudents((prev) => prev.filter((s) => s.uid !== target.uid))
    setDialogOpen(false)
    setRemoveTarget(null)

    try {
      const currentUser = clientAuth.currentUser
      if (!currentUser) throw new Error("You must be signed in to remove a student")
      const idToken = await currentUser.getIdToken()

      const response = await fetch("/api/students/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(target.inviteStatus === "accepted"
          ? { studentUid: target.uid }
          : { inviteId: target.inviteId }),
      })
      if (!response.ok) throw new Error("Student removal failed")
    } catch {
      // Revert the optimistic update if the request failed.
      setStudents((prev) => [...prev, target])
    } finally {
      setRemoving(false)
    }
  }

  function handleStudentAdded(added: AddedStudent) {
    setStudents((prev) => [...prev, toStudent(added.uid, added.name, added.email, added.inviteStatus ?? "sent", added.inviteId ?? null)])
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
            <div className="flex min-w-0 flex-col">
              <span className="font-medium text-foreground">{student.name}</span>
              <span className="text-xs text-muted-foreground">{student.email}</span>
              {student.inviteStatus !== "accepted" && (
                <span className="mt-0.5 text-xs text-[#8DCEF9]">
                  {student.inviteStatus === "email_failed" ? "Invitation failed" : "Pending invite — awaiting sign-in"}
                </span>
              )}
            </div>
          </div>
        )
      },
    },
    {
      id: "actions",
      header: () => <span className="flex justify-end pr-1">Action</span>,
      cell: ({ row }) => {
        const student = row.original
        if (student.inviteStatus !== "accepted") {
          return (
            <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => openRemoveDialog(student)}
              >
                Remove invite
              </Button>
            </div>
          )
        }
        return (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
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
              <DropdownMenuContent
                align="end"
                className="min-w-44"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.stopPropagation()
                    router.push(`/students/${student.uid}/vocabulary`)
                  }}
                >
                  View Vocabulary
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(e) => {
                    e.stopPropagation()
                    openRemoveDialog(student)
                  }}
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
                    className={`${row.original.inviteStatus === "accepted" ? "cursor-pointer" : "cursor-default"} border-border last:border-0 hover:bg-white/3`}
                    onClick={() => {
                      if (row.original.inviteStatus === "accepted") {
                        router.push(`/students/${row.original.uid}/vocabulary`)
                      }
                    }}
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
