"use client"

import * as React from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"

import type { OrgPermissions } from "@/lib/org-permissions"

const STATIC_ROLES = ["owner", "admin", "member"] as const

export function MembersTab({ org, members: initialMembers, customRoles = [], permissions }: {
  org: any
  members: any[]
  customRoles?: any[]
  permissions: OrgPermissions
}) {
  const [members, setMembers] = React.useState(initialMembers || [])
  const { data: session } = authClient.useSession()

  const canUpdateMember = permissions.member.update
  const canDeleteMember = permissions.member.delete

  // Merge static + custom roles for the role picker
  const allRoles = React.useMemo(() => {
    const customRoleNames = customRoles.map((r: any) => r.role || r.name).filter(Boolean)
    return [...STATIC_ROLES, ...customRoleNames]
  }, [customRoles])

  React.useEffect(() => {
    setMembers(initialMembers || [])
  }, [initialMembers])

  const [editMember, setEditMember] = React.useState<any>(null)
  const [editRole, setEditRole] = React.useState<string>("member")
  const [isUpdating, setIsUpdating] = React.useState(false)

  const openEditRole = (member: any) => {
    setEditMember(member)
    setEditRole(member.role)
  }

  const handleUpdateRole = async () => {
    if (!editMember) return
    setIsUpdating(true)
    const { error } = await authClient.organization.updateMemberRole({
      memberId: editMember.id,
      role: editRole,
      organizationId: org.id,
    })
    setIsUpdating(false)
    if (error) {
      toast.error(error.message || "Failed to update role")
    } else {
      toast.success("Role updated")
      setMembers((prev: any[]) =>
        prev.map((m) => (m.id === editMember.id ? { ...m, role: editRole } : m))
      )
      setEditMember(null)
    }
  }

  const handleRemoveMember = async (member: any) => {
    const loadingToast = toast.loading("Removing member...")
    setMembers((prev: any[]) => prev.filter((m) => m.id !== member.id))
    const { error } = await authClient.organization.removeMember({
      memberIdOrEmail: member.id,
      organizationId: org.id,
    })
    if (error) {
      toast.error(error.message || "Failed to remove member", { id: loadingToast })
      setMembers((prev: any[]) => [...prev, member])
    } else {
      toast.success("Member removed", { id: loadingToast })
    }
  }

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "user.name",
      header: "Name",
      cell: ({ row }) => {
        const isSelf = row.original.userId === session?.user?.id
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium">{row.original.user?.name || row.original.userId}</span>
              {isSelf && <Badge variant="secondary" className="text-xs">You</Badge>}
            </div>
            {row.original.user?.email && (
              <span className="text-xs text-muted-foreground">{row.original.user.email}</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.getValue("role")}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const member = row.original
        const isSelf = member.userId === session?.user?.id
        if (!canUpdateMember && !canDeleteMember) return null
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
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(member.id)}>
                Copy member ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {canUpdateMember && (
                <DropdownMenuItem onClick={() => openEditRole(member)}>Edit role</DropdownMenuItem>
              )}
              {canDeleteMember && (
                <DropdownMenuItem
                  className="text-destructive"
                  disabled={isSelf}
                  onClick={() => handleRemoveMember(member)}
                >
                  Remove member
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>View and manage organization members.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={members} />
        </CardContent>
      </Card>

      <Dialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Change the role for {editMember?.user?.name || editMember?.user?.email}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Label>Role</Label>
            <Select value={editRole} onValueChange={(v) => setEditRole(v ?? "member")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allRoles.map((r) => {
                  const isCustom = !STATIC_ROLES.includes(r as any)
                  return (
                    <SelectItem key={r} value={r}>
                      <div className="flex items-center gap-2">
                        <span className="capitalize">{r}</span>
                        {isCustom && (
                          <Badge variant="secondary" className="text-xs py-0 px-1.5">custom</Badge>
                        )}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMember(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={isUpdating || editRole === editMember?.role}
            >
              {isUpdating ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
