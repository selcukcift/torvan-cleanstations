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
  Monitor,
  Check,
  X,
  Star
} from "lucide-react"
import { nextJsApiClient } from '@/lib/api'
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

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
  const [showCart, setShowCart] = useState(false)

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
      case 'storage': return <Box className="w-8 h-8" />
      case 'organization': return <Package className="w-8 h-8" />
      case 'lighting': return <Lightbulb className="w-8 h-8" />
      case 'technology': return <Monitor className="w-8 h-8" />
      default: return <Settings className="w-8 h-8" />
    }
  }

  // Calculate total items in cart across all builds
  const getTotalCartItems = () => {
    return Object.values(accessories).flat().reduce((total, acc) => total + acc.quantity, 0)
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
          <h2 className="text-2xl font-bold">Select Accessories</h2>
          <p className="text-muted-foreground">
            Browse our catalog of {allAccessories.length} accessories to enhance your sink configuration
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Cart Summary Button */}
          <Button 
            variant="outline" 
            className="relative" 
            onClick={() => setShowCart(!showCart)}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Cart ({getTotalCartItems()})
            {getTotalCartItems() > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {getTotalCartItems() > 9 ? '9+' : getTotalCartItems()}
              </Badge>
            )}
          </Button>
          
          {/* View Mode Toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-none"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search accessories by name or part number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Quick Add */}
            <div className="flex gap-2">
              <Input
                placeholder="Part number (702.4-705.57)"
                className="w-48"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const partNumber = e.currentTarget.value.trim()
                    const accessory = allAccessories.find(acc => acc.partNumber === partNumber)
                    if (accessory) {
                      const buildNumber = sinkSelection.buildNumbers[0]
                      updateAccessoryQuantity(accessory, buildNumber, 1)
                      e.currentTarget.value = ''
                      toast({
                        title: "Added to cart",
                        description: `${accessory.name} added successfully`,
                      })
                    } else {
                      toast({
                        title: "Not found",
                        description: "Part number not found in catalog",
                        variant: "destructive"
                      })
                    }
                  }
                }}
              />
              <Button variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            {categories.map(category => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedCategory(category.id)
                  setSelectedSubcategory('all')
                }}
                className="flex items-center gap-2"
              >
                {category.id !== 'all' && (
                  <div className="text-current">
                    {getCategoryIcon(category.id)}
                  </div>
                )}
                {category.name}
                <Badge variant="secondary" className="ml-1">
                  {category.count}
                </Badge>
              </Button>
            ))}
          </div>
          
          {/* Subcategory Filters */}
          {selectedCategory !== 'all' && subcategories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t">
              <Button
                variant={selectedSubcategory === 'all' ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedSubcategory('all')}
              >
                All
              </Button>
              {subcategories.map(subcat => (
                <Button
                  key={subcat.id}
                  variant={selectedSubcategory === subcat.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedSubcategory(subcat.id)}
                >
                  {subcat.name}
                  <Badge variant="outline" className="ml-1">
                    {subcat.count}
                  </Badge>
                </Button>
              ))}
            </div>
          )}
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
            {/* Product Grid */}
            <div className={cn(
              "grid gap-4",
              viewMode === 'grid' 
                ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" 
                : "grid-cols-1"
            )}>
              {filteredAccessories.map((accessory) => {
                const quantity = getAccessoryQuantity(accessory.assemblyId, buildNumber)
                const isSelected = quantity > 0

                return (
                  <Card 
                    key={accessory.id} 
                    className={cn(
                      "transition-all duration-200 hover:shadow-lg",
                      isSelected 
                        ? "ring-2 ring-blue-500 bg-blue-50/50" 
                        : "hover:shadow-md"
                    )}
                  >
                    <CardContent className="p-4">
                      {/* Icon */}
                      <div className="flex justify-center mb-3">
                        <div className={cn(
                          "p-3 rounded-lg",
                          isSelected ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600"
                        )}>
                          {getCategoryIcon(accessory.category)}
                        </div>
                      </div>
                      
                      {/* Product Info */}
                      <div className="text-center space-y-2">
                        <h3 className="font-medium text-sm leading-tight">
                          {accessory.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {accessory.partNumber}
                        </p>
                      </div>
                      
                      {/* Actions */}
                      <div className="mt-4 space-y-2">
                        {!isSelected ? (
                          <Button 
                            size="sm" 
                            className="w-full"
                            onClick={() => updateAccessoryQuantity(accessory, buildNumber, 1)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add to Cart
                          </Button>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateAccessoryQuantity(accessory, buildNumber, Math.max(0, quantity - 1))}
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <span className="font-medium min-w-8 text-center">{quantity}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateAccessoryQuantity(accessory, buildNumber, quantity + 1)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="flex items-center justify-center gap-1 text-green-600">
                              <Check className="w-4 h-4" />
                              <span className="text-xs font-medium">Added</span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Quick Info Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2 text-xs"
                        onClick={() => {
                          toast({
                            title: accessory.name,
                            description: accessory.description,
                          })
                        }}
                      >
                        <Info className="w-3 h-3 mr-1" />
                        Details
                      </Button>
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
          </TabsContent>
        ))}
      </Tabs>

      {/* Floating Cart */}
      {showCart && getTotalCartItems() > 0 && (
        <div className="fixed bottom-4 right-4 w-80 max-h-96 bg-white rounded-lg shadow-xl border z-50">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Shopping Cart</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowCart(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="max-h-64">
            <div className="p-4 space-y-3">
              {Object.entries(accessories).map(([buildNumber, buildAccessories]) => 
                buildAccessories.length > 0 && (
                  <div key={buildNumber}>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">{buildNumber}</h4>
                    {buildAccessories.map((accessory) => (
                      <div key={accessory.assemblyId} className="flex items-center justify-between py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{accessory.name}</p>
                          <p className="text-xs text-muted-foreground">{accessory.partNumber}</p>
                        </div>
                        <Badge variant="outline">×{accessory.quantity}</Badge>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </ScrollArea>
          <div className="p-4 border-t">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Total Items:</span>
              <Badge>{getTotalCartItems()}</Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}