use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  FileText,
  Hash,
  Calendar,
  CheckSquare,
  List,
  Type,
  Loader2,
  History,
  AlertTriangle,
  Upload
} from "lucide-react"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { QcTemplateCreateSchema, QcTemplateItemSchema } from "@/lib/qcValidationSchemas"
import { z } from "zod"

// Enhanced type definitions based on schema
type QCTemplateItem = z.infer<typeof QcTemplateItemSchema> & { id?: string };
type QCTemplate = z.infer<typeof QcTemplateCreateSchema> & { 
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    orderQcResults: number;
  };
};

interface TemplateUsage {
  canModify: boolean;
  usageCount: number;
  message: string;
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [showItemDialog, setShowItemDialog] = useState(false)
  const [showCloneDialog, setShowCloneDialog] = useState(false)
  const [cloneData, setCloneData] = useState({ name: '', version: '1.0' })
  const [editingTemplate, setEditingTemplate] = useState<QCTemplate | null>(null)
  const [editingItem, setEditingItem] = useState<QCTemplateItem | null>(null)
  const [templateUsage, setTemplateUsage] = useState<TemplateUsage | null>(null)

  const {
    register: registerTemplate,
    handleSubmit: handleTemplateSubmit,
    control: templateControl,
    reset: resetTemplateForm,
    formState: { errors: templateErrors }
  } = useForm<QCTemplate>({
    resolver: zodResolver(QcTemplateCreateSchema)
  });

  const {
    register: registerItem,
    handleSubmit: handleItemSubmit,
    control: itemControl,
    reset: resetItemForm,
    formState: { errors: itemErrors }
  } = useForm<QCTemplateItem>({
    resolver: zodResolver(QcTemplateItemSchema)
  });

  const { fields, append, remove, move } = useFieldArray({
    control: templateControl,
    name: "items",
  });

  useEffect(() => {
    fetchTemplates()
  }, [])

  useEffect(() => {
    if (selectedTemplate) {
      resetTemplateForm(selectedTemplate);
    }
  }, [selectedTemplate, resetTemplateForm]);

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await nextJsApiClient.get('/admin/qc-templates?includeInactive=true')
      
      if (response.data.templates) {
        const sortedTemplates = response.data.templates.sort((a: QCTemplate, b: QCTemplate) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime());
        setTemplates(sortedTemplates)
        if (sortedTemplates.length > 0 && !selectedTemplate) {
          setSelectedTemplate(sortedTemplates[0])
        }
      }
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to load QC templates", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplateUsage = async (templateId: string) => {
    try {
      const response = await nextJsApiClient.get(`/admin/qc-templates/${templateId}/usage`)
      setTemplateUsage(response.data)
    } catch (error: any) {
      console.error('Error fetching template usage:', error)
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
    setEditingTemplate(null); // Ensure we are in "create" mode
    resetTemplateForm(newTemplate);
    setShowTemplateDialog(true);
  }

  const handleEditTemplate = async (template: QCTemplate) => {
    if (template.id) {
      await fetchTemplateUsage(template.id)
    }
    setEditingTemplate(template);
    resetTemplateForm(template);
    setShowTemplateDialog(true);
  }

