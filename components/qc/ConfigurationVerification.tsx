"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  CheckCircle2,
  AlertTriangle,
  Info,
  Package,
  Ruler,
  Grid3X3,
  Settings,
  User,
  Calendar,
  FileText
} from "lucide-react"
import { format } from "date-fns"

interface ConfigurationData {
  buildNumber: string
  sinkModel: string
  dimensions: {
    width: number
    length: number
    unit: string
  }
  structuralComponents: {
    legs: {
      typeId: string
      name: string
      type: string
    }
    feet: {
      typeId: string
      name: string
      type: string
    }
  }
  pegboard: boolean
  pegboardType?: string
  basins: Array<{
    position: number
    type: string
    size: string
    addons: string[]
  }>
  faucets: any[]
  sprayers: any[]
  workflowDirection: string
}

interface OrderData {
  poNumber: string
  customerName: string
  buildNumbers: string[]
  status?: string
}

interface VerificationData {
  [key: string]: {
    verified: boolean
    notes?: string
  }
}

interface ConfigurationVerificationProps {
  orderData: OrderData
  configuration: ConfigurationData
  onVerificationChange: (verificationData: VerificationData) => void
  verificationData: VerificationData
}

export function ConfigurationVerification({ 
  orderData, 
  configuration, 
  onVerificationChange,
  verificationData 
}: ConfigurationVerificationProps) {
  const [localVerificationData, setLocalVerificationData] = useState<VerificationData>(verificationData)

  const handleVerificationChange = (key: string, verified: boolean, notes?: string) => {
    const updated = {
      ...localVerificationData,
      [key]: {
        verified,
        notes: notes || localVerificationData[key]?.notes || ''
      }
    }
    setLocalVerificationData(updated)
    onVerificationChange(updated)
  }

  const handleNotesChange = (key: string, notes: string) => {
    const updated = {
      ...localVerificationData,
      [key]: {
        verified: localVerificationData[key]?.verified || false,
        notes
      }
    }
    setLocalVerificationData(updated)
    onVerificationChange(updated)
  }

  const getVerificationStatus = () => {
    const totalItems = Object.keys(getVerificationItems()).length
    const verifiedItems = Object.values(localVerificationData).filter(item => item.verified).length
    return { total: totalItems, verified: verifiedItems }
  }

  const getVerificationItems = () => {
    return {
      basinCount: `Basin count: ${configuration.basins.length} basins`,
      pegboard: `Pegboard: ${configuration.pegboard ? 'Yes' : 'No'}`,
      feetType: `Feet type: ${configuration.structuralComponents.feet.name}`,
      dimensions: `Sink dimensions: ${configuration.dimensions.width}″ x ${configuration.dimensions.length}″`,
      sinkModel: `Sink model: ${configuration.sinkModel}`
    }
  }

  const status = getVerificationStatus()
  const allVerified = status.verified === status.total
  const hasDiscrepancies = Object.values(localVerificationData).some(item => !item.verified && item.notes)

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Configuration Verification
              </CardTitle>
              <CardDescription>
                Verify that the physical build matches the expected configuration before proceeding with inspection
              </CardDescription>
            </div>
            <Badge 
              variant={allVerified ? "default" : "secondary"}
              className={allVerified ? "bg-green-100 text-green-700" : ""}
            >
              {status.verified}/{status.total} Verified
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Order Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            Order Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <div>
                <div className="text-sm text-slate-600">PO Number</div>
                <div className="font-medium">{orderData.poNumber}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              <div>
                <div className="text-sm text-slate-600">Customer</div>
                <div className="font-medium">{orderData.customerName}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <div>
                <div className="text-sm text-slate-600">Inspection Date</div>
                <div className="font-medium">{format(new Date(), "MMM dd, yyyy")}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expected Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Expected Configuration
          </CardTitle>
          <CardDescription>
            The configuration below is what should be built according to the order specifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Basic Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Build Number:</span>
                    <span className="font-medium">{configuration.buildNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Sink Model:</span>
                    <span className="font-medium">{configuration.sinkModel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Workflow Direction:</span>
                    <span className="font-medium">{configuration.workflowDirection.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  Dimensions
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Width:</span>
                    <span className="font-medium">{configuration.dimensions.width}{configuration.dimensions.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Length:</span>
                    <span className="font-medium">{configuration.dimensions.length}{configuration.dimensions.unit}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Structural Components */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Structural Components</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Legs:</span>
                    <span className="font-medium">{configuration.structuralComponents.legs.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Feet:</span>
                    <span className="font-medium">{configuration.structuralComponents.feet.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Pegboard:</span>
                    <Badge variant={configuration.pegboard ? "default" : "secondary"}>
                      {configuration.pegboard ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4" />
                  Basins ({configuration.basins.length})
                </h4>
                <div className="space-y-2">
                  {configuration.basins.map((basin, index) => (
                    <div key={index} className="text-sm border rounded p-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">Basin {basin.position}</span>
                        <Badge variant="outline">{basin.type}</Badge>
                      </div>
                      <div className="text-slate-600 text-xs">
                        Size: {basin.size} | Addons: {basin.addons.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Physical Verification Checklist
          </CardTitle>
          <CardDescription>
            Check each item below to confirm the physical build matches the expected configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(getVerificationItems()).map(([key, description]) => {
              const isVerified = localVerificationData[key]?.verified || false
              const notes = localVerificationData[key]?.notes || ''
              
              return (
                <div key={key} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={key}
                      checked={isVerified}
                      onCheckedChange={(checked) => handleVerificationChange(key, !!checked)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label 
                        htmlFor={key}
                        className="text-base font-medium cursor-pointer flex items-center gap-2"
                      >
                        {description}
                        {isVerified && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                      </Label>
                      <p className="text-sm text-slate-600 mt-1">
                        Verify that the physical build matches this specification
                      </p>
                    </div>
                  </div>

                  <div className="ml-6">
                    <Label className="text-sm text-slate-600">
                      Notes {!isVerified && <span className="text-red-500">(Required if not verified)</span>}
                    </Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => handleNotesChange(key, e.target.value)}
                      placeholder={
                        isVerified 
                          ? "Add any additional notes (optional)..." 
                          : "Explain the discrepancy and what was found instead..."
                      }
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                  
                  {key !== Object.keys(getVerificationItems())[Object.keys(getVerificationItems()).length - 1] && (
                    <Separator />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Status Alert */}
      {!allVerified && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {hasDiscrepancies 
              ? "Configuration discrepancies found. Please review notes and contact production coordinator if needed."
              : "Please verify all configuration items before proceeding to the next inspection phase."
            }
          </AlertDescription>
        </Alert>
      )}

      {allVerified && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Configuration verification complete! You can now proceed to the detailed inspection.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}