"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Package, 
  ChevronDown, 
  ChevronRight, 
  Plus,
  ShoppingCart,
  Wrench,
  Box,
  Component,
  Image as ImageIcon,
  FileText
} from "lucide-react"

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

interface ServiceAssemblyCardProps {
  assembly: ServiceAssembly
  onAddToCart: (assembly: ServiceAssembly) => void
  onAddComponentToCart: (component: ServiceComponent) => void
  searchTerm?: string
}

const getAssemblyTypeIcon = (type: string) => {
  switch (type) {
    case 'SERVICE_PART':
      return Wrench
    case 'KIT':
      return Box
    default:
      return Package
  }
}

const getAssemblyTypeColor = (type: string) => {
  switch (type) {
    case 'SERVICE_PART':
      return 'bg-blue-100 text-blue-700'
    case 'KIT':
      return 'bg-green-100 text-green-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const highlightSearchTerm = (text: string, searchTerm?: string) => {
  if (!searchTerm) return text
  
  const regex = new RegExp(`(${searchTerm})`, 'gi')
  const parts = text.split(regex)
  
  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 px-1 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

export function ServiceAssemblyCard({ 
  assembly, 
  onAddToCart, 
  onAddComponentToCart, 
  searchTerm 
}: ServiceAssemblyCardProps) {
  const [showComponents, setShowComponents] = useState(false)
  const TypeIcon = getAssemblyTypeIcon(assembly.type)
  const typeColor = getAssemblyTypeColor(assembly.type)

  const handleAddAssemblyToCart = () => {
    onAddToCart(assembly)
  }

  const handleAddComponentToCart = (component: ServiceComponent) => {
    onAddComponentToCart(component)
  }

  return (
    <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <TypeIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold leading-tight">
                {highlightSearchTerm(assembly.name, searchTerm)}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  ID: {assembly.assemblyId}
                </Badge>
                <Badge className={`text-xs ${typeColor}`}>
                  {assembly.type.replace('_', ' ')}
                </Badge>
                {assembly.isKit && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                    KIT
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {assembly.canOrder && (
              <Button 
                onClick={handleAddAssemblyToCart}
                size="sm"
                className="flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Add Assembly
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {assembly.componentCount > 0 && (
          <div className="space-y-3">
            <Collapsible open={showComponents} onOpenChange={setShowComponents}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-between"
                  size="sm"
                >
                  <span className="flex items-center gap-2">
                    <Component className="w-4 h-4" />
                    View Components ({assembly.componentCount})
                  </span>
                  {showComponents ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="mt-3 border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Component</TableHead>
                        <TableHead>Part ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assembly.components.map((component) => (
                        <TableRow key={component.id}>
                          <TableCell>
                            {component.part ? (
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                                  {component.part.photoURL ? (
                                    <img 
                                      src={component.part.photoURL} 
                                      alt={component.part.name}
                                      className="w-full h-full object-cover rounded"
                                    />
                                  ) : (
                                    <Package className="w-5 h-5 text-slate-400" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-sm leading-tight">
                                    {highlightSearchTerm(component.part.name, searchTerm)}
                                  </p>
                                  {component.part.manufacturerPartNumber && (
                                    <p className="text-xs text-slate-500">
                                      MPN: {component.part.manufacturerPartNumber}
                                    </p>
                                  )}
                                  {component.notes && (
                                    <p className="text-xs text-slate-600 italic">
                                      {component.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : component.assembly ? (
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                                  <Box className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm leading-tight">
                                    {highlightSearchTerm(component.assembly.name, searchTerm)}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Assembly: {component.assembly.assemblyId}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="text-slate-500 text-sm">Unknown component</div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {component.part?.partId || component.assembly?.assemblyId || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {component.part?.type || component.assembly?.type || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-sm font-mono">
                              {component.quantity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              onClick={() => handleAddComponentToCart(component)}
                              size="sm"
                              variant="outline"
                              className="h-8 px-2"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
        
        {assembly.componentCount === 0 && (
          <div className="text-center py-4 text-slate-500 bg-slate-50 rounded-lg">
            <Package className="w-6 h-6 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No components defined for this assembly</p>
            <p className="text-xs text-slate-400">Can be ordered as a complete unit</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}