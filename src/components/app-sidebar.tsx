import * as React from "react"
import { NavMain } from "@/components/nav-main"
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
import { LayoutDashboardIcon, CommandIcon, BuildingIcon, PlusIcon, SettingsIcon, KeyIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { authClient } from "@/lib/auth-client"
import { OrgForm } from "@/components/org-form"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name: string
    email: string
    image?: string
  }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const [createOrgOpen, setCreateOrgOpen] = React.useState(false)
  const { data: organizations } = authClient.useListOrganizations()

  const orgItems = organizations?.map((org) => ({
    title: org.name,
    url: `/org/${org.slug}`,
  })) ?? []

  const navMain = [
    {
      title: "Dashboard",
      url: "/",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Organization",
      url: "#",
      icon: <BuildingIcon />,
      isActive: true,
      items: [
        ...orgItems,
        {
          title: "Create New",
          icon: <PlusIcon className="w-3 h-3" />,
          isAction: true,
          onClick: () => setCreateOrgOpen(true),
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: <SettingsIcon />,
      items: [
        {
          title: "API Keys",
          url: "/settings/api-keys",
          icon: <KeyIcon className="w-3 h-3" />,
        },
      ],
    },
  ]

  const navUser = {
    name: user?.name ?? "User",
    email: user?.email ?? "",
    avatar: user?.image ?? "",
  }

  return (
    <>
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
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={navUser} />
        </SidebarFooter>
      </Sidebar>
      <Dialog open={createOrgOpen} onOpenChange={setCreateOrgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
            <DialogDescription>
              Add a new organization to manage your projects.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <OrgForm onSuccess={() => setCreateOrgOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AppSidebar
