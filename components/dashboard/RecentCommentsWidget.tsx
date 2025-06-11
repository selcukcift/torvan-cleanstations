"use client"

import { useState, useEffect } from "react"
import { nextJsApiClient } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Eye, RefreshCw, Loader2, AlertCircle, User } from "lucide-react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"

interface Comment {
  id: string
  content: string
  isInternal: boolean
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  category: string | null
  isResolved: boolean
  createdAt: string
  orderId: string
  user: {
    id: string
    fullName: string
    initials: string
    role: string
  }
  order: {
    id: string
    poNumber: string
    customerName: string
    orderStatus: string
  }
}

const priorityColors = {
  LOW: "bg-gray-100 text-gray-800",
  NORMAL: "bg-blue-100 text-blue-800",
  HIGH: "bg-orange-100 text-orange-800",
  URGENT: "bg-red-100 text-red-800"
}

export function RecentCommentsWidget() {
  const router = useRouter()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRecentComments()
  }, [])

  const fetchRecentComments = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // This would need a new API endpoint for recent comments across all orders
      const response = await nextJsApiClient.get('/comments/recent?limit=10&includeInternal=true')
      
      if (response.data.success) {
        setComments(response.data.data.comments)
      }
    } catch (error: any) {
      console.error('Error fetching recent comments:', error)
      setError('Failed to load comments')
    } finally {
      setLoading(false)
    }
  }

  const handleViewOrder = (orderId: string) => {
    router.push(`/orders/${orderId}?tab=comments`)
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const truncateContent = (content: string, maxLength: number = 120) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Recent Comments
            </CardTitle>
            <CardDescription>
              Latest comments across all orders
            </CardDescription>
          </div>
          <Button 
            onClick={fetchRecentComments} 
            size="sm" 
            variant="outline"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && comments.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2 text-sm text-gray-600">Loading comments...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8 text-red-600">
            <AlertCircle className="w-6 h-6 mr-2" />
            <span className="text-sm">{error}</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No recent comments</p>
            <p className="text-sm text-gray-500">Comments will appear here as they are added to orders</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {comments.map((comment) => (
              <div key={comment.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                      {getInitials(comment.user.fullName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="font-medium truncate">{comment.user.fullName}</span>
                        <Badge variant="outline" className="text-xs">{comment.user.role}</Badge>
                        {comment.priority !== 'NORMAL' && (
                          <Badge className={`text-xs ${priorityColors[comment.priority]}`}>
                            {comment.priority}
                          </Badge>
                        )}
                        {comment.isInternal && (
                          <Badge variant="secondary" className="text-xs">Internal</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleViewOrder(comment.orderId)}
                    size="sm"
                    variant="ghost"
                    className="ml-2 flex-shrink-0"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="ml-8">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs text-gray-500">on</span>
                    <Badge variant="outline" className="text-xs">
                      {comment.order.poNumber}
                    </Badge>
                    <span className="text-xs text-gray-500 truncate">
                      {comment.order.customerName}
                    </span>
                    {comment.category && (
                      <Badge variant="outline" className="text-xs">
                        {comment.category}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-2">
                    {truncateContent(comment.content)}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {format(new Date(comment.createdAt), "MMM dd, HH:mm")}
                    </span>
                    {comment.isResolved && (
                      <Badge className="text-xs bg-green-100 text-green-800">
                        Resolved
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}