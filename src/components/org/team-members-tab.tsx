"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Plus } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { authClient } from "@/lib/auth-client"
import type { OrgPermissions } from "@/lib/org-permissions"
import { toast } from "sonner"
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

type ActiveOrganization = typeof authClient.$Infer.Organization & {
  members: (typeof authClient.$Infer.Member & {
    user: typeof authClient.$Infer.Session["user"]
  })[]
}
type Team = typeof authClient.$Infer.Team

interface TeamMembersTabProps {
  org: ActiveOrganization
  team: Team
  initialTeamMembers?: any[]
  permissions: OrgPermissions
}

export function TeamMembersTab({ org, team, initialTeamMembers, permissions }: TeamMembersTabProps) {
  const [teamMembers, setTeamMembers] = React.useState<any[]>(initialTeamMembers ?? [])
  const [isLoading, setIsLoading] = React.useState(!initialTeamMembers)
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [selectedUserId, setSelectedUserId] = React.useState<string>("")
  const [isAdding, setIsAdding] = React.useState(false)
  const { data: session } = authClient.useSession()

  const canAddMember = permissions.member.create
  const canRemoveMember = permissions.member.delete

  const fetchTeamMembers = React.useCallback(async () => {
    try {
      const { data, error } = await authClient.organization.listTeamMembers({ 
        query: { teamId: team.id },
        fetchOptions: { cache: 'no-store' }
      })
      if (error) {
        toast.error(error.message || "Failed to load team members")
      } else {
        setTeamMembers(data || [])
      }
    } catch (err) {
      toast.error("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [team.id])

  React.useEffect(() => {
    // Skip initial fetch when server already provided the data
    if (initialTeamMembers) return
    fetchTeamMembers()
  }, [fetchTeamMembers, initialTeamMembers])

  // Enhance team members with user details from the organization members
  const enrichedMembers = React.useMemo(() => {
    if (!org?.members) return []
    return teamMembers.map(tm => {
      const orgMember = org.members.find((m: any) => m.userId === tm.userId)
      return {
        ...tm,
        user: orgMember?.user || { name: "Unknown", email: "" },
        role: orgMember?.role || "unknown"
      }
    })
  }, [teamMembers, org])

  const availableOrgMembers = React.useMemo(() => {
    if (!org?.members) return []
    return org.members.filter((m: any) => !teamMembers.some(tm => tm.userId === m.userId))
  }, [org, teamMembers])

  const handleAddMember = async () => {
    if (!selectedUserId) return
    setIsAdding(true)
    try {
      const { data, error } = await authClient.organization.addTeamMember({
        teamId: team.id,
        userId: selectedUserId,
        organizationId: org.id
      })
      if (error) {
        toast.error(error.message || "Failed to add member to team")
      } else {
        toast.success("Member added successfully")
        setIsAddOpen(false)
        setSelectedUserId("")
        if (data) {
          setTeamMembers(prev => [...prev, data])
        }
        fetchTeamMembers()
      }
    } catch (err) {
      toast.error("An unexpected error occurred")
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    const loadingToast = toast.loading("Removing member...")
    try {
      // Optimistic update
      setTeamMembers(prev => prev.filter(m => m.userId !== userId))
      
      const { error } = await authClient.organization.removeTeamMember({
        teamId: team.id,
        userId,
        organizationId: org.id
      })
      if (error) {
        toast.error(error.message || "Failed to remove member", { id: loadingToast })
        // Revert on error
        fetchTeamMembers()
      } else {
        toast.success("Member removed from team", { id: loadingToast })
      }
    } catch (err) {
      toast.error("An unexpected error occurred", { id: loadingToast })
      fetchTeamMembers()
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
      }
    },
    {
      accessorKey: "role",
      header: "Org Role",
      cell: ({ row }) => <Badge variant="outline" className="capitalize">{row.getValue("role")}</Badge>
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const member = row.original
        if (!canRemoveMember) return null
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
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(member.userId)}>
                Copy user ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleRemoveMember(member.userId)}
              >
                Remove from team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    }
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Manage members of the {team.name} team.
            </CardDescription>
          </div>
          {canAddMember && (
            <Button size="sm" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-4 text-sm text-muted-foreground">Loading members...</div>
          ) : (
            <DataTable columns={columns} data={enrichedMembers} />
          )}
        </CardContent>
      </Card>

      {canAddMember && (
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Select a member from your organization to add to this team.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="member">Select Member</Label>
                <Select value={selectedUserId} onValueChange={(val) => setSelectedUserId(val || "")}>
                  <SelectTrigger id="member">
                    <SelectValue placeholder="Select an organization member">
                      {selectedUserId
                        ? (() => {
                            const m = availableOrgMembers.find((m: any) => m.userId === selectedUserId)
                            return m ? (m.user?.name || m.user?.email || m.userId) : undefined
                          })()
                        : undefined
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableOrgMembers.map((member: any) => (
                      <SelectItem key={member.userId} value={member.userId}>
                        {member.user?.name || member.user?.email || member.userId}
                      </SelectItem>
                    ))}
                    {availableOrgMembers.length === 0 && (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No more members available to add.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAddMember} disabled={!selectedUserId || isAdding}>
                {isAdding ? "Adding..." : "Add to Team"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
