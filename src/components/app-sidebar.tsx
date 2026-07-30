import * as React from "react"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { LayoutDashboardIcon, ShieldIcon, Settings2Icon, CircleHelpIcon, CommandIcon } from "lucide-react"

const navMain = [
  {
    title: "Dashboard",
    url: "/",
    icon: <LayoutDashboardIcon />,
  },
  {
    title: "Admin",
    url: "/admin",
    icon: <ShieldIcon />,
  },
]

const navSecondary = [
  {
    title: "Settings",
    url: "/settings",
    icon: <Settings2Icon />,
  },
  {
    title: "Get Help",
    url: "#",
    icon: <CircleHelpIcon />,
  },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name: string
    email: string
    image?: string
  }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const navUser = {
    name: user?.name ?? "User",
    email: user?.email ?? "",
    avatar: user?.image ?? "",
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<a href="/" />}
            >
              <CommandIcon className="size-5!" />
              <span className="text-base font-semibold">Better Auth</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={navUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
