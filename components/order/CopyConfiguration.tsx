"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Copy, CheckCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CopyConfigurationProps {
  buildNumbers: string[]
  currentBuildNumber: string
  configurations: Record<string, any>
  onCopyConfiguration: (sourceBuildNumber: string, targetBuildNumber: string) => void
}

export function CopyConfiguration({
  buildNumbers,
  currentBuildNumber,
  configurations,
  onCopyConfiguration
}: CopyConfigurationProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [sourceBuildNumber, setSourceBuildNumber] = useState("")

  // Get available source build numbers (those that have configurations and are not the current one)
  const availableSourceBuilds = buildNumbers.filter(buildNumber => 
    buildNumber !== currentBuildNumber && 
    configurations[buildNumber] && 
    isConfigurationComplete(configurations[buildNumber])
  )

  function isConfigurationComplete(config: any): boolean {
    return !!(
      config.sinkModelId &&
      config.width &&
      config.length &&
      config.legsTypeId &&
      config.feetTypeId &&
      config.basins &&
      config.basins.length > 0 &&
      config.basins.every((basin: any) => basin.basinType && basin.basinSizePartNumber)
    )
  }

  const handleCopy = () => {
    if (!sourceBuildNumber) {
      toast({
        title: "Selection Required",
        description: "Please select a sink configuration to copy from",
        variant: "destructive"
      })
      return
    }

    try {
      onCopyConfiguration(sourceBuildNumber, currentBuildNumber)
      
      toast({
        title: "Configuration Copied",
        description: `Successfully copied configuration from ${sourceBuildNumber} to ${currentBuildNumber}`,
      })
      
      setIsOpen(false)
      setSourceBuildNumber("")
    } catch (error) {
      console.error("Error copying configuration:", error)
      toast({
        title: "Copy Failed",
        description: "Failed to copy configuration. Please try again.",
        variant: "destructive"
      })
    }
  }

  const getConfigurationSummary = (config: any) => {
    if (!config) return "No configuration"

    const parts = []
    
    if (config.sinkModelId) {
      parts.push(`Model: ${config.sinkModelId}`)
    }
    
    if (config.width && config.length) {
      parts.push(`${config.width}" × ${config.length}"`)
    }
    
    if (config.basins?.length) {
      const basinTypes = config.basins.map((b: any) => b.basinType).filter(Boolean)
      if (basinTypes.length > 0) {
        parts.push(`Basins: ${basinTypes.join(", ")}`)
      }
    }
    
    if (config.pegboard) {
      parts.push("Pegboard")
    }
    
    if (config.faucets?.length) {
      parts.push(`${config.faucets.length} Faucet${config.faucets.length > 1 ? 's' : ''}`)
    }
    
    if (config.sprayers?.length) {
      parts.push(`${config.sprayers.length} Sprayer${config.sprayers.length > 1 ? 's' : ''}`)
    }

    return parts.length > 0 ? parts.join(" • ") : "Partial configuration"
  }

  // Don't show the copy button if there are no available source configurations
  if (availableSourceBuilds.length === 0) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Copy className="h-4 w-4" />
          Copy From
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Copy Configuration
          </DialogTitle>
          <DialogDescription>
            Copy the complete configuration from another sink to {currentBuildNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This will replace the current configuration for {currentBuildNumber} with the selected source configuration.
              All existing settings will be overwritten.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="source">Copy configuration from:</Label>
            <Select value={sourceBuildNumber} onValueChange={setSourceBuildNumber}>
              <SelectTrigger>
                <SelectValue placeholder="Select a configured sink to copy from" />
              </SelectTrigger>
              <SelectContent>
                {availableSourceBuilds.map((buildNumber) => (
                  <SelectItem key={buildNumber} value={buildNumber}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{buildNumber}</span>
                      <CheckCircle className="h-4 w-4 text-green-600 ml-2" />
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {sourceBuildNumber && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Configuration Preview:</Label>
              <div className="rounded-lg bg-muted p-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Source: {sourceBuildNumber}</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getConfigurationSummary(configurations[sourceBuildNumber])}
                  </p>
                </div>
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                ↓ Copy to ↓
              </div>
              
              <div className="rounded-lg bg-muted p-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Target: {currentBuildNumber}</span>
                    {isConfigurationComplete(configurations[currentBuildNumber]) ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {configurations[currentBuildNumber] 
                      ? getConfigurationSummary(configurations[currentBuildNumber])
                      : "No configuration"
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">What will be copied:</Label>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Sink model and dimensions</li>
              <li>• Leg and feet types</li>
              <li>• Pegboard configuration</li>
              <li>• Basin types and sizes</li>
              <li>• Faucet configurations</li>
              <li>• Sprayer configurations</li>
              <li>• Accessories and add-ons</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-6">
          <Button
            variant="outline"
            onClick={() => {
              setIsOpen(false)
              setSourceBuildNumber("")
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCopy}
            disabled={!sourceBuildNumber}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}