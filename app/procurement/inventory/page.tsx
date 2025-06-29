"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Package, Layers, BarChart3, AlertCircle, Loader2, Download, FileText } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppHeader } from "@/components/ui/app-header"
import { InventoryTreeView } from "@/components/procurement/InventoryTreeView"
import { InventoryItemDetails } from "@/components/procurement/InventoryItemDetails"
import { InventorySearchAndFilter } from "@/components/procurement/InventorySearchAndFilter"
import type { CategoryInfo, AssemblyInfo } from "@/lib/inventoryBrowserService"

interface InventoryStats {
  totalCategories: number
  totalSubcategories: number
  totalAssemblies: number
  totalParts: number
  totalComponents: number
}

export default function InventoryBrowserPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [categories, setCategories] = useState<CategoryInfo[]>([])
  const [stats, setStats] = useState<InventoryStats | null>(null)
  const [selectedAssembly, setSelectedAssembly] = useState<AssemblyInfo | null>(null)
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check user role
  const userRole = user?.publicMetadata?.role as string
  const hasAccess = ["ADMIN", "PROCUREMENT_SPECIALIST", "PRODUCTION_COORDINATOR"].includes(userRole || "")

  useEffect(() => {
    if (isLoaded && user && hasAccess) {
      loadInventoryData()
    }
  }, [isLoaded, user, hasAccess])

  const loadInventoryData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/procurement/inventory/hierarchy')
      
      if (!response.ok) {
        throw new Error('Failed to load inventory data')
      }

      const data = await response.json()
      
      if (data.success) {
        setCategories(data.data.categories)
        setStats(data.data.stats)
      } else {
        throw new Error(data.message || 'Failed to load inventory data')
      }
    } catch (err) {
      console.error('Error loading inventory data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleAssemblySelect = (assembly: AssemblyInfo) => {
    setSelectedAssembly(assembly)
    setSelectedPartId(null)
  }

  const handlePartSelect = (partId: string) => {
    setSelectedPartId(partId)
    setSelectedAssembly(null)
  }

  const exportHierarchy = async () => {
    try {
      const exportUrl = selectedAssembly 
        ? `/api/procurement/inventory/export?format=json&assemblyId=${selectedAssembly.id}`
        : `/api/procurement/inventory/export?format=json`
      
      // Create a temporary link to download the file
      const link = document.createElement('a')
      link.href = exportUrl
      link.download = selectedAssembly 
        ? `assembly_${selectedAssembly.id}_export.json`
        : `inventory_export.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppHeader />
        <div className="container mx-auto p-8">
          <Card>
            <CardContent className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-slate-600">Loading user data...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppHeader />
        <div className="container mx-auto p-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access the inventory browser. 
              This page is only available to Administrators, Production Coordinators, and Procurement Specialists.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppHeader />
        <div className="container mx-auto p-8">
          <Card>
            <CardContent className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-slate-600">Loading inventory data...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppHeader />
        <div className="container mx-auto p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load inventory data: {error}
            </AlertDescription>
          </Alert>
          <Button onClick={loadInventoryData} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <div className="container mx-auto p-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Inventory Browser</h1>
              <p className="text-slate-600">
                Explore hierarchical relationships between parts and assemblies
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportHierarchy}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" onClick={() => router.push('/procurement')}>
                <Package className="w-4 h-4 mr-2" />
                Back to Procurement
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCategories}</div>
                <div className="text-xs text-gray-500">Main categories</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Subcategories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSubcategories}</div>
                <div className="text-xs text-gray-500">Classification groups</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Assemblies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.totalAssemblies}</div>
                <div className="text-xs text-gray-500">Buildable products</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Parts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.totalParts}</div>
                <div className="text-xs text-gray-500">Individual components</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Relationships</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.totalComponents}</div>
                <div className="text-xs text-gray-500">Component links</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Search and Tree */}
          <div className="lg:col-span-4 space-y-6">
            {/* Search Component */}
            <InventorySearchAndFilter
              onAssemblySelect={handleAssemblySelect}
              onPartSelect={handlePartSelect}
            />

            {/* Tree View */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Hierarchy Browser
                  </CardTitle>
                  <CardDescription>
                    Navigate through categories, assemblies, and components
                  </CardDescription>
                </CardHeader>
              </Card>
              
              <div className="mt-4">
                <InventoryTreeView
                  categories={categories}
                  onAssemblySelect={handleAssemblySelect}
                  onPartSelect={handlePartSelect}
                />
              </div>
            </div>
          </div>

          {/* Right Panel - Details */}
          <div className="lg:col-span-8">
            <InventoryItemDetails
              selectedAssembly={selectedAssembly}
              selectedPartId={selectedPartId}
            />
          </div>
        </div>

        {/* Information Banner */}
        <div className="mt-8">
          <Alert>
            <Package className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> This inventory browser is independent from order processing and BOM generation. 
              It provides a read-only view of the hierarchical structure for procurement analysis and planning.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  )
}