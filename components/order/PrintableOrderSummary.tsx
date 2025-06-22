"use client"

import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface PrintableOrderSummaryProps {
  order: any
  bomItems?: any[]
  showBOM?: boolean
  showConfiguration?: boolean
  showQCResults?: boolean
}

// Status display names
const statusDisplayNames: Record<string, string> = {
  ORDER_CREATED: "Order Created",
  SINK_BODY_EXTERNAL_PRODUCTION: "Sink Body in External Production",
  READY_FOR_PRE_QC: "Ready for Pre-QC",
  READY_FOR_PRODUCTION: "Ready for Production",
  TESTING_COMPLETE: "Testing Complete",
  PACKAGING_COMPLETE: "Packaging Complete",
  READY_FOR_FINAL_QC: "Ready for Final QC",
  READY_FOR_SHIP: "Ready for Ship",
  SHIPPED: "Shipped"
}

// Helper function to get readable description from part/assembly ID
const getPartDescription = (partId: string): string => {
  const partDescriptions: Record<string, string> = {
    // Sink Models
    'T2-36': 'T2 CleanStation 36" Standard',
    'T2-48': 'T2 CleanStation 48" Standard', 
    'T2-60': 'T2 CleanStation 60" Standard',
    'T2-72': 'T2 CleanStation 72" Standard',
    
    // Legs & Feet
    'T2-DL27-KIT': 'Height Adjustable Column Kit (DL27)',
    'T2-DL14-KIT': 'Height Adjustable Column Kit (DL14)',
    'T2-LC1-KIT': 'Height Adjustable Triple Column Kit (LC1)',
    'T2-DL27-FH-KIT': 'Fixed Height Column Kit (DL27)',
    'T2-DL14-FH-KIT': 'Fixed Height Column Kit (DL14)',
    'T2-LEVELING-CASTOR-475': 'Leveling Casters with Brake (4x)',
    'T2-SEISMIC-FEET': 'Seismic Feet for Earthquake Safety',
    
    // Basin Types
    'E_SINK': 'Standard E-Sink Basin',
    'E_SINK_DI': 'E-Sink Basin with Deionized Water',
    'E_DRAIN': 'E-Drain Basin for Drainage',
  }
  
  return partDescriptions[partId] || partId
}

