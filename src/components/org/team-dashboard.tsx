"use client"

import * as React from "react"
import { authClient } from "@/lib/auth-client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CircleAlert, SettingsIcon, UsersIcon } from "lucide-react"
import { TeamGeneralTab } from "./team-general-tab"
import { TeamMembersTab } from "./team-members-tab"

import { DEFAULT_PERMISSIONS, type OrgPermissions } from "@/lib/org-permissions"

interface TeamDashboardProps {
  slug: string
  teamId: string
  initialOrg?: any
  initialTeamMembers?: any[]
  permissions?: OrgPermissions
}

export function TeamDashboard({ slug, teamId, initialOrg, initialTeamMembers, permissions = DEFAULT_PERMISSIONS }: TeamDashboardProps) {
  const [orgData, setOrgData] = React.useState<any>(initialOrg ?? null)
  const [isPending, setIsPending] = React.useState(!initialOrg)
  const [error, setError] = React.useState<any>(null)

  const fetchOrg = React.useCallback(async () => {
    setIsPending(true)
    try {
      const { data, error } = await authClient.organization.getFullOrganization({
        query: {
          organizationSlug: slug
        }
      })
      if (error) {
        setError(error)
      } else {
        setOrgData(data)
      }
    } catch (err) {
      setError(err)
    } finally {
      setIsPending(false)
    }
  }, [slug])

  React.useEffect(() => {
    // Skip initial fetch when server already provided the data
    if (initialOrg) return
    fetchOrg()
  }, [fetchOrg, initialOrg])

  const { data: activeOrg } = authClient.useActiveOrganization()
  const { data: session } = authClient.useSession()
  const activeTeamId = (session?.session as any)?.activeTeamId

  // Ensure active org is set
  React.useEffect(() => {
    if (orgData && (!activeOrg || activeOrg.id !== orgData.id)) {
      authClient.organization.setActive({ organizationId: orgData.id }).catch(console.error)
    }
  }, [orgData, activeOrg])

  // Ensure active team is set
  React.useEffect(() => {
    if (orgData && activeOrg && activeOrg.id === orgData.id) {
      if (activeTeamId !== teamId) {
        authClient.organization.setActiveTeam({ teamId }).catch(console.error)
      }
    }
  }, [orgData, activeOrg, teamId, activeTeamId])

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-[250px]" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (error || !orgData) {
    return (
      <Alert variant="destructive">
        <CircleAlert className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error?.message || "Failed to load team or organization not found."}
        </AlertDescription>
      </Alert>
    )
  }

  const team = orgData.teams?.find((t: any) => t.id === teamId)

  if (!team) {
    return (
      <Alert variant="destructive">
        <CircleAlert className="h-4 w-4" />
        <AlertTitle>Team Not Found</AlertTitle>
        <AlertDescription>
          The team you are looking for does not exist or you don't have permission to view it.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{team.name}</h2>
        <p className="text-muted-foreground">Manage your team settings and members.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList variant="line" className="w-full justify-start border-b rounded-none bg-transparent overflow-x-auto flex-nowrap whitespace-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <TabsTrigger value="general">
            <SettingsIcon className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="members">
            <UsersIcon className="w-4 h-4 mr-2" />
            Members
          </TabsTrigger>
        </TabsList>
        <div className="mt-6">
          <TabsContent value="general">
            <TeamGeneralTab org={orgData} team={team} permissions={permissions}
              onUpdateTeam={(id, name) => setOrgData((prev: any) => prev ? { ...prev, teams: prev.teams.map((t: any) => t.id === id ? { ...t, name } : t) } : prev)}
            />
          </TabsContent>
          <TabsContent value="members">
            <TeamMembersTab org={orgData} team={team} initialTeamMembers={initialTeamMembers} permissions={permissions} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
