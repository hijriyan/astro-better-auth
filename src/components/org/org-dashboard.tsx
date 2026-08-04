"use client"

import * as React from "react"
import { authClient } from "@/lib/auth-client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GeneralTab } from "./general-tab"
import { MembersTab } from "./members-tab"
import { TeamsTab } from "./teams-tab"
import { InvitationsTab } from "./invitations-tab"
import { AccessControlTab } from "./access-control-tab"
import { ApiKeysTab } from "./api-keys-tab"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CircleAlert, SettingsIcon, UsersIcon, UsersRoundIcon, MailIcon, ShieldIcon, KeyIcon } from "lucide-react"
import { DEFAULT_PERMISSIONS, type OrgPermissions } from "@/lib/org-permissions"

interface OrgDashboardProps {
  slug: string
  initialOrg?: any
  initialRoles?: any[] | null
  permissions?: OrgPermissions
}

export function OrgDashboard({ slug, initialOrg, initialRoles, permissions = DEFAULT_PERMISSIONS }: OrgDashboardProps) {
  const [orgData, setOrgData] = React.useState<any>(initialOrg ?? null)
  const [isPending, setIsPending] = React.useState(!initialOrg)
  const [error, setError] = React.useState<any>(null)
  // Lifted roles state — shared between AccessControlTab, MembersTab, InvitationsTab
  const [customRoles, setCustomRoles] = React.useState<any[]>(initialRoles ?? [])

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

  // We should also set the active organization if it's not already active
  const { data: activeOrg } = authClient.useActiveOrganization()

  React.useEffect(() => {
    if (orgData && (!activeOrg || activeOrg.id !== orgData.id)) {
      authClient.organization.setActive({ organizationId: orgData.id }).catch(console.error)
    }
  }, [orgData, activeOrg])


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
          {error?.message || "Failed to load organization or organization not found."}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{orgData.name}</h2>
        <p className="text-muted-foreground">Manage your organization settings, members, and teams.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList variant="line" className="w-full justify-start border-b rounded-none bg-transparent overflow-x-auto flex-nowrap whitespace-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <TabsTrigger value="general">
            <SettingsIcon />
            General
          </TabsTrigger>
          <TabsTrigger value="members">
            <UsersIcon />
            Members
          </TabsTrigger>
          <TabsTrigger value="teams">
            <UsersRoundIcon />
            Teams
          </TabsTrigger>
          <TabsTrigger value="invitations">
            <MailIcon />
            Invitations
          </TabsTrigger>
          {permissions.apiKey.read && (
            <TabsTrigger value="api-keys">
              <KeyIcon />
              API Keys
            </TabsTrigger>
          )}
          {permissions.ac.read && (
            <TabsTrigger value="access-control">
              <ShieldIcon />
              Access Control
            </TabsTrigger>
          )}
        </TabsList>
        <div className="mt-6">
          <TabsContent value="general">
            <GeneralTab org={orgData} permissions={permissions} />
          </TabsContent>
          <TabsContent value="members">
            <MembersTab org={orgData} members={orgData.members} customRoles={customRoles} permissions={permissions} />
          </TabsContent>
          <TabsContent value="teams">
            <TeamsTab
              org={orgData}
              teams={orgData.teams || []}
              permissions={permissions}
              onAddTeam={(t) => setOrgData((prev: any) => prev ? { ...prev, teams: [...(prev.teams || []), t] } : prev)}
            />
          </TabsContent>
          <TabsContent value="invitations">
            <InvitationsTab org={orgData} invitations={orgData.invitations} customRoles={customRoles} permissions={permissions} />
          </TabsContent>
          {permissions.apiKey.read && (
            <TabsContent value="api-keys">
              <ApiKeysTab org={orgData} permissions={permissions} />
            </TabsContent>
          )}
          {permissions.ac.read && (
            <TabsContent value="access-control">
              <AccessControlTab org={orgData} initialRoles={initialRoles ?? undefined} onRolesChange={setCustomRoles} permissions={permissions} />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  )
}
