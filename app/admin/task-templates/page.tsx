'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { nextJsApiClient } from '@/lib/api';
import { Plus, Edit2, Trash2, Clock, Wrench, Package, CheckCircle2, AlertCircle } from 'lucide-react';

interface TaskTemplateStep {
  id?: string;
  stepNumber: number;
  title: string;
  description?: string;
  estimatedMinutes?: number;
  workInstructionId?: string;
  qcFormTemplateItemId?: string;
  requiredTools: Array<{
    toolId: string;
    tool?: { id: string; name: string; description?: string; category: string };
    notes?: string;
  }>;
  requiredParts: Array<{
    partId: string;
    part?: { partId: string; name: string; type: string; unitOfMeasure?: string };
    quantity: number;
    notes?: string;
  }>;
  workInstruction?: {
    id: string;
    title: string;
    description?: string;
  };
  qcFormTemplateItem?: {
    id: string;
    section: string;
    checklistItem: string;
    itemType: string;
  };
}

interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  appliesToAssemblyType?: 'SINK' | 'INSTROSINK' | 'ENDOSCOPE';
  appliesToProductFamily?: string;
  version: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  steps: TaskTemplateStep[];
}

interface TemplateGroup {
  name: string;
  appliesToAssemblyType?: string;
  appliesToProductFamily?: string;
  activeVersion: TaskTemplate | null;
  versions: TaskTemplate[];
}

