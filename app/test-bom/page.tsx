'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { BOMDebugHelper } from '@/components/debug/BOMDebugHelper'

export default function TestBOMPage() {
  const [orderConfig, setOrderConfig] = useState({
    sinkModelId: 'MDRD_B1_ESINK_60',
    length: 60,
    width: 36,
    legsTypeId: 'T2-DL27-KIT',
    feetTypeId: 'T2-LEVELING-CASTOR-475',
    pegboard: false,
    pegboardTypeId: '',
    pegboardColorId: '',
    drawersAndCompartments: [],
    basins: [
      {
        basinType: 'E_SINK_DI',
        basinSize: 'T2-ADW-BASIN24X20X10',
        addonIds: []
      }
    ],
    faucets: [],
    sprayers: [],
    controlBoxId: null,
    accessories: []
  })

  // Sink models based on length - comprehensive combinations
  const getSinkModels = (length: number) => {
    const models = []
    
    // 48-60" Range (Uses T2-BODY-48-60-HA)
    if (length >= 48 && length <= 60) {
      // Single Basin Models
      models.push({ value: 'MDRD_B1_ESINK_48', label: 'Single Basin E-Sink (48-60") → T2-BODY-48-60-HA' })
      models.push({ value: 'MDRD_B1_ISINK_48', label: 'Single Basin I-Sink (48-60") → T2-BODY-48-60-HA' })
      models.push({ value: 'MDRD_B1_ESINK_60', label: 'Single Basin E-Sink 60" → T2-BODY-48-60-HA' })
      models.push({ value: 'MDRD_B1_ISINK_60', label: 'Single Basin I-Sink 60" → T2-BODY-48-60-HA' })
      
      // Double Basin Models (for 48-60" range)
      models.push({ value: 'MDRD_B2_ESINK_48', label: 'Double Basin E-Sink (48-60") → T2-BODY-48-60-HA' })
      models.push({ value: 'MDRD_B2_ISINK_48', label: 'Double Basin I-Sink (48-60") → T2-BODY-48-60-HA' })
      models.push({ value: 'MDRD_B2_ESINK_60', label: 'Double Basin E-Sink 60" → T2-BODY-48-60-HA' })
      models.push({ value: 'MDRD_B2_ISINK_60', label: 'Double Basin I-Sink 60" → T2-BODY-48-60-HA' })
    }
    
    // 61-72" Range (Uses T2-BODY-61-72-HA)
    if (length >= 61 && length <= 72) {
      // Single Basin Models
      models.push({ value: 'MDRD_B1_ESINK_61', label: 'Single Basin E-Sink (61-72") → T2-BODY-61-72-HA' })
      models.push({ value: 'MDRD_B1_ISINK_61', label: 'Single Basin I-Sink (61-72") → T2-BODY-61-72-HA' })
      models.push({ value: 'MDRD_B1_ESINK_72', label: 'Single Basin E-Sink 72" → T2-BODY-61-72-HA' })
      models.push({ value: 'MDRD_B1_ISINK_72', label: 'Single Basin I-Sink 72" → T2-BODY-61-72-HA' })
      
      // Double Basin Models
      models.push({ value: 'MDRD_B2_ESINK_61', label: 'Double Basin E-Sink (61-72") → T2-BODY-61-72-HA' })
      models.push({ value: 'MDRD_B2_ISINK_61', label: 'Double Basin I-Sink (61-72") → T2-BODY-61-72-HA' })
      models.push({ value: 'MDRD_B2_ESINK_72', label: 'Double Basin E-Sink 72" → T2-BODY-61-72-HA' })
      models.push({ value: 'MDRD_B2_ISINK_72', label: 'Double Basin I-Sink 72" → T2-BODY-61-72-HA' })
      
      // Triple Basin Models (starting at 61")
      models.push({ value: 'MDRD_B3_ESINK_61', label: 'Triple Basin E-Sink (61-72") → T2-BODY-61-72-HA' })
      models.push({ value: 'MDRD_B3_ISINK_61', label: 'Triple Basin I-Sink (61-72") → T2-BODY-61-72-HA' })
    }
    
    // 73-120" Range (Uses T2-BODY-73-120-HA)
    if (length >= 73 && length <= 120) {
      // Single Basin Models
      models.push({ value: 'MDRD_B1_ESINK_73', label: 'Single Basin E-Sink (73-120") → T2-BODY-73-120-HA' })
      models.push({ value: 'MDRD_B1_ISINK_73', label: 'Single Basin I-Sink (73-120") → T2-BODY-73-120-HA' })
      models.push({ value: 'MDRD_B1_ESINK_120', label: 'Single Basin E-Sink 120" → T2-BODY-73-120-HA' })
      models.push({ value: 'MDRD_B1_ISINK_120', label: 'Single Basin I-Sink 120" → T2-BODY-73-120-HA' })
      
      // Double Basin Models
      models.push({ value: 'MDRD_B2_ESINK_73', label: 'Double Basin E-Sink (73-120") → T2-BODY-73-120-HA' })
      models.push({ value: 'MDRD_B2_ISINK_73', label: 'Double Basin I-Sink (73-120") → T2-BODY-73-120-HA' })
      models.push({ value: 'MDRD_B2_ESINK_120', label: 'Double Basin E-Sink 120" → T2-BODY-73-120-HA' })
      models.push({ value: 'MDRD_B2_ISINK_120', label: 'Double Basin I-Sink 120" → T2-BODY-73-120-HA' })
      
      // Triple Basin Models
      models.push({ value: 'MDRD_B3_ESINK_73', label: 'Triple Basin E-Sink (73-120") → T2-BODY-73-120-HA' })
      models.push({ value: 'MDRD_B3_ISINK_73', label: 'Triple Basin I-Sink (73-120") → T2-BODY-73-120-HA' })
      models.push({ value: 'MDRD_B3_ESINK_84', label: 'Triple Basin E-Sink 84" → T2-BODY-73-120-HA' })
      models.push({ value: 'MDRD_B3_ISINK_84', label: 'Triple Basin I-Sink 84" → T2-BODY-73-120-HA' })
      models.push({ value: 'MDRD_B3_ESINK_120', label: 'Triple Basin E-Sink 120" → T2-BODY-73-120-HA' })
      models.push({ value: 'MDRD_B3_ISINK_120', label: 'Triple Basin I-Sink 120" → T2-BODY-73-120-HA' })
    }
    
    // Special Models (Instrosink)
    if (length >= 34 && length <= 40) {
      models.push({ value: 'T2-1B-INSTRO-HA', label: 'Single Bowl Instro Sink (34"×30")' })
    }
    
    // Custom/Extended Ranges
    if (length > 120) {
      models.push({ value: 'CUSTOM_SINK_EXTENDED', label: `Custom Sink ${length}" (Extended Range)` })
    }
    
    if (length < 48 && length >= 34) {
      models.push({ value: 'CUSTOM_SINK_COMPACT', label: `Custom Sink ${length}" (Compact Range)` })
    }
    
    return models
  }

  const sinkModels = getSinkModels(orderConfig.length)

  const [customerInfo] = useState({
    language: 'EN'
  })

  const [bomHelperVisible, setBomHelperVisible] = useState(true)

  const updateConfig = (key: string, value: any) => {
    setOrderConfig(prev => {
      const newConfig = {
        ...prev,
        [key]: value
      }
      
      // Auto-update sink model when length changes
      if (key === 'length') {
        const availableModels = getSinkModels(value)
        const currentModelStillValid = availableModels.some(model => model.value === prev.sinkModelId)
        
        if (!currentModelStillValid && availableModels.length > 0) {
          // Auto-select the first available model
          newConfig.sinkModelId = availableModels[0].value
        }
      }
      
      return newConfig
    })
  }

  const addBasin = () => {
    setOrderConfig(prev => ({
      ...prev,
      basins: [...prev.basins, {
        basinType: 'E_SINK',
        basinSize: 'T2-ADW-BASIN20X20X8',
        addonIds: []
      }]
    }))
  }

  const updateBasin = (index: number, key: string, value: any) => {
    setOrderConfig(prev => ({
      ...prev,
      basins: prev.basins.map((basin, i) => 
        i === index ? { ...basin, [key]: value } : basin
      )
    }))
  }

  const removeBasin = (index: number) => {
    setOrderConfig(prev => ({
      ...prev,
      basins: prev.basins.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>BOM Generation Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Basic Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sink Model (based on length: {orderConfig.length}")</Label>
              <Select value={orderConfig.sinkModelId} onValueChange={(value) => updateConfig('sinkModelId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sink model" />
                </SelectTrigger>
                <SelectContent>
                  {sinkModels.length > 0 ? (
                    sinkModels.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      No models available for {orderConfig.length}" length
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Legs Type</Label>
              <Select value={orderConfig.legsTypeId} onValueChange={(value) => updateConfig('legsTypeId', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="T2-DL27-KIT">Height Adjustable (DL27)</SelectItem>
                  <SelectItem value="T2-DL14-KIT">Height Adjustable (DL14)</SelectItem>
                  <SelectItem value="T2-LC1-KIT">Fixed Height</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Length (inches)</Label>
              <Input 
                type="number" 
                value={orderConfig.length} 
                onChange={(e) => updateConfig('length', parseInt(e.target.value) || 60)}
              />
            </div>
            <div>
              <Label>Width (inches)</Label>
              <Input 
                type="number" 
                value={orderConfig.width} 
                onChange={(e) => updateConfig('width', parseInt(e.target.value) || 36)}
              />
            </div>
            <div>
              <Label>Feet Type</Label>
              <Select value={orderConfig.feetTypeId} onValueChange={(value) => updateConfig('feetTypeId', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="T2-LEVELING-CASTOR-475">Leveling Casters</SelectItem>
                  <SelectItem value="T2-SEISMIC-FEET">Seismic Feet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pegboard Configuration */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch 
                checked={orderConfig.pegboard} 
                onCheckedChange={(checked) => updateConfig('pegboard', checked)}
              />
              <Label>Enable Pegboard</Label>
            </div>
            
            {orderConfig.pegboard && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pegboard Type</Label>
                  <Select value={orderConfig.pegboardTypeId} onValueChange={(value) => updateConfig('pegboardTypeId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERF">Perforated</SelectItem>
                      <SelectItem value="SOLID">Solid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Pegboard Color</Label>
                  <Select value={orderConfig.pegboardColorId} onValueChange={(value) => updateConfig('pegboardColorId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="T-OA-PB-COLOR-GREEN">Green</SelectItem>
                      <SelectItem value="T-OA-PB-COLOR-BLUE">Blue</SelectItem>
                      <SelectItem value="T-OA-PB-COLOR-RED">Red</SelectItem>
                      <SelectItem value="T-OA-PB-COLOR-BLACK">Black</SelectItem>
                      <SelectItem value="none">No Color</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Basins Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-medium">Basin Configuration</Label>
              <Button onClick={addBasin} size="sm">Add Basin</Button>
            </div>
            
            {orderConfig.basins.map((basin, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Basin {index + 1}</h4>
                  <Button onClick={() => removeBasin(index)} variant="destructive" size="sm">Remove</Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Basin Type</Label>
                    <Select value={basin.basinType} onValueChange={(value) => updateBasin(index, 'basinType', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="E_SINK">E-Sink Basin</SelectItem>
                        <SelectItem value="E_SINK_DI">E-Sink DI Basin</SelectItem>
                        <SelectItem value="E_DRAIN">E-Drain Basin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Basin Size</Label>
                    <Select value={basin.basinSize} onValueChange={(value) => updateBasin(index, 'basinSize', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="T2-ADW-BASIN20X20X8">20X20X8</SelectItem>
                        <SelectItem value="T2-ADW-BASIN24X20X8">24X20X8</SelectItem>
                        <SelectItem value="T2-ADW-BASIN24X20X10">24X20X10</SelectItem>
                        <SelectItem value="T2-ADW-BASIN30X20X8">30X20X8</SelectItem>
                        <SelectItem value="T2-ADW-BASIN30X20X10">30X20X10</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Current Configuration Display */}
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-sm">Current Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(orderConfig, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* BOM Debug Helper */}
      <BOMDebugHelper 
        orderConfig={orderConfig}
        customerInfo={customerInfo}
        isVisible={bomHelperVisible}
        onToggleVisibility={() => setBomHelperVisible(!bomHelperVisible)}
      />
    </div>
  )
}