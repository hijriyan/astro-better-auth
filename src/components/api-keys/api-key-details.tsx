import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  CopyIcon,
  CheckIcon,
  Loader2,
  PencilIcon,
  KeyRoundIcon,
  ShieldIcon,
  ClockIcon,
  ActivityIcon,
  CalendarIcon,
  HashIcon,
  GaugeIcon,
  RefreshCwIcon,
  TimerIcon,
  InfinityIcon,
} from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import { PermissionsBuilder } from "@/components/permissions-builder"
import { UnitConverter } from "@/components/ui/unit-converter"

interface ApiKeyDetailsProps {
  apiKeyId: string
  configId: string
  organizationId?: string
  canUpdate?: boolean
}

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(ms: number) {
  if (ms >= 86_400_000) return `${Math.round(ms / 86_400_000)}d`
  if (ms >= 3_600_000)  return `${Math.round(ms / 3_600_000)}h`
  if (ms >= 60_000)     return `${Math.round(ms / 60_000)}m`
  if (ms >= 1_000)      return `${Math.round(ms / 1_000)}s`
  return `${ms}ms`
}

function formatCompactNumber(num: number) {
  return Intl.NumberFormat(undefined, {
    notation: "compact",
    compactDisplay: "short",
  }).format(num)
}

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  muted,
}: {
  label: string
  value: React.ReactNode
  icon: React.ElementType
  sub?: string
  muted?: boolean
}) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wide">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className={`text-xl font-semibold leading-none ${muted ? "text-muted-foreground" : ""}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}

function SectionHeading({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
      <Icon className="w-3.5 h-3.5" />
      {children}
    </h4>
  )
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = React.useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={copy}>
      {copied
        ? <><CheckIcon className="w-3 h-3 text-emerald-500" /> Copied</>
        : <><CopyIcon className="w-3 h-3" /> {label ?? "Copy"}</>}
    </Button>
  )
}

// ── component ─────────────────────────────────────────────────────────────────

