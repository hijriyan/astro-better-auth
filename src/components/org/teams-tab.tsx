"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"

import type { OrgPermissions } from "@/lib/org-permissions"



import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TeamForm } from "./team-form"

function formatDistanceToNowNative(date: Date) {
  const diffInSeconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  
  if (diffInSeconds < 60) return rtf.format(-diffInSeconds, 'second')
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return rtf.format(-diffInMinutes, 'minute')
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return rtf.format(-diffInHours, 'hour')
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) return rtf.format(-diffInDays, 'day')
  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) return rtf.format(-diffInMonths, 'month')
  const diffInYears = Math.floor(diffInDays / 365)
  return rtf.format(-diffInYears, 'year')
}

export function TeamsTab({
  org,
  teams,
  permissions,
  onAddTeam,
}: {
  org: any
  teams: any[]
  permissions: OrgPermissions
  onAddTeam?: (team: any) => void
}) {
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const canCreateTeam = permissions.team.create

  const teamsColumns = React.useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "name",
      header: "Team Name",
      cell: ({ row }) => (
        <a href={`/org/${org.slug}/team/${row.original.id}`} className="font-medium hover:underline">
          {row.getValue("name")}
        </a>
      )
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => {
        const date = row.getValue("createdAt")
        if (!date) return "-"
        return <span className="text-muted-foreground">{formatDistanceToNowNative(new Date(date as string))}</span>
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const team = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.href = `/org/${org.slug}/team/${team.id}`}>
                Manage Team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [org.slug])

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Teams</CardTitle>
            <CardDescription>Manage your organization's teams.</CardDescription>
          </div>
          {canCreateTeam && (
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>Create Team</Button>
          )}
        </CardHeader>
        <CardContent>
          <DataTable columns={teamsColumns} data={teams || []} />
        </CardContent>
      </Card>

      {canCreateTeam && (
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Team</DialogTitle>
            </DialogHeader>
            <TeamForm 
              orgId={org.id} 
              onSuccess={(data) => {
                setIsCreateOpen(false)
                if (data) onAddTeam?.(data)
              }} 
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
