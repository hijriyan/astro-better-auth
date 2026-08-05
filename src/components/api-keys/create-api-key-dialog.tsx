import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDownIcon, Loader2, Settings2Icon } from "lucide-react"
import { toast } from "sonner"
import { PermissionsBuilder } from "@/components/permissions-builder"
import { UnitConverter } from "@/components/ui/unit-converter"

interface CreateApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  configId: string
  organizationId?: string
  onCreated: (apiKey: string) => void
}

interface ServerOnlyFields {
  rateLimitEnabled: boolean
  rateLimitMax: string
  rateLimitTimeWindow: string
  remaining: string
  refillAmount: string
  refillInterval: string
  expiresIn: string
}

const EMPTY_SERVER: ServerOnlyFields = {
  rateLimitEnabled: false,
  rateLimitMax: "",
  rateLimitTimeWindow: "",
  remaining: "",
  refillAmount: "",
  refillInterval: "",
  expiresIn: "",
}

export function CreateApiKeyDialog({
  open,
  onOpenChange,
  configId,
  organizationId,
  onCreated,
}: CreateApiKeyDialogProps) {
  const [name, setName]         = React.useState("")
  const [permissions, setPerms] = React.useState<Record<string, string[]>>({})
  const [advanced, setAdvanced] = React.useState<ServerOnlyFields>(EMPTY_SERVER)
  const [showAdv, setShowAdv]   = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setName("")
      setPerms({})
      setAdvanced(EMPTY_SERVER)
      setShowAdv(false)
    }
  }, [open])

  const updateAdv = (patch: Partial<ServerOnlyFields>) =>
    setAdvanced((prev) => ({ ...prev, ...patch }))

  const onSubmit = async (e: any) => {
    e.preventDefault()
    if (!name.trim()) { toast.error("Please enter a name for the API key."); return }

    setIsLoading(true)
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        configId,
      }

      if (organizationId)                   body.organizationId  = organizationId
      if (Object.keys(permissions).length)  body.permissions     = permissions

      // server-only params — only include when non-empty
      body.rateLimitEnabled = advanced.rateLimitEnabled
      if (advanced.rateLimitEnabled) {
        if (advanced.rateLimitMax)         body.rateLimitMax        = Number(advanced.rateLimitMax)
        if (advanced.rateLimitTimeWindow)  body.rateLimitTimeWindow = Number(advanced.rateLimitTimeWindow)
      }
      if (advanced.remaining)     body.remaining      = Number(advanced.remaining)
      if (advanced.refillAmount)  body.refillAmount   = Number(advanced.refillAmount)
      if (advanced.refillInterval) body.refillInterval = Number(advanced.refillInterval)
      if (advanced.expiresIn)     body.expiresIn      = Number(advanced.expiresIn)

      const res = await fetch("/api/api-keys/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to create API key.")
        return
      }

      toast.success("API key created successfully")
      onCreated(data.key)
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      toast.error("An unexpected error occurred.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={onSubmit}>
          <DialogHeader className="mb-4">
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Generate a new key to authenticate requests. Copy it immediately — it won't be shown again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="key-name">Key Name <span className="text-destructive">*</span></Label>
              <Input
                id="key-name"
                placeholder="e.g. Production Frontend"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            {/* Permissions */}
            <PermissionsBuilder value={permissions} onChange={setPerms} />

            {/* Advanced (server-only) */}
            <Collapsible open={showAdv} onOpenChange={setShowAdv}>
              <CollapsibleTrigger
                className="flex w-full items-center justify-between text-sm text-muted-foreground hover:text-foreground py-1 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Settings2Icon className="w-3.5 h-3.5" />
                  Advanced settings
                </span>
                <ChevronDownIcon
                  className={`w-4 h-4 transition-transform ${showAdv ? "rotate-180" : ""}`}
                />
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-5 pt-3">
                <Separator />

                {/* Rate limit */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Rate Limiting</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Restrict how many requests per time window this key can make.
                      </p>
                    </div>
                    <Switch
                      checked={advanced.rateLimitEnabled}
                      onCheckedChange={(v) => updateAdv({ rateLimitEnabled: v })}
                    />
                  </div>

                  {advanced.rateLimitEnabled && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Max requests</Label>
                        <Input
                          type="number"
                          min={1}
                          placeholder="e.g. 1000"
                          value={advanced.rateLimitMax}
                          onChange={(e) => updateAdv({ rateLimitMax: e.target.value })}
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
                            value={advanced.rateLimitTimeWindow}
                            onChange={(e) => updateAdv({ rateLimitTimeWindow: e.target.value })}
                            className="h-8 text-sm"
                          />
                          <UnitConverter targetUnit="ms" allowedUnits={["seconds", "minutes", "hours", "days"]} onConvert={(val) => updateAdv({ rateLimitTimeWindow: String(val) })} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Quota & refill */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Quota &amp; Refill</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Remaining requests</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Unlimited"
                        value={advanced.remaining}
                        onChange={(e) => updateAdv({ remaining: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Refill amount</Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="e.g. 100"
                        value={advanced.refillAmount}
                        onChange={(e) => updateAdv({ refillAmount: e.target.value })}
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
                          value={advanced.refillInterval}
                          onChange={(e) => updateAdv({ refillInterval: e.target.value })}
                          className="h-8 text-sm"
                        />
                        <UnitConverter targetUnit="ms" allowedUnits={["seconds", "minutes", "hours", "days"]} onConvert={(val) => updateAdv({ refillInterval: String(val) })} />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Expiry */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Expiry</Label>
                  <p className="text-xs text-muted-foreground">
                    Seconds until this key expires. Leave blank for no expiry.
                  </p>
                  <div className="flex items-center gap-2 max-w-xs">
                    <Input
                      type="number"
                      min={60}
                      placeholder="e.g. 2592000 (30 days)"
                      value={advanced.expiresIn}
                      onChange={(e) => updateAdv({ expiresIn: e.target.value })}
                      className="h-8 text-sm"
                    />
                    <UnitConverter targetUnit="s" onConvert={(val) => updateAdv({ expiresIn: String(val) })} />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Create Key
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
