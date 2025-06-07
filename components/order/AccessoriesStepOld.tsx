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
import { Plus, Minus, ShoppingCart, Package, Search, Star, Loader2, Info } from "lucide-react"
import { nextJsApiClient } from '@/lib/api'
import { useToast } from "@/hooks/use-toast"

interface AccessoryCategory {
  id: string
  name: string
  description?: string
  code: string
}

interface Accessory {
  id: string
  assemblyId: string
  name: string
  type: string
  categoryCode: string
  categoryName?: string
  displayName: string
  featured?: boolean
}

interface SelectedAccessory {
  assemblyId: string
  accessoryId: string
  name: string
  partNumber?: string
  quantity: number
  buildNumbers: string[]  // Which build numbers this accessory applies to
}

export function AccessoriesStep() {
  const { sinkSelection, accessories, updateAccessories } = useOrderCreateStore()
  const { toast } = useToast()
  
  const [availableAccessories, setAvailableAccessories] = useState<Accessory[]>([])
  const [featuredAccessories, setFeaturedAccessories] = useState<Accessory[]>([])
  const [categories, setCategories] = useState<AccessoryCategory[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [currentView, setCurrentView] = useState<'featured' | 'category' | 'search'>('featured')
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [pagination, setPagination] = useState({ offset: 0, limit: 20, hasMore: false })

  const buildNumbers = sinkSelection.buildNumbers || []

  useEffect(() => {
    loadInitialData()
  }, [])

  // Load initial categories and featured accessories
  const loadInitialData = async () => {
    try {
      setLoading(true)
      
      const [categoriesRes, featuredRes] = await Promise.all([
        nextJsApiClient.get('/accessories?getCategories=true'), // Get all accessory categories
        nextJsApiClient.get('/accessories?featured=true') // Get featured accessories
      ])
      
      if (categoriesRes.data.success) {
        setCategories(categoriesRes.data.categories || [])
      }
      
      if (featuredRes.data.success) {
        setFeaturedAccessories(featuredRes.data.data || [])
        setAvailableAccessories(featuredRes.data.data || [])
      }
      
    } catch (error) {
      console.error('Error loading accessories data:', error)
      toast({
        title: "Error",
        description: "Failed to load accessories data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Load accessories by category
  const loadAccessoriesByCategory = async (categoryCode: string) => {
    try {
      setLoading(true)
      setCurrentView('category')
      
      const response = await nextJsApiClient.get(`/accessories?categoryCode=${categoryCode}`)
      
      if (response.data.success) {
        setAvailableAccessories(response.data.data || [])
      }
    } catch (error) {
      console.error('Error loading accessories by category:', error)
      toast({
        title: "Error",
        description: "Failed to load accessories for this category",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Search accessories
  const searchAccessories = async (query: string) => {
    if (!query.trim()) {
      setCurrentView('featured')
      setAvailableAccessories(featuredAccessories)
      return
    }
    
    try {
      setSearchLoading(true)
      setCurrentView('search')
      
      const response = await nextJsApiClient.get(
        `/accessories/search?query=${encodeURIComponent(query)}&limit=50`
      )
      
      if (response.data.success) {
        setAvailableAccessories(response.data.accessories || [])
        setPagination(response.data.pagination || { offset: 0, limit: 20, hasMore: false })
      }
    } catch (error) {
      console.error('Error searching accessories:', error)
      toast({
        title: "Error",
        description: "Failed to search accessories",
        variant: "destructive"
      })
    } finally {
      setSearchLoading(false)
    }
  }

  // Handle search input changes with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchAccessories(searchTerm)
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  // Handle category change
  const handleCategoryChange = (categoryCode: string) => {
    setSelectedCategory(categoryCode)
    setSearchTerm('')
    
    if (categoryCode === 'ALL') {
      setCurrentView('featured')
      setAvailableAccessories(featuredAccessories)
    } else {
      loadAccessoriesByCategory(categoryCode)
    }
  }

  const getAccessoryQuantity = (accessoryId: string, buildNumber: string): number => {
    const buildAccessories = accessories[buildNumber] || []
    const accessory = buildAccessories.find(acc => acc.accessoryId === accessoryId)
    return accessory?.quantity || 0
  }

  const updateAccessoryQuantity = (
    accessory: Accessory,
    buildNumber: string,
    quantity: number
  ) => {
    const currentAccessories = accessories[buildNumber] || []
    let updatedAccessories: import('@/stores/orderCreateStore').SelectedAccessory[]

    if (quantity === 0) {
      // Remove accessory
      updatedAccessories = currentAccessories.filter(acc => acc.accessoryId !== accessory.assemblyId)
    } else {
      // Update or add accessory
      const existingIndex = currentAccessories.findIndex(acc => acc.accessoryId === accessory.assemblyId)
      if (existingIndex >= 0) {
        updatedAccessories = [...currentAccessories]
        updatedAccessories[existingIndex] = {
          ...updatedAccessories[existingIndex],
          quantity
        }
      } else {
        updatedAccessories = [
          ...currentAccessories,
          {
            assemblyId: accessory.assemblyId,
            accessoryId: accessory.assemblyId,
            name: accessory.displayName || accessory.name,
            partNumber: accessory.assemblyId,
            quantity,
            buildNumbers: [buildNumber]
          }
        ]
      }
    }
    updateAccessories(buildNumber, updatedAccessories)
  }

  const getTotalAccessoriesForBuild = (buildNumber: string): number => {
    const buildAccessories = accessories[buildNumber] || []
    return buildAccessories.reduce((total, acc) => total + acc.quantity, 0)
  }

  const getTotalAccessoriesCount = (): number => {
    return buildNumbers.reduce((total, buildNumber) => 
      total + getTotalAccessoriesForBuild(buildNumber), 0
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Add-on Accessories</h2>
          <p className="text-slate-600">
            Select optional accessories for your CleanStation sinks.
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <ShoppingCart className="w-5 h-5 text-slate-600" />
          <Badge variant="outline" className="px-3 py-1">
            {getTotalAccessoriesCount()} items selected
          </Badge>
        </div>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                {searchLoading && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />
                )}
                <Input
                  placeholder="Search accessories by name or assembly ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10"
                />
              </div>
            </div>
          </div>
          
          {/* Accessory Family Categories */}
          <div className="mt-6">
            <Label className="text-base font-semibold mb-4 block">Accessory Families</Label>
            <Tabs value={selectedCategory} onValueChange={handleCategoryChange} className="w-full">
              <TabsList className="flex flex-wrap justify-start h-auto p-1 gap-1">
                <TabsTrigger value="ALL" className="text-xs p-2 min-w-fit">
                  <Star className="w-4 h-4 mr-1" />
                  Featured
                </TabsTrigger>
                {categories.map((category) => (
                  <TabsTrigger key={category.id} value={category.id} className="text-xs p-2 min-w-fit">
                    <Package className="w-4 h-4 mr-1" />
                    {category.name.replace('FAUCET, OUTLET, DRAIN, SPRAYER KITS', 'Faucet & Drain')
                      .replace('ELECTRONIC & DIGITAL ADD-ONS', 'Electronic')
                      .replace('LIGHTING ADD-ONS', 'Lighting')
                      .replace('HOLDERS, PLATES & HANGERS', 'Holders & Plates')
                      .replace('BASKETS, BINS & SHELVES', 'Baskets & Shelves')
                      .replace('DRAWERS & COMPARTMENTS', 'Drawers')
                      .replace('MANUAL', 'Manual')}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          
          {/* Current View Indicator */}
          <div className="mt-4">
            {currentView === 'featured' && (
              <Alert>
                <Star className="h-4 w-4" />
                <AlertDescription>
                  Showing featured accessories commonly used in CleanStation configurations.
                </AlertDescription>
              </Alert>
            )}
            {currentView === 'search' && searchTerm && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Search results for "{searchTerm}" - {availableAccessories.length} accessories found
                </AlertDescription>
              </Alert>
            )}
            {currentView === 'category' && selectedCategory !== 'ALL' && (
              <Alert>
                <Package className="h-4 w-4" />
                <AlertDescription>
                  {(() => {
                    const category = categories.find(cat => cat.id === selectedCategory)
                    if (category) {
                      return `${category.name} - ${category.description || 'Category accessories'}`
                    }
                    return 'Category accessories'
                  })()}
                  {selectedCategory === '720.702' && ' - Currently showing ' + availableAccessories.length + ' items including bin rails, wire baskets, shelves, and storage solutions'}
                  {selectedCategory === '720.703' && ' - Currently showing ' + availableAccessories.length + ' items including brush holders, glove dispensers, staging covers, and bottle holders'}
                  {selectedCategory === '720.704' && ' - Currently showing ' + availableAccessories.length + ' items including magnifying lights, LED task lights, and dimmable lighting'}
                  {selectedCategory === '720.705' && ' - Currently showing ' + availableAccessories.length + ' items including monitor mounts, CPU holders, keyboard arms, and digital accessories'}
                  {selectedCategory === '720.706' && ' - Currently showing ' + availableAccessories.length + ' items including faucet kits, sprayer systems, basin lights, and drain accessories'}
                  {selectedCategory === '720.707' && ' - Currently showing ' + availableAccessories.length + ' items including drawer housing, pull-out shelves, and compartment solutions'}
                  {selectedCategory === '720.701' && ' - Currently showing ' + availableAccessories.length + ' manual kits in English, French, and Spanish'}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accessories Catalog */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Available Accessories</CardTitle>
              <CardDescription>
                Browse and select accessories for your order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="ml-2">Loading accessories...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availableAccessories.map((accessory) => (
                      <div key={accessory.assemblyId} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium text-slate-900">{accessory.displayName}</h4>
                              {accessory.featured && (
                                <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                                  <Star className="w-3 h-3 mr-1" />
                                  Featured
                                </Badge>
                              )}
                              <Badge variant="outline">
                                {accessory.type}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-slate-600 mb-1">
                              Assembly ID: {accessory.assemblyId}
                            </p>
                            
                            <p className="text-sm text-slate-600 mb-3">
                              Full Name: {accessory.name}
                            </p>

                            <Badge variant="secondary" className="text-xs">
                              {accessory.categoryName || accessory.categoryCode}
                            </Badge>
                          </div>

                          <div className="ml-4">
                            <Package className="w-8 h-8 text-slate-400" />
                          </div>
                        </div>

                        {/* Quantity Controls for Each Build Number */}
                        <div className="mt-4 space-y-2">
                          {buildNumbers.map((buildNumber) => {
                            const quantity = getAccessoryQuantity(accessory.assemblyId, buildNumber)
                            return (
                              <div key={`${accessory.assemblyId}-${buildNumber}`} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                                <span className="text-sm font-medium">
                                  Build: {buildNumber}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateAccessoryQuantity(
                                      accessory, 
                                      buildNumber, 
                                      Math.max(0, quantity - 1)
                                    )}
                                    disabled={quantity === 0}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <span className="w-8 text-center text-sm">{quantity}</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateAccessoryQuantity(
                                      accessory, 
                                      buildNumber, 
                                      quantity + 1
                                    )}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}

                    {availableAccessories.length === 0 && !loading && (
                      <div className="text-center py-8">
                        <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600">
                          {currentView === 'search' && searchTerm 
                            ? `No accessories found for "${searchTerm}"`
                            : 'No accessories available in this category'
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Selected Accessories Summary */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Selected Accessories</CardTitle>
              <CardDescription>
                Summary of accessories for each build
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {buildNumbers.map((buildNumber) => {
                    const buildAccessories = accessories[buildNumber] || []
                    const totalItems = getTotalAccessoriesForBuild(buildNumber)

                    return (
                      <div key={buildNumber} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-slate-900">
                            Build: {buildNumber}
                          </h4>
                          <Badge variant="outline">
                            {totalItems} items
                          </Badge>
                        </div>

                        {buildAccessories.length > 0 ? (
                          <div className="space-y-2">
                            {buildAccessories.map((accessory, index) => (
                              <div key={`${buildNumber}-${accessory.accessoryId}-${index}`} className="text-sm">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-900">
                                      {accessory.name}
                                    </p>
                                    {accessory.partNumber && (
                                      <p className="text-xs text-slate-600">
                                        {accessory.partNumber}
                                      </p>
                                    )}
                                  </div>
                                  <div className="ml-2 text-right">
                                    <p className="font-medium">×{accessory.quantity}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">
                            No accessories selected
                          </p>
                        )}
                      </div>
                    )
                  })}

                  {buildNumbers.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-slate-600">
                        Complete previous steps to select accessories.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Step Summary */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
              <span className="text-xs font-medium text-blue-600">4</span>
            </div>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Step 4 Summary:</p>
              <ul className="text-xs space-y-1">
                <li>• Total accessories selected: {getTotalAccessoriesCount()}</li>
                <li>• Build numbers configured: {buildNumbers.length}</li>
                <li>• Accessories are optional and can be modified later</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