  const onTemplateFormSubmit = async (data: QCTemplate) => {
    try {
      setSaving(true);
      let response;
      if (editingTemplate?.id) {
        response = await nextJsApiClient.put(`/admin/qc-templates/${editingTemplate.id}`, data);
      } else {
        response = await nextJsApiClient.post('/admin/qc-templates', data);
      }

      if (response.data) {
        toast({ title: "Success", description: response.data.message || `Template ${editingTemplate?.id ? 'updated' : 'created'} successfully` });
        setShowTemplateDialog(false);
        await fetchTemplates();
      }
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to ${editingTemplate?.id ? 'update' : 'create'} template`, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSeedOfficialChecklists = async () => {
    try {
      setSaving(true);
      const response = await nextJsApiClient.post('/admin/qc-templates/seed-defaults');
      if (response.data.success) {
        toast({ title: "Success", description: response.data.message });
        await fetchTemplates();
      }
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to seed official checklists.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    resetItemForm({
      section: "",
      checklistItem: "",
      itemType: 'PASS_FAIL',
      isBasinSpecific: false,
      isRequired: true,
      order: (selectedTemplate?.items.length || 0) + 1,
    });
    setShowItemDialog(true);
  };

  const handleEditItem = (item: QCTemplateItem) => {
    setEditingItem(item);
    resetItemForm(item);
    setShowItemDialog(true);
  };

  const onAddItemFormSubmit = (data: QCTemplateItem) => {
    if (!selectedTemplate) return;

    const updatedItems = [...selectedTemplate.items];
    if (editingItem) {
      // Update existing item
      const index = updatedItems.findIndex(item => item.id === editingItem.id);
      if (index !== -1) {
        updatedItems[index] = { ...data, id: editingItem.id };
      }
    } else {
      // Add new item
      updatedItems.push({ ...data, id: `temp-${Date.now()}` }); // Assign a temporary ID
    }

    setSelectedTemplate({
      ...selectedTemplate,
      items: updatedItems.sort((a, b) => a.order - b.order),
    });
    setShowItemDialog(false);
    setEditingItem(null);
  };

  const handleDeleteItem = (itemId: string) => {
    if (!selectedTemplate) return;
    const updatedItems = selectedTemplate.items.filter(item => item.id !== itemId);
    setSelectedTemplate({
      ...selectedTemplate,
      items: updatedItems.map((item, idx) => ({ ...item, order: idx + 1 })),
    });
  };

  const handleMoveItem = (itemId: string, direction: 'up' | 'down') => {
    if (!selectedTemplate) return;

    const items = [...selectedTemplate.items];
    const index = items.findIndex(item => item.id === itemId);
    
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    // Swap items
    const temp = items[index];
    items[index] = items[newIndex];
    items[newIndex] = temp;

    // Update order numbers
    items.forEach((item, idx) => {
      item.order = idx + 1;
    });

    setSelectedTemplate({
      ...selectedTemplate,
      items
    });
  };

  const renderItemTypeIcon = (itemType: string) => {
    const option = ITEM_TYPE_OPTIONS.find(opt => opt.value === itemType)
    const Icon = option?.icon || FileText
    return <Icon className="w-4 h-4 text-slate-500" />
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">QC Template Management</h2>
          <p className="text-slate-600">Create and manage quality control inspection templates</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSeedOfficialChecklists} disabled={saving} className="flex items-center gap-2">
            <Upload className="w-4 h-4" /> Seed Official Checklists
          </Button>
          <Button onClick={handleCreateTemplate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedTemplate?.id === template.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50'}`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{template.formName}</h4>
                          <Badge variant={template.isActive ? "default" : "secondary"} className="text-xs">{template.isActive ? 'Active' : 'Inactive'}</Badge>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          v{template.version} • {template.items.length} items
                          {template._count?.orderQcResults ? ` • ${template._count.orderQcResults} uses` : ''}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditTemplate(template)}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                          {/* Add other actions like clone, delete etc. here */}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {selectedTemplate && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedTemplate.formName}</CardTitle>
                  <CardDescription>{selectedTemplate.description || "No description"}</CardDescription>
                </div>
                <Button onClick={handleAddItem} size="sm" className="flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Order</TableHead>
                      <TableHead>Checklist Item</TableHead>
                      <TableHead className="w-[150px]">Type</TableHead>
                      <TableHead className="w-[150px]">Section</TableHead>
                      <TableHead className="w-[150px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedTemplate.items.sort((a, b) => a.order - b.order).map((item, index) => (
                      <TableRow key={item.id || index}>
                        <TableCell>{item.order}</TableCell>
                        <TableCell className="font-medium">{item.checklistItem}</TableCell>
                        <TableCell><Badge variant="outline" className="flex items-center gap-1.5">{renderItemTypeIcon(item.itemType)} {item.itemType}</Badge></TableCell>
                        <TableCell>{item.section}</TableCell>
                        <TableCell className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleMoveItem(item.id!, 'up')} disabled={index === 0}><ArrowUp className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleMoveItem(item.id!, 'down')} disabled={index === selectedTemplate.items.length - 1}><ArrowDown className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditItem(item)}><Edit className="w-4 h-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Item</AlertDialogTitle>
                                <AlertDialogDescription>Are you sure you want to delete this item? This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteItem(item.id!)} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleTemplateSubmit(onTemplateFormSubmit)}>
            <DialogHeader>
              <DialogTitle>{editingTemplate?.id ? 'Edit Template' : 'Create New Template'}</DialogTitle>
              <DialogDescription>Configure the basic information for this QC template.</DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="formName">Form Name *</Label>
                  <Input id="formName" {...registerTemplate("formName")} />
                  {templateErrors.formName && <p className="text-red-500 text-xs mt-1">{templateErrors.formName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="formType">Form Type *</Label>
                  <Controller
                    control={templateControl}
                    name="formType"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FORM_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {templateErrors.formType && <p className="text-red-500 text-xs mt-1">{templateErrors.formType.message}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="version">Version</Label>
                <Input id="version" {...registerTemplate("version")} />
                {templateErrors.version && <p className="text-red-500 text-xs mt-1">{templateErrors.version.message}</p>}
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...registerTemplate("description")} />
                {templateErrors.description && <p className="text-red-500 text-xs mt-1">{templateErrors.description.message}</p>}
              </div>
              <div>
                <Label htmlFor="appliesToProductFamily">Applies to Product Family</Label>
                <Input id="appliesToProductFamily" {...registerTemplate("appliesToProductFamily")} />
                {templateErrors.appliesToProductFamily && <p className="text-red-500 text-xs mt-1">{templateErrors.appliesToProductFamily.message}</p>}
              </div>
              <div className="flex items-center space-x-2">
                <Controller
                  control={templateControl}
                  name="isActive"
                  render={({ field }) => (
                    <Checkbox
                      id="isActive"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="isActive">Active template</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingTemplate?.id ? 'Update' : 'Add'} Template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleItemSubmit(onAddItemFormSubmit)}>
            <DialogHeader>
              <DialogTitle>{editingItem?.id ? 'Edit Item' : 'Add New Item'}</DialogTitle>
              <DialogDescription>Configure the details for this checklist item.</DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              <div>
                <Label htmlFor="checklistItem">Checklist Item *</Label>
                <Input id="checklistItem" {...registerItem("checklistItem")} />
                {itemErrors.checklistItem && <p className="text-red-500 text-xs mt-1">{itemErrors.checklistItem.message}</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="itemType">Item Type *</Label>
                  <Controller
                    control={itemControl}
                    name="itemType"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ITEM_TYPE_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value}>
                              <div className="flex items-center gap-2">
                                <o.icon className="w-4 h-4" />
                                {o.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {itemErrors.itemType && <p className="text-red-500 text-xs mt-1">{itemErrors.itemType.message}</p>}
                </div>
                
                <div>
                  <Label htmlFor="section">Section</Label>
                  <Input id="section" {...registerItem("section")} />
                  {itemErrors.section && <p className="text-red-500 text-xs mt-1">{itemErrors.section.message}</p>}
                </div>
              </div>
              
              {(itemControl._getWatch('itemType') === 'SINGLE_SELECT' || itemControl._getWatch('itemType') === 'MULTI_SELECT') && (
                <div>
                  <Label htmlFor="options">Select Options (one per line)</Label>
                  <Textarea
                    id="options"
                    {...registerItem("options", {
                      setValueAs: (value) => value.split('\n').filter((opt: string) => opt.trim()),
                      valueAsArray: true,
                    })}
                    defaultValue={editingItem?.options?.join('\n') || ''}
                    placeholder="Option 1\nOption 2\nOption 3"
                    rows={4}
                  />
                  {itemErrors.options && <p className="text-red-500 text-xs mt-1">{itemErrors.options.message}</p>}
                </div>
              )}
              
              {itemControl._getWatch('itemType') === 'NUMERIC_INPUT' && (
                <div>
                  <Label htmlFor="expectedValue">Expected Value or Range</Label>
                  <Input id="expectedValue" {...registerItem("expectedValue")} />
                  {itemErrors.expectedValue && <p className="text-red-500 text-xs mt-1">{itemErrors.expectedValue.message}</p>}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Controller
                    control={itemControl}
                    name="isRequired"
                    render={({ field }) => (
                      <Checkbox
                        id="isRequired"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Label htmlFor="isRequired">Required field</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Controller
                    control={itemControl}
                    name="isBasinSpecific"
                    render={({ field }) => (
                      <Checkbox
                        id="isBasinSpecific"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Label htmlFor="isBasinSpecific">Basin specific</Label>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowItemDialog(false)}>Cancel</Button>
              <Button type="submit">
                {editingItem?.id ? 'Update' : 'Add'} Item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}