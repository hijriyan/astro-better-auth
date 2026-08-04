import * as React from "react"
import { authClient } from "@/lib/auth-client"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Trash2 } from "lucide-react"

interface SessionsTableProps {
  userId: string
}

export function SessionsTable({ userId }: SessionsTableProps) {
  const [sessions, setSessions] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchSessions = React.useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await authClient.admin.listUserSessions({
      userId,
    })
    
    if (error) {
      toast.error(`Failed to load sessions: ${error.message}`)
    } else {
      // The API doesn't seem to natively paginate listUserSessions based on the docs snippet,
      // but if it does return an array or object, we handle it.
      // Usually it returns just an array of sessions, or an object with { sessions }
      if (Array.isArray(data)) {
        setSessions(data)
      } else if (data && typeof data === 'object' && 'sessions' in data) {
        setSessions((data as any).sessions)
      } else {
        setSessions(data as any || [])
      }
    }
    setIsLoading(false)
  }, [userId])

  React.useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleRevokeSession = async (sessionToken: string) => {
    setIsLoading(true)
    // Revoking session API
    const { error } = await authClient.admin.revokeUserSession({
      sessionToken: sessionToken,
    })
    if (error) {
      toast.error(`Failed to revoke session: ${error.message}`)
    } else {
      toast.success("Session revoked")
      fetchSessions()
    }
    setIsLoading(false)
  }

  const columns = React.useMemo(() => [
    {
      accessorKey: "userAgent",
      header: "Device / Browser",
      cell: ({ row }: any) => {
        const ua = row.original.userAgent
        return (
          <div className="max-w-[200px] truncate" title={ua}>
            {ua || "Unknown Device"}
          </div>
        )
      }
    },
    {
      accessorKey: "ipAddress",
      header: "IP Address",
      cell: ({ row }: any) => row.original.ipAddress || "N/A"
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }: any) => new Date(row.original.createdAt).toLocaleString()
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={() => handleRevokeSession(row.original.token)}
          className="h-8"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Revoke
        </Button>
      )
    }
  ], [fetchSessions])

  const handleRevokeAllSessions = async () => {
    setIsLoading(true)
    const { error } = await authClient.admin.revokeUserSessions({
      userId,
    })
    if (error) {
      toast.error(`Failed to revoke all sessions: ${error.message}`)
    } else {
      toast.success("All sessions revoked")
      fetchSessions()
    }
    setIsLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button 
          variant="destructive" 
          onClick={handleRevokeAllSessions} 
          disabled={isLoading || sessions.length === 0}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Revoke All Sessions
        </Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DataTable columns={columns} data={sessions} />
      )}
    </div>
  )
}