export default function TaskTemplatesPage() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [templateGroups, setTemplateGroups] = useState<TemplateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Form state for creating/editing templates
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    appliesToAssemblyType: '',
    appliesToProductFamily: '',
    version: '1.0',
    isActive: true,
    steps: [] as Omit<TaskTemplateStep, 'id'>[]
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await nextJsApiClient.get('/api/admin/task-templates');
      
      if (response.status === 200) {
        const data = response.data;
        setTemplates(data.templates || []);
        setTemplateGroups(data.templateGroups || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch task templates',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fetching task templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch task templates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const response = await nextJsApiClient.post('/api/admin/task-templates', formData);
      
      if (response.status === 200) {
        toast({
          title: 'Success',
          description: 'Task template created successfully'
        });
        setIsCreateDialogOpen(false);
        resetForm();
        fetchTemplates();
      } else {
        const errorData = response.data;
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to create task template',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error creating task template:', error);
      toast({
        title: 'Error',
        description: 'Failed to create task template',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    try {
      const response = await nextJsApiClient.put(`/api/admin/task-templates/${editingTemplate.id}`, formData);
      
      if (response.status === 200) {
        toast({
          title: 'Success',
          description: 'Task template updated successfully'
        });
        setIsEditDialogOpen(false);
        setEditingTemplate(null);
        resetForm();
        fetchTemplates();
      } else {
        const errorData = response.data;
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to update task template',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error updating task template:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task template',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this task template?')) return;

    try {
      const response = await nextJsApiClient.delete(`/api/admin/task-templates/${templateId}`);
      
      if (response.status === 200) {
        toast({
          title: 'Success',
          description: 'Task template deleted successfully'
        });
        fetchTemplates();
      } else {
        const errorData = response.data;
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to delete task template',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error deleting task template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete task template',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      appliesToAssemblyType: '',
      appliesToProductFamily: '',
      version: '1.0',
      isActive: true,
      steps: []
    });
  };

  const openEditDialog = (template: TaskTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      appliesToAssemblyType: template.appliesToAssemblyType || '',
      appliesToProductFamily: template.appliesToProductFamily || '',
      version: template.version,
      isActive: template.isActive,
      steps: template.steps.map(step => ({
        stepNumber: step.stepNumber,
        title: step.title,
        description: step.description,
        estimatedMinutes: step.estimatedMinutes,
        workInstructionId: step.workInstructionId,
        qcFormTemplateItemId: step.qcFormTemplateItemId,
        requiredTools: step.requiredTools.map(tool => ({
          toolId: tool.toolId,
          notes: tool.notes
        })),
        requiredParts: step.requiredParts.map(part => ({
          partId: part.partId,
          quantity: part.quantity,
          notes: part.notes
        }))
      }))
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (template: TaskTemplate) => {
    setSelectedTemplate(template);
    setIsViewDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading task templates...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Task Templates</h1>
          <p className="text-muted-foreground">
            Manage assembly task templates for automated task generation
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Task Template</DialogTitle>
              <DialogDescription>
                Create a new task template for assembly workflows
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., T2 Sink Assembly"
                  />
                </div>
                <div>
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="1.0"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this template is used for..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="assemblyType">Assembly Type</Label>
                  <Select 
                    value={formData.appliesToAssemblyType} 
                    onValueChange={(value) => setFormData({ ...formData, appliesToAssemblyType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assembly type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any Assembly Type</SelectItem>
                      <SelectItem value="SINK">Sink</SelectItem>
                      <SelectItem value="INSTROSINK">InstroSink</SelectItem>
                      <SelectItem value="ENDOSCOPE">Endoscope</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="productFamily">Product Family</Label>
                  <Input
                    id="productFamily"
                    value={formData.appliesToProductFamily}
                    onChange={(e) => setFormData({ ...formData, appliesToProductFamily: e.target.value })}
                    placeholder="e.g., T2 Series"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Active Template</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate}>
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="grouped" className="space-y-4">
        <TabsList>
          <TabsTrigger value="grouped">Grouped by Name</TabsTrigger>
          <TabsTrigger value="all">All Templates</TabsTrigger>
        </TabsList>
        
        <TabsContent value="grouped" className="space-y-4">
          {templateGroups.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">No task templates found</p>
              </CardContent>
            </Card>
          ) : (
            templateGroups.map((group) => (
              <Card key={group.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {group.name}
                        {group.appliesToAssemblyType && (
                          <Badge variant="secondary">{group.appliesToAssemblyType}</Badge>
                        )}
                      </CardTitle>
                      {group.appliesToProductFamily && (
                        <CardDescription>Product Family: {group.appliesToProductFamily}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={group.activeVersion?.isActive ? "default" : "secondary"}>
                        {group.versions.length} version{group.versions.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {group.versions.map((template) => (
                      <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Version {template.version}</span>
                              {template.isActive && (
                                <Badge variant="default" className="h-5">Active</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {template.steps.length} steps
                              {template.description && ` • ${template.description}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openViewDialog(template)}
                          >
                            View
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openEditDialog(template)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.isActive ? (
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    Version {template.version}
                    {template.appliesToAssemblyType && ` • ${template.appliesToAssemblyType}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {template.description && (
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        {template.steps.length} steps
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => openViewDialog(template)}
                      >
                        View Details
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openEditDialog(template)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* View Template Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              Version {selectedTemplate?.version} • {selectedTemplate?.steps.length} steps
            </DialogDescription>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-4">
              {selectedTemplate.description && (
                <div>
                  <Label>Description</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedTemplate.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedTemplate.appliesToAssemblyType && (
                  <div>
                    <Label>Assembly Type</Label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedTemplate.appliesToAssemblyType}</p>
                  </div>
                )}
                {selectedTemplate.appliesToProductFamily && (
                  <div>
                    <Label>Product Family</Label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedTemplate.appliesToProductFamily}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <Label>Steps</Label>
                <div className="space-y-3 mt-2">
                  {selectedTemplate.steps.map((step, index) => (
                    <Card key={step.id || index}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">Step {step.stepNumber}</Badge>
                              <h4 className="font-medium">{step.title}</h4>
                              {step.estimatedMinutes && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {step.estimatedMinutes}m
                                </div>
                              )}
                            </div>
                            
                            {step.description && (
                              <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {step.requiredTools.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-1 text-sm font-medium mb-1">
                                    <Wrench className="h-3 w-3" />
                                    Required Tools
                                  </div>
                                  <div className="space-y-1">
                                    {step.requiredTools.map((tool, toolIndex) => (
                                      <div key={toolIndex} className="text-sm">
                                        <span className="font-medium">{tool.tool?.name || tool.toolId}</span>
                                        {tool.notes && <span className="text-muted-foreground"> - {tool.notes}</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {step.requiredParts.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-1 text-sm font-medium mb-1">
                                    <Package className="h-3 w-3" />
                                    Required Parts
                                  </div>
                                  <div className="space-y-1">
                                    {step.requiredParts.map((part, partIndex) => (
                                      <div key={partIndex} className="text-sm">
                                        <span className="font-medium">{part.part?.name || part.partId}</span>
                                        <span className="text-muted-foreground"> (Qty: {part.quantity})</span>
                                        {part.notes && <span className="text-muted-foreground"> - {part.notes}</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {step.workInstruction && (
                              <div className="mt-3 p-2 bg-muted rounded-md">
                                <div className="text-sm font-medium">Work Instruction: {step.workInstruction.title}</div>
                                {step.workInstruction.description && (
                                  <div className="text-sm text-muted-foreground">{step.workInstruction.description}</div>
                                )}
                              </div>
                            )}

                            {step.qcFormTemplateItem && (
                              <div className="mt-3 p-2 bg-muted rounded-md">
                                <div className="text-sm font-medium">QC Check: {step.qcFormTemplateItem.checklistItem}</div>
                                <div className="text-sm text-muted-foreground">
                                  {step.qcFormTemplateItem.section} • {step.qcFormTemplateItem.itemType}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task Template</DialogTitle>
            <DialogDescription>
              Update the task template details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Template Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-version">Version</Label>
                <Input
                  id="edit-version"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-assemblyType">Assembly Type</Label>
                <Select 
                  value={formData.appliesToAssemblyType} 
                  onValueChange={(value) => setFormData({ ...formData, appliesToAssemblyType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assembly type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any Assembly Type</SelectItem>
                    <SelectItem value="SINK">Sink</SelectItem>
                    <SelectItem value="INSTROSINK">InstroSink</SelectItem>
                    <SelectItem value="ENDOSCOPE">Endoscope</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-productFamily">Product Family</Label>
                <Input
                  id="edit-productFamily"
                  value={formData.appliesToProductFamily}
                  onChange={(e) => setFormData({ ...formData, appliesToProductFamily: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="edit-isActive">Active Template</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTemplate}>
              Update Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}