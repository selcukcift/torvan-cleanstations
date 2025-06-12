"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  MessageSquare,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Tag,
  Filter,
  Loader2,
  Send
} from "lucide-react"
import { format } from "date-fns"

interface OrderCommentsProps {
  orderId: string
}

interface Comment {
  id: string
  content: string
  isInternal: boolean
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  category: string | null
  isResolved: boolean
  resolvedAt: string | null
  mentions: string[]
  attachments: string[]
  createdAt: string
  updatedAt: string
  user: {
    id: string
    fullName: string
    initials: string
    role: string
  }
  resolver?: {
    id: string
    fullName: string
    initials: string
    role: string
  } | null
}

const priorityColors = {
  LOW: "bg-gray-100 text-gray-800",
  NORMAL: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800"
}

const categoryOptions = [
  "Production",
  "Quality",
  "Customer",
  "Technical",
  "Procurement",
  "Shipping",
  "General"
]

export function OrderComments({ orderId }: OrderCommentsProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showAddComment, setShowAddComment] = useState(false)
  const [editingComment, setEditingComment] = useState<Comment | null>(null)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  
  // Filters
  const [showInternal, setShowInternal] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [resolvedFilter, setResolvedFilter] = useState<string>("all")
  
  // New comment form
  const [newComment, setNewComment] = useState({
    content: "",
    isInternal: false,
    priority: "NORMAL" as const,
    category: ""
  })
  
  // Edit comment form
  const [editForm, setEditForm] = useState({
    content: "",
    priority: "NORMAL" as const,
    category: "",
    isResolved: false
  })

  const userRole = session?.user?.role
  const canViewInternal = ['ADMIN', 'PRODUCTION_COORDINATOR', 'QC_PERSON'].includes(userRole || '')
  const canCreateInternal = ['ADMIN', 'PRODUCTION_COORDINATOR', 'QC_PERSON'].includes(userRole || '')

  useEffect(() => {
    fetchComments()
  }, [orderId, showInternal, categoryFilter, resolvedFilter])

  const fetchComments = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        includeInternal: showInternal.toString(),
        ...(categoryFilter && categoryFilter !== 'all' && { category: categoryFilter }),
        ...(resolvedFilter && resolvedFilter !== 'all' && { isResolved: resolvedFilter })
      })

      const response = await nextJsApiClient.get(`/orders/${orderId}/comments?${params}`)
      if (response.data.success) {
        setComments(response.data.data.comments)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!newComment.content.trim()) return

    try {
      setSubmitting(true)
      const response = await nextJsApiClient.post(`/orders/${orderId}/comments`, newComment)
      
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Comment added successfully"
        })
        setNewComment({
          content: "",
          isInternal: false,
          priority: "NORMAL",
          category: ""
        })
        setShowAddComment(false)
        fetchComments()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to add comment",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditComment = async () => {
    if (!editingComment || !editForm.content.trim()) return

    try {
      setSubmitting(true)
      const response = await nextJsApiClient.put(
        `/orders/${orderId}/comments/${editingComment.id}`,
        editForm
      )
      
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Comment updated successfully"
        })
        setEditingComment(null)
        fetchComments()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update comment",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      const response = await nextJsApiClient.delete(`/orders/${orderId}/comments/${commentId}`)
      
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Comment deleted successfully"
        })
        fetchComments()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete comment",
        variant: "destructive"
      })
    } finally {
      setDeletingCommentId(null)
    }
  }

  const handleToggleResolved = async (comment: Comment) => {
    try {
      const response = await nextJsApiClient.put(
        `/orders/${orderId}/comments/${comment.id}`,
        { isResolved: !comment.isResolved }
      )
      
      if (response.data.success) {
        toast({
          title: "Success",
          description: comment.isResolved ? "Comment reopened" : "Comment resolved"
        })
        fetchComments()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update comment status",
        variant: "destructive"
      })
    }
  }

  const startEdit = (comment: Comment) => {
    setEditingComment(comment)
    setEditForm({
      content: comment.content,
      priority: comment.priority,
      category: comment.category || "",
      isResolved: comment.isResolved
    })
  }

  const canEditComment = (comment: Comment) => {
    return comment.user.id === session?.user?.id || ['ADMIN', 'PRODUCTION_COORDINATOR'].includes(userRole || '')
  }

  const canDeleteComment = (comment: Comment) => {
    return comment.user.id === session?.user?.id || userRole === 'ADMIN'
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>
        </div>
        <div className="flex items-center space-x-2">
          {/* Filters */}
          {canViewInternal && (
            <div className="flex items-center space-x-2">
              <Switch
                id="show-internal"
                checked={showInternal}
                onCheckedChange={setShowInternal}
              />
              <Label htmlFor="show-internal" className="text-sm">Internal</Label>
            </div>
          )}
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categoryOptions.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="false">Open</SelectItem>
              <SelectItem value="true">Resolved</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={showAddComment} onOpenChange={setShowAddComment}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Comment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Comment</DialogTitle>
                <DialogDescription>
                  Add a comment to this order. Comments help track progress and communicate with team members.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="content">Comment</Label>
                  <Textarea
                    id="content"
                    value={newComment.content}
                    onChange={(e) => setNewComment({ ...newComment, content: e.target.value })}
                    placeholder="Enter your comment..."
                    rows={4}
                    className="mt-1"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select 
                      value={newComment.priority} 
                      onValueChange={(value: any) => setNewComment({ ...newComment, priority: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="NORMAL">Normal</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={newComment.category} 
                      onValueChange={(value) => setNewComment({ ...newComment, category: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {canCreateInternal && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is-internal"
                      checked={newComment.isInternal}
                      onCheckedChange={(checked) => setNewComment({ ...newComment, isInternal: checked })}
                    />
                    <Label htmlFor="is-internal">Internal Comment (Team Only)</Label>
                  </div>
                )}
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowAddComment(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitComment} disabled={submitting || !newComment.content.trim()}>
                    {submitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Add Comment
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2 text-sm text-gray-600">Loading comments...</span>
          </div>
        ) : comments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No comments yet</p>
              <p className="text-sm text-gray-500">Be the first to add a comment to this order</p>
            </CardContent>
          </Card>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className={`${comment.isResolved ? 'opacity-75' : ''}`}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {/* User Avatar */}
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                      {getInitials(comment.user.fullName)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Comment Header */}
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium text-sm">{comment.user.fullName}</span>
                        <Badge variant="outline" className="text-xs">{comment.user.role}</Badge>
                        
                        <Badge className={`text-xs ${priorityColors[comment.priority]}`}>
                          {comment.priority}
                        </Badge>
                        
                        {comment.category && (
                          <Badge variant="outline" className="text-xs">
                            <Tag className="w-3 h-3 mr-1" />
                            {comment.category}
                          </Badge>
                        )}
                        
                        {comment.isInternal && (
                          <Badge variant="secondary" className="text-xs">
                            Internal
                          </Badge>
                        )}
                        
                        {comment.isResolved && (
                          <Badge className="text-xs bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Resolved
                          </Badge>
                        )}
                        
                        <span className="text-xs text-gray-500">
                          {format(new Date(comment.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                        </span>
                      </div>
                      
                      {/* Comment Content */}
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                        {comment.content}
                      </div>
                      
                      {/* Resolution Info */}
                      {comment.isResolved && comment.resolver && (
                        <div className="mt-2 text-xs text-gray-500">
                          Resolved by {comment.resolver.fullName} on{' '}
                          {format(new Date(comment.resolvedAt!), "MMM dd, yyyy 'at' HH:mm")}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleToggleResolved(comment)}>
                        {comment.isResolved ? (
                          <>
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Reopen
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Resolve
                          </>
                        )}
                      </DropdownMenuItem>
                      
                      {canEditComment(comment) && (
                        <DropdownMenuItem onClick={() => startEdit(comment)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      
                      {canDeleteComment(comment) && (
                        <DropdownMenuItem 
                          onClick={() => setDeletingCommentId(comment.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Comment Dialog */}
      <Dialog open={!!editingComment} onOpenChange={() => setEditingComment(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Comment</DialogTitle>
            <DialogDescription>
              Update your comment content or settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-content">Comment</Label>
              <Textarea
                id="edit-content"
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                rows={4}
                className="mt-1"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-priority">Priority</Label>
                <Select 
                  value={editForm.priority} 
                  onValueChange={(value: any) => setEditForm({ ...editForm, priority: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select 
                  value={editForm.category} 
                  onValueChange={(value) => setEditForm({ ...editForm, category: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-resolved"
                checked={editForm.isResolved}
                onCheckedChange={(checked) => setEditForm({ ...editForm, isResolved: checked })}
              />
              <Label htmlFor="edit-resolved">Mark as Resolved</Label>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingComment(null)}>
                Cancel
              </Button>
              <Button onClick={handleEditComment} disabled={submitting || !editForm.content.trim()}>
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Edit className="w-4 h-4 mr-2" />
                )}
                Update Comment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCommentId} onOpenChange={() => setDeletingCommentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCommentId && handleDeleteComment(deletingCommentId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}