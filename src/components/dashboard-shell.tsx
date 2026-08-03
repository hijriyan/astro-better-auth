import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'

import type { BreadcrumbType } from '@/components/site-header'

interface DashboardShellProps {
  user: { name: string; email: string; image?: string }
  title: string
  breadcrumbs?: BreadcrumbType[]
  children?: React.ReactNode
}

export function DashboardShell({ user, title, breadcrumbs, children }: DashboardShellProps) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset>
          <SiteHeader title={title} breadcrumbs={breadcrumbs} />
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
