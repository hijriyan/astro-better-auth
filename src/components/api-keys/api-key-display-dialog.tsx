import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, Copy, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ApiKeyDisplayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKey: string
}

export function ApiKeyDisplayDialog({ open, onOpenChange, apiKey }: ApiKeyDisplayDialogProps) {
  const [copied, setCopied] = React.useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>API Key Created</DialogTitle>
          <DialogDescription>
            Your new API key has been successfully generated.
          </DialogDescription>
        </DialogHeader>
        
        <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-800/50 mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription className="text-yellow-700 dark:text-yellow-300">
            Please copy this key and save it somewhere safe. For security reasons, <strong>we will not show it to you again</strong>.
          </AlertDescription>
        </Alert>

        <div className="flex items-center space-x-2 mt-4">
          <Input 
            readOnly 
            value={apiKey} 
            className="font-mono text-sm bg-muted text-muted-foreground flex-1"
          />
          <Button type="button" size="icon" onClick={copyToClipboard} variant="secondary">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            <span className="sr-only">Copy</span>
          </Button>
        </div>

        <DialogFooter className="mt-6">
          <Button type="button" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            I've copied it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
