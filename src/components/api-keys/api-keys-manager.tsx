import * as React from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ApiKeyList, type ApiKeyData } from "./api-key-list"
import { CreateApiKeyDialog } from "./create-api-key-dialog"
import { ApiKeyDisplayDialog } from "./api-key-display-dialog"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"

interface ApiKeysManagerProps {
  configId: string
  organizationId?: string
  title?: string
  description?: string
  viewUrlPrefix: string
  permissions?: { read: boolean; create: boolean; update: boolean; delete: boolean }
}

export function ApiKeysManager(props: ApiKeysManagerProps) {
  const { 
    configId, 
    organizationId,
    title = "API Keys",
    description = "Manage your API keys for authenticating requests.",
    permissions = { read: true, create: true, update: true, delete: true }
  } = props
  const [apiKeys, setApiKeys] = React.useState<ApiKeyData[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [displayDialogOpen, setDisplayDialogOpen] = React.useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = React.useState("")

  const fetchApiKeys = React.useCallback(async () => {
    setIsLoading(true)
    try {
      // We pass the configId so we only fetch keys for this specific config (User vs Org)
      // @ts-ignore - The better-auth types might not fully infer the options based on configId yet
      const { data, error } = await authClient.apiKey.list({
        query: {
          configId,
          ...(organizationId ? { organizationId } : {})
        }
      })
      
      if (error) {
        toast.error("Failed to load API keys.")
        console.error(error)
        return
      }
      
      if (data) {
        // @ts-ignore
        const keysArray: any[] = Array.isArray(data) ? data : data.apiKeys || data.data || []
        
        // We filter by referenceId if organizationId is provided to ensure we only show keys for this org
        const filteredKeys = organizationId 
          ? keysArray.filter(key => key.referenceId === organizationId)
          : keysArray
          
        setApiKeys(filteredKeys as unknown as ApiKeyData[])
      }
    } catch (err) {
      console.error(err)
      toast.error("An unexpected error occurred.")
    } finally {
      setIsLoading(false)
    }
  }, [configId, organizationId])

  React.useEffect(() => {
    fetchApiKeys()
  }, [fetchApiKeys])

  const handleKeyCreated = (key: string) => {
    setNewlyCreatedKey(key)
    setDisplayDialogOpen(true)
    fetchApiKeys() // Refresh the list
  }

  const handleView = (key: ApiKeyData) => {
    window.location.href = `${props.viewUrlPrefix}/${key.id}`
  }

  const handleRevoke = async (id: string) => {
    try {
      const { error } = await authClient.apiKey.delete({ 
        keyId: id,
        configId,
      })
      
      if (error) {
        toast.error(error.message || "Failed to revoke API key.")
        return
      }
      
      toast.success("API key revoked successfully")
      fetchApiKeys() // Refresh the list
    } catch (err) {
      console.error(err)
      toast.error("An unexpected error occurred.")
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {permissions.create !== false && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Key
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ApiKeyList 
          apiKeys={apiKeys} 
          isLoading={isLoading} 
          onRevoke={handleRevoke}
          onView={handleView}
          permissions={permissions}
        />
      </CardContent>

      <CreateApiKeyDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
        configId={configId}
        organizationId={organizationId}
        onCreated={handleKeyCreated}
      />

      <ApiKeyDisplayDialog
        open={displayDialogOpen}
        onOpenChange={setDisplayDialogOpen}
        apiKey={newlyCreatedKey}
      />
    </Card>
  )
}
