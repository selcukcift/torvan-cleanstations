"use client"

import { useState, useEffect } from "react"
import { Package, Layers, Info, ExternalLink, Copy, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { AssemblyInfo, PartInfo, ComponentReference } from "@/lib/inventoryBrowserService"

interface InventoryItemDetailsProps {
  selectedAssembly?: AssemblyInfo | null
  selectedPartId?: string | null
}

export function InventoryItemDetails({ selectedAssembly, selectedPartId }: InventoryItemDetailsProps) {
  const [partDetails, setPartDetails] = useState<PartInfo | null>(null)
  const [partUsage, setPartUsage] = useState<AssemblyInfo[]>([])
  const [flattenedComponents, setFlattenedComponents] = useState<ComponentReference[]>([])
  const [loading, setLoading] = useState(false)

  // Load part details when selectedPartId changes
  useEffect(() => {
    if (selectedPartId) {
      loadPartDetails(selectedPartId)
    } else {
      setPartDetails(null)
      setPartUsage([])
    }
  }, [selectedPartId])

  // Load flattened components when assembly changes
  useEffect(() => {
    if (selectedAssembly) {
      loadFlattenedComponents(selectedAssembly.id)
    } else {
      setFlattenedComponents([])
    }
  }, [selectedAssembly])

  const loadPartDetails = async (partId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/procurement/inventory/part/${partId}`)
      if (response.ok) {
        const data = await response.json()
        setPartDetails(data.data.part)
        setPartUsage(data.data.usedInAssemblies)
      }
    } catch (error) {
      console.error('Failed to load part details:', error)
    }
    setLoading(false)
  }

  const loadFlattenedComponents = async (assemblyId: string) => {
    try {
      const response = await fetch(`/api/procurement/inventory/assembly/${assemblyId}?flattened=true`)
      if (response.ok) {
        const data = await response.json()
        setFlattenedComponents(data.data.flattenedComponents || [])
      }
    } catch (error) {
      console.error('Failed to load flattened components:', error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  if (!selectedAssembly && !selectedPartId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Select an assembly or part to view details</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading details...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          {selectedAssembly ? (
            <Layers className="h-5 w-5 text-orange-500" />
          ) : (
            <Package className="h-5 w-5 text-green-500" />
          )}
          <CardTitle className="font-mono text-lg">
            {selectedAssembly?.id || selectedPartId}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(selectedAssembly?.id || selectedPartId || '')}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          {selectedAssembly?.name || partDetails?.name || 'Loading...'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="components">
              {selectedAssembly ? 'Components' : 'Usage'}
            </TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {selectedAssembly ? (
              <AssemblyOverview assembly={selectedAssembly} />
            ) : (
              <PartOverview part={partDetails} usage={partUsage} />
            )}
          </TabsContent>

          <TabsContent value="components" className="space-y-4">
            {selectedAssembly ? (
              <AssemblyComponents 
                assembly={selectedAssembly}
                flattenedComponents={flattenedComponents}
              />
            ) : (
              <PartUsage usage={partUsage} />
            )}
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            {selectedAssembly ? (
              <AssemblyDetails assembly={selectedAssembly} />
            ) : (
              <PartDetails part={partDetails} />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function AssemblyOverview({ assembly }: { assembly: AssemblyInfo }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium mb-2">Type & Status</h4>
          <div className="space-y-2">
            <Badge className={
              assembly.type === 'KIT' ? 'bg-blue-100 text-blue-700' :
              assembly.type === 'SERVICE_PART' ? 'bg-green-100 text-green-700' :
              'bg-orange-100 text-orange-700'
            }>
              {assembly.type}
            </Badge>
            <Badge variant="outline" className={
              assembly.status === 'ACTIVE' ? 'border-green-500 text-green-700' :
              'border-gray-500 text-gray-700'
            }>
              {assembly.status}
            </Badge>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium mb-2">Properties</h4>
          <div className="space-y-1 text-sm">
            <div>Orderable: {assembly.canOrder ? '✓ Yes' : '✗ No'}</div>
            <div>Is Kit: {assembly.isKit ? '✓ Yes' : '✗ No'}</div>
            <div>Components: {assembly.components.length}</div>
          </div>
        </div>
      </div>

      {(assembly.categoryCode || assembly.subcategoryCode) && (
        <div>
          <h4 className="font-medium mb-2">Category</h4>
          <div className="text-sm text-gray-600">
            {assembly.categoryCode && (
              <div>Category: {assembly.categoryCode}</div>
            )}
            {assembly.subcategoryCode && (
              <div>Subcategory: {assembly.subcategoryCode}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function PartOverview({ part, usage }: { part: PartInfo | null, usage: AssemblyInfo[] }) {
  if (!part) return <div>No part data available</div>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium mb-2">Type & Status</h4>
          <div className="space-y-2">
            <Badge className="bg-green-100 text-green-700">
              {part.type}
            </Badge>
            <Badge variant="outline" className={
              part.status === 'ACTIVE' ? 'border-green-500 text-green-700' :
              'border-gray-500 text-gray-700'
            }>
              {part.status}
            </Badge>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium mb-2">Usage</h4>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-sm">Used in {usage.length} assemblies</span>
          </div>
        </div>
      </div>

      {(part.manufacturerPartNumber || part.manufacturerInfo) && (
        <div>
          <h4 className="font-medium mb-2">Manufacturer</h4>
          <div className="text-sm text-gray-600">
            {part.manufacturerPartNumber && (
              <div>Part Number: {part.manufacturerPartNumber}</div>
            )}
            {part.manufacturerInfo && (
              <div>Manufacturer: {part.manufacturerInfo}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AssemblyComponents({ 
  assembly, 
  flattenedComponents 
}: { 
  assembly: AssemblyInfo
  flattenedComponents: ComponentReference[]
}) {
  const [showFlattened, setShowFlattened] = useState(false)

  const componentsToShow = showFlattened ? flattenedComponents : assembly.components

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Components</h4>
        <div className="flex gap-2">
          <Button
            variant={!showFlattened ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFlattened(false)}
          >
            Direct ({assembly.components.length})
          </Button>
          <Button
            variant={showFlattened ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFlattened(true)}
          >
            All ({flattenedComponents.length})
          </Button>
        </div>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {componentsToShow.map((component, index) => (
          <div key={`${component.id}-${index}`} className="flex items-center justify-between p-2 border rounded">
            <div className="flex items-center gap-2">
              {component.type === 'PART' ? (
                <Package className="h-4 w-4 text-green-500" />
              ) : (
                <Layers className="h-4 w-4 text-orange-500" />
              )}
              <span className="font-mono text-sm">{component.id}</span>
              <span className="text-sm text-gray-600 truncate max-w-32">
                {component.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Qty: {component.quantity}
              </Badge>
              <Badge 
                variant="outline" 
                className={`text-xs ${component.type === 'PART' ? 'text-green-600' : 'text-orange-600'}`}
              >
                {component.type}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PartUsage({ usage }: { usage: AssemblyInfo[] }) {
  return (
    <div className="space-y-4">
      <h4 className="font-medium">Used in Assemblies ({usage.length})</h4>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {usage.map((assembly) => (
          <div key={assembly.id} className="flex items-center justify-between p-2 border rounded">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-orange-500" />
              <span className="font-mono text-sm">{assembly.id}</span>
              <span className="text-sm text-gray-600 truncate max-w-32">
                {assembly.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={
                assembly.type === 'KIT' ? 'bg-blue-100 text-blue-700' :
                assembly.type === 'SERVICE_PART' ? 'bg-green-100 text-green-700' :
                'bg-orange-100 text-orange-700'
              }>
                {assembly.type}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AssemblyDetails({ assembly }: { assembly: AssemblyInfo }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="font-medium">Assembly ID:</span>
          <span className="font-mono">{assembly.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Name:</span>
          <span className="text-right max-w-48 truncate">{assembly.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Type:</span>
          <span>{assembly.type}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Status:</span>
          <span>{assembly.status}</span>
        </div>
        {assembly.categoryCode && (
          <div className="flex justify-between">
            <span className="font-medium">Category Code:</span>
            <span>{assembly.categoryCode}</span>
          </div>
        )}
        {assembly.subcategoryCode && (
          <div className="flex justify-between">
            <span className="font-medium">Subcategory Code:</span>
            <span>{assembly.subcategoryCode}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="font-medium">Can Order:</span>
          <span>{assembly.canOrder ? 'Yes' : 'No'}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Is Kit:</span>
          <span>{assembly.isKit ? 'Yes' : 'No'}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Components:</span>
          <span>{assembly.components.length}</span>
        </div>
      </div>
    </div>
  )
}

function PartDetails({ part }: { part: PartInfo | null }) {
  if (!part) return <div>No part data available</div>

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="font-medium">Part ID:</span>
          <span className="font-mono">{part.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Name:</span>
          <span className="text-right max-w-48 truncate">{part.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Type:</span>
          <span>{part.type}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Status:</span>
          <span>{part.status}</span>
        </div>
        {part.manufacturerPartNumber && (
          <div className="flex justify-between">
            <span className="font-medium">Mfg Part Number:</span>
            <span className="font-mono">{part.manufacturerPartNumber}</span>
          </div>
        )}
        {part.manufacturerInfo && (
          <div className="flex justify-between">
            <span className="font-medium">Manufacturer:</span>
            <span>{part.manufacturerInfo}</span>
          </div>
        )}
      </div>
    </div>
  )
}