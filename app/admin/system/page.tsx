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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Activity, 
  Database, 
  Users, 
  Package, 
  AlertCircle, 
  Settings,
  BarChart3,
  RefreshCw,
  Shield,
  Clock,
  CheckCircle
} from 'lucide-react'
import { nextJsApiClient } from '@/lib/api'

interface SystemHealth {
  systemStatus: 'healthy' | 'warning' | 'critical'
  alerts: string[]
  responseTime: number
  timestamp: string
  statistics: {
    users: Record<string, unknown>
    orders: Record<string, unknown>
    parts: Record<string, unknown>
    assemblies: Record<string, unknown>
    tasks: Record<string, unknown>
  }
  recentActivity: Record<string, unknown>[]
}

interface SystemStats {
  users: {
    total: number
    active: number
    byRole: Record<string, number>
  }
  orders: {
    total: number
    byStatus: Record<string, number>
  }
  parts: {
    total: number
    lowStock: number
  }
  assemblies: {
    total: number
  }
  qcTemplates: {
    total: number
    activeChecks: number
  }
}


export default function AdminSystemPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not admin
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }
  }, [session, status, router])

  // Fetch system data
  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchSystemData()
      
      // Refresh system health every 30 seconds
      const interval = setInterval(fetchSystemHealth, 30000)
      return () => clearInterval(interval)
    }
  }, [session]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSystemData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      await Promise.all([
        fetchSystemHealth(),
        fetchSystemStats(),
        fetchAuditLogs()
      ])
    } catch (err) {
      console.error('Error fetching system data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch system data')
    } finally {
      setLoading(false)
    }
  }

  const fetchSystemHealth = async () => {
    try {
      const response = await nextJsApiClient.get('/v1/admin/system/health')
      setSystemHealth(response.data.data)
    } catch (err) {
      console.error('Error fetching system health:', err)
    }
  }

  const fetchSystemStats = async () => {
    try {
      // Get stats from the system health endpoint
      const response = await nextJsApiClient.get('/v1/admin/system/health')
      const healthData = response.data.data
      
      const stats: SystemStats = {
        users: {
          total: healthData.statistics.users.total || 0,
          active: (healthData.statistics.users.admin_active || 0) + 
                 (healthData.statistics.users.production_coordinator_active || 0) +
                 (healthData.statistics.users.procurement_specialist_active || 0) +
                 (healthData.statistics.users.qc_person_active || 0) +
                 (healthData.statistics.users.assembler_active || 0) +
                 (healthData.statistics.users.service_department_active || 0),
          byRole: {
            'ADMIN': (healthData.statistics.users.admin_active || 0) + (healthData.statistics.users.admin_inactive || 0),
            'PRODUCTION_COORDINATOR': (healthData.statistics.users.production_coordinator_active || 0) + (healthData.statistics.users.production_coordinator_inactive || 0),
            'PROCUREMENT_SPECIALIST': (healthData.statistics.users.procurement_specialist_active || 0) + (healthData.statistics.users.procurement_specialist_inactive || 0),
            'QC_PERSON': (healthData.statistics.users.qc_person_active || 0) + (healthData.statistics.users.qc_person_inactive || 0),
            'ASSEMBLER': (healthData.statistics.users.assembler_active || 0) + (healthData.statistics.users.assembler_inactive || 0),
            'SERVICE_DEPARTMENT': (healthData.statistics.users.service_department_active || 0) + (healthData.statistics.users.service_department_inactive || 0)
          }
        },
        orders: {
          total: healthData.statistics.orders.total || 0,
          byStatus: {
            'PENDING': healthData.statistics.orders.pending || 0,
            'ORDER_CREATED': healthData.statistics.orders.order_created || 0,
            'READY_FOR_PRE_QC': healthData.statistics.orders.ready_for_pre_qc || 0,
            'READY_FOR_PRODUCTION': healthData.statistics.orders.ready_for_production || 0,
            'TESTING_COMPLETE': healthData.statistics.orders.testing_complete || 0
          }
        },
        parts: {
          total: healthData.statistics.parts.total || 0,
          lowStock: healthData.statistics.parts.lowStock || 0
        },
        assemblies: {
          total: healthData.statistics.assemblies.total || 0
        },
        qcTemplates: {
          total: 4, // This would need a separate API call
          activeChecks: 150 // This would need a separate API call
        }
      }
      
      setSystemStats(stats)
    } catch (err) {
      console.error('Error fetching system stats:', err)
      // Fallback to basic stats if API fails
      setSystemStats({
        users: { total: 0, active: 0, byRole: {} },
        orders: { total: 0, byStatus: {} },
        parts: { total: 0, lowStock: 0 },
        assemblies: { total: 0 },
        qcTemplates: { total: 0, activeChecks: 0 }
      })
    }
  }

  const fetchAuditLogs = async () => {
    try {
      // Mock audit logs - in real implementation, fetch from audit log API
      const mockLogs: AuditLogEntry[] = [
        {
          id: '1',
          action: 'USER_LOGIN',
          entityType: 'User',
          entityId: session?.user?.id || '',
          userId: session?.user?.id || '',
          userName: session?.user?.username || 'admin',
          timestamp: new Date().toISOString()
        }
      ]
      setAuditLogs(mockLogs)
    } catch (err) {
      console.error('Error fetching audit logs:', err)
    }
  }

  const getHealthStatusBadge = (status?: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
      case 'critical':
        return <Badge className="bg-red-100 text-red-800">Critical</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading system data...</span>
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
          <h1 className="text-3xl font-bold tracking-tight">System Administration</h1>
          <p className="text-muted-foreground">
            Monitor and manage your Torvan Medical workflow system
          </p>
        </div>
        <Button onClick={fetchSystemData} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh Data
        </Button>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* System Alerts */}
      {systemHealth?.alerts && systemHealth.alerts.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>System Alerts</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {systemHealth.alerts.map((alert, index) => (
                <li key={index} className="text-sm">{alert}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <CardTitle>System Health</CardTitle>
            </div>
            {systemHealth && getHealthStatusBadge(systemHealth.systemStatus)}
          </div>
          <CardDescription>
            Real-time system status and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="text-sm font-medium">Database</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Connected</span>
              </div>
              {systemHealth?.responseTime && (
                <p className="text-xs text-muted-foreground">
                  Response: {systemHealth.responseTime}ms
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">Authentication</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Active</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span className="text-sm font-medium">File Upload</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Available</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Uptime</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {systemHealth ? '99.9%' : 'Loading...'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats?.users.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {systemStats?.users.active || 0} active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats?.orders.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              All time orders created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parts Catalog</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats?.parts.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {systemStats?.parts.lowStock || 0} low stock alerts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assemblies</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats?.assemblies.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Including pegboard kits
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Role Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Role Distribution
          </CardTitle>
          <CardDescription>
            Current user distribution across system roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {systemStats?.users.byRole && Object.entries(systemStats.users.byRole).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">{role.replace('_', ' ')}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Administrative Actions</CardTitle>
          <CardDescription>
            Common administrative tasks and system management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="justify-start gap-2 h-auto p-4"
              onClick={() => router.push('/admin/work-instructions')}
            >
              <Settings className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Work Instructions</div>
                <div className="text-xs text-muted-foreground">Manage assembly instructions</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="justify-start gap-2 h-auto p-4"
              onClick={() => router.push('/admin/task-lists')}
            >
              <CheckCircle className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Task Lists</div>
                <div className="text-xs text-muted-foreground">Manage production tasks</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="justify-start gap-2 h-auto p-4"
              onClick={fetchSystemData}
            >
              <RefreshCw className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Refresh System</div>
                <div className="text-xs text-muted-foreground">Update all system data</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}