export function ApiKeyDetails({ apiKeyId, configId, organizationId, canUpdate = true }: ApiKeyDetailsProps) {
  const [apiKey, setApiKey] = React.useState<any | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  // edit state
  const [isEditing, setIsEditing]         = React.useState(false)
  const [editName, setEditName]           = React.useState("")
  const [editEnabled, setEditEnabled]     = React.useState(true)
  const [editPerms, setEditPerms]         = React.useState<Record<string, string[]>>({})
  // server-only edit fields
  const [editRateLimitEnabled, setEditRateLimitEnabled]     = React.useState(false)
  const [editRateLimitMax, setEditRateLimitMax]             = React.useState("")
  const [editRateLimitWindow, setEditRateLimitWindow]       = React.useState("")
  const [editRemaining, setEditRemaining]                   = React.useState("")
  const [editRefillAmount, setEditRefillAmount]             = React.useState("")
  const [editRefillInterval, setEditRefillInterval]         = React.useState("")
  const [editExpiresIn, setEditExpiresIn]                   = React.useState("")

  const [isSaving, setIsSaving] = React.useState(false)

  const fetchKey = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await authClient.apiKey.get({ query: { id: apiKeyId, configId } })
      if (error) { toast.error("Failed to load API key details."); return }
      if (data) {
        setApiKey(data)
        resetEditState(data)
      }
    } catch { toast.error("An unexpected error occurred.") }
    finally { setIsLoading(false) }
  }, [apiKeyId, configId])

  React.useEffect(() => { fetchKey() }, [fetchKey])

  function resetEditState(k: any) {
    setEditName(k.name ?? "")
    setEditEnabled(k.enabled ?? true)
    setEditPerms(k.permissions ?? {})
    setEditRateLimitEnabled(k.rateLimitEnabled ?? false)
    setEditRateLimitMax(k.rateLimitMax != null ? String(k.rateLimitMax) : "")
    setEditRateLimitWindow(k.rateLimitTimeWindow != null ? String(k.rateLimitTimeWindow) : "")
    setEditRemaining(k.remaining != null ? String(k.remaining) : "")
    setEditRefillAmount(k.refillAmount != null ? String(k.refillAmount) : "")
    setEditRefillInterval(k.refillInterval != null ? String(k.refillInterval) : "")
    setEditExpiresIn("")
  }

  const cancelEdit = () => {
    setIsEditing(false)
    resetEditState(apiKey)
  }

  const handleSave = async () => {
    if (!apiKey) return
    setIsSaving(true)
    try {
      const body: Record<string, unknown> = {
        configId,
        keyId: apiKey.id,
        name: editName.trim(),
        enabled: editEnabled,
        permissions: Object.keys(editPerms).length > 0 ? editPerms : null,
        rateLimitEnabled: editRateLimitEnabled,
      }

      if (editRateLimitEnabled) {
        if (editRateLimitMax)    body.rateLimitMax         = Number(editRateLimitMax)
        if (editRateLimitWindow) body.rateLimitTimeWindow  = Number(editRateLimitWindow)
      }
      if (editRemaining)     body.remaining      = Number(editRemaining)
      if (editRefillAmount)  body.refillAmount   = Number(editRefillAmount)
      if (editRefillInterval) body.refillInterval = Number(editRefillInterval)
      if (editExpiresIn)     body.expiresIn      = Number(editExpiresIn)

      const res = await fetch("/api/api-keys/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || "Failed to update API key.")
        return
      }

      toast.success("API key updated successfully")
      setIsEditing(false)
      fetchKey()
    } catch { toast.error("An unexpected error occurred.") }
    finally { setIsSaving(false) }
  }

  // ── loading / not found ─────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading key details…</p>
      </div>
    )
  }

  if (!apiKey) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-4 border rounded-xl border-dashed">
        <KeyRoundIcon className="h-10 w-10 text-muted-foreground" />
        <h3 className="text-lg font-semibold">API Key Not Found</h3>
        <p className="text-sm text-muted-foreground">This key does not exist or has been revoked.</p>
      </div>
    )
  }

  const hasPermissions = apiKey.permissions && Object.keys(apiKey.permissions).length > 0
  const hasRateLimit   = apiKey.rateLimitEnabled

  // ── view mode ────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-11 h-11 rounded-full bg-primary/10 text-primary shrink-0">
            <KeyRoundIcon className="w-5 h-5" />
          </div>
          <div>
            {isEditing ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="max-w-xs font-semibold text-base h-9"
                placeholder="Key name"
              />
            ) : (
              <h1 className="text-xl font-semibold tracking-tight">
                {apiKey.name || "Unnamed Key"}
              </h1>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {organizationId ? "Organization-scoped key" : "Personal key"} · {configId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isEditing && (
            <>
              <Badge
                variant={apiKey.enabled ? "default" : "secondary"}
                className={apiKey.enabled
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
                  : ""}
              >
                {apiKey.enabled ? "Active" : "Disabled"}
              </Badge>
              {canUpdate && (
                <Button size="sm" onClick={() => setIsEditing(true)}>
                  <PencilIcon className="w-3.5 h-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Edit panel ── */}
      {isEditing && (
        <div className="rounded-xl border bg-card flex flex-col">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">Update Settings</h3>
            <p className="text-sm text-muted-foreground">
              Modify the configuration and permissions for this API key.
            </p>
          </div>
          
          <div className="p-6 space-y-6">

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Active</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Disabled keys are rejected on every request.
              </p>
            </div>
            <Switch checked={editEnabled} onCheckedChange={setEditEnabled} />
          </div>

          <Separator />

          {/* Rate limit */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Rate Limiting</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Limit requests per time window for this key.
                </p>
              </div>
              <Switch checked={editRateLimitEnabled} onCheckedChange={setEditRateLimitEnabled} />
            </div>
            {editRateLimitEnabled && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Max requests</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g. 1000"
                    value={editRateLimitMax}
                    onChange={(e) => setEditRateLimitMax(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Time window (ms)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1000}
                      placeholder="e.g. 3600000"
                      value={editRateLimitWindow}
                      onChange={(e) => setEditRateLimitWindow(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <UnitConverter targetUnit="ms" allowedUnits={["seconds", "minutes", "hours", "days"]} onConvert={(val) => setEditRateLimitWindow(String(val))} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Quota / refill */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Quota &amp; Refill</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Remaining requests</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Unlimited"
                  value={editRemaining}
                  onChange={(e) => setEditRemaining(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Refill amount</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 100"
                  value={editRefillAmount}
                  onChange={(e) => setEditRefillAmount(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Refill interval (ms)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1000}
                    placeholder="e.g. 86400000"
                    value={editRefillInterval}
                    onChange={(e) => setEditRefillInterval(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <UnitConverter targetUnit="ms" allowedUnits={["seconds", "minutes", "hours", "days"]} onConvert={(val) => setEditRefillInterval(String(val))} />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Expiry */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Extend expiry</Label>
            <p className="text-xs text-muted-foreground">Seconds from now until the key expires. Leave blank to keep the current value.</p>
            <div className="flex items-center gap-2 max-w-xs">
              <Input
                type="number"
                min={60}
                placeholder="e.g. 2592000 (30 days)"
                value={editExpiresIn}
                onChange={(e) => setEditExpiresIn(e.target.value)}
                className="h-8 text-sm"
              />
              <UnitConverter targetUnit="s" onConvert={(val) => setEditExpiresIn(String(val))} />
            </div>
          </div>

          <Separator />

          {/* Permissions */}
          <PermissionsBuilder value={editPerms} onChange={setEditPerms} />
          </div>

          <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={cancelEdit} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !editName.trim()}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>
      )}

      {/* ── Identity ── */}
      <section className="space-y-3">
        <SectionHeading icon={HashIcon}>Identity</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-2">Key ID</p>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm truncate" title={apiKey.id}>{apiKey.id}</span>
              <CopyButton text={apiKey.id} />
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-2">Prefix / Hint</p>
            <span className="font-mono text-sm">{apiKey.start || apiKey.prefix || "—"}</span>
          </div>
        </div>
      </section>

      {/* ── Usage & Limits ── */}
      <section className="space-y-3">
        <SectionHeading icon={GaugeIcon}>Usage &amp; Limits</SectionHeading>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={GaugeIcon}
            label="Rate limit"
            value={hasRateLimit ? `${apiKey.rateLimitMax} req` : "Off"}
            sub={hasRateLimit && apiKey.rateLimitTimeWindow ? `per ${fmt(apiKey.rateLimitTimeWindow)}` : undefined}
            muted={!hasRateLimit}
          />
          <StatCard
            icon={ActivityIcon}
            label="Total requests"
            value={formatCompactNumber(apiKey.requestCount ?? 0)}
          />
          <StatCard
            icon={InfinityIcon}
            label="Remaining"
            value={apiKey.remaining != null ? apiKey.remaining : "∞"}
            muted={apiKey.remaining == null}
          />
          <StatCard
            icon={RefreshCwIcon}
            label="Refill"
            value={
              apiKey.refillAmount && apiKey.refillInterval
                ? `+${apiKey.refillAmount}`
                : "None"
            }
            sub={
              apiKey.refillAmount && apiKey.refillInterval
                ? `every ${fmt(apiKey.refillInterval)}`
                : undefined
            }
            muted={!apiKey.refillAmount}
          />
        </div>
      </section>

      {/* ── Permissions ── */}
      <section className="space-y-3">
        <SectionHeading icon={ShieldIcon}>Permissions</SectionHeading>
        {hasPermissions ? (
          <div className="rounded-xl border bg-card divide-y overflow-hidden">
            {Object.entries(apiKey.permissions as Record<string, string[]>).map(([resource, actions]) => (
              <div key={resource} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
                <span className="font-mono text-sm font-medium">{resource}</span>
                <div className="flex flex-wrap gap-1.5">
                  {actions.map((action) => (
                    <Badge key={action} variant="outline" className="font-mono text-xs bg-muted/40">
                      {action}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed bg-muted/20 p-5 text-center text-sm text-muted-foreground">
            No permissions configured — key has unrestricted access.
          </div>
        )}
      </section>

      {/* ── Timeline ── */}
      <section className="space-y-3">
        <SectionHeading icon={ClockIcon}>Timeline</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarIcon className="w-3.5 h-3.5" /> Created
            </div>
            <p className="text-sm font-medium">{new Date(apiKey.createdAt).toLocaleString()}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ActivityIcon className="w-3.5 h-3.5" /> Last used
            </div>
            <p className="text-sm font-medium">
              {apiKey.lastRequest ? new Date(apiKey.lastRequest).toLocaleString() : "Never"}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TimerIcon className="w-3.5 h-3.5" /> Expires
            </div>
            <p className="text-sm font-medium">
              {apiKey.expiresAt ? new Date(apiKey.expiresAt).toLocaleString() : "Never"}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
