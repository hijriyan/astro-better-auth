"use client"

import * as React from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Shield, Mail, Calendar, Key, AlertTriangle, ArrowLeft, Loader2, Save, Ban, CheckCircle, UserCog, Lock, CircleAlert } from "lucide-react"
import { buttonVariants, Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { PhoneInput } from "@/components/ui/phone-input"
import { Label } from "@/components/ui/label"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import { SessionsTable } from "./sessions-table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z.string().optional().or(z.literal("")),
  phoneNumber: z.string().optional().or(z.literal("")),
})
type ProfileFormValues = z.infer<typeof profileSchema>

const passwordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
})
type PasswordFormValues = z.infer<typeof passwordSchema>

const banSchema = z.object({
  banReason: z.string().min(1, "Ban reason is required"),
  banExpiresInDays: z.string().optional(),
})
type BanFormValues = z.infer<typeof banSchema>

interface UserDetailProps {
  user: {
    id: string
    name: string
    email: string
    emailVerified: boolean
    image: string | null
    role: string | null
    banned: boolean | null
    banReason: string | null
    banExpires?: Date | null
    createdAt: Date
    updatedAt: Date
    lastLoginMethod: string | null
    phoneNumber?: string | null
    username?: string | null
    twoFactorEnabled?: boolean | null
  }
}

