"use client"

import { useState, useEffect } from "react"
import { useOrderCreateStore } from "@/stores/orderCreateStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Minus, Trash2, AlertTriangle, Construction } from "lucide-react"
import { nextJsApiClient } from '@/lib/api'

interface BuildNumberEntry {
  id: string
  buildNumber: string
  isValid: boolean
}

export function SinkSelectionStep() {
  const { sinkSelection, updateSinkSelection } = useOrderCreateStore()
  const [buildNumbers, setBuildNumbers] = useState<BuildNumberEntry[]>([
    { id: '1', buildNumber: '', isValid: false }
  ])
  const [sinkFamilies, setSinkFamilies] = useState<{ value: string, label: string, available: boolean }[]>([])

  useEffect(() => {
    nextJsApiClient.get('/configurator?type=sink-families')
      .then(res => {
        const families = res.data.data.map((fam: any) => ({
          value: fam.code,
          label: fam.name || fam.code,
          available: fam.available !== false // default to true if not specified
        }))
        setSinkFamilies(families)
      })
      .catch(() => {
        setSinkFamilies([
          { value: 'MDRD', label: 'MDRD CleanStation', available: true }
        ])      })  }, [])

  // Sync local build numbers state with store
  useEffect(() => {
    if (sinkSelection.quantity > 0 && sinkSelection.buildNumbers.length > 0) {
      const syncedBuildNumbers = sinkSelection.buildNumbers.map((buildNumber, index) => ({
        id: (index + 1).toString(),
        buildNumber: buildNumber,
        isValid: buildNumber.length >= 3 && !sinkSelection.buildNumbers.filter((bn, i) => i !== index).includes(buildNumber)
      }))
      
      // Only update if different to avoid infinite loops
      if (JSON.stringify(syncedBuildNumbers) !== JSON.stringify(buildNumbers)) {
        setBuildNumbers(syncedBuildNumbers)
      }
    } else if (sinkSelection.quantity > 0) {
      // Initialize empty build numbers if quantity is set but no build numbers exist
      const emptyBuildNumbers = Array.from({ length: sinkSelection.quantity }, (_, i) => ({
        id: (i + 1).toString(),
        buildNumber: '',
        isValid: false
      }))
      setBuildNumbers(emptyBuildNumbers)
    }
  }, [sinkSelection.quantity, sinkSelection.buildNumbers])

  const handleFamilyChange = (family: string) => {
    if (family === 'ENDOSCOPE_CLEANSTATION') {
      // Redirect to under construction page
      window.location.href = '/under-construction/endoscope'
      return
    }
    if (family === 'INSTROSINK') {
      // Redirect to under construction page
      window.location.href = '/under-construction/instrosink'
      return
    }
    updateSinkSelection({ sinkFamily: family })
  }
  const handleQuantityChange = (quantity: number) => {
    updateSinkSelection({ quantity })
    
    // Adjust build number entries based on quantity
    const newBuildNumbers = [...buildNumbers]
    
    if (quantity > buildNumbers.length) {
      // Add more build number entries
      for (let i = buildNumbers.length; i < quantity; i++) {
        newBuildNumbers.push({
          id: (i + 1).toString(),
          buildNumber: '',
          isValid: false
        })
      }
    } else if (quantity < buildNumbers.length) {
      // Remove excess build number entries
      newBuildNumbers.splice(quantity)
    }
    
    setBuildNumbers(newBuildNumbers)
    // Update store with current build numbers (even if empty)
    const allBuildNumbers = newBuildNumbers.map(bn => bn.buildNumber)
    updateSinkSelection({ buildNumbers: allBuildNumbers })
  }
  const handleBuildNumberChange = (index: number, value: string) => {
    const newBuildNumbers = [...buildNumbers]
    newBuildNumbers[index] = {
      ...newBuildNumbers[index],
      buildNumber: value,
      isValid: value.length >= 3 && !isDuplicateBuildNumber(value, index)
    }
    setBuildNumbers(newBuildNumbers)
    
    // Update store with all build numbers (not just valid ones)
    const allBuildNumbers = newBuildNumbers.map(bn => bn.buildNumber)
    updateSinkSelection({ buildNumbers: allBuildNumbers })
  }

  const isDuplicateBuildNumber = (buildNumber: string, currentIndex: number): boolean => {
    return buildNumbers.some((bn, index) => 
      index !== currentIndex && bn.buildNumber === buildNumber
    )
  }

  const getAllBuildNumbersValid = (): boolean => {
    return buildNumbers.every(bn => bn.isValid) && buildNumbers.length === sinkSelection.quantity
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Sink Selection & Quantities</h2>
        <p className="text-slate-600">
          Choose the sink family, specify quantities, and assign unique build numbers for each sink unit.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sink Family Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Sink Family</CardTitle>
            <CardDescription>
              Select the CleanStation family for this order
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sinkFamily">CleanStation Family *</Label>
              <Select value={sinkSelection.sinkFamily} onValueChange={handleFamilyChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a sink family" />
                </SelectTrigger>
                <SelectContent>
                  {sinkFamilies.map((family) => (
                    <SelectItem 
                      key={family.value} 
                      value={family.value}
                      disabled={!family.available}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{family.label}</span>
                        {!family.available && (
                          <Badge variant="secondary" className="ml-2">
                            <Construction className="w-3 h-3 mr-1" />
                            Under Construction
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </CardContent>
        </Card>

        {/* Quantity & Build Numbers */}
        <Card>
          <CardHeader>
            <CardTitle>Order Quantity & Build Numbers</CardTitle>
            <CardDescription>
              Specify quantity and assign unique build numbers for each sink
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="quantity">Number of Sinks *</Label>
              <div className="flex items-center space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(Math.max(0, (sinkSelection.quantity || 0) - 1))}
                  disabled={!sinkSelection.quantity || sinkSelection.quantity <= 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="w-20 text-center">
                  <span className="text-2xl font-semibold">{sinkSelection.quantity || 0}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange((sinkSelection.quantity || 0) + 1)}
                  disabled={sinkSelection.quantity >= 10}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {sinkSelection.quantity >= 10 && (
                <p className="text-xs text-muted-foreground">Maximum 10 sinks per order</p>
              )}
            </div>

            {/* Build Numbers */}
            {sinkSelection.quantity && sinkSelection.quantity > 0 && (
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <Label className="text-base font-medium">Build Numbers *</Label>
                  <p className="text-sm text-slate-600 mt-1">
                    Assign unique build numbers for each sink
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {buildNumbers.map((buildNumber, index) => (
                    <div key={buildNumber.id} className="space-y-2">
                      <Label htmlFor={`buildNumber-${index}`}>
                        Sink {index + 1} Build Number *
                      </Label>
                      <div className="relative">
                        <Input
                          id={`buildNumber-${index}`}
                          value={buildNumber.buildNumber}
                          onChange={(e) => handleBuildNumberChange(index, e.target.value)}
                          placeholder={`Enter unique build number for sink ${index + 1}`}
                          className={`w-full ${
                            buildNumber.buildNumber && !buildNumber.isValid 
                              ? 'border-red-300 focus:border-red-500' 
                              : buildNumber.isValid 
                              ? 'border-green-300 focus:border-green-500' 
                              : ''
                          }`}
                        />
                        {buildNumber.buildNumber && !buildNumber.isValid && (
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                          </div>
                        )}
                      </div>
                      {buildNumber.buildNumber && !buildNumber.isValid && (
                        <p className="text-xs text-red-600">
                          {isDuplicateBuildNumber(buildNumber.buildNumber, index)
                            ? 'Build number must be unique'
                            : 'Build number must be at least 3 characters'
                          }
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>


    </div>
  )
}
