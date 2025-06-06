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
  Loader2,
  History,
  AlertTriangle,
  Info,
  Upload
} from "lucide-react"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { QcTemplateCreateSchema, QcTemplateUpdateSchema, QcTemplateItemSchema } from "@/lib/qcValidationSchemas"
import { z } from "zod"
import { Upload } from "lucide-react"

interface QCTemplateItem {
  id?: string
  section: string
  checklistItem: string
  itemType: 'PASS_FAIL' | 'TEXT_INPUT' | 'NUMERIC_INPUT' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'DATE_INPUT' | 'CHECKBOX'
  isBasinSpecific: boolean
  isRequired: boolean
  order: number
  options?: string[]
  expectedValue?: string
  templateId?: string
  _action?: 'create' | 'update' | 'delete'
}

interface QCTemplate {
  id?: string
  formName: string
  formType: 'Pre-Production Check' | 'Production Check' | 'Final QC' | 'End-of-Line Testing'
  version: string
  description?: string
  appliesToProductFamily?: string
  isActive: boolean
  items: QCTemplateItem[]
  createdAt?: string
  updatedAt?: string
  _count?: {
    orderQcResults: number
  }
}

interface TemplateUsage {
  canModify: boolean
  usageCount: number
  message: string
}

interface TemplateUsage {
  total: number
  canModify: boolean
  message: string
}

const ITEM_TYPE_OPTIONS = [
  { value: 'PASS_FAIL', label: 'Pass/Fail', icon: CheckSquare },
  { value: 'TEXT_INPUT', label: 'Text Input', icon: Type },
  { value: 'NUMERIC_INPUT', label: 'Numeric Input', icon: Hash },
  { value: 'SINGLE_SELECT', label: 'Single Select', icon: List },
  { value: 'MULTI_SELECT', label: 'Multi Select', icon: List },
  { value: 'DATE_INPUT', label: 'Date Input', icon: Calendar },
  { value: 'CHECKBOX', label: 'Checkbox', icon: CheckSquare }
]

