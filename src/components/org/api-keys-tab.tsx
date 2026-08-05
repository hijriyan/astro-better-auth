
import { ApiKeysManager } from "../api-keys/api-keys-manager"
import type { OrgPermissions } from "@/lib/org-permissions"

interface ApiKeysTabProps {
  org: any
  permissions: OrgPermissions
}

export function ApiKeysTab({ org, permissions }: ApiKeysTabProps) {
  return (
    <div className="space-y-6">
      <ApiKeysManager
        configId="org-keys"
        organizationId={org.id}
        title="Organization API Keys"
        description="Manage API keys specifically scoped for this organization. These keys have access to organization resources."
        viewUrlPrefix={`/org/${org.slug}/api-keys`}
        permissions={permissions.apiKey}
      />
    </div>
  )
}
