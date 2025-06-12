'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react'
import { nextJsApiClient } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

interface User {
  id: string
  username: string
  email: string
  fullName: string
  role: UserRole
  isActive: boolean
  initials: string
  createdAt: string
  lastLoginAt?: string
  loginAttempts: number
  lockedUntil?: string
}

type UserRole = 'ADMIN' | 'PRODUCTION_COORDINATOR' | 'PROCUREMENT_SPECIALIST' | 'QC_PERSON' | 'ASSEMBLER' | 'SERVICE_DEPARTMENT'

const USER_ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'ADMIN', label: 'Administrator', description: 'Full system access and user management' },
  { value: 'PRODUCTION_COORDINATOR', label: 'Production Coordinator', description: 'Oversees production workflow and order management' },
  { value: 'PROCUREMENT_SPECIALIST', label: 'Procurement Specialist', description: 'Manages parts procurement and inventory' },
  { value: 'QC_PERSON', label: 'Quality Control', description: 'Performs quality inspections and testing' },
  { value: 'ASSEMBLER', label: 'Assembler', description: 'Executes assembly and production tasks' },
  { value: 'SERVICE_DEPARTMENT', label: 'Service Department', description: 'Handles service orders and maintenance' }
]

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  
  const [users, setUsers] = useState<User[]>([])
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Redirect if not admin
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }
  }, [session, status, router])

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchUsers()
    }
  }, [session])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await nextJsApiClient.get('/v1/admin/users')
      
      if (response.data.success) {
        setUsers(response.data.users)
      } else {
        setError(response.data.message || 'Failed to fetch users')
      }
    } catch (err) {
      console.error('Error fetching users:', err)
      setError((err as any).response?.data?.message || 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = () => {
    setEditingUser({
      username: '',
      email: '',
      fullName: '',
      role: 'ASSEMBLER',
      isActive: true,
      initials: ''
    })
    setNewPassword('')
    setConfirmPassword('')
    setShowDialog(true)
  }

  const handleEditUser = (user: User) => {
    setEditingUser({ ...user })
    setNewPassword('')
    setConfirmPassword('')
    setShowDialog(true)
  }

  const generateInitials = (fullName: string): string => {
    return fullName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 3)
  }

  const handleSaveUser = async () => {
    if (!editingUser) return

    // Validation
    if (!editingUser.username?.trim()) {
      toast({
        title: "Validation Error",
        description: "Username is required",
        variant: "destructive"
      })
      return
    }

    if (!editingUser.email?.trim()) {
      toast({
        title: "Validation Error", 
        description: "Email is required",
        variant: "destructive"
      })
      return
    }

    if (!editingUser.fullName?.trim()) {
      toast({
        title: "Validation Error",
        description: "Full name is required", 
        variant: "destructive"
      })
      return
    }

    if (!editingUser.id && !newPassword) {
      toast({
        title: "Validation Error",
        description: "Password is required for new users",
        variant: "destructive"
      })
      return
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match",
        variant: "destructive"
      })
      return
    }

    if (newPassword && newPassword.length < 8) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive"
      })
      return
    }

    try {
      setSaving(true)

      // Auto-generate initials if not provided
      if (!editingUser.initials?.trim()) {
        editingUser.initials = generateInitials(editingUser.fullName)
      }

      const userData = {
        ...editingUser,
        ...(newPassword && { password: newPassword })
      }

      if (editingUser.id) {
        // Update existing user
        const response = await nextJsApiClient.put(`/v1/admin/users/${editingUser.id}`, userData)
        if (response.data.success) {
          toast({
            title: "Success",
            description: "User updated successfully"
          })
        }
      } else {
        // Create new user
        const response = await nextJsApiClient.post('/v1/admin/users', userData)
        if (response.data.success) {
          toast({
            title: "Success", 
            description: "User created successfully"
          })
        }
      }

      setShowDialog(false)
      setEditingUser(null)
      setNewPassword('')
      setConfirmPassword('')
      await fetchUsers()
    } catch (error) {
      console.error('Error saving user:', error)
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save user",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const response = await nextJsApiClient.put(`/v1/admin/users/${userId}`, { isActive })
      
      if (response.data.success) {
        toast({
          title: "Success",
          description: `User ${isActive ? 'activated' : 'deactivated'} successfully`
        })
        await fetchUsers()
      }
    } catch (error) {
      console.error('Error updating user status:', error)
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive"
      })
    }
  }

  const handleDeleteUser = async (userId: string, username: string) => {
    if (userId === session?.user?.id) {
      toast({
        title: "Error",
        description: "You cannot delete your own account",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await nextJsApiClient.delete(`/v1/admin/users/${userId}`)
      
      if (response.data.success) {
        toast({
          title: "Success",
          description: `User ${username} deleted successfully`
        })
        await fetchUsers()
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      })
    }
  }

  const getRoleBadgeColor = (role: UserRole) => {
    const colors = {
      'ADMIN': 'bg-red-100 text-red-800',
      'PRODUCTION_COORDINATOR': 'bg-blue-100 text-blue-800',
      'PROCUREMENT_SPECIALIST': 'bg-green-100 text-green-800',
      'QC_PERSON': 'bg-yellow-100 text-yellow-800',
      'ASSEMBLER': 'bg-purple-100 text-purple-800',
      'SERVICE_DEPARTMENT': 'bg-orange-100 text-orange-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  const formatLastLogin = (lastLoginAt?: string) => {
    if (!lastLoginAt) return 'Never'
    return new Date(lastLoginAt).toLocaleDateString()
  }

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading users...</span>
        </div>
      </div>
    )
  }

  if (session?.user?.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage system users, roles, and permissions
          </p>
        </div>
        <Button onClick={handleCreateUser} className="gap-2">
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            System Users
          </CardTitle>
          <CardDescription>
            {users.length} total users • {users.filter(u => u.isActive).length} active
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {user.initials}
                      </div>
                      <div>
                        <div className="font-medium">{user.fullName}</div>
                        <div className="text-sm text-muted-foreground">
                          @{user.username} • {user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {USER_ROLES.find(r => r.value === user.role)?.label || user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.isActive ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {user.lockedUntil && new Date(user.lockedUntil) > new Date() && (
                        <Badge variant="destructive" className="text-xs">Locked</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatLastLogin(user.lastLoginAt)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleUserStatus(user.id, !user.isActive)}
                        disabled={user.id === session?.user?.id}
                      >
                        {user.isActive ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            disabled={user.id === session?.user?.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete user &ldquo;{user.fullName}&rdquo;? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteUser(user.id, user.username)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>No users found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit User Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingUser?.id ? 'Edit User' : 'Create New User'}
            </DialogTitle>
            <DialogDescription>
              {editingUser?.id 
                ? 'Update user information and permissions'
                : 'Add a new user to the system'
              }
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={editingUser.username || ''}
                    onChange={(e) => setEditingUser({
                      ...editingUser,
                      username: e.target.value
                    })}
                    placeholder="johndoe"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({
                      ...editingUser,
                      email: e.target.value
                    })}
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={editingUser.fullName || ''}
                    onChange={(e) => {
                      const fullName = e.target.value
                      setEditingUser({
                        ...editingUser,
                        fullName,
                        initials: generateInitials(fullName)
                      })
                    }}
                    placeholder="John Doe"
                  />
                </div>
                
                <div>
                  <Label htmlFor="initials">Initials</Label>
                  <Input
                    id="initials"
                    value={editingUser.initials || ''}
                    onChange={(e) => setEditingUser({
                      ...editingUser,
                      initials: e.target.value.toUpperCase()
                    })}
                    placeholder="JD"
                    maxLength={3}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value: UserRole) => setEditingUser({
                    ...editingUser,
                    role: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div>
                          <div className="font-medium">{role.label}</div>
                          <div className="text-xs text-muted-foreground">{role.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Password Section */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">
                  {editingUser.id ? 'Change Password (Optional)' : 'Set Password *'}
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password">
                      {editingUser.id ? 'New Password' : 'Password *'}
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="confirmPassword">
                      {editingUser.id ? 'Confirm New Password' : 'Confirm Password *'}
                    </Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={editingUser.isActive ?? true}
                  onCheckedChange={(checked) => setEditingUser({
                    ...editingUser,
                    isActive: checked
                  })}
                />
                <Label htmlFor="isActive">Active User</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDialog(false)
                setEditingUser(null)
                setNewPassword('')
                setConfirmPassword('')
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveUser} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {editingUser?.id ? 'Update User' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}