export function PrintableOrderSummary({ 
  order, 
  bomItems = [], 
  showBOM = true, 
  showConfiguration = true,
  showQCResults = false
}: PrintableOrderSummaryProps) {
  if (!order) return null

  return (
    <div className="print-container space-y-6 p-8 bg-white">
      {/* Print-specific styles */}
      <style jsx>{`
        @media print {
          .print-container {
            margin: 0;
            padding: 0;
            background: white !important;
            color: black !important;
            font-size: 11px;
            line-height: 1.4;
          }
          
          .print-page-break {
            page-break-before: always;
          }
          
          .print-hide {
            display: none !important;
          }
          
          .print-table {
            border-collapse: collapse;
            width: 100%;
          }
          
          .print-table th,
          .print-table td {
            border: 1px solid #ddd;
            padding: 4px 8px;
            text-align: left;
          }
          
          .print-table th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          
          .print-header {
            border-bottom: 2px solid #000;
            margin-bottom: 20px;
            padding-bottom: 15px;
          }
        }
      `}</style>

      {/* Header with Company Info */}
      <div className="print-header flex justify-between items-start border-b-2 border-gray-900 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Torvan Medical CleanStation</h1>
          <p className="text-sm text-gray-600">Production Order Summary</p>
          <p className="text-xs text-gray-500">Generated on {format(new Date(), "MMMM dd, yyyy 'at' HH:mm")}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold">PO: {order.poNumber}</div>
          <Badge className="mt-1">
            {statusDisplayNames[order.orderStatus] || order.orderStatus}
          </Badge>
        </div>
      </div>

      {/* Order Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Order Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <strong>Customer:</strong><br />
              {order.customerName}
            </div>
            <div>
              <strong>Project:</strong><br />
              {order.projectName || 'N/A'}
            </div>
            <div>
              <strong>Sales Person:</strong><br />
              {order.salesPerson}
            </div>
            <div>
              <strong>Language:</strong><br />
              {order.language === "EN" ? "English" : order.language === "FR" ? "French" : "Spanish"}
            </div>
            <div>
              <strong>Order Date:</strong><br />
              {format(new Date(order.createdAt), "MMM dd, yyyy")}
            </div>
            <div>
              <strong>Want Date:</strong><br />
              {format(new Date(order.wantDate), "MMM dd, yyyy")}
            </div>
            <div>
              <strong>Created By:</strong><br />
              {order.createdBy?.fullName || 'Unknown'}
            </div>
            <div>
              <strong>Current Assignee:</strong><br />
              {order.currentAssignee || 'Unassigned'}
            </div>
          </div>
          {order.notes && (
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <strong>Notes:</strong><br />
              {order.notes}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Build Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Build Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {order.buildNumbers.map((buildNumber: string) => {
              const sinkConfig = order.sinkConfigurations?.find((sc: any) => sc.buildNumber === buildNumber)
              const basinConfigs = order.basinConfigurations?.filter((bc: any) => bc.buildNumber === buildNumber) || []
              
              if (!sinkConfig) return null
              
              return (
                <div key={buildNumber} className="border rounded p-3">
                  <h4 className="font-semibold mb-2">{buildNumber}</h4>
                  <div className="text-sm space-y-1">
                    <div><strong>Dimensions:</strong> {sinkConfig.width}" × {sinkConfig.length}"</div>
                    <div><strong>Legs:</strong> {getPartDescription(sinkConfig.legsTypeId || '')}</div>
                    <div><strong>Feet:</strong> {getPartDescription(sinkConfig.feetTypeId || '')}</div>
                    <div><strong>Pegboard:</strong> {sinkConfig.pegboard ? 'Yes' : 'No'}</div>
                    <div><strong>Basins:</strong> {basinConfigs.length}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Details (if enabled) */}
      {showConfiguration && (
        <div className="print-page-break">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Detailed Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              {order.buildNumbers.map((buildNumber: string) => {
                const sinkConfig = order.sinkConfigurations?.find((sc: any) => sc.buildNumber === buildNumber)
                const basinConfigs = order.basinConfigurations?.filter((bc: any) => bc.buildNumber === buildNumber) || []
                const faucetConfigs = order.faucetConfigurations?.filter((fc: any) => fc.buildNumber === buildNumber) || []
                const sprayerConfigs = order.sprayerConfigurations?.filter((sc: any) => sc.buildNumber === buildNumber) || []
                const accessories = order.selectedAccessories?.filter((sa: any) => sa.buildNumber === buildNumber) || []

                return (
                  <div key={buildNumber} className="mb-6 last:mb-0">
                    <h4 className="font-semibold text-base mb-3 border-b pb-1">{buildNumber}</h4>
                    
                    {/* Sink Configuration */}
                    <div className="mb-4">
                      <h5 className="font-medium mb-2">Sink Configuration</h5>
                      <Table className="print-table">
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Model</TableCell>
                            <TableCell>{getPartDescription(sinkConfig?.sinkModelId || '')}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Dimensions</TableCell>
                            <TableCell>{sinkConfig?.width}" × {sinkConfig?.length}"</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Workflow Direction</TableCell>
                            <TableCell>{sinkConfig?.workflowDirection?.replace('_', ' to ') || 'N/A'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Legs</TableCell>
                            <TableCell>{getPartDescription(sinkConfig?.legsTypeId || '')}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Feet</TableCell>
                            <TableCell>{getPartDescription(sinkConfig?.feetTypeId || '')}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Pegboard</TableCell>
                            <TableCell>
                              {sinkConfig?.pegboard ? 
                                `Yes - ${sinkConfig.pegboardTypeId || 'Standard'} (${sinkConfig.pegboardColorId || 'Default'})` : 
                                'No'
                              }
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {/* Basin Configuration */}
                    {basinConfigs.length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-medium mb-2">Basin Configuration ({basinConfigs.length} basins)</h5>
                        <Table className="print-table">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Basin #</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Size</TableHead>
                              <TableHead>Add-ons</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {basinConfigs.map((basin: any, idx: number) => (
                              <TableRow key={idx}>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell>{getPartDescription(basin.basinTypeId)}</TableCell>
                                <TableCell>{getPartDescription(basin.basinSizePartNumber)}</TableCell>
                                <TableCell>{basin.addonIds?.join(', ') || 'None'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Faucet Configuration */}
                    {faucetConfigs.length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-medium mb-2">Faucet Configuration</h5>
                        <Table className="print-table">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead>Placement</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {faucetConfigs.map((faucet: any, idx: number) => (
                              <TableRow key={idx}>
                                <TableCell>{getPartDescription(faucet.faucetTypeId)}</TableCell>
                                <TableCell>{faucet.faucetQuantity}</TableCell>
                                <TableCell>{faucet.faucetPlacement || 'N/A'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Accessories */}
                    {accessories.length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-medium mb-2">Accessories</h5>
                        <Table className="print-table">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Assembly ID</TableHead>
                              <TableHead>Quantity</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {accessories.map((accessory: any, idx: number) => (
                              <TableRow key={idx}>
                                <TableCell>{accessory.assemblyId}</TableCell>
                                <TableCell>{accessory.quantity}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bill of Materials (if enabled and available) */}
      {showBOM && bomItems.length > 0 && (
        <div className="print-page-break">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Bill of Materials</CardTitle>
            </CardHeader>
            <CardContent>
              <Table className="print-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bomItems.map((item: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.name || item.partIdOrAssemblyId}</TableCell>
                      <TableCell>{item.itemType || 'N/A'}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.category || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 text-sm text-gray-600">
                Total Items: {bomItems.length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Order History */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Order History</CardTitle>
        </CardHeader>
        <CardContent>
          {order.historyLogs && order.historyLogs.length > 0 ? (
            <Table className="print-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.historyLogs.slice(0, 10).map((log: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="text-xs">
                      {format(new Date(log.timestamp), "MMM dd, HH:mm")}
                    </TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.user?.fullName || 'System'}</TableCell>
                    <TableCell className="text-xs">{log.notes || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500">No history available</p>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
        <p>This document was generated by the Torvan Medical CleanStation Production System</p>
        <p>For questions or concerns, please contact your Production Coordinator</p>
      </div>
    </div>
  )
}