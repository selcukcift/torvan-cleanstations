"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { 
  CheckCircle2,
  AlertCircle,
  Circle,
  Droplets
} from "lucide-react"

interface QCTemplateItem {
  id: string
  section: string
  checklistItem: string
  itemType: 'PASS_FAIL' | 'TEXT_INPUT' | 'NUMERIC_INPUT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'DATE_INPUT' | 'CHECKBOX'
  isBasinSpecific?: boolean
  isRequired: boolean
  order: number
  options?: any
  expectedValue?: string
  applicabilityCondition?: string
  repeatPer?: string
  repeatIndex?: number
  originalId?: string
  notesPrompt?: string
}

interface QCFormData {
  [itemId: string]: {
    value: any
    notes?: string
    passed?: boolean
  }
}

interface BasinData {
  basinNumber: number
  items: QCTemplateItem[]
  completedCount: number
  totalCount: number
  status: 'completed' | 'in-progress' | 'pending' | 'failed'
}

interface BasinInspectionGridProps {
  basinItems: QCTemplateItem[]
  formData: QCFormData
  onItemValueChange: (itemId: string, value: any, field?: 'value' | 'notes') => void
}

export function BasinInspectionGrid({ basinItems, formData, onItemValueChange }: BasinInspectionGridProps) {
  // Group basin items by basin number
  const basinGroups = basinItems.reduce((groups: Record<number, QCTemplateItem[]>, item) => {
    const basinNumber = item.repeatIndex || 1
    if (!groups[basinNumber]) {
      groups[basinNumber] = []
    }
    groups[basinNumber].push(item)
    return groups
  }, {})

  // Convert to basin data with status
  const basinsData: BasinData[] = Object.entries(basinGroups).map(([basinNum, items]) => {
    const basinNumber = parseInt(basinNum)
    const completedCount = getCompletedCount(items)
    const totalCount = items.length
    const failedCount = getFailedCount(items)
    
    let status: 'completed' | 'in-progress' | 'pending' | 'failed' = 'pending'
    if (failedCount > 0) {
      status = 'failed'
    } else if (completedCount === totalCount) {
      status = 'completed'
    } else if (completedCount > 0) {
      status = 'in-progress'
    }

    return {
      basinNumber,
      items,
      completedCount,
      totalCount,
      status
    }
  }).sort((a, b) => a.basinNumber - b.basinNumber)

  function getCompletedCount(items: QCTemplateItem[]): number {
    return items.filter(item => {
      const itemKey = item.repeatIndex ? `${item.originalId || item.id}-${item.repeatIndex}` : item.id
      const itemData = formData[itemKey]
      if (!itemData) return false
      
      if (item.isRequired) {
        if (item.itemType === 'CHECKBOX') {
          return itemData.value === true
        }
        return itemData.value !== '' && itemData.value !== null && itemData.value !== undefined
      }
      return true
    }).length
  }

  function getFailedCount(items: QCTemplateItem[]): number {
    return items.filter(item => {
      const itemKey = item.repeatIndex ? `${item.originalId || item.id}-${item.repeatIndex}` : item.id
      const itemData = formData[itemKey]
      return itemData?.value === 'FAIL'
    }).length
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'border-green-200 bg-green-50'
      case 'in-progress': return 'border-blue-200 bg-blue-50'
      case 'failed': return 'border-red-200 bg-red-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'in-progress': return <Circle className="w-5 h-5 text-blue-600" />
      case 'failed': return <AlertCircle className="w-5 h-5 text-red-600" />
      default: return <Circle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-100 text-green-700">Complete</Badge>
      case 'in-progress': return <Badge className="bg-blue-100 text-blue-700">In Progress</Badge>
      case 'failed': return <Badge className="bg-red-100 text-red-700">Failed</Badge>
      default: return <Badge variant="secondary">Pending</Badge>
    }
  }

  const renderFormField = (item: QCTemplateItem) => {
    const itemKey = item.repeatIndex ? `${item.originalId || item.id}-${item.repeatIndex}` : item.id
    const itemData = formData[itemKey] || { value: '', notes: '' }

    switch (item.itemType) {
      case 'CHECKBOX':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={itemKey}
              checked={itemData.value}
              onCheckedChange={(checked) => onItemValueChange(itemKey, checked)}
            />
            <Label htmlFor={itemKey} className="text-sm">Yes</Label>
          </div>
        )

      case 'SINGLE_SELECT':
        const selectOptions = typeof item.options === 'string' 
          ? JSON.parse(item.options || '[]') 
          : (item.options || []);
        return (
          <Select value={itemData.value} onValueChange={(value) => onItemValueChange(itemKey, value)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.map((option: string) => (
                <SelectItem key={option} value={option} className="text-sm">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'TEXT_INPUT':
        return (
          <Input
            value={itemData.value}
            onChange={(e) => onItemValueChange(itemKey, e.target.value)}
            placeholder="Enter value..."
            className="h-8 text-sm"
          />
        )

      case 'NUMERIC_INPUT':
        return (
          <Input
            type="number"
            value={itemData.value}
            onChange={(e) => onItemValueChange(itemKey, e.target.value)}
            placeholder="Enter number..."
            className="h-8 text-sm"
          />
        )

      default:
        return <div className="text-xs text-gray-500">Unsupported field type</div>
    }
  }

  if (basinsData.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Droplets className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium">No Basin Items</p>
          <p className="text-slate-600">No basin-specific inspection items found.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Basin Grid Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {basinsData.map((basin) => (
          <Card key={basin.basinNumber} className={`${getStatusColor(basin.status)} transition-colors`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Droplets className="w-5 h-5" />
                  Basin {basin.basinNumber}
                </CardTitle>
                {getStatusIcon(basin.status)}
              </div>
              <div className="flex items-center justify-between">
                {getStatusBadge(basin.status)}
                <span className="text-sm text-slate-600">
                  {basin.completedCount}/{basin.totalCount} items
                </span>
              </div>
              <Progress 
                value={(basin.completedCount / basin.totalCount) * 100} 
                className="h-2" 
              />
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Detailed Basin Inspection */}
      <div className="space-y-8">
        {basinsData.map((basin) => (
          <Card key={`detail-${basin.basinNumber}`} className={`${getStatusColor(basin.status)}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Droplets className="w-6 h-6" />
                  <div>
                    <CardTitle className="text-xl">Basin {basin.basinNumber} Inspection</CardTitle>
                    <CardDescription>
                      Complete all {basin.totalCount} inspection points for this basin
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(basin.status)}
                  <div className="text-right">
                    <div className="text-sm font-medium">{basin.completedCount}/{basin.totalCount}</div>
                    <div className="text-xs text-slate-600">completed</div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {basin.items
                  .sort((a, b) => a.order - b.order)
                  .map((item) => {
                    const itemKey = item.repeatIndex ? `${item.originalId || item.id}-${item.repeatIndex}` : item.id
                    const itemData = formData[itemKey] || { value: '', notes: '' }
                    const isCompleted = item.isRequired ? 
                      (item.itemType === 'CHECKBOX' ? itemData.value === true : itemData.value !== '' && itemData.value !== null) :
                      true
                    
                    return (
                      <Card key={itemKey} className={`border ${isCompleted ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <Label className="text-sm font-medium flex items-center gap-2">
                                {item.checklistItem.replace(`Basin ${basin.basinNumber}`, '').replace('Basin 1', '').trim()}
                                {item.isRequired && <span className="text-red-500">*</span>}
                                {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                              </Label>
                            </div>
                            
                            <div>
                              {renderFormField(item)}
                            </div>

                            {item.notesPrompt && (
                              <div>
                                <Label className="text-xs text-slate-600">Notes</Label>
                                <Textarea
                                  value={itemData.notes || ''}
                                  onChange={(e) => onItemValueChange(itemKey, e.target.value, 'notes')}
                                  placeholder={item.notesPrompt}
                                  rows={2}
                                  className="mt-1 text-sm"
                                />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}