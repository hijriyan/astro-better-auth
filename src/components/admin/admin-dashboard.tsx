
import { UsersTable } from "./users-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield } from "lucide-react"

export function AdminDashboard() {
  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in zoom-in-95 duration-300">
      <Card className="border-primary/10 shadow-sm bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-md text-primary">
              <Shield className="size-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Admin Dashboard</CardTitle>
              <CardDescription>
                Manage users and configure administrative settings.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <UsersTable />
        </CardContent>
      </Card>
    </div>
  )
}
