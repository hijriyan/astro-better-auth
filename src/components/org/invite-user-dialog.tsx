"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Combobox,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxValue,
} from "@/components/ui/combobox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const STATIC_ROLES = ["owner", "admin", "member"] as const

// Separate component so we can wire up the anchor ref cleanly
function TeamCombobox({
  teams,
  value,
  onChange,
}: {
  teams: any[]
  value: string[]
  onChange: (vals: string[]) => void
}) {
  const chipsRef = React.useRef<HTMLDivElement>(null)

  return (
    <Combobox multiple value={value} onValueChange={onChange}>
      <ComboboxChips ref={chipsRef}>
        <ComboboxValue>
          {value.map((id) => {
            const name = teams.find((t: any) => t.id === id)?.name ?? id
            return <ComboboxChip key={id}>{name}</ComboboxChip>
          })}
        </ComboboxValue>
        <ComboboxChipsInput placeholder={value.length === 0 ? "Search teams..." : ""} />
      </ComboboxChips>
      <ComboboxContent anchor={chipsRef}>
        <ComboboxList>
          {teams.map((t: any) => (
            <ComboboxItem key={t.id} value={t.id}>
              {t.name}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

interface InviteUserDialogProps {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  customRoles?: any[]
  teams?: any[]
  onSuccess: (invitation: any) => void
  onOptimisticStart: (invitation: any) => void
  onOptimisticRevert: (id: string) => void
}

export function InviteUserDialog({
  orgId,
  open,
  onOpenChange,
  customRoles = [],
  teams = [],
  onSuccess,
  onOptimisticStart,
  onOptimisticRevert,
}: InviteUserDialogProps) {
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState("member")
  const [teamIds, setTeamIds] = React.useState<string[]>([])
  const [isInviting, setIsInviting] = React.useState(false)

  const hasTeams = teams.length > 0

  const allRoles = React.useMemo(() => {
    const customRoleNames = customRoles.map((r: any) => r.role || r.name).filter(Boolean)
    return [...STATIC_ROLES, ...customRoleNames]
  }, [customRoles])

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setEmail("")
      setRole("member")
      setTeamIds([])
    }
  }, [open])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setIsInviting(true)

    const resolvedTeamIds = teamIds.length > 0 ? teamIds : undefined
    const resolvedTeamNames = resolvedTeamIds
      ?.map((id) => teams.find((t: any) => t.id === id)?.name ?? id)

    const optimisticId = `temp-${Date.now()}`
    const optimisticInv = {
      id: optimisticId,
      email,
      role,
      status: "pending",
      organizationId: orgId,
      teamId: resolvedTeamIds ? resolvedTeamIds.join(",") : undefined,
      teamNames: resolvedTeamNames,
    }

    onOptimisticStart(optimisticInv)
    onOpenChange(false)

    const { data, error } = await authClient.organization.inviteMember({
      email,
      role: role as any,
      organizationId: orgId,
      ...(resolvedTeamIds ? { teamId: resolvedTeamIds } : {}),
    })

    if (error) {
      toast.error(error.message || "Failed to invite member")
      onOptimisticRevert(optimisticId)
      onOpenChange(true)
    } else {
      toast.success("Invitation sent successfully")
      onSuccess({ ...optimisticInv, id: optimisticId, data })
    }
    setIsInviting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Send an invitation email to a new member to join your organization.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleInvite} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              placeholder="user@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">The invitation will be sent to this email address.</p>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(val) => setRole(val || "member")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {allRoles.map((r) => {
                  const isCustom = !STATIC_ROLES.includes(r as any)
                  return (
                    <SelectItem key={r} value={r}>
                      <div className="flex items-center gap-2">
                        <span className="capitalize">{r}</span>
                        {isCustom && (
                          <Badge variant="secondary" className="text-xs py-0 px-1.5">
                            custom
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Determines what the member can do in this organization.</p>
          </div>

          {hasTeams && (
            <div className="space-y-2">
              <Label>
                Teams{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <TeamCombobox teams={teams} value={teamIds} onChange={setTeamIds} />
              <p className="text-xs text-muted-foreground">Member will be added to all selected teams upon accepting the invitation.</p>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="mr-2">
              Cancel
            </Button>
            <Button type="submit" disabled={isInviting}>
              {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invitation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
