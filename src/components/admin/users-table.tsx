import * as React from "react"
import { authClient } from "@/lib/auth-client"
import { DataTable } from "@/components/data-table"
import { UserActionsMenu } from "./user-actions-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react"
import type { AdminUser } from "./user-actions-menu"

export function UsersTable() {
  const [users, setUsers] = React.useState<AdminUser[]>([])
  const [total, setTotal] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(true)
  
  // Pagination and Filtering State
  const [page, setPage] = React.useState(1)
  const [limit] = React.useState(10)
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")


  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500)
    return () => clearTimeout(timer)
  }, [search])

  const fetchUsers = React.useCallback(async () => {
    setIsLoading(true)
    const offset = (page - 1) * limit
    
    // According to docs, listUsers takes a query object
    const query: any = {
      limit,
      offset,
      sortBy: "createdAt",
      sortDirection: "desc",
    }

    if (debouncedSearch) {
      query.searchValue = debouncedSearch
      query.searchField = "email"
      query.searchOperator = "contains"
    }

    const { data, error } = await authClient.admin.listUsers({ query })
    
    if (error) {
      toast.error(`Failed to load users: ${error.message}`)
    } else if (data) {
      setUsers(data.users || [])
      setTotal(data.total || 0)
    }
    setIsLoading(false)
  }, [page, limit, debouncedSearch])

  React.useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Reset page to 1 when search changes
  React.useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const columns = React.useMemo(() => [
    {
      accessorKey: "name",
      header: "User",
      cell: ({ row }: any) => {
        const user = row.original
        return (
          <a href={`/admin/users/${user.id}`} className="flex flex-col hover:bg-muted/50 p-1.5 -m-1.5 rounded-md transition-colors w-fit">
            <span className="font-medium text-foreground hover:underline">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </a>
        )
      }
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }: any) => {
        const role = row.original.role
        return (
          <Badge variant={role === "admin" ? "default" : "secondary"}>
            {role || "user"}
          </Badge>
        )
      }
    },
    {
      accessorKey: "banned",
      header: "Status",
      cell: ({ row }: any) => {
        const isBanned = row.original.banned
        return (
          <Badge variant={isBanned ? "destructive" : "outline"} className={!isBanned ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-900/50" : ""}>
            {isBanned ? "Banned" : "Active"}
          </Badge>
        )
      }
    },
    {
      accessorKey: "createdAt",
      header: "Joined",
      cell: ({ row }: any) => new Date(row.original.createdAt).toLocaleDateString()
    },

    {
      id: "actions",
      header: "",
      cell: ({ row }: any) => (
        <div className="flex justify-end">
          <UserActionsMenu user={row.original} onUpdated={fetchUsers} />
        </div>
      )
    }
  ], [fetchUsers])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/50"
          />
        </div>
      </div>

      <div className="relative rounded-md border bg-card text-card-foreground shadow-sm">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px] rounded-md">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <DataTable columns={columns} data={users} />
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Showing {users.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, total)} of {total} users
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <div className="text-sm font-medium px-2">
            Page {page} of {totalPages || 1}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isLoading}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

    </div>
  )
}
