"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Plus,
  Edit,
  Trash2,
  Copy,
  MoreHorizontal,
  ClipboardCheck,
  Settings,
  ArrowUp,
  ArrowDown,
  Save,
  X,
  FileText,
  Hash,
  Calendar,
  CheckSquare,
  List,
  Type,
  Loader2
} from "lucide-react"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface QCTemplateItem {
  id?: string
  text: string
  itemType: 'PASS_FAIL' | 'TEXT_INPUT' | 'NUMERIC_INPUT' | 'SELECT_OPTION' | 'DATE_INPUT' | 'CHECKBOX'
  required: boolean
  category: string
  order: number
  selectOptions?: string[]
  numericMin?: number
  numericMax?: number
  notes?: string
}

interface QCTemplate {
  id?: string
  name: string
  version: string
  description?: string
  appliesToProductFamily?: string
  isActive: boolean
  items: QCTemplateItem[]
  createdAt?: string
  updatedAt?: string
}

const ITEM_TYPE_OPTIONS = [
  { value: 'PASS_FAIL', label: 'Pass/Fail', icon: CheckSquare },
  { value: 'TEXT_INPUT', label: 'Text Input', icon: Type },
  { value: 'NUMERIC_INPUT', label: 'Numeric Input', icon: Hash },
  { value: 'SELECT_OPTION', label: 'Select Option', icon: List },
  { value: 'DATE_INPUT', label: 'Date Input', icon: Calendar },
  { value: 'CHECKBOX', label: 'Checkbox', icon: CheckSquare }
]

