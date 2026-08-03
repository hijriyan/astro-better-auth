"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { authClient } from "@/lib/auth-client"
import type { OrgPermissions } from "@/lib/org-permissions"
import { toast } from "sonner"
import { DataTable } from "@/components/data-table"
import { type ColumnDef } from "@tanstack/react-table"
import { InviteUserDialog } from "./invite-user-dialog"

export function InvitationsTab({ org, invitations, customRoles = [], permissions }: {
  org: any
  invitations: any[]
  customRoles?: any[]
  permissions: OrgPermissions
}) {
  const [localInvitations, setLocalInvitations] = React.useState(invitations || [])
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)

  const canCreateInvitation = permissions.invitation.create
  const canCancelInvitation = permissions.invitation.cancel

  const teams: any[] = org.teams || []

  React.useEffect(() => {
    setLocalInvitations(invitations || [])
  }, [invitations])

  const handleCancel = async (invitationId: string) => {
    const loadingToast = toast.loading("Canceling invitation...")
    const originalInvites = [...localInvitations]

    setLocalInvitations((prev: any[]) => prev.filter((inv) => inv.id !== invitationId))

    const { error } = await authClient.organization.cancelInvitation({ invitationId })

    if (error) {
      toast.error(error.message || "Failed to cancel invitation", { id: loadingToast })
      setLocalInvitations(originalInvites)
    } else {
      toast.success("Invitation canceled", { id: loadingToast })
    }
  }

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => <span className="capitalize">{row.getValue("role")}</span>,
    },
    ...(teams.length > 0
      ? [{
          accessorKey: "teamId",
          header: "Teams",
          cell: ({ row }: any) => {
            const tid: string | undefined = row.original.teamId
            if (!tid) return <span className="text-muted-foreground text-xs">—</span>
            // optimistic rows carry teamNames directly
            if (row.original.teamNames) {
              return (
                <div className="flex flex-wrap gap-1">
                  {(row.original.teamNames as string[]).map((name) => (
                    <Badge key={name} variant="secondary" className="text-xs">{name}</Badge>
                  ))}
                </div>
              )
            }
            // real rows: teamId is comma-separated
            const ids = tid.split(",").map((s) => s.trim()).filter(Boolean)
            return (
              <div className="flex flex-wrap gap-1">
                {ids.map((id) => {
                  const name = teams.find((t: any) => t.id === id)?.name ?? id
                  return <Badge key={id} variant="secondary" className="text-xs">{name}</Badge>
                })}
              </div>
            )
          },
        } satisfies ColumnDef<any>]
      : []
    ),
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className="text-xs font-medium bg-muted px-2 py-1 rounded-full capitalize">
          {row.getValue("status")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const inv = row.original
        const isPending = inv.status === "pending"
        return (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive h-7"
            onClick={() => handleCancel(inv.id)}
            disabled={!isPending || inv.id.startsWith("temp-") || !canCancelInvitation}
          >
            Cancel
          </Button>
        )
      },
    },
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Invitations</CardTitle>
          <CardDescription>Manage invitations for your organization.</CardDescription>
        </div>
        {canCreateInvitation && (
          <Button onClick={() => setIsDialogOpen(true)} size="sm">
            Invite Member
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={localInvitations} />
      </CardContent>

      <InviteUserDialog
        orgId={org.id}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        customRoles={customRoles}
        teams={teams}
        onOptimisticStart={(optimisticInv: any) => {
          setLocalInvitations((prev: any[]) => [...prev, optimisticInv])
        }}
        onOptimisticRevert={(id: string) => {
          setLocalInvitations((prev: any[]) => prev.filter((i) => i.id !== id))
        }}
        onSuccess={({ id, data }: { id: string; data: any }) => {
          setLocalInvitations((prev: any[]) =>
            prev.map((inv) => (inv.id === id ? data || inv : inv))
          )
        }}
      />
    </Card>
  )
}
