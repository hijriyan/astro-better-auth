"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CircleAlert } from "lucide-react"
import { authClient } from "@/lib/auth-client"

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Team name must be at least 2 characters.",
  }),
})

export function TeamForm({ 
  orgId,
  onSuccess,
  initialData,
  readOnly = false,
}: { 
  orgId: string;
  onSuccess?: (data?: any) => void;
  initialData?: { id: string; name: string };
  readOnly?: boolean;
}) {
  const isUpdate = !!initialData
  const [isPending, setIsPending] = React.useState(false)
  const [error, setError] = React.useState<{ message: string; code?: string } | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsPending(true)
    setError(null)
    try {
      let apiError
      if (isUpdate && initialData) {
        // ponytail: updateTeam/addTeamMember are not yet in organizationClient getActions types
        // but exist at runtime via the $fetch proxy. Remove cast when better-auth adds them.
        const result = await (authClient.organization as any).updateTeam({
          teamId: initialData.id,
          data: {
            name: values.name,
          }
        })
        apiError = result.error
        
        if (!apiError) {
          toast.success("Team updated successfully!")
          form.reset({ name: values.name })
          onSuccess?.({ id: initialData.id, name: values.name })
          return
        }
      } else {
        const result = await (authClient.organization as any).createTeam({
          name: values.name,
          organizationId: orgId,
        })
        apiError = result.error
        
        if (!apiError && result.data?.id) {
          // Immediately add the creator to the team
          const sessionResp = await authClient.getSession()
          if (sessionResp.data?.user?.id) {
            await (authClient.organization as any).addTeamMember({
              teamId: result.data.id,
              userId: sessionResp.data.user.id,
              organizationId: orgId,
            })
          }
          toast.success("Team created successfully!")
          form.reset()
          onSuccess?.(result.data)
          return
        }
      }

      if (apiError) {
        setError({
          code: apiError.code,
          message: apiError.message || (isUpdate ? "Failed to update team" : "Failed to create team")
        })
        toast.error(apiError.message || (isUpdate ? "Failed to update team" : "Failed to create team"))
        return
      }

      onSuccess?.()
    } catch (err: any) {
      setError({ message: err.message || "An unexpected error occurred" })
      toast.error("An unexpected error occurred")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <CircleAlert className="h-4 w-4" />
            <AlertTitle className="break-all">Error {error.code ? `(${error.code})` : ""}</AlertTitle>
            <AlertDescription className="break-words">{error.message}</AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Name</FormLabel>
              <FormControl>
                <Input placeholder="Engineering" {...field} disabled={readOnly} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!readOnly && (
          <Button
            type="submit"
            className="w-full"
            disabled={isPending || (isUpdate && !form.formState.isDirty)}
          >
            {isPending
              ? (isUpdate ? "Saving..." : "Creating...")
              : (isUpdate ? "Save Changes" : "Create Team")
            }
          </Button>
        )}
      </form>
    </Form>
  )
}
