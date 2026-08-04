import * as React from "react"
import { MoreHorizontal, UserCog, Ban, CheckCircle, Trash2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import type { User as BaseUser } from "better-auth"

export type AdminUser = BaseUser & {
  role?: string | null;
  banned?: boolean | null;
}

interface UserActionsMenuProps {
  user: AdminUser
  onUpdated: () => void
}

export function UserActionsMenu({ user, onUpdated }: UserActionsMenuProps) {
  const [isUpdating, setIsUpdating] = React.useState(false)


  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${user.email}? This cannot be undone.`)) return
    
    setIsUpdating(true)
    const { error } = await authClient.admin.removeUser({
      userId: user.id,
    })
    
    if (error) {
      toast.error(`Failed to delete user: ${error.message}`)
    } else {
      toast.success("User deleted successfully")
      onUpdated()
    }
    setIsUpdating(false)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger 
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0" 
        disabled={isUpdating}
      >
        <span className="sr-only">Open menu</span>
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => window.location.href = `/admin/users/${user.id}`}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          

        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600 focus:bg-red-100 dark:focus:bg-red-950">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete User
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
