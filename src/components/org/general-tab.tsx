"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { OrgForm } from "@/components/org-form"
import { DeleteOrgDialog } from "./delete-org-dialog"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import type { OrgPermissions } from "@/lib/org-permissions"

export function GeneralTab({ org, permissions }: { org: any; permissions: OrgPermissions }) {
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState<{ message: string; code?: string } | null>(null)

  const [leaveOpen, setLeaveOpen] = React.useState(false)
  const [isLeaving, setIsLeaving] = React.useState(false)

  const { data: activeMember } = authClient.useActiveMember()
  const { data: organizations } = authClient.useListOrganizations()
  const isOwner = activeMember?.role === "owner"

  // Owners can only leave if there's at least one other owner
  const ownerCount = (org.members as any[])?.filter((m: any) =>
    m.role?.split(",").map((r: string) => r.trim()).includes("owner")
  ).length ?? 0
  const canLeave = !isOwner || ownerCount > 1

  const handleDeleteOrg = async () => {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const result = await authClient.organization.delete({ organizationId: org.id })
      if (result.error) {
        setDeleteError({ message: result.error.message || "Failed to delete organization", code: result.error.code })
        toast.error(result.error.message || "Failed to delete organization")
      } else {
        toast.success("Organization deleted successfully!")
        setDeleteOpen(false)
        window.location.href = "/"
      }
    } catch (err: any) {
      setDeleteError({ message: err.message || "An unexpected error occurred" })
      toast.error("An unexpected error occurred")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleLeave = async () => {
    setIsLeaving(true)
    const { error } = await authClient.organization.leave({
      organizationId: org.id,
    })
    setIsLeaving(false)
    if (error) {
      toast.error(error.message || "Failed to leave organization")
      setLeaveOpen(false)
    } else {
      toast.success(`You have left ${org.name}`)
      window.location.href = "/"
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            {permissions.organization.update
              ? "Manage your organization name and URL slug."
              : "Organization details."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrgForm initialData={org} readOnly={!permissions.organization.update} />
        </CardContent>
      </Card>

      {/* Leave org — available to all members except sole owners */}
      {!permissions.organization.delete && canLeave && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-600">Leave Organization</CardTitle>
            <CardDescription>
              Remove yourself from this organization. You will lose access immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700" onClick={() => setLeaveOpen(true)}>
              Leave Organization
            </Button>
          </CardContent>
        </Card>
      )}

      {permissions.organization.delete && (
        <>
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                Permanently delete this organization and all of its data. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {canLeave && (
                <Button variant="outline" className="border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700" onClick={() => setLeaveOpen(true)}>
                  Leave Organization
                </Button>
              )}
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                Delete Organization
              </Button>
            </CardContent>
          </Card>

          <DeleteOrgDialog
            isOpen={deleteOpen}
            onOpenChange={setDeleteOpen}
            onConfirm={handleDeleteOrg}
            orgName={org.name}
            isPending={isDeleting}
            error={deleteError}
          />
        </>
      )}

      {/* Leave confirmation dialog */}
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave <span className="font-medium">{org.name}</span>? You will lose access immediately and will need a new invitation to rejoin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleLeave}
              disabled={isLeaving}
            >
              {isLeaving ? "Leaving..." : "Leave Organization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
