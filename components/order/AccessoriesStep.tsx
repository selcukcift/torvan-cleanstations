"use client"

import { useState, useEffect } from "react"
import { useOrderCreateStore } from "@/stores/orderCreateStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { 
  Plus, 
  Minus, 
  ShoppingCart, 
  Package, 
  Search, 
  Filter, 
  Loader2, 
  Info,
  Grid,
  List,
  Box,
  Lightbulb,
  Settings,
  Monitor
} from "lucide-react"
import { nextJsApiClient } from '@/lib/api'
import { useToast } from "@/hooks/use-toast"

interface AccessoryItem {
  id: string
  assemblyId: string
  name: string
  description: string
  category: string
  categoryName: string
  subcategory?: string
  partNumber: string
  available: boolean
}

interface AccessoryCategory {
  id: string
  name: string
  count: number
}

interface SelectedAccessory {
  assemblyId: string
  name: string
  quantity: number
  buildNumbers: string[]
  category: string
  partNumber: string
}

export function AccessoriesStep() {
  const { sinkSelection, accessories, updateAccessories } = useOrderCreateStore()
  const { toast } = useToast()
  
  const [allAccessories, setAllAccessories] = useState<AccessoryItem[]>([])
  const [filteredAccessories, setFilteredAccessories] = useState<AccessoryItem[]>([])
  const [categories, setCategories] = useState<AccessoryCategory[]>([])
  const [subcategories, setSubcategories] = useState<AccessoryCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [expandedAccessory, setExpandedAccessory] = useState<string | null>(null)

  // Load accessories from API
  useEffect(() => {
    fetchAccessories()
  }, [selectedCategory, selectedSubcategory, searchTerm])

  const fetchAccessories = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      if (selectedSubcategory !== 'all') params.append('subcategory', selectedSubcategory)
      if (searchTerm) params.append('search', searchTerm)

      const response = await nextJsApiClient.get(`/accessories/catalog?${params.toString()}`)
      
      if (response.data.success) {
        const { accessories, categories, subcategories } = response.data.data
        setAllAccessories(accessories)
        setFilteredAccessories(accessories)
        setCategories(categories)
        setSubcategories(subcategories)
      } else {
        throw new Error('Failed to fetch accessories')
      }
    } catch (error) {
      console.error('Error fetching accessories:', error)
      toast({
        title: "Error",
        description: "Failed to load accessories catalog",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Get quantity for a specific accessory and build
  const getAccessoryQuantity = (assemblyId: string, buildNumber: string): number => {
    const buildAccessories = accessories[buildNumber] || []
    const accessory = buildAccessories.find(acc => acc.assemblyId === assemblyId)
    return accessory?.quantity || 0
  }

  // Update accessory quantity
  const updateAccessoryQuantity = (accessoryItem: AccessoryItem, buildNumber: string, newQuantity: number) => {
    const currentBuildAccessories = [...(accessories[buildNumber] || [])]
    const existingIndex = currentBuildAccessories.findIndex(acc => acc.assemblyId === accessoryItem.assemblyId)

    if (newQuantity === 0) {
      // Remove accessory
      if (existingIndex >= 0) {
        currentBuildAccessories.splice(existingIndex, 1)
      }
    } else {
      // Add or update accessory
      if (existingIndex >= 0) {
        // Update existing accessory
        currentBuildAccessories[existingIndex].quantity = newQuantity
      } else {
        // Add new accessory
        currentBuildAccessories.push({
          assemblyId: accessoryItem.assemblyId,
          name: accessoryItem.name,
          quantity: newQuantity,
          buildNumbers: [buildNumber],
          category: accessoryItem.category,
          partNumber: accessoryItem.partNumber
        })
      }
    }

    updateAccessories(buildNumber, currentBuildAccessories)
  }

  // Get total quantity across all builds for an accessory
  const getTotalAccessoryQuantity = (assemblyId: string): number => {
    return Object.values(accessories).flat()
      .filter(acc => acc.assemblyId === assemblyId)
      .reduce((total, acc) => total + acc.quantity, 0)
  }

  // Category icons
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'storage': return <Box className="w-5 h-5" />
      case 'organization': return <Package className="w-5 h-5" />
      case 'lighting': return <Lightbulb className="w-5 h-5" />
      case 'technology': return <Monitor className="w-5 h-5" />
      default: return <Settings className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2 text-lg">Loading accessories catalog...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configure Accessories</h2>
          <p className="text-muted-foreground">
            Select from our comprehensive catalog of {allAccessories.length} accessories organized by category
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search accessories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(cat.id)}
                      {cat.name} ({cat.count})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Subcategory filter */}
            <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
              <SelectTrigger>
                <SelectValue placeholder="Subcategory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subcategories</SelectItem>
                {subcategories.map(subcat => (
                  <SelectItem key={subcat.id} value={subcat.id}>
                    {subcat.name} ({subcat.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear filters */}
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedCategory('all')
                setSelectedSubcategory('all')
                setSearchTerm('')
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Build Number Tabs */}
      <Tabs defaultValue={sinkSelection.buildNumbers[0]} className="w-full">
        <TabsList className="grid w-full grid-cols-auto">
          {sinkSelection.buildNumbers.map((buildNumber) => (
            <TabsTrigger key={buildNumber} value={buildNumber} className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              {buildNumber}
              <Badge variant="outline" className="ml-1">
                {(accessories[buildNumber] || []).length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {sinkSelection.buildNumbers.map((buildNumber) => (
          <TabsContent key={buildNumber} value={buildNumber} className="mt-6">
            {/* Header with Build Number */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-slate-900">
                Select accessories for {buildNumber}
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Choose accessories and specify quantities for this build
              </p>
            </div>

            {/* Main Content Area with Shopping Cart */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Accessories Section */}
              <div className="lg:col-span-3">
                <div className={`grid gap-4 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' 
                    : 'grid-cols-1'
                }`}>
              {filteredAccessories.map((accessory) => {
                const quantity = getAccessoryQuantity(accessory.assemblyId, buildNumber)
                const totalQuantity = getTotalAccessoryQuantity(accessory.assemblyId)
                const isExpanded = expandedAccessory === accessory.id

                return (
                  <Card 
                    key={accessory.id} 
                    className={`transition-all duration-200 ${
                      quantity > 0 ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(accessory.category)}
                            <CardTitle className="text-base leading-tight">
                              {accessory.name}
                            </CardTitle>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {accessory.partNumber}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {accessory.categoryName}
                            </Badge>
                            {totalQuantity > 0 && (
                              <Badge className="text-xs">
                                {totalQuantity} total
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedAccessory(isExpanded ? null : accessory.id)}
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      {isExpanded && (
                        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            {accessory.description}
                          </p>
                          <div className="mt-2 text-xs">
                            <span className="font-medium">Assembly ID:</span> {accessory.assemblyId}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateAccessoryQuantity(accessory, buildNumber, Math.max(0, quantity - 1))}
                            disabled={quantity === 0}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          
                          <Input
                            type="number"
                            min="0"
                            max="99"
                            value={quantity}
                            onChange={(e) => {
                              const newQuantity = parseInt(e.target.value) || 0
                              updateAccessoryQuantity(accessory, buildNumber, Math.max(0, Math.min(99, newQuantity)))
                            }}
                            className="w-16 text-center"
                          />
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateAccessoryQuantity(accessory, buildNumber, quantity + 1)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>

                        {quantity > 0 && (
                          <Badge className="text-xs">
                            Selected
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {filteredAccessories.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No accessories found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your filters or search terms
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Shopping Cart Section */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    {buildNumber} Cart
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(accessories[buildNumber] || []).length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No accessories selected
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(accessories[buildNumber] || []).map((accessory) => (
                        <div key={accessory.assemblyId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {accessory.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {accessory.partNumber}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  const accessoryItem = allAccessories.find(a => a.assemblyId === accessory.assemblyId)
                                  if (accessoryItem) {
                                    updateAccessoryQuantity(accessoryItem, buildNumber, Math.max(0, accessory.quantity - 1))
                                  }
                                }}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="text-sm font-medium w-8 text-center">
                                {accessory.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  const accessoryItem = allAccessories.find(a => a.assemblyId === accessory.assemblyId)
                                  if (accessoryItem) {
                                    updateAccessoryQuantity(accessoryItem, buildNumber, accessory.quantity + 1)
                                  }
                                }}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {(accessories[buildNumber] || []).length > 0 && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span>Total Items:</span>
                        <Badge variant="outline">
                          {(accessories[buildNumber] || []).reduce((sum, acc) => sum + acc.quantity, 0)}
                        </Badge>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Summary */}
      {Object.values(accessories).flat().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Accessories Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categories
                .filter(cat => cat.id !== 'all')
                .map(category => {
                  const categoryAccessories = Object.values(accessories).flat().filter(acc => acc.category === category.id)
                  if (categoryAccessories.length === 0) return null

                  return (
                    <div key={category.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(category.id)}
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <Badge variant="outline">
                        {categoryAccessories.reduce((sum, acc) => sum + acc.quantity, 0)} items
                      </Badge>
                    </div>
                  )
                })
              }
            </div>
            
            <Separator className="my-4" />
            
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Total Accessories</span>
              <Badge className="text-base px-3 py-1">
                {Object.values(accessories).flat().reduce((sum, acc) => sum + acc.quantity, 0)} items
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}