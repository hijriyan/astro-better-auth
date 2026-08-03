"use client"

import * as React from "react"
import { authClient } from "@/lib/auth-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BellIcon, MailIcon, CheckCircle2, XCircle, Loader2, InboxIcon } from "lucide-react"
import { toast } from "sonner"

type Invitation = {
  id: string
  email: string
  role: string
  organizationId: string
  organizationName: string
  inviterId: string
  teamId?: string | null
  status: string
  expiresAt: string
  createdAt: string
}

// Shared fetch helper — used by both NotificationsPage and useInvitationCount
async function fetchUserInvitations(): Promise<Invitation[]> {
  const { data, error } = await (authClient as any).$fetch(
    "/organization/list-user-invitations",
    { method: "GET" }
  ) as { data: Invitation[] | null; error: any }
  if (error) throw error
  return data || []
}

/**
 * Lightweight hook for badge count in NavUser.
 * Fetches once on mount — no polling.
 */
export function useInvitationCount() {
  const [count, setCount] = React.useState(0)

  React.useEffect(() => {
    fetchUserInvitations()
      .then((invs) => setCount(invs.length))
      .catch(() => setCount(0)) // silently fail — badge is non-critical
  }, [])

  return count
}

type InvitationItemState = "idle" | "accepting" | "rejecting" | "accepted" | "rejected"

function InvitationItem({
  invitation,
  onDone,
}: {
  invitation: Invitation
  onDone: (id: string) => void
}) {
  const [state, setState] = React.useState<InvitationItemState>("idle")

  const handleAccept = async () => {
    setState("accepting")
    const { error } = await authClient.organization.acceptInvitation({
      invitationId: invitation.id,
    })
    if (error) {
      toast.error(error.message || "Failed to accept invitation")
      setState("idle")
    } else {
      setState("accepted")
      toast.success(`You joined ${invitation.organizationName}`)
      setTimeout(() => onDone(invitation.id), 1200)
    }
  }

  const handleReject = async () => {
    setState("rejecting")
    const { error } = await authClient.organization.rejectInvitation({
      invitationId: invitation.id,
    })
    if (error) {
      toast.error(error.message || "Failed to reject invitation")
      setState("idle")
    } else {
      setState("rejected")
      toast.success("Invitation declined")
      setTimeout(() => onDone(invitation.id), 1200)
    }
  }

  const isProcessing = state === "accepting" || state === "rejecting"

  return (
    <div className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-card transition-opacity duration-300">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{invitation.organizationName}</span>
          <Badge variant="secondary" className="capitalize text-xs">{invitation.role}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Invited to join as <span className="capitalize font-medium">{invitation.role}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Expires {new Date(invitation.expiresAt).toLocaleDateString(undefined, {
            year: "numeric", month: "short", day: "numeric",
          })}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {state === "accepted" && (
          <div className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>Joined</span>
          </div>
        )}
        {state === "rejected" && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <XCircle className="h-4 w-4" />
            <span>Declined</span>
          </div>
        )}
        {state === "idle" && (
          <>
            <Button size="sm" variant="outline" onClick={handleReject} disabled={isProcessing}>
              Decline
            </Button>
            <Button size="sm" onClick={handleAccept} disabled={isProcessing}>
              Accept
            </Button>
          </>
        )}
        {isProcessing && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
      <InboxIcon className="h-10 w-10 opacity-30" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

function InvitationsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start justify-between gap-4 p-4 rounded-lg border">
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function NotificationsPage() {
  const [invitations, setInvitations] = React.useState<Invitation[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    fetchUserInvitations()
      .then(setInvitations)
      .catch((e) => {
        if (e?.status === 403) {
          setError("Email verification required to view invitations.")
        } else {
          setError(e?.message || "Failed to load invitations")
        }
      })
      .finally(() => setIsLoading(false))
  }, [])

  const handleDone = (id: string) => {
    setInvitations((prev) => prev.filter((inv) => inv.id !== id))
  }

  const renderInvitations = () => {
    if (isLoading) return <InvitationsSkeleton />
    if (error) return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <XCircle className="h-10 w-10 text-destructive opacity-60" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
    if (invitations.length === 0) return <EmptyState label="No pending invitations" />
    return (
      <div className="space-y-3">
        {invitations.map((inv) => (
          <InvitationItem key={inv.id} invitation={inv} onDone={handleDone} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
        <p className="text-muted-foreground">Stay up to date with your invitations and system updates.</p>
      </div>

      <Tabs defaultValue="invitations" className="w-full">
        <TabsList variant="line" className="w-full justify-start border-b rounded-none bg-transparent">
          <TabsTrigger value="invitations" className="flex items-center gap-2">
            <MailIcon className="h-4 w-4" />
            Invitations
            {!isLoading && invitations.length > 0 && (
              <Badge className="ml-1 h-5 min-w-5 px-1.5 text-xs">{invitations.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <BellIcon className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
          <TabsContent value="invitations">
            {renderInvitations()}
          </TabsContent>
          <TabsContent value="system">
            <EmptyState label="No system notifications" />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