export function QCTemplateManager() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<QCTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<QCTemplate | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<QCTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [showItemDialog, setShowItemDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<QCTemplateItem | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await nextJsApiClient.get('/admin/qc-templates')
      
      if (response.data.success) {
        setTemplates(response.data.templates)
        if (response.data.templates.length > 0 && !selectedTemplate) {
          setSelectedTemplate(response.data.templates[0])
        }
      }
    } catch (error: any) {
      console.error('Error fetching templates:', error)
      toast({
        title: "Error",
        description: "Failed to load QC templates",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = () => {
    const newTemplate: QCTemplate = {
      name: "",
      version: "1.0",
      description: "",
      appliesToProductFamily: "",
      isActive: true,
      items: []
    }
    setEditingTemplate(newTemplate)
    setShowTemplateDialog(true)
  }

  const handleEditTemplate = (template: QCTemplate) => {
    setEditingTemplate({ ...template })
    setShowTemplateDialog(true)
  }

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return

    if (!editingTemplate.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name is required",
        variant: "destructive"
      })
      return
    }

    try {
      setSaving(true)
      
      if (editingTemplate.id) {
        // Update existing template
        const response = await nextJsApiClient.put(`/admin/qc-templates/${editingTemplate.id}`, editingTemplate)
        if (response.data.success) {
          toast({
            title: "Success",
            description: "Template updated successfully"
          })
        }
      } else {
        // Create new template
        const response = await nextJsApiClient.post('/admin/qc-templates', editingTemplate)
        if (response.data.success) {
          toast({
            title: "Success",
            description: "Template created successfully"
          })
        }
      }
      
      setShowTemplateDialog(false)
      setEditingTemplate(null)
      await fetchTemplates()
    } catch (error: any) {
      console.error('Error saving template:', error)
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const response = await nextJsApiClient.delete(`/admin/qc-templates/${templateId}`)
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Template deleted successfully"
        })
        await fetchTemplates()
        if (selectedTemplate?.id === templateId) {
          setSelectedTemplate(templates.find(t => t.id !== templateId) || null)
        }
      }
    } catch (error: any) {
      console.error('Error deleting template:', error)
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive"
      })
    }
  }

  const handleAddItem = () => {
    const newItem: QCTemplateItem = {
      text: "",
      itemType: 'PASS_FAIL',
      required: false,
      category: "General",
      order: (selectedTemplate?.items.length || 0) + 1,
      notes: ""
    }
    setEditingItem(newItem)
    setShowItemDialog(true)
  }

  const handleEditItem = (item: QCTemplateItem) => {
    setEditingItem({ ...item })
    setShowItemDialog(true)
  }

  const handleSaveItem = () => {
    if (!editingItem || !selectedTemplate) return

    if (!editingItem.text.trim()) {
      toast({
        title: "Validation Error",
        description: "Item text is required",
        variant: "destructive"
      })
      return
    }

    const updatedItems = [...selectedTemplate.items]
    const existingIndex = updatedItems.findIndex(item => item.id === editingItem.id)
    
    if (existingIndex >= 0) {
      updatedItems[existingIndex] = editingItem
    } else {
      updatedItems.push({ ...editingItem, id: `temp-${Date.now()}` })
    }

    setSelectedTemplate({
      ...selectedTemplate,
      items: updatedItems
    })

    setShowItemDialog(false)
    setEditingItem(null)
  }

  const handleDeleteItem = (itemId: string) => {
    if (!selectedTemplate) return

    const updatedItems = selectedTemplate.items.filter(item => item.id !== itemId)
    setSelectedTemplate({
      ...selectedTemplate,
      items: updatedItems
    })
  }

  const handleMoveItem = (itemId: string, direction: 'up' | 'down') => {
    if (!selectedTemplate) return

    const items = [...selectedTemplate.items]
    const index = items.findIndex(item => item.id === itemId)
    
    if (index === -1) return
    
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= items.length) return

    // Swap items
    const temp = items[index]
    items[index] = items[newIndex]
    items[newIndex] = temp

    // Update order numbers
    items.forEach((item, idx) => {
      item.order = idx + 1
    })

    setSelectedTemplate({
      ...selectedTemplate,
      items
    })
  }

  const handleSaveTemplateItems = async () => {
    if (!selectedTemplate?.id) return

    try {
      setSaving(true)
      const response = await nextJsApiClient.put(`/admin/qc-templates/${selectedTemplate.id}`, selectedTemplate)
      
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Template items saved successfully"
        })
        await fetchTemplates()
      }
    } catch (error: any) {
      console.error('Error saving template items:', error)
      toast({
        title: "Error",
        description: "Failed to save template items",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const renderItemTypeIcon = (itemType: string) => {
    const option = ITEM_TYPE_OPTIONS.find(opt => opt.value === itemType)
    const Icon = option?.icon || FileText
    return <Icon className="w-4 h-4" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">QC Template Management</h2>
          <p className="text-slate-600">Create and manage quality control inspection templates</p>
        </div>
        <Button onClick={handleCreateTemplate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Templates</CardTitle>
            <CardDescription>{templates.length} templates available</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-slate-50'
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{template.name}</h4>
                          {template.isActive ? (
                            <Badge variant="default" className="text-xs">Active</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          v{template.version} • {template.items.length} items
                        </p>
                        {template.appliesToProductFamily && (
                          <p className="text-xs text-slate-500 mt-1">
                            {template.appliesToProductFamily}
                          </p>
                        )}
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Template
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <Separator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-red-600" onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Template</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{template.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => template.id && handleDeleteTemplate(template.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
                
                {templates.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>No templates created yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Template Details and Items */}
        {selectedTemplate && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedTemplate.name}</CardTitle>
                  <CardDescription>{selectedTemplate.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleAddItem}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </Button>
                  <Button
                    onClick={handleSaveTemplateItems}
                    disabled={saving}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {selectedTemplate.items
                    .sort((a, b) => a.order - b.order)
                    .map((item, index) => (
                      <div key={item.id || index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {renderItemTypeIcon(item.itemType)}
                              <span className="font-medium">{item.text}</span>
                              {item.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                            </div>
                            
                            <div className="text-sm text-slate-600 space-y-1">
                              <p><strong>Type:</strong> {ITEM_TYPE_OPTIONS.find(opt => opt.value === item.itemType)?.label}</p>
                              <p><strong>Category:</strong> {item.category}</p>
                              {item.notes && <p><strong>Notes:</strong> {item.notes}</p>}
                              {item.selectOptions && (
                                <p><strong>Options:</strong> {item.selectOptions.join(', ')}</p>
                              )}
                              {item.numericMin !== undefined && item.numericMax !== undefined && (
                                <p><strong>Range:</strong> {item.numericMin} - {item.numericMax}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMoveItem(item.id!, 'up')}
                              disabled={index === 0}
                            >
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMoveItem(item.id!, 'down')}
                              disabled={index === selectedTemplate.items.length - 1}
                            >
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditItem(item)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(item.id!)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  
                  {selectedTemplate.items.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <Settings className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                      <p>No items added to this template yet</p>
                      <Button
                        variant="outline"
                        onClick={handleAddItem}
                        className="mt-4 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add First Item
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Template Create/Edit Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.id ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription>
              Configure the basic information for this QC template
            </DialogDescription>
          </DialogHeader>
          
          {editingTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="template-name">Template Name *</Label>
                  <Input
                    id="template-name"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({
                      ...editingTemplate,
                      name: e.target.value
                    })}
                    placeholder="e.g., T2 Sink Production Checklist"
                  />
                </div>
                <div>
                  <Label htmlFor="template-version">Version</Label>
                  <Input
                    id="template-version"
                    value={editingTemplate.version}
                    onChange={(e) => setEditingTemplate({
                      ...editingTemplate,
                      version: e.target.value
                    })}
                    placeholder="e.g., 1.0"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  value={editingTemplate.description || ''}
                  onChange={(e) => setEditingTemplate({
                    ...editingTemplate,
                    description: e.target.value
                  })}
                  placeholder="Describe what this template is used for..."
                />
              </div>
              
              <div>
                <Label htmlFor="product-family">Applies to Product Family</Label>
                <Input
                  id="product-family"
                  value={editingTemplate.appliesToProductFamily || ''}
                  onChange={(e) => setEditingTemplate({
                    ...editingTemplate,
                    appliesToProductFamily: e.target.value
                  })}
                  placeholder="e.g., MDRD_T2_SINK (leave blank for all products)"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="template-active"
                  checked={editingTemplate.isActive}
                  onCheckedChange={(checked) => setEditingTemplate({
                    ...editingTemplate,
                    isActive: !!checked
                  })}
                />
                <Label htmlFor="template-active">Active template</Label>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {editingTemplate?.id ? 'Update' : 'Create'} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Create/Edit Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem?.id ? 'Edit Item' : 'Add New Item'}
            </DialogTitle>
            <DialogDescription>
              Configure the details for this checklist item
            </DialogDescription>
          </DialogHeader>
          
          {editingItem && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="item-text">Item Text *</Label>
                <Input
                  id="item-text"
                  value={editingItem.text}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    text: e.target.value
                  })}
                  placeholder="e.g., Check all welds for cracks"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="item-type">Item Type *</Label>
                  <Select
                    value={editingItem.itemType}
                    onValueChange={(value) => setEditingItem({
                      ...editingItem,
                      itemType: value as any
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEM_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <option.icon className="w-4 h-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="item-category">Category</Label>
                  <Input
                    id="item-category"
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      category: e.target.value
                    })}
                    placeholder="e.g., Welding, Assembly, Finish"
                  />
                </div>
              </div>
              
              {editingItem.itemType === 'SELECT_OPTION' && (
                <div>
                  <Label htmlFor="select-options">Select Options (one per line)</Label>
                  <Textarea
                    id="select-options"
                    value={editingItem.selectOptions?.join('\n') || ''}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      selectOptions: e.target.value.split('\n').filter(opt => opt.trim())
                    })}
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                    rows={4}
                  />
                </div>
              )}
              
              {editingItem.itemType === 'NUMERIC_INPUT' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="numeric-min">Minimum Value</Label>
                    <Input
                      id="numeric-min"
                      type="number"
                      value={editingItem.numericMin || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        numericMin: e.target.value ? Number(e.target.value) : undefined
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="numeric-max">Maximum Value</Label>
                    <Input
                      id="numeric-max"
                      type="number"
                      value={editingItem.numericMax || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        numericMax: e.target.value ? Number(e.target.value) : undefined
                      })}
                    />
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="item-notes">Notes/Instructions</Label>
                <Textarea
                  id="item-notes"
                  value={editingItem.notes || ''}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    notes: e.target.value
                  })}
                  placeholder="Additional instructions or guidance for this item..."
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="item-required"
                  checked={editingItem.required}
                  onCheckedChange={(checked) => setEditingItem({
                    ...editingItem,
                    required: !!checked
                  })}
                />
                <Label htmlFor="item-required">Required field</Label>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveItem}>
              {editingItem?.id ? 'Update' : 'Add'} Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}