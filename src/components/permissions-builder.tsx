import * as React from "react"
import { Plus, X, ShieldIcon, ChevronDown, ChevronRight } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { statement } from "@/lib/permissions"

export interface PermissionsBuilderProps {
  value: Record<string, string[]>
  onChange: (value: Record<string, string[]>) => void
  emptyStateMessage?: React.ReactNode // kept for API compatibility, though less relevant now
}

// Preset resources from the org statement
const PRESET_RESOURCES = Object.keys(statement)
const PRESET_ACTIONS: Record<string, string[]> = statement as unknown as Record<string, string[]>

export function PermissionsBuilder({ value, onChange }: PermissionsBuilderProps) {
  const [customRows, setCustomRows] = React.useState<{ id: string; resource: string; actions: string[] }[]>(() => {
    return Object.keys(value)
      .filter((res) => !PRESET_RESOURCES.includes(res))
      .map((res) => ({ id: crypto.randomUUID(), resource: res, actions: value[res] }))
  })

  const emitChange = React.useCallback(
    (newCustomRows: typeof customRows, newPresetValues: Record<string, string[]>) => {
      const out: Record<string, string[]> = { ...newPresetValues }
      for (const row of newCustomRows) {
        const res = row.resource.trim()
        if (res && row.actions.length > 0) {
          out[res] = row.actions
        }
      }
      onChange(out)
    },
    [onChange]
  )

  const togglePresetAction = (resource: string, action: string, checked: boolean) => {
    const currentActions = value[resource] || []
    const newActions = checked ? [...currentActions, action] : currentActions.filter((a) => a !== action)

    const cleanPresets: Record<string, string[]> = {}
    for (const r of PRESET_RESOURCES) {
      if (value[r]) cleanPresets[r] = value[r]
    }

    if (newActions.length > 0) {
      cleanPresets[resource] = newActions
    } else {
      delete cleanPresets[resource]
    }

    emitChange(customRows, cleanPresets)
  }

  const addCustomRow = () => {
    setCustomRows([...customRows, { id: crypto.randomUUID(), resource: "", actions: [] }])
  }

  const removeCustomRow = (id: string) => {
    const next = customRows.filter((r) => r.id !== id)
    setCustomRows(next)

    const cleanPresets: Record<string, string[]> = {}
    for (const r of PRESET_RESOURCES) {
      if (value[r]) cleanPresets[r] = value[r]
    }
    emitChange(next, cleanPresets)
  }

  const updateCustomRow = (id: string, updates: Partial<(typeof customRows)[0]>) => {
    const next = customRows.map((r) => (r.id === id ? { ...r, ...updates } : r))
    setCustomRows(next)

    const cleanPresets: Record<string, string[]> = {}
    for (const r of PRESET_RESOURCES) {
      if (value[r]) cleanPresets[r] = value[r]
    }
    emitChange(next, cleanPresets)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <ShieldIcon className="w-4 h-4 text-muted-foreground" />
            Core Permissions
          </Label>
        </div>
        <div className="border rounded-md">
          {PRESET_RESOURCES.map((resource) => (
            <PermissionRow
              key={resource}
              resource={resource}
              actions={PRESET_ACTIONS[resource]}
              selectedActions={value[resource] || []}
              onToggleAction={(action, checked) => togglePresetAction(resource, action, checked)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Custom Permissions</Label>
          <Button type="button" variant="outline" size="sm" onClick={addCustomRow}>
            <Plus className="w-3 h-3 mr-1.5" />
            Add Custom
          </Button>
        </div>
        {customRows.length > 0 ? (
          <div className="border rounded-md">
            {customRows.map((row) => (
              <CustomPermissionRow
                key={row.id}
                row={row}
                onChange={(updates) => updateCustomRow(row.id, updates)}
                onRemove={() => removeCustomRow(row.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-5 text-center bg-muted/20">
            No custom permissions defined.
          </div>
        )}
      </div>
    </div>
  )
}

function PermissionRow({
  resource,
  actions,
  selectedActions,
  onToggleAction,
}: {
  resource: string
  actions: string[]
  selectedActions: string[]
  onToggleAction: (action: string, checked: boolean) => void
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b last:border-b-0">
      <div className="flex items-center justify-between p-3 sm:p-4 hover:bg-muted/30 transition-colors">
        <div 
          className="flex flex-col gap-1.5 min-w-0 pr-4 flex-1 cursor-pointer"
          onClick={() => setOpen(!open)}
        >
          <h4 className="text-sm font-medium capitalize truncate select-none">{resource}</h4>
          {!open && selectedActions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedActions.map((a) => (
                <Badge key={a} variant="secondary" className="text-[10px] px-1.5 py-0 h-4.5 rounded-sm">
                  {a}
                </Badge>
              ))}
            </div>
          )}
          {!open && selectedActions.length === 0 && (
            <p className="text-xs text-muted-foreground">No permissions</p>
          )}
        </div>
        <CollapsibleTrigger
          className={buttonVariants({ variant: "ghost", size: "sm", className: "w-8 h-8 p-0 shrink-0" })}
        >
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="px-3 sm:px-4 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t mt-1">
          {actions.map((action) => (
            <label key={action} className="flex items-center gap-2.5 text-sm cursor-pointer group">
              <Checkbox
                checked={selectedActions.includes(action)}
                onCheckedChange={(c) => onToggleAction(action, !!c)}
                className="transition-colors group-hover:border-primary"
              />
              <span className="capitalize">{action}</span>
            </label>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function CustomPermissionRow({
  row,
  onChange,
  onRemove,
}: {
  row: { id: string; resource: string; actions: string[] }
  onChange: (updates: Partial<{ resource: string; actions: string[] }>) => void
  onRemove: () => void
}) {
  const [open, setOpen] = React.useState(true)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b last:border-b-0">
      <div className="flex items-start justify-between p-3 sm:p-4 hover:bg-muted/30 transition-colors">
        <div 
          className="flex flex-col gap-1.5 flex-1 min-w-0 pr-4 cursor-pointer"
          onClick={(e) => {
            if ((e.target as HTMLElement).tagName === 'INPUT') return
            setOpen(!open)
          }}
        >
          {open ? (
            <Input
              placeholder="Resource name (e.g. billing)"
              value={row.resource}
              onChange={(e) => onChange({ resource: e.target.value })}
              className="h-8 max-w-[200px] text-sm"
            />
          ) : (
            <>
              <h4 className="text-sm font-medium truncate select-none">{row.resource || "Unnamed resource"}</h4>
              {row.actions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {row.actions.map((a) => (
                    <Badge key={a} variant="secondary" className="text-[10px] px-1.5 py-0 h-4.5 rounded-sm">
                      {a}
                    </Badge>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <X className="w-4 h-4" />
          </Button>
          <CollapsibleTrigger
            className={buttonVariants({ variant: "ghost", size: "sm", className: "w-8 h-8 p-0" })}
          >
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent className="px-3 sm:px-4 pb-4">
        <div className="pt-3 border-t mt-1">
          <Label className="text-xs text-muted-foreground mb-2 block">Actions</Label>
          <ActionTagInput value={row.actions} onChange={(actions) => onChange({ actions })} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function ActionTagInput({
  value,
  onChange,
  disabled,
}: {
  value: string[]
  onChange: (v: string[]) => void
  disabled?: boolean
}) {
  const [input, setInput] = React.useState("")

  const commit = () => {
    const trimmed = input.trim().replace(/,$/, "")
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput("")
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      commit()
    } else if (e.key === "Backspace" && input === "" && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 min-h-9 items-center border rounded-md px-2.5 py-1.5 bg-background focus-within:ring-1 focus-within:ring-ring">
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="font-mono text-xs gap-1 pl-2 pr-1 h-6">
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="hover:text-destructive shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        disabled={disabled}
        placeholder={disabled ? "Select resource first" : "Type action, press Enter"}
        className="border-0 shadow-none focus-visible:ring-0 h-6 p-0 text-sm font-mono flex-1 min-w-[140px]"
      />
    </div>
  )
}
