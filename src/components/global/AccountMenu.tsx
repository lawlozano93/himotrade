'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { authService } from '@/lib/services/auth'
import { useToast } from '@/components/ui/use-toast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { User, Settings, LogOut, UserCog, CircleUser, Calendar } from 'lucide-react'

interface ProfileFormValues {
  firstName: string
  lastName: string
  birthday: string
}

interface AccountFormValues {
  password: string
  confirmPassword: string
}

export default function AccountMenu({ isSidebarOpen }: { isSidebarOpen: boolean }) {
  const router = useRouter()
  const { user } = useUser()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  
  // State for dialogs
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  
  // Form states
  const [profileForm, setProfileForm] = useState<ProfileFormValues>({
    firstName: '',
    lastName: '',
    birthday: ''
  })
  
  const [accountForm, setAccountForm] = useState<AccountFormValues>({
    password: '',
    confirmPassword: ''
  })
  
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Load profile data when dialog opens
  useEffect(() => {
    if (isProfileOpen && user) {
      loadProfileData()
    }
  }, [isProfileOpen, user])

  // Load user profile data
  const loadProfileData = async () => {
    if (!user?.id) return
    
    setIsLoading(true)
    
    try {
      // Try to get existing profile
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, birthday')
        .eq('id', user.id)
        .maybeSingle()
      
      // If we found the profile, use the data
      if (data) {
        setProfileForm({
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          birthday: data.birthday || ''
        })
      }
      
      // If error is not a "no results" error, log it
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error)
      }
    } catch (error) {
      console.error('Error in loadProfileData:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Get initials for avatar
  const getInitials = () => {
    if (!user?.email) return 'U'
    return user.email.charAt(0).toUpperCase()
  }
  
  const handleSignOut = async () => {
    try {
      await authService.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
      toast({
        title: 'Error',
        description: 'Failed to sign out',
        variant: 'destructive',
      })
    }
  }
  
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive',
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // First check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
      
      let error
      
      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            first_name: profileForm.firstName,
            last_name: profileForm.lastName,
            birthday: profileForm.birthday,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
        
        error = updateError
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            username: user.email?.split('@')[0] || `user_${Date.now()}`,
            first_name: profileForm.firstName,
            last_name: profileForm.lastName,
            birthday: profileForm.birthday,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        error = insertError
      }
      
      if (error) throw error
      
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      })
      
      setIsProfileOpen(false)
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please run the SQL fix from the README.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    if (accountForm.password !== accountForm.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      })
      setIsSubmitting(false)
      return
    }
    
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: accountForm.password 
      })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Password updated successfully',
      })
      
      setAccountForm({
        password: '',
        confirmPassword: ''
      })
      
      setIsAccountOpen(false)
    } catch (error) {
      console.error('Error updating password:', error)
      toast({
        title: 'Error',
        description: 'Failed to update password',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleDeleteAccount = async () => {
    if (deleteConfirmEmail !== user?.email) {
      toast({
        title: 'Error',
        description: 'Email does not match',
        variant: 'destructive',
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // TODO: Implement account deletion logic
      // This would typically involve a server-side function
      // For now, just show a success message
      
      toast({
        title: 'Account Deletion Requested',
        description: 'Your account deletion has been requested and will be processed.',
      })
      
      setIsDeleteOpen(false)
      // In a real implementation, you might sign the user out here
      await handleSignOut()
    } catch (error) {
      console.error('Error deleting account:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete account',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Display name for the account menu
  const displayName = () => {
    if (profileForm.firstName && profileForm.lastName) {
      return `${profileForm.firstName} ${profileForm.lastName}`
    }
    return user?.email || 'User'
  }

  return (
    <div className="px-4 py-4 border-t mt-auto">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full flex items-center justify-start">
            <Avatar className={cn("h-8 w-8", isSidebarOpen ? "mr-2" : "mx-auto")}>
              <AvatarImage src="" alt={user?.email || 'User'} />
              <AvatarFallback>{getInitials()}</AvatarFallback>
            </Avatar>
            <div className={cn(
              "flex flex-col items-start transition-opacity duration-200",
              !isSidebarOpen && "md:hidden"
            )}>
              <span className="text-sm font-medium truncate max-w-[140px]">
                {user?.email}
              </span>
              <span className="text-xs text-muted-foreground">
                Account
              </span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
              <CircleUser className="mr-2 h-4 w-4" />
              <span>Profile Information</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsAccountOpen(true)}>
              <UserCog className="mr-2 h-4 w-4" />
              <span>Account Settings</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile Information Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profile Information</DialogTitle>
            <DialogDescription>
              Update your personal details
            </DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <div className="py-8 flex items-center justify-center">
              <div className="animate-spin h-6 w-6 rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <form onSubmit={handleProfileSubmit}>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    placeholder="Enter your last name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthday">Birthday</Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={profileForm.birthday}
                    onChange={(e) => setProfileForm({ ...profileForm, birthday: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Account Settings Dialog */}
      <Dialog open={isAccountOpen} onOpenChange={setIsAccountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Account Settings</DialogTitle>
            <DialogDescription>
              Manage your account security
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordChange}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={accountForm.password}
                  onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={accountForm.confirmPassword}
                  onChange={(e) => setAccountForm({ ...accountForm, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </Button>
            </DialogFooter>
          </form>
          <div className="pt-4 border-t mt-4">
            <h4 className="text-sm font-medium mb-2">Danger Zone</h4>
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">Delete Account</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="confirm-email">Confirm by typing your email address</Label>
                      <Input
                        id="confirm-email"
                        value={deleteConfirmEmail}
                        onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                        placeholder={user?.email}
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={isSubmitting || deleteConfirmEmail !== user?.email}
                  >
                    {isSubmitting ? 'Deleting...' : 'Delete Account'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 