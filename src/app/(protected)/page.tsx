'use client'

import { useEffect, useState } from 'react'
import { UserPlus, Users } from 'lucide-react'

import { clientAuth } from '@/lib/firebase/client'
import { Button } from '@/components/ui/button'
import { AddStudentDialog } from '@/components/AddStudentDialog'
import { QuickActions } from '@/components/home/QuickActions'
import { StatTiles } from '@/components/home/StatTiles'
import { StudentHeader } from '@/components/home/StudentHeader'
import { TodaysPracticeCard } from '@/components/home/TodaysPracticeCard'
import { VocabHealthCard } from '@/components/home/VocabHealthCard'
import { WeeklyTrendsCard } from '@/components/home/WeeklyTrendsCard'
import type { DashboardResponse, RosterStudent, StudentDashboard, TrendsRange } from '@/types/dashboard'

async function fetchDashboard(studentUid?: string): Promise<DashboardResponse> {
  const user = clientAuth.currentUser
  if (!user) throw new Error('Not authenticated')
  const token = await user.getIdToken()
  const params = new URLSearchParams({
    timezoneOffsetMinutes: String(-(new Date().getTimezoneOffset())),
  })
  if (studentUid) params.set('student', studentUid)
  const res = await fetch(`/api/dashboard?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

export default function HomePage() {
  const [roster, setRoster] = useState<RosterStudent[] | null>(null)
  const [selectedUid, setSelectedUid] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null)
  const [range, setRange] = useState<TrendsRange>('this_week')
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  useEffect(() => {
    fetchDashboard()
      .then((data) => {
        setRoster(data.roster ?? [])
        setDashboard(data.dashboard)
        setSelectedUid(data.dashboard?.student.uid ?? null)
      })
      .catch(() => setRoster([]))
  }, [])

  function selectStudent(uid: string) {
    if (uid === selectedUid) return
    setSelectedUid(uid)
    setDashboard(null)
    fetchDashboard(uid)
      .then((data) => setDashboard(data.dashboard))
      .catch(() => {})
  }

  function handleStudentAdded(added: { uid: string; name: string; email: string }) {
    setRoster((current) => [...(current ?? []), { ...added, lastActiveAt: null }])
    if (!selectedUid) selectStudent(added.uid)
  }

  if (roster !== null && roster.length === 0) {
    return (
      <>
        <div className="flex min-h-[70vh] items-center justify-center p-8">
          <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-xl border border-border bg-card px-8 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(141,206,249,0.1)]">
              <Users className="h-5 w-5 text-[#8DCEF9]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="font-heading text-lg font-semibold text-foreground">No students yet</p>
              <p className="text-sm text-muted-foreground">
                Add your first student to see their practice dashboard here.
              </p>
            </div>
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="mt-1 bg-[#8DCEF9] font-medium text-[#0a1a2a] hover:bg-[#A8DAFC]"
            >
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Add student
            </Button>
          </div>
        </div>
        <AddStudentDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onAdded={handleStudentAdded} />
      </>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-6 p-8">
        <StudentHeader
          roster={roster}
          selectedUid={selectedUid}
          student={dashboard?.student ?? null}
          onSelectStudent={selectStudent}
          onAddStudent={() => setAddDialogOpen(true)}
        />

        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2">
            <TodaysPracticeCard practice={dashboard?.todaysPractice ?? null} />
          </div>
          <QuickActions studentUid={selectedUid} />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <VocabHealthCard health={dashboard?.vocabHealth ?? null} />
          <StatTiles stats={dashboard?.stats ?? null} />
        </div>

        <WeeklyTrendsCard trends={dashboard?.trends ?? null} range={range} onRangeChange={setRange} />
      </div>

      <AddStudentDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onAdded={handleStudentAdded} />
    </>
  )
}
