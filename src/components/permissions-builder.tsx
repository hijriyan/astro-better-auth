import * as React from "react"
import { Plus, X, ShieldIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Combobox,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxEmpty,
  ComboboxValue,
} from "@/components/ui/combobox"
import { statement } from "@/lib/permissions"

export interface PermissionsBuilderProps {
  value: Record<string, string[]>
  onChange: (value: Record<string, string[]>) => void
  emptyStateMessage?: React.ReactNode
}

interface PermissionRow {
  id: string
  resource: string
  actions: string[]
}

// Preset resources from the org statement — user can also type a custom resource
const PRESET_RESOURCES = Object.keys(statement)

// Actions available per preset resource; falls back to empty (user types custom actions)
const PRESET_ACTIONS: Record<string, string[]> = statement as unknown as Record<string, string[]>

function toRows(value: Record<string, string[]>): PermissionRow[] {
  return Object.entries(value).map(([resource, actions]) => ({
    id: crypto.randomUUID(),
    resource,
    actions,
  }))
}

function toRecord(rows: PermissionRow[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const row of rows) {
    const res = row.resource.trim()
    if (res && row.actions.length > 0) out[res] = row.actions
  }
  return out
}

export function PermissionsBuilder({ value, onChange, emptyStateMessage = "No permissions defined — this key will have unrestricted access." }: PermissionsBuilderProps) {
  const [rows, setRows] = React.useState<PermissionRow[]>(() =>
    Object.keys(value).length > 0 ? toRows(value) : []
  )

  // Push changes up whenever rows mutate
  const update = React.useCallback(
    (next: PermissionRow[]) => {
      setRows(next)
      onChange(toRecord(next))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange]
  )

  const addRow = () =>
    update([...rows, { id: crypto.randomUUID(), resource: "", actions: [] }])

  const removeRow = (id: string) =>
    update(rows.filter((r) => r.id !== id))

  const setResource = (id: string, resource: string) =>
    update(rows.map((r) => (r.id === id ? { ...r, resource, actions: [] } : r)))

  const setActions = (id: string, actions: string[]) =>
    update(rows.map((r) => (r.id === id ? { ...r, actions } : r)))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <ShieldIcon className="w-4 h-4 text-muted-foreground" />
          Permissions
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="w-3 h-3 mr-1.5" />
          Add Resource
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-5 text-center bg-muted/20">
          {emptyStateMessage}
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[200px]">Resource</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const presetActions = row.resource
                  ? (PRESET_ACTIONS[row.resource] ?? [])
                  : []
                const usedResources = rows
                  .filter((r) => r.id !== row.id)
                  .map((r) => r.resource)

                return (
                  <TableRow key={row.id}>
                    {/* Resource — preset dropdown OR free-text for custom resources */}
                    <TableCell className="align-top py-2">
                      <ResourceInput
                        value={row.resource}
                        onChange={(v) => setResource(row.id, v)}
                        disabledOptions={usedResources}
                      />
                    </TableCell>

                    {/* Actions — combobox when preset exists, tag-input otherwise */}
                    <TableCell className="align-top py-2">
                      {presetActions.length > 0 ? (
                        <Combobox
                          multiple
                          value={row.actions}
                          onValueChange={(actions: string[]) => setActions(row.id, actions)}
                        >
                          <ComboboxChips>
                            <ComboboxValue>
                              {row.actions.map((a) => (
                                <ComboboxChip key={a}>{a}</ComboboxChip>
                              ))}
                            </ComboboxValue>
                            <ComboboxChipsInput
                              placeholder={row.resource ? "Select actions…" : "Select resource first"}
                              disabled={!row.resource}
                            />
                          </ComboboxChips>
                          <ComboboxContent>
                            <ComboboxList>
                              {presetActions.length === 0 ? (
                                <ComboboxEmpty>No actions available.</ComboboxEmpty>
                              ) : (
                                presetActions.map((a) => (
                                  <ComboboxItem key={a} value={a}>
                                    {a}
                                  </ComboboxItem>
                                ))
                              )}
                            </ComboboxList>
                          </ComboboxContent>
                        </Combobox>
                      ) : (
                        <ActionTagInput
                          value={row.actions}
                          onChange={(actions) => setActions(row.id, actions)}
                          disabled={!row.resource}
                        />
                      )}
                    </TableCell>

                    <TableCell className="align-top py-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeRow(row.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

// ── Resource input ──────────────────────────────────────────────────────────
// Shows preset resources in a datalist dropdown; user can still type anything.
function ResourceInput({
  value,
  onChange,
  disabledOptions,
}: {
  value: string
  onChange: (v: string) => void
  disabledOptions: string[]
}) {
  const listId = React.useId()

  return (
    <>
      <Input
        list={listId}
        placeholder="Resource (e.g. files)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-mono text-sm h-9"
      />
      <datalist id={listId}>
        {PRESET_RESOURCES.filter((r) => !disabledOptions.includes(r)).map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
    </>
  )
}

// ── Action tag input ────────────────────────────────────────────────────────
// For custom (non-preset) resources: type an action and press Enter or comma.
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
    <div className="flex flex-wrap gap-1 min-h-9 items-center border rounded-md px-2 py-1 bg-background focus-within:ring-1 focus-within:ring-ring">
      {value.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="font-mono text-xs gap-1 pl-2 pr-1"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="hover:text-destructive"
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
        className="border-0 shadow-none focus-visible:ring-0 h-6 p-0 text-sm font-mono flex-1 min-w-[120px]"
      />
    </div>
  )
}