export function UserDetail({ user: initialUser }: UserDetailProps) {
  const [user, setUser] = React.useState(initialUser)
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [isSettingPassword, setIsSettingPassword] = React.useState(false)
  const [isBanDialogOpen, setIsBanDialogOpen] = React.useState(false)
  const [profileError, setProfileError] = React.useState<{ message?: string; code?: string } | null>(null)

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      username: user.username || "",
      phoneNumber: user.phoneNumber || "",
    },
  })

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
    },
  })

  const banForm = useForm<BanFormValues>({
    resolver: zodResolver(banSchema),
    defaultValues: {
      banReason: "",
      banExpiresInDays: "7",
    },
  })

  const onUpdateProfile = async (values: ProfileFormValues) => {
    setIsUpdating(true)
    setProfileError(null)
    const updateData: Record<string, any> = {}
    if (values.name !== user.name) updateData.name = values.name
    if (values.username !== (user.username || "")) updateData.username = values.username || null
    if (values.phoneNumber !== (user.phoneNumber || "")) updateData.phoneNumber = values.phoneNumber || null
    
    if (Object.keys(updateData).length === 0) {
      setIsUpdating(false)
      return
    }

    const { error } = await authClient.admin.updateUser({
      userId: user.id,
      data: updateData,
    })
    
    if (error) {
      const errorMessage = error.message || "An unknown error occurred"
      setProfileError({ message: errorMessage, code: (error as any).code || (error as any).status })
      toast.error(`Failed to update profile: ${errorMessage}`)
    } else {
      toast.success("Profile updated successfully")
      setUser({ ...user, name: values.name, username: values.username || null, phoneNumber: values.phoneNumber || null })
      profileForm.reset({
        name: values.name,
        username: values.username || "",
        phoneNumber: values.phoneNumber || "",
      })
    }
    setIsUpdating(false)
  }

  const onSetPassword = async (values: PasswordFormValues) => {
    setIsSettingPassword(true)
    
    const { error } = await authClient.admin.setUserPassword({
      userId: user.id,
      newPassword: values.password,
    })

    if (error) {
      toast.error(`Failed to set password: ${error.message || "An unknown error occurred"}`)
    } else {
      toast.success("Password updated successfully")
      passwordForm.reset()
    }
    setIsSettingPassword(false)
  }

  const handleUnban = async () => {
    setIsUpdating(true)
    const { error } = await authClient.admin.unbanUser({ userId: user.id })
    if (error) {
      toast.error(`Failed to unban user: ${error.message || "An unknown error occurred"}`)
    } else {
      toast.success("User unbanned successfully")
      setUser({ ...user, banned: false, banReason: null, banExpires: null })
    }
    setIsUpdating(false)
  }

  const onBanSubmit = async (values: BanFormValues) => {
    setIsUpdating(true)
    const expiresInSeconds = (parseInt(values.banExpiresInDays || "7")) * 24 * 60 * 60
    const { error } = await authClient.admin.banUser({ 
      userId: user.id,
      banReason: values.banReason,
      banExpiresIn: expiresInSeconds
    })
    if (error) {
      toast.error(`Failed to ban user: ${error.message || "An unknown error occurred"}`)
    } else {
      toast.success("User banned successfully")
      setUser({ 
        ...user, 
        banned: true, 
        banReason: values.banReason,
        banExpires: new Date(Date.now() + expiresInSeconds * 1000) 
      })
      setIsBanDialogOpen(false)
      banForm.reset()
    }
    setIsUpdating(false)
  }

  const handleRoleChange = async (role: "admin" | "user") => {
    setIsUpdating(true)
    const { error } = await authClient.admin.setRole({
      userId: user.id,
      role,
    })
    
    if (error) {
      toast.error(`Failed to set role: ${error.message || "An unknown error occurred"}`)
    } else {
      toast.success(`Role updated to ${role}`)
      setUser({ ...user, role })
    }
    setIsUpdating(false)
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in zoom-in-95 duration-300 pb-10">
      <div className="flex items-center justify-between">
        <a href="/admin" className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-2" })}>
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card Summary */}
        <Card className="col-span-1 border-primary/10 shadow-sm bg-gradient-to-br from-background to-muted/20 h-fit">
          <CardHeader className="text-center pb-2 pt-8">
            <div className="mx-auto bg-primary/10 p-2 rounded-full w-24 h-24 mb-4 flex items-center justify-center">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.image || undefined} alt={user.name} />
                <AvatarFallback className="text-2xl">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-2xl">{user.name}</CardTitle>
            <CardDescription className="text-sm mt-1 break-all">{user.email}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 mt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" /> Role
              </span>
              <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                {user.role || "user"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email Status
              </span>
              <Badge variant={user.emailVerified ? "outline" : "destructive"} className={user.emailVerified ? "text-green-600 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-900" : ""}>
                {user.emailVerified ? "Verified" : "Unverified"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Account Status
              </span>
              <Badge variant={user.banned ? "destructive" : "outline"} className={!user.banned ? "text-green-600 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-900" : ""}>
                {user.banned ? "Banned" : "Active"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Key className="h-4 w-4" /> 2FA Status
              </span>
              <Badge variant={user.twoFactorEnabled ? "default" : "secondary"}>
                {user.twoFactorEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Details */}
        <div className="col-span-1 md:col-span-2 flex flex-col gap-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList variant="line" className="w-full justify-start mb-6">
              <TabsTrigger value="general">
                General Settings
              </TabsTrigger>
              <TabsTrigger value="sessions">
                Active Sessions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6 mt-0">
              {/* Profile Update */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Details</CardTitle>
                  <CardDescription>Update user personal information.</CardDescription>
                </CardHeader>
                <CardContent>
                  {profileError && (
                    <Alert variant="destructive" className="mb-4">
                      <CircleAlert className="h-4 w-4" />
                      <AlertTitle>Error {profileError.code ? `(${profileError.code})` : ''}</AlertTitle>
                      <AlertDescription>{profileError.message}</AlertDescription>
                    </Alert>
                  )}
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-4">
                      <FormField
                        control={profileForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <PhoneInput {...field} defaultCountry="ID" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" value={user.email} disabled />
                        <p className="text-xs text-muted-foreground">Email address cannot be changed currently.</p>
                      </div>
                      <Button type="submit" disabled={isUpdating || !profileForm.formState.isDirty}>
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Set Password */}
              <Card>
                <CardHeader>
                  <CardTitle>Set Password</CardTitle>
                  <CardDescription>Manually override the user's password.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onSetPassword)} className="space-y-4 max-w-sm">
                      <FormField
                        control={passwordForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter new password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" variant="secondary" disabled={isSettingPassword || !passwordForm.formState.isDirty}>
                        {isSettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Lock className="mr-2 h-4 w-4" />
                        Set Password
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Admin Actions */}
              <Card className="border-destructive/20">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" /> Danger Zone
                  </CardTitle>
                  <CardDescription>Administrative actions that affect user access.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b pb-4">
                    <div>
                      <h4 className="font-medium text-sm text-foreground">Change Role</h4>
                      <p className="text-sm text-muted-foreground mt-1">Promote or demote user.</p>
                    </div>
                    {user.role === "admin" ? (
                      <Button variant="outline" onClick={() => handleRoleChange("user")} disabled={isUpdating}>
                        <UserCog className="mr-2 h-4 w-4" /> Demote to User
                      </Button>
                    ) : (
                      <Button variant="default" onClick={() => handleRoleChange("admin")} disabled={isUpdating}>
                        <UserCog className="mr-2 h-4 w-4" /> Promote to Admin
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm text-foreground">Ban User</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {user.banned ? (
                          <>
                            Currently banned for: <span className="font-semibold text-destructive">{user.banReason}</span>
                            {user.banExpires && (
                              <span className="block mt-1">Expires on: <span className="font-medium text-foreground">{new Date(user.banExpires).toLocaleString()}</span></span>
                            )}
                          </>
                        ) : (
                          "Prevent this user from logging in."
                        )}
                      </p>
                    </div>
                    
                    {user.banned ? (
                      <Button variant="outline" className="text-green-600 hover:text-green-700" onClick={handleUnban} disabled={isUpdating}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Unban User
                      </Button>
                    ) : (
                      <Button variant="destructive" onClick={() => setIsBanDialogOpen(true)} disabled={isUpdating}>
                        <Ban className="mr-2 h-4 w-4" /> Ban User
                      </Button>
                    )}
                  </div>
                  
                </CardContent>
              </Card>

            </TabsContent>

            <TabsContent value="sessions" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Active Sessions</CardTitle>
                  <CardDescription>Manage devices currently logged into this account.</CardDescription>
                </CardHeader>
                <CardContent>
                  <SessionsTable userId={user.id} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
        <DialogContent>
          <Form {...banForm}>
            <form onSubmit={banForm.handleSubmit(onBanSubmit)}>
              <DialogHeader>
                <DialogTitle>Ban User</DialogTitle>
                <DialogDescription>
                  Are you sure you want to ban {user.name}? They will be logged out and unable to log in until the ban expires.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <FormField
                  control={banForm.control}
                  name="banReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Ban</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Violation of Terms of Service" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={banForm.control}
                  name="banExpiresInDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ban Duration (Days)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsBanDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" type="submit" disabled={isUpdating || !banForm.formState.isValid}>
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm Ban
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
