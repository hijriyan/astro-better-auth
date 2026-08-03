import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TeamForm } from "./team-form"
import { DeleteTeamDialog } from "./delete-team-dialog"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import type { OrgPermissions } from "@/lib/org-permissions"

interface TeamGeneralTabProps {
  org: any
  team: any
  permissions: OrgPermissions
  onUpdateTeam?: (id: string, name: string) => void
}

export function TeamGeneralTab({ org, team, permissions, onUpdateTeam }: TeamGeneralTabProps) {
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState<{ message: string; code?: string } | null>(null)
  const { data: session } = authClient.useSession()

  const canUpdateTeam = permissions.team.update
  const canDeleteTeam = permissions.team.delete

  const handleDeleteTeam = async () => {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const activeTeamId = (session?.session as any)?.activeTeamId
      if (activeTeamId === team.id) {
        await authClient.organization.setActiveTeam({ teamId: null }).catch(console.error)
      }

      const result = await authClient.organization.removeTeam({
        teamId: team.id,
        organizationId: org.id,
      })
      if (result.error) {
        setDeleteError({ message: result.error.message || "Failed to delete team", code: result.error.code })
        toast.error(result.error.message || "Failed to delete team")
      } else {
        toast.success("Team deleted successfully!")
        setDeleteOpen(false)
        window.location.href = `/org/${org.slug}`
      }
    } catch (err: any) {
      setDeleteError({ message: err.message || "An unexpected error occurred" })
      toast.error("An unexpected error occurred")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Team Settings</CardTitle>
          <CardDescription>
            {canUpdateTeam ? "Update your team name and details." : "Team details."}
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-xl">
          <TeamForm
            orgId={org.id}
            initialData={team}
            readOnly={!canUpdateTeam}
            onSuccess={(data) => {
              if (data && onUpdateTeam) onUpdateTeam(data.id, data.name)
            }}
          />
        </CardContent>
      </Card>

      {canDeleteTeam && (
        <>
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                Permanently delete this team and all of its data. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                Delete Team
              </Button>
            </CardContent>
          </Card>

          <DeleteTeamDialog
            isOpen={deleteOpen}
            onOpenChange={setDeleteOpen}
            onConfirm={handleDeleteTeam}
            teamName={team.name}
            isPending={isDeleting}
            error={deleteError}
          />
        </>
      )}
    </div>
  )
}
