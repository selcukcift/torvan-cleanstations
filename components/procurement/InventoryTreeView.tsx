"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Package, Layers, Settings, Wrench } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { CategoryInfo, AssemblyInfo } from "@/lib/inventoryBrowserService"

interface InventoryTreeViewProps {
  categories: CategoryInfo[]
  onAssemblySelect?: (assembly: AssemblyInfo) => void
  onPartSelect?: (partId: string) => void
}

interface TreeNodeState {
  [key: string]: boolean
}

export function InventoryTreeView({ 
  categories, 
  onAssemblySelect,
  onPartSelect 
}: InventoryTreeViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<TreeNodeState>({})
  const [selectedItem, setSelectedItem] = useState<string | null>(null)

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }))
  }

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName.toUpperCase()) {
      case 'CONTROL BOX':
        return <Settings className="h-4 w-4 text-blue-600" />
      case 'SERVICE PARTS':
        return <Wrench className="h-4 w-4 text-green-600" />
      case 'ACCESSORY LIST':
        return <Package className="h-4 w-4 text-purple-600" />
      default:
        return <Layers className="h-4 w-4 text-gray-600" />
    }
  }

  const getAssemblyTypeColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'KIT':
        return 'bg-blue-100 text-blue-700'
      case 'SERVICE_PART':
        return 'bg-green-100 text-green-700'
      case 'ASSEMBLY':
        return 'bg-orange-100 text-orange-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const handleAssemblyClick = (assembly: AssemblyInfo) => {
    setSelectedItem(`assembly-${assembly.id}`)
    onAssemblySelect?.(assembly)
  }

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="space-y-2">
          {categories.map((category) => (
            <div key={category.id} className="border-l-2 border-gray-200">
              {/* Category Level */}
              <div className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => toggleNode(`category-${category.id}`)}
                >
                  {expandedNodes[`category-${category.id}`] ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                {getCategoryIcon(category.name)}
                <span className="font-medium text-sm">{category.name}</span>
                <Badge variant="outline" className="text-xs">
                  {category.subcategories.length} subcategories
                </Badge>
              </div>

              {/* Subcategories */}
              {expandedNodes[`category-${category.id}`] && (
                <div className="ml-6 border-l border-gray-200">
                  {category.subcategories.map((subcategory) => (
                    <div key={subcategory.id}>
                      {/* Subcategory Level */}
                      <div className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleNode(`subcategory-${subcategory.id}`)}
                        >
                          {expandedNodes[`subcategory-${subcategory.id}`] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        <Package className="h-3 w-3 text-gray-500" />
                        <span className="text-sm">{subcategory.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {subcategory.assemblyRefs.length} items
                        </Badge>
                      </div>

                      {/* Assembly References */}
                      {expandedNodes[`subcategory-${subcategory.id}`] && (
                        <div className="ml-6 border-l border-gray-100">
                          {subcategory.assemblyRefs.map((assemblyRef) => (
                            <AssemblyNode
                              key={assemblyRef}
                              assemblyId={assemblyRef}
                              level={3}
                              selectedItem={selectedItem}
                              onAssemblyClick={(assembly) => handleAssemblyClick(assembly)}
                              onPartClick={onPartSelect}
                              expandedNodes={expandedNodes}
                              toggleNode={toggleNode}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface AssemblyNodeProps {
  assemblyId: string
  level: number
  selectedItem: string | null
  onAssemblyClick: (assembly: AssemblyInfo) => void
  onPartClick?: (partId: string) => void
  expandedNodes: TreeNodeState
  toggleNode: (nodeId: string) => void
}

function AssemblyNode({
  assemblyId,
  level,
  selectedItem,
  onAssemblyClick,
  onPartClick,
  expandedNodes,
  toggleNode
}: AssemblyNodeProps) {
  const [assembly, setAssembly] = useState<AssemblyInfo | null>(null)
  const [loading, setLoading] = useState(false)

  // This would normally fetch assembly data from the API
  // For now, we'll show a placeholder
  const loadAssemblyData = async () => {
    if (assembly || loading) return
    
    setLoading(true)
    try {
      // Fetch assembly data from API
      const response = await fetch(`/api/procurement/inventory/assembly/${assemblyId}`)
      if (response.ok) {
        const data = await response.json()
        setAssembly(data.data.assembly)
      }
    } catch (error) {
      console.error('Failed to load assembly:', error)
    }
    setLoading(false)
  }

  const handleClick = () => {
    loadAssemblyData()
    if (assembly) {
      onAssemblyClick(assembly)
    }
  }

  const handleToggle = () => {
    toggleNode(`assembly-${assemblyId}`)
    loadAssemblyData()
  }

  const isSelected = selectedItem === `assembly-${assemblyId}`
  const isExpanded = expandedNodes[`assembly-${assemblyId}`]

  return (
    <div className={`${level > 3 ? 'ml-4' : ''}`}>
      {/* Assembly Level */}
      <div 
        className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
          isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
        }`}
        onClick={handleClick}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={(e) => {
            e.stopPropagation()
            handleToggle()
          }}
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
          ) : isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
        
        <Layers className="h-3 w-3 text-orange-500" />
        <span className="text-sm font-mono">{assemblyId}</span>
        
        {assembly && (
          <>
            <span className="text-xs text-gray-500 truncate max-w-40">
              {assembly.name}
            </span>
            <Badge 
              className={`text-xs ${assembly.type ? 
                assembly.type === 'KIT' ? 'bg-blue-100 text-blue-700' :
                assembly.type === 'SERVICE_PART' ? 'bg-green-100 text-green-700' :
                'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {assembly.type || 'ASSEMBLY'}
            </Badge>
            {assembly.components.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {assembly.components.length} components
              </Badge>
            )}
          </>
        )}
      </div>

      {/* Components */}
      {isExpanded && assembly?.components && (
        <div className="ml-6 border-l border-gray-100">
          {assembly.components.map((component, index) => (
            <div 
              key={`${component.id}-${index}`}
              className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
              onClick={() => {
                if (component.type === 'PART') {
                  onPartClick?.(component.id)
                }
              }}
            >
              <div className="w-6" /> {/* Spacer for alignment */}
              {component.type === 'PART' ? (
                <Package className="h-3 w-3 text-green-500" />
              ) : (
                <Layers className="h-3 w-3 text-orange-500" />
              )}
              <span className="text-sm font-mono">{component.id}</span>
              <span className="text-xs text-gray-500 truncate max-w-32">
                {component.name}
              </span>
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
          ))}
        </div>
      )}
    </div>
  )
}