const FORM_TYPE_OPTIONS = [
  { value: 'Pre-Production Check', label: 'Pre-Production Check' },
  { value: 'Production Check', label: 'Production Check' },
  { value: 'Final QC', label: 'Final QC' },
  { value: 'End-of-Line Testing', label: 'End-of-Line Testing' }
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
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [templateVersions, setTemplateVersions] = useState<QCTemplate[]>([])
  const [templateUsage, setTemplateUsage] = useState<TemplateUsage | null>(null)
  const [showCloneDialog, setShowCloneDialog] = useState(false)
  const [cloneData, setCloneData] = useState({ name: '', version: '1.0' })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await nextJsApiClient.get('/admin/qc-templates?includeInactive=true')
      
      if (response.data.templates) {
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

  const fetchTemplateUsage = async (templateId: string) => {
    try {
      const response = await nextJsApiClient.get(`/admin/qc-templates/${templateId}/usage`)
      if (response.data) {
        setTemplateUsage(response.data)
      }
    } catch (error: any) {
      console.error('Error fetching template usage:', error)
    }
  }

  const fetchVersionHistory = async (templateId: string) => {
    try {
      const response = await nextJsApiClient.get(`/admin/qc-templates/${templateId}/versions`)
      if (response.data.versions) {
        setTemplateVersions(response.data.versions)
      }
    } catch (error: any) {
      console.error('Error fetching version history:', error)
    }
  }

  const handleCreateTemplate = () => {
    const newTemplate: QCTemplate = {
      formName: "",
      formType: "Pre-Production Check",
      version: "1.0",
      description: "",
      appliesToProductFamily: "",
      isActive: true,
      items: []
    }
    setEditingTemplate(newTemplate)
    setShowTemplateDialog(true)
  }

  const handleEditTemplate = async (template: QCTemplate) => {
    if (template.id) {
      await fetchTemplateUsage(template.id)
    }
    setEditingTemplate({ ...template })
    setShowTemplateDialog(true)
  }

  const handleCloneTemplate = (template: QCTemplate) => {
    setEditingTemplate(template)
    setCloneData({ 
      name: `${template.name} - Copy`, 
      version: '1.0' 
    })
    setShowCloneDialog(true)
  }

  const handlePerformClone = async () => {
    if (!editingTemplate?.id) return

    try {
      setSaving(true)
      const response = await nextJsApiClient.post(`/admin/qc-templates/${editingTemplate.id}/clone`, cloneData)
      
      if (response.data.template) {
        toast({
          title: "Success",
          description: response.data.message || "Template cloned successfully"
        })
        setShowCloneDialog(false)
        await fetchTemplates()
      }
    } catch (error: any) {
      console.error('Error cloning template:', error)
      toast({
        title: "Error",
        description: "Failed to clone template",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleViewVersionHistory = async (template: QCTemplate) => {
    if (template.id) {
      await fetchVersionHistory(template.id)
      setShowVersionHistory(true)
    }
  }

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return

    if (!editingTemplate.formName.trim()) {
      toast({
        title: "Validation Error",
        description: "Form name is required",
        variant: "destructive"
      })
      return
    }

    try {
      setSaving(true)
      
      if (editingTemplate.id) {
        // Update existing template
        const response = await nextJsApiClient.put(`/admin/qc-templates/${editingTemplate.id}`, editingTemplate)
        if (response.data.template) {
          toast({
            title: "Success",
            description: response.data.message || "Template updated successfully"
          })
          if (response.data.message && response.data.message.includes('new version')) {
            // A new version was created, refresh the list
            await fetchTemplates()
          }
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
      section: "General",
      checklistItem: "",
      itemType: 'PASS_FAIL',
      isBasinSpecific: false,
      isRequired: true,
      order: (selectedTemplate?.items.length || 0) + 1
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

    if (!editingItem.checklistItem.trim()) {
      toast({
        title: "Validation Error",
        description: "Checklist item is required",
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

  const handleSeedOfficialChecklists = async () => {
    try {
      setSaving(true)
      
      // Fetch the resource file
      const response = await fetch('/resources/CLP.T2.001.V01 - T2SinkProduction.txt')
      const text = await response.text()
      
      // Parse the text file to extract sections and checklist items
      const sections = text.split('SECTION').filter(s => s.trim())
      const templates: QCTemplate[] = []
      
      sections.forEach((section, index) => {
        const lines = section.split('\n').filter(l => l.trim())
        if (lines.length === 0) return
        
        let sectionName = ''
        let formType: QCTemplate['formType'] = 'Pre-Production Check'
        
        // Determine section name and form type
        if (lines[0].includes('1') || lines[0].includes('PRE-PRODUCTION')) {
          sectionName = 'Section 1: Pre-Production Check'
          formType = 'Pre-Production Check'
        } else if (lines[0].includes('2') || lines[0].includes('PRODUCTION CHECK')) {
          sectionName = 'Section 2: Sink Production Check'
          formType = 'Production Check'
        } else if (lines[0].includes('3') || lines[0].includes('END-OF-LINE')) {
          sectionName = 'Section 3: End-of-Line Testing'
          formType = 'End-of-Line Testing'
        } else if (lines[0].includes('4') || lines[0].includes('PACKAGING')) {
          sectionName = 'Section 4: Packaging and Shipping'
          formType = 'Final QC'
        }
        
        const items: QCTemplateItem[] = []
        let orderCounter = 1
        
        // Parse checklist items
        lines.forEach((line, lineIndex) => {
          if (lineIndex === 0) return // Skip section header
          
          // Extract checklist items (lines starting with ☐)
          if (line.includes('☐')) {
            const checklistText = line.replace('☐', '').trim()
            if (checklistText) {
              const isBasinSpecific = checklistText.toLowerCase().includes('basin') || 
                                     line.toLowerCase().includes('basin')
              
              items.push({
                section: sectionName,
                checklistItem: checklistText,
                itemType: 'PASS_FAIL',
                isBasinSpecific: isBasinSpecific,
                isRequired: true,
                order: orderCounter++
              })
            }
          }
        })
        
        if (items.length > 0) {
          templates.push({
            formName: `T2 Sink ${formType}`,
            formType: formType,
            version: '1.0',
            description: `Official checklist for T2 sink ${formType.toLowerCase()}`,
            appliesToProductFamily: 'MDRD_T2_SINK',
            isActive: true,
            items: items
          })
        }
      })
      
      // Create templates via API
      for (const template of templates) {
        try {
          await nextJsApiClient.post('/admin/qc-templates', template)
        } catch (error) {
          console.error('Error creating template:', template.formName, error)
        }
      }
      
      toast({
        title: "Success",
        description: `Seeded ${templates.length} official QC templates`
      })
      
      await fetchTemplates()
    } catch (error: any) {
      console.error('Error seeding official checklists:', error)
      toast({
        title: "Error",
        description: "Failed to seed official checklists",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
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

  const fetchVersionHistory = async (templateId: string) => {
    // Placeholder for version history functionality
    console.log('Fetching version history for template:', templateId)
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSeedOfficialChecklists}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Seed Official Checklists
          </Button>
          <Button onClick={handleCreateTemplate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Template
          </Button>
        </div>
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
                          <h4 className="font-medium text-sm">{template.formName}</h4>
                          {template.isActive ? (
                            <Badge variant="default" className="text-xs">Active</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          v{template.version} • {template.items.length} items
                          {template._count?.orderQcResults ? ` • ${template._count.orderQcResults} uses` : ''}
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
                          <DropdownMenuItem onClick={() => handleCloneTemplate(template)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Clone Template
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewVersionHistory(template)}>
                            <History className="w-4 h-4 mr-2" />
                            Version History
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
                                  Are you sure you want to delete "{template.formName}"? This action cannot be undone.
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
                  <CardTitle>{selectedTemplate.formName}</CardTitle>
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
                              <span className="font-medium">{item.checklistItem}</span>
                              {item.isRequired && <Badge variant="secondary" className="text-xs">Required</Badge>}
                              {item.isBasinSpecific && <Badge variant="outline" className="text-xs">Basin Specific</Badge>}
                            </div>
                            
                            <div className="text-sm text-slate-600 space-y-1">
                              <p><strong>Type:</strong> {ITEM_TYPE_OPTIONS.find(opt => opt.value === item.itemType)?.label}</p>
                              <p><strong>Section:</strong> {item.section}</p>
                              {item.options && item.options.length > 0 && (
                                <p><strong>Options:</strong> {item.options.join(', ')}</p>
                              )}
                              {item.expectedValue && (
                                <p><strong>Expected:</strong> {item.expectedValue}</p>
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
            <>
              {templateUsage && !templateUsage.canModify && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-amber-900">Template In Use</p>
                    <p className="text-amber-700">{templateUsage.message}</p>
                    <p className="text-amber-700 mt-1">Changes will create a new version of this template.</p>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="template-name">Form Name *</Label>
                  <Input
                    id="template-name"
                    value={editingTemplate.formName}
                    onChange={(e) => setEditingTemplate({
                      ...editingTemplate,
                      formName: e.target.value
                    })}
                    placeholder="e.g., T2 Sink Production Checklist"
                  />
                </div>
                <div>
                  <Label htmlFor="form-type">Form Type *</Label>
                  <Select
                    value={editingTemplate.formType}
                    onValueChange={(value) => setEditingTemplate({
                      ...editingTemplate,
                      formType: value as QCTemplate['formType']
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORM_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
            </>
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
                <Label htmlFor="item-text">Checklist Item *</Label>
                <Input
                  id="item-text"
                  value={editingItem.checklistItem}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    checklistItem: e.target.value
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
                  <Label htmlFor="item-section">Section</Label>
                  <Input
                    id="item-section"
                    value={editingItem.section}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      section: e.target.value
                    })}
                    placeholder="e.g., Visual Inspection, Functionality"
                  />
                </div>
              </div>
              
              {(editingItem.itemType === 'SINGLE_SELECT' || editingItem.itemType === 'MULTI_SELECT') && (
                <div>
                  <Label htmlFor="select-options">Select Options (one per line)</Label>
                  <Textarea
                    id="select-options"
                    value={editingItem.options?.join('\n') || ''}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      options: e.target.value.split('\n').filter(opt => opt.trim())
                    })}
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                    rows={4}
                  />
                </div>
              )}
              
              {editingItem.itemType === 'NUMERIC_INPUT' && (
                <div>
                  <Label htmlFor="expected-value">Expected Value or Range</Label>
                  <Input
                    id="expected-value"
                    value={editingItem.expectedValue || ''}
                    onChange={(e) => setEditingItem({
                      ...editingItem,
                      expectedValue: e.target.value
                    })}
                    placeholder="e.g., 10-15 or > 5"
                  />
                </div>
              )}
              
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="item-required"
                    checked={editingItem.isRequired}
                    onCheckedChange={(checked) => setEditingItem({
                      ...editingItem,
                      isRequired: !!checked
                    })}
                  />
                  <Label htmlFor="item-required">Required field</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="item-basin-specific"
                    checked={editingItem.isBasinSpecific}
                    onCheckedChange={(checked) => setEditingItem({
                      ...editingItem,
                      isBasinSpecific: !!checked
                    })}
                  />
                  <Label htmlFor="item-basin-specific">Basin specific</Label>
                </div>
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

      {/* Clone Template Dialog */}
      <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Template</DialogTitle>
            <DialogDescription>
              Create a new template based on "{editingTemplate?.name}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="clone-name">New Template Name *</Label>
              <Input
                id="clone-name"
                value={cloneData.name}
                onChange={(e) => setCloneData({ ...cloneData, name: e.target.value })}
                placeholder="e.g., T2 Sink Production Checklist v2"
              />
            </div>
            
            <div>
              <Label htmlFor="clone-version">Version</Label>
              <Input
                id="clone-version"
                value={cloneData.version}
                onChange={(e) => setCloneData({ ...cloneData, version: e.target.value })}
                placeholder="e.g., 1.0"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloneDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePerformClone} disabled={saving || !cloneData.name.trim()}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Clone Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              All versions of this template
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {templateVersions.map((version) => (
                <Card key={version.id} className={version.isActive ? 'border-blue-200 bg-blue-50' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">Version {version.version}</h4>
                        {version.isActive && <Badge variant="default">Current</Badge>}
                      </div>
                      <p className="text-sm text-slate-600">
                        {new Date(version.createdAt || '').toLocaleDateString()}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-slate-600 space-y-1">
                      <p>{version._count?.items || 0} checklist items</p>
                      <p>{version._count?.orderQcResults || 0} QC results using this version</p>
                      {version.description && <p className="mt-2">{version.description}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVersionHistory(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}