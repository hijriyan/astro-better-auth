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
  FormDescription,
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
    message: "Name must be at least 2 characters.",
  }),
  slug: z.string().min(2, {
    message: "Slug must be at least 2 characters.",
  }).regex(/^[a-z0-9-]+$/, {
    message: "Slug can only contain lowercase letters, numbers, and hyphens.",
  }),
})

export function OrgForm({ 
  onSuccess,
  initialData,
  readOnly = false,
}: { 
  onSuccess?: () => void;
  initialData?: { id: string; name: string; slug: string };
  readOnly?: boolean;
}) {
  const isUpdate = !!initialData
  const [isPending, setIsPending] = React.useState(false)
  const [error, setError] = React.useState<{ message: string; code?: string } | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      slug: initialData?.slug || "",
    },
  })

  const nameValue = form.watch("name")
  const slugValue = form.watch("slug")
  
  // Auto-generate slug from name only when creating
  React.useEffect(() => {
    if (!isUpdate && nameValue && !form.formState.dirtyFields.slug) {
      const generatedSlug = nameValue
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/[\s-]+/g, "-")
      
      form.setValue("slug", generatedSlug, { shouldValidate: true })
    }
  }, [nameValue, form, isUpdate])

  // Client-side slug uniqueness checking
  React.useEffect(() => {
    if (!slugValue || slugValue.length < 2 || slugValue === initialData?.slug) {
      if (form.getFieldState("slug").error?.type === "manual") {
        form.clearErrors("slug")
      }
      return
    }

    const timeoutId = setTimeout(async () => {
      try {
        const { data, error } = await authClient.organization.checkSlug({ slug: slugValue })
        
        if (error) {
          if (error.status === 400 || (error.code as string) === 'ORGANIZATION_SLUG_ALREADY_TAKEN') {
            form.setError("slug", { type: "manual", message: "This slug is already taken." })
          } else {
            console.error("Error from checkSlug:", error)
          }
          return
        }

        if (form.getFieldState("slug").error?.type === "manual") {
          form.clearErrors("slug")
        }
      } catch (err) {
        console.error("Failed to check slug", err)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [slugValue, form, initialData?.slug])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsPending(true)
    setError(null)
    try {
      let apiError
      if (isUpdate && initialData) {
        const result = await authClient.organization.update({
          organizationId: initialData.id,
          data: {
            name: values.name,
            slug: values.slug,
          }
        })
        apiError = result.error
        
        if (!apiError) {
          toast.success("Organization updated successfully!")
          if (values.slug !== initialData.slug) {
            window.location.href = `/org/${values.slug}`
          }
        }
      } else {
        const result = await authClient.organization.create({
          name: values.name,
          slug: values.slug,
        })
        apiError = result.error
        
        if (!apiError) {
          toast.success("Organization created successfully!")
          form.reset()
        }
      }

      if (apiError) {
        setError({
          code: apiError.code,
          message: apiError.message || (isUpdate ? "Failed to update organization" : "Failed to create organization")
        })
        toast.error(apiError.message || (isUpdate ? "Failed to update organization" : "Failed to create organization"))
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
            <AlertTitle>Error {error.code ? `(${error.code})` : ""}</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization Name</FormLabel>
              <FormControl>
                <Input placeholder="Acme Corp" {...field} disabled={readOnly} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL Slug</FormLabel>
              <FormControl>
                <Input placeholder="acme-corp" {...field} disabled={readOnly} />
              </FormControl>
              <FormDescription>
                This will be used in your organization's URL.
              </FormDescription>
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
              : (isUpdate ? "Save Changes" : "Create Organization")
            }
          </Button>
        )}
      </form>
    </Form>
  )
}
