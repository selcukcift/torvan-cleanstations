"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Search,
  ShoppingCart,
  Package,
  Filter,
  Wrench,
  RefreshCw,
  Loader2,
  FolderOpen
} from "lucide-react"
import { nextJsApiClient } from '@/lib/api'
import { useToast } from "@/hooks/use-toast"
import { useServiceCartStore } from "@/stores/serviceCartStore"
import { ServiceCategoryAccordion } from "./ServiceCategoryAccordion"

interface ServiceComponent {
  id: string
  quantity: number
  notes?: string
  part?: {
    partId: string
    name: string
    manufacturerPartNumber?: string
    type: string
    status: string
    photoURL?: string
    technicalDrawingURL?: string
  }
  assembly?: {
    assemblyId: string
    name: string
    type: string
  }
}

interface ServiceAssembly {
  assemblyId: string
  name: string
  type: string
  canOrder: boolean
  isKit: boolean
  componentCount: number
  components: ServiceComponent[]
}

interface ServiceSubcategory {
  subcategoryId: string
  name: string
  description?: string
  assemblyCount: number
  componentCount: number
  assemblies: ServiceAssembly[]
}

interface ServiceHierarchy {
  category: {
    categoryId: string
    name: string
    description?: string
    totalSubcategories: number
  }
  subcategories: ServiceSubcategory[]
  summary: {
    totalSubcategories: number
    totalAssemblies: number
    totalComponents: number
    generatedAt: string
  }
}

export function ServicePartsBrowser() {
  const [hierarchy, setHierarchy] = useState<ServiceHierarchy | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all")
  const { toast } = useToast()
  
  // Cart store
  const { addItem, updateQuantity, getTotalItems } = useServiceCartStore()

  useEffect(() => {
    fetchServicePartsHierarchy()
  }, [])

  const fetchServicePartsHierarchy = async () => {
    try {
      setLoading(true)
      const response = await nextJsApiClient.get('/service-parts/hierarchy')
      if (response.data.success) {
        setHierarchy(response.data.data)
      }
    } catch (error: any) {
      console.error('Error fetching service parts hierarchy:', error)
      toast({
        title: "Error",
        description: "Failed to load service parts",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const addAssemblyToCart = (assembly: ServiceAssembly) => {
    addItem({
      partId: assembly.assemblyId,
      name: assembly.name,
      type: assembly.type,
      isAssembly: true,
      canOrder: assembly.canOrder
    })
    
    toast({
      title: "Added to Cart",
      description: `${assembly.name} assembly added to cart`
    })
  }

  const addComponentToCart = (component: ServiceComponent) => {
    if (component.part) {
      addItem({
        partId: component.part.partId,
        name: component.part.name,
        partNumber: component.part.partId,
        manufacturerPartNumber: component.part.manufacturerPartNumber,
        type: component.part.type,
        photoURL: component.part.photoURL,
        quantity: component.quantity,
        isComponent: true
      })
      
      toast({
        title: "Added to Cart",
        description: `${component.part.name} component added to cart (Qty: ${component.quantity})`
      })
    } else if (component.assembly) {
      addItem({
        partId: component.assembly.assemblyId,
        name: component.assembly.name,
        type: component.assembly.type,
        quantity: component.quantity,
        isAssembly: true,
        isComponent: true
      })
      
      toast({
        title: "Added to Cart",
        description: `${component.assembly.name} sub-assembly added to cart (Qty: ${component.quantity})`
      })
    }
  }

  // Filter subcategories based on selected filter and search
  const getFilteredSubcategories = () => {
    if (!hierarchy) return []
    
    let filtered = hierarchy.subcategories
    
    // Filter by selected subcategory
    if (selectedSubcategory !== "all") {
      filtered = filtered.filter(sub => sub.subcategoryId === selectedSubcategory)
    }
    
    return filtered
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Service Parts Browser
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>Loading service parts...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!hierarchy) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Service Parts Browser
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <p className="text-slate-500">Failed to load service parts hierarchy</p>
          <Button 
            onClick={fetchServicePartsHierarchy}
            variant="outline"
            className="mt-4"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const filteredSubcategories = getFilteredSubcategories()

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Service Parts Browser
              <Badge variant="outline" className="ml-2">
                Category 719
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              <Badge variant="outline">
                {getTotalItems()} items in cart
              </Badge>
            </div>
          </CardTitle>
          
          {/* Summary Stats */}
          <div className="flex gap-4 text-sm text-slate-600">
            <span>{hierarchy.summary.totalSubcategories} categories</span>
            <span>•</span>
            <span>{hierarchy.summary.totalAssemblies} assemblies</span>
            <span>•</span>
            <span>{hierarchy.summary.totalComponents} components</span>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Search and Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Search assemblies, components, or part numbers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {hierarchy.subcategories.map((subcategory) => (
                  <SelectItem key={subcategory.subcategoryId} value={subcategory.subcategoryId}>
                    {subcategory.name} ({subcategory.assemblyCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline"
              onClick={fetchServicePartsHierarchy}
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Service Parts Categories */}
      {filteredSubcategories.length > 0 ? (
        <div className="space-y-4">
          {filteredSubcategories.map((subcategory) => (
            <ServiceCategoryAccordion
              key={subcategory.subcategoryId}
              subcategory={subcategory}
              onAddToCart={addAssemblyToCart}
              onAddComponentToCart={addComponentToCart}
              searchTerm={search}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <FolderOpen className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="font-medium text-slate-900 mb-2">No Results Found</h3>
            <p className="text-slate-600 mb-4">
              {search 
                ? `No service parts found matching "${search}"`
                : selectedSubcategory !== "all" 
                ? "No assemblies found in the selected category"
                : "No service parts available"
              }
            </p>
            {(search || selectedSubcategory !== "all") && (
              <Button 
                variant="outline"
                onClick={() => {
                  setSearch("")
                  setSelectedSubcategory("all")
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}