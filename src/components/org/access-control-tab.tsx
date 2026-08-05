"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import type { OrgPermissions } from "@/lib/org-permissions"
import { DataTable } from "@/components/data-table"
import { type ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Plus, Trash2, Pencil } from "lucide-react"
import { toast } from "sonner"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { PermissionsBuilder } from "@/components/permissions-builder"

export function AccessControlTab({ initialRoles, onRolesChange, permissions }: {
  initialRoles?: any[]
  onRolesChange?: (roles: any[]) => void
  permissions: OrgPermissions
}) {
  const [roles, setRoles] = React.useState<any[]>(initialRoles ?? [])
  const [isLoading, setIsLoading] = React.useState(!initialRoles)

  const canCreateAC = permissions.ac.create
  const canUpdateAC = permissions.ac.update
  const canDeleteAC = permissions.ac.delete

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [dialogMode, setDialogMode] = React.useState<"create" | "update">("create")
  const [editingRoleId, setEditingRoleId] = React.useState<string | null>(null)

  // Form State
  const [roleName, setRoleName] = React.useState("")
  const [originalRoleName, setOriginalRoleName] = React.useState("")
  const [rolePermissions, setRolePermissions] = React.useState<Record<string, string[]>>({})

  const fetchRoles = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await authClient.organization.listRoles()
      if (error) {
        toast.error(error.message || "Failed to load roles")
      } else {
        const fetched = data || []
        setRoles(fetched)
        onRolesChange?.(fetched)
      }
    } catch (error) {
      console.error(error)
      toast.error("An unexpected error occurred while fetching roles.")
    } finally {
      setIsLoading(false)
    }
  }, [onRolesChange])

  React.useEffect(() => {
    // Skip initial fetch when server already provided the data
    if (initialRoles) return
    fetchRoles()
  }, [fetchRoles, initialRoles])

  const handleDeleteRole = async (roleId: string) => {
    const loadingToast = toast.loading("Deleting role...")
    try {
      const { error } = await authClient.organization.deleteRole({ roleId })
      if (error) {
        toast.error(error.message || "Failed to delete role", { id: loadingToast })
      } else {
        toast.success("Role deleted successfully", { id: loadingToast })
        fetchRoles()
      }
    } catch (err) {
      toast.error("An unexpected error occurred", { id: loadingToast })
    }
  }

  const openCreateRole = () => {
    setDialogMode("create")
    setRoleName("")
    setOriginalRoleName("")
    setRolePermissions({})
    setEditingRoleId(null)
    setIsDialogOpen(true)
  }

  const openUpdateRole = (roleData: any) => {
    setDialogMode("update")
    setEditingRoleId(roleData.id)
    const name = roleData.role || roleData.name || ""
    setRoleName(name)
    setOriginalRoleName(name)
    const perms = roleData.permission || roleData.permissions || {}
    setRolePermissions(perms)
    setIsDialogOpen(true)
  }

  const handleSubmitRole = async () => {
    if (dialogMode === "create" && !roleName) {
      toast.error("Role name is required")
      return
    }

    // Clean up: remove resources that have empty action arrays
    const parsedPermissions: Record<string, string[]> = {}
    for (const [res, actions] of Object.entries(rolePermissions)) {
      if (Array.isArray(actions) && actions.length > 0) {
        parsedPermissions[res] = actions
      }
    }

    setIsSubmitting(true)
    try {
      if (dialogMode === "create") {
        const { error } = await authClient.organization.createRole({
          role: roleName,
          permission: parsedPermissions,
        })
        if (error) throw error
        toast.success("Role created successfully")
      } else {
        const { error } = await authClient.organization.updateRole({
          roleId: editingRoleId!,
          data: { permission: parsedPermissions },
        })
        if (error) throw error
        toast.success("Role updated successfully")
      }
      setIsDialogOpen(false)
      setRoleName("")
      setRolePermissions({})
      setEditingRoleId(null)
      fetchRoles()
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "role",
      header: "Role Name",
      cell: ({ row }) => (
        <span className="font-medium capitalize">{row.getValue("role") || row.original.name}</span>
      ),
    },
    {
      accessorKey: "permission",
      header: "Permissions",
      cell: ({ row }) => {
        const perms = row.original.permission || row.original.permissions
        if (!perms || Object.keys(perms).length === 0) {
          return <Badge variant="secondary">None</Badge>
        }
        return (
          <div className="flex flex-wrap gap-1">
            {Object.entries(perms).map(([resource, actions]: [string, any]) => (
              <Badge key={resource} variant="outline" className="text-xs">
                {resource}: {Array.isArray(actions) ? actions.join(", ") : "All"}
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => {
        const date = row.original.createdAt
        return (
          <span className="text-sm text-muted-foreground">
            {date ? new Date(date).toLocaleString() : "-"}
          </span>
        )
      },
    },
    {
      accessorKey: "updatedAt",
      header: "Updated At",
      cell: ({ row }) => {
        const date = row.original.updatedAt
        return (
          <span className="text-sm text-muted-foreground">
            {date ? new Date(date).toLocaleString() : "-"}
          </span>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const role = row.original
        const roleName = role.role || role.name || ""
        const isBuiltIn = ["owner", "admin", "member"].includes(roleName.toLowerCase())

        if (isBuiltIn) {
          return <span className="text-xs text-muted-foreground italic">Built-in</span>
        }
        if (!canUpdateAC && !canDeleteAC) return null

        return (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canUpdateAC && (
                <DropdownMenuItem onClick={() => openUpdateRole(role)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Role
                </DropdownMenuItem>
              )}
              {canDeleteAC && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => handleDeleteRole(role.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Role
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Access Control</CardTitle>
            <CardDescription>Configure custom roles and dynamic access controls.</CardDescription>
          </div>
          {canCreateAC && (
            <Button size="sm" onClick={openCreateRole}>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-4 text-sm text-muted-foreground">
              Loading roles...
            </div>
          ) : (
            <DataTable columns={columns} data={roles} />
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-3xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Create Custom Role" : "Update Custom Role"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Define a new role and configure its resource permissions."
                : "Modify the selected role's name and resource permissions."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {dialogMode === "create" && (
              <div className="grid gap-2">
                <Label htmlFor="name">Role Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. editor, moderator"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                />
              </div>
            )}
            {dialogMode === "update" && (
              <p className="text-sm text-muted-foreground">
                Editing permissions for role <span className="font-medium text-foreground capitalize">{originalRoleName}</span>.
                Role names cannot be changed — delete and recreate the role if you need a different name.
              </p>
            )}

            <div className="grid gap-4">
              <PermissionsBuilder
                value={rolePermissions}
                onChange={setRolePermissions}
                emptyStateMessage="No permissions added. Click 'Add Resource' to configure resource access."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitRole} disabled={isSubmitting || (dialogMode === "create" && !roleName)}>
              {isSubmitting
                ? dialogMode === "create"
                  ? "Creating..."
                  : "Updating..."
                : dialogMode === "create"
                  ? "Create Role"
                  : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
