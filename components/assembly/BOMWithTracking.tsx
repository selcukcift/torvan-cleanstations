"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Package, CheckCircle, ExternalLink, Flag } from "lucide-react"
import { SerialBatchCapture } from "./SerialBatchCapture"
import { nextJsApiClient } from "@/lib/api"

interface BOMItem {
  id: string
  partIdOrAssemblyId: string
  name: string
  quantity: number
  itemType: string
  category?: string
  isCustom: boolean
  serialNumber?: string
  batchNumber?: string
  customGeneratedPartNumber?: string
  part?: {
    requiresSerialTracking?: boolean
    isOutsourced?: boolean
  }
  assembly?: {
    requiresSerialTracking?: boolean
    isOutsourced?: boolean
  }
}

interface BOMWithTrackingProps {
  orderId: string
  buildNumber?: string
  onItemSelect?: (item: BOMItem) => void
}

export function BOMWithTracking({ orderId, buildNumber, onItemSelect }: BOMWithTrackingProps) {
  const [bomItems, setBomItems] = useState<BOMItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [criticalPartsOnly, setCriticalPartsOnly] = useState(false)
  const [untracked, setUntracked] = useState<BOMItem[]>([])

  useEffect(() => {
    fetchBOM()
  }, [orderId, buildNumber])

  const fetchBOM = async () => {
    try {
      setLoading(true)
      const endpoint = buildNumber 
        ? `/orders/${orderId}/bom?buildNumber=${buildNumber}`
        : `/orders/${orderId}/bom`
      
      const response = await nextJsApiClient.get(endpoint)
      
      if (response.data.success) {
        const items = response.data.data.items || []
        setBomItems(items)
        
        // Identify untracked critical parts
        const untrackedCritical = items.filter((item: BOMItem) => {
          const requiresTracking = item.part?.requiresSerialTracking || 
                                 item.assembly?.requiresSerialTracking
          return requiresTracking && !item.serialNumber && !item.batchNumber
        })
        setUntracked(untrackedCritical)
      } else {
        setError(response.data.error || "Failed to fetch BOM")
      }
    } catch (error) {
      console.error("Error fetching BOM:", error)
      setError("Error loading BOM data")
    } finally {
      setLoading(false)
    }
  }

  const handleTrackingUpdate = (bomItemId: string, trackingData: any) => {
    setBomItems(prev => prev.map(item => 
      item.id === bomItemId 
        ? { ...item, ...trackingData }
        : item
    ))
    
    // Update untracked list
    setUntracked(prev => prev.filter(item => item.id !== bomItemId))
  }

  const getTrackingStatus = (item: BOMItem) => {
    const requiresTracking = item.part?.requiresSerialTracking || 
                           item.assembly?.requiresSerialTracking
    
    if (!requiresTracking) return null
    
    if (item.serialNumber || item.batchNumber) {
      return <Badge variant="success" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        Tracked
      </Badge>
    }
    
    return <Badge variant="destructive" className="gap-1">
      <AlertCircle className="h-3 w-3" />
      Required
    </Badge>
  }

  const filteredItems = criticalPartsOnly
    ? bomItems.filter(item => 
        item.part?.requiresSerialTracking || 
        item.assembly?.requiresSerialTracking
      )
    : bomItems

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">Loading BOM...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {untracked.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {untracked.length} critical component{untracked.length > 1 ? 's' : ''} require tracking information
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bill of Materials</CardTitle>
              <CardDescription>
                Track serial and batch numbers for critical components
              </CardDescription>
            </div>
            <Button
              variant={criticalPartsOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setCriticalPartsOnly(!criticalPartsOnly)}
            >
              <Package className="h-4 w-4 mr-2" />
              {criticalPartsOnly ? "Show All" : "Critical Only"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part/Assembly</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Serial/Batch</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow 
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onItemSelect?.(item)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {item.partIdOrAssemblyId}
                        </Badge>
                        {item.isCustom && (
                          <Badge variant="secondary" className="text-xs">
                            Custom
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.name}
                      {(item.part?.isOutsourced || item.assembly?.isOutsourced) && (
                        <Flag className="h-3 w-3 text-orange-500 inline ml-2" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {item.category || item.itemType}
                      </Badge>
                    </TableCell>
                    <TableCell>{getTrackingStatus(item)}</TableCell>
                    <TableCell>
                      {item.serialNumber && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">S/N:</span> {item.serialNumber}
                        </div>
                      )}
                      {item.batchNumber && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Batch:</span> {item.batchNumber}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <SerialBatchCapture
                          orderId={orderId}
                          bomItemId={item.id}
                          partId={item.partIdOrAssemblyId}
                          partName={item.name}
                          requiresSerialTracking={
                            item.part?.requiresSerialTracking || 
                            item.assembly?.requiresSerialTracking || 
                            false
                          }
                          currentSerialNumber={item.serialNumber}
                          currentBatchNumber={item.batchNumber}
                          onCapture={(data) => handleTrackingUpdate(item.id, data)}
                        />
                        {(item.part?.isOutsourced || item.assembly?.isOutsourced) && (
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}