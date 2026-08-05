
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Trash, Loader2, KeyRound } from "lucide-react"

export interface ApiKeyData {
  id: string
  name: string
  prefix?: string
  start?: string
  createdAt: Date | string
  expiresAt?: Date | string | null
  lastRequest?: Date | string | null
  enabled?: boolean
}

interface ApiKeyListProps {
  apiKeys: ApiKeyData[]
  isLoading: boolean
  onRevoke: (id: string) => void
  onView: (apiKey: ApiKeyData) => void
  permissions?: { read: boolean; create: boolean; update: boolean; delete: boolean }
}

export function ApiKeyList({ apiKeys, isLoading, onRevoke, onView, permissions = { read: true, create: true, update: true, delete: true } }: ApiKeyListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 border rounded-md border-dashed">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading API Keys...</p>
      </div>
    )
  }

  if (apiKeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 border rounded-md border-dashed">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
          <KeyRound className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-medium">No API keys</h3>
          <p className="text-sm text-muted-foreground mt-1">
            You don't have any API keys yet. Create one to get started.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last Used</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apiKeys.map((key) => (
            <TableRow key={key.id}>
              <TableCell className="font-medium">{key.name}</TableCell>
              <TableCell className="font-mono text-muted-foreground">
                {key.prefix || key.start ? `${key.prefix || key.start}••••••••••••••••` : '••••••••••••••••'}
              </TableCell>
              <TableCell>
                <Badge variant={key.enabled ? "default" : "secondary"} className={key.enabled ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20" : ""}>
                  {key.enabled ? "Active" : "Disabled"}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(key.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {key.lastRequest 
                  ? new Date(key.lastRequest).toLocaleDateString()
                  : 'Never'}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(key)}>
                      View Details
                    </DropdownMenuItem>
                    {permissions.delete !== false && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                          onClick={() => onRevoke(key.id)}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Revoke Key
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
