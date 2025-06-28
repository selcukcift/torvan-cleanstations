"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  MoreHorizontal,
  Loader2,
} from "lucide-react"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

// Zod Schemas (mirroring API)
const TaskTemplateStepPartSchema = z.object({
  id: z.string().optional(),
  partId: z.string().min(1, "Part ID is required"),
  quantity: z.number().int().positive().default(1),
  notes: z.string().optional().nullable(),
  _action: z.enum(['create', 'update', 'delete']).optional(),
});

const TaskTemplateStepToolSchema = z.object({
  id: z.string().optional(),
  toolId: z.string().min(1, "Tool ID is required"),
  notes: z.string().optional().nullable(),
  _action: z.enum(['create', 'update', 'delete']).optional(),
});

const TaskTemplateStepSchema = z.object({
  id: z.string().optional(),
  stepNumber: z.number().int().positive(),
  title: z.string().min(1, "Step title is required"),
  description: z.string().optional().nullable(),
  estimatedMinutes: z.number().int().positive().optional().nullable(),
  workInstructionId: z.string().optional().nullable(),
  qcFormTemplateItemId: z.string().optional().nullable(),
  requiredParts: z.array(TaskTemplateStepPartSchema).optional(),
  requiredTools: z.array(TaskTemplateStepToolSchema).optional(),
  _action: z.enum(['create', 'update', 'delete']).optional(),
});

const TaskTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  appliesToAssemblyType: z.string().optional().nullable(),
  appliesToProductFamily: z.string().optional().nullable(),
  version: z.string().default("1.0"),
  isActive: z.boolean().default(true),
  steps: z.array(TaskTemplateStepSchema).min(1, "At least one step is required"),
});

type TaskTemplate = z.infer<typeof TaskTemplateSchema>;

interface WorkInstruction {
  id: string;
  title: string;
}

interface Part {
  partId: string;
  name: string;
}

interface Tool {
  id: string;
  name: string;
}

export default function TaskListsPage() {
  const { toast } = useToast();
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [workInstructions, setWorkInstructions] = useState<WorkInstruction[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<TaskTemplate>({
    resolver: zodResolver(TaskTemplateSchema),
    defaultValues: { steps: [] }
  });

  const { fields: stepFields, append: appendStep, remove: removeStep } = useFieldArray({
    control,
    name: "steps",
  });

  useEffect(() => {
    fetchTaskTemplates();
    fetchDependencies();
  }, [fetchTaskTemplates, fetchDependencies]);

  const fetchTaskTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await nextJsApiClient.get('/v1/admin/task-lists');
      setTaskTemplates(response.data.taskTemplates);
    } catch {
      toast({ title: "Error", description: "Failed to load task lists", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchDependencies = useCallback(async () => {
    try {
      const [wiResponse, partsResponse, toolsResponse] = await Promise.all([
        nextJsApiClient.get('/v1/admin/work-instructions'),
        nextJsApiClient.get('/v1/parts'), // Assuming an API endpoint for parts
        nextJsApiClient.get('/v1/tools'),   // Assuming an API endpoint for tools
      ]);
      setWorkInstructions(wiResponse.data.workInstructions);
      setParts(partsResponse.data.parts);
      setTools(toolsResponse.data.tools);
    } catch (error) {
      console.error("Error fetching dependencies:", error);
      toast({ title: "Error", description: "Failed to load dependencies (Work Instructions, Parts, Tools)", variant: "destructive" });
    }
  }, [toast]);

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    reset({
      name: "",
      description: "",
      appliesToAssemblyType: null,
      appliesToProductFamily: null,
      version: "1.0",
      isActive: true,
      steps: [{ stepNumber: 1, title: "", requiredParts: [], requiredTools: [] }],
    });
    setShowFormDialog(true);
  };

  const handleEditTemplate = (template: TaskTemplate) => {
    setEditingTemplate(template);
    reset(template);
    setShowFormDialog(true);
  };

  const onSubmit = async (data: TaskTemplate) => {
    try {
      setSaving(true);
      let response;
      if (editingTemplate) {
        // Mark steps for update/delete and new ones for create
        const updatedSteps = data.steps.map(step => {
          const existingStep = editingTemplate.steps.find(s => s.id === step.id);
          if (existingStep) {
            return { ...step, _action: 'update' };
          } else {
            return { ...step, _action: 'create' };
          }
        });
        const stepsToDelete = editingTemplate.steps.filter(existingStep => 
          !data.steps.some(newStep => newStep.id === existingStep.id)
        ).map(step => ({ ...step, _action: 'delete' }));

        response = await nextJsApiClient.put(`/v1/admin/task-lists/${editingTemplate.id}`, { ...data, steps: [...updatedSteps, ...stepsToDelete] });
      } else {
        response = await nextJsApiClient.post('/v1/admin/task-lists', data);
      }
      toast({ title: "Success", description: response.data.message });
      setShowFormDialog(false);
      fetchTaskTemplates();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save task list";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await nextJsApiClient.delete(`/v1/admin/task-lists/${id}`);
      toast({ title: "Success", description: "Task list deleted successfully" });
      fetchTaskTemplates();
    } catch {
      toast({ title: "Error", description: "Failed to delete task list", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Task List Management</h2>
          <p className="text-slate-600">Create and manage standardized task lists for various assembly types.</p>
        </div>
        <Button onClick={handleCreateTemplate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Task List
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Task Lists</CardTitle>
          <CardDescription>{taskTemplates.length} task lists available</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Steps</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taskTemplates.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-8">No task lists found.</TableCell></TableRow>
                ) : (
                  taskTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>v{template.version}</TableCell>
                      <TableCell>{template.steps.length}</TableCell>
                      <TableCell>{template.appliesToAssemblyType || template.appliesToProductFamily || 'N/A'}</TableCell>
                      <TableCell><Badge variant={template.isActive ? "default" : "secondary"}>{template.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditTemplate(template)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>This action cannot be undone. This will permanently delete the task list.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteTemplate(template.id!)} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Task List" : "Create New Task List"}</DialogTitle>
            <DialogDescription>Define the details and steps for this standardized task list.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Task List Name *</Label>
                <Input id="name" {...register("name")} />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="version">Version</Label>
                <Input id="version" {...register("version")} />
                {errors.version && <p className="text-red-500 text-xs mt-1">{errors.version.message}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register("description")} />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="appliesToAssemblyType">Applies to Assembly Type (e.g., MDRD_B2_ESINK)</Label>
                <Input id="appliesToAssemblyType" {...register("appliesToAssemblyType")} />
                {errors.appliesToAssemblyType && <p className="text-red-500 text-xs mt-1">{errors.appliesToAssemblyType.message}</p>}
              </div>
              <div>
                <Label htmlFor="appliesToProductFamily">Applies to Product Family (e.g., MDRD_T2_SINK)</Label>
                <Input id="appliesToProductFamily" {...register("appliesToProductFamily")} />
                {errors.appliesToProductFamily && <p className="text-red-500 text-xs mt-1">{errors.appliesToProductFamily.message}</p>}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={field.value}
                    onChange={field.onChange}
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                )}
              />
              <Label htmlFor="isActive">Active Task List</Label>
            </div>

            <Separator className="my-4" />
            <h3 className="text-lg font-semibold">Steps</h3>
            {errors.steps && <p className="text-red-500 text-xs mt-1">{errors.steps.message}</p>}
            <div className="space-y-4">
              {stepFields.map((field, index) => (
                <Card key={field.id} className="p-4">
                  <CardHeader className="flex flex-row items-center justify-between p-0 mb-4">
                    <CardTitle className="text-md">Step {index + 1}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => removeStep(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 space-y-3">
                    <div>
                      <Label htmlFor={`steps.${index}.title`}>Step Title *</Label>
                      <Input id={`steps.${index}.title`} {...register(`steps.${index}.title`)} />
                      {errors.steps?.[index]?.title && <p className="text-red-500 text-xs mt-1">{errors.steps[index]?.title?.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor={`steps.${index}.description`}>Description</Label>
                      <Textarea id={`steps.${index}.description`} {...register(`steps.${index}.description`)} />
                      {errors.steps?.[index]?.description && <p className="text-red-500 text-xs mt-1">{errors.steps[index]?.description?.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor={`steps.${index}.estimatedMinutes`}>Estimated Step Time (minutes)</Label>
                      <Input id={`steps.${index}.estimatedMinutes`} type="number" {...register(`steps.${index}.estimatedMinutes`, { valueAsNumber: true })} />
                      {errors.steps?.[index]?.estimatedMinutes && <p className="text-red-500 text-xs mt-1">{errors.steps[index]?.estimatedMinutes?.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor={`steps.${index}.workInstructionId`}>Work Instruction</Label>
                      <Controller
                        control={control}
                        name={`steps.${index}.workInstructionId`}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <SelectTrigger><SelectValue placeholder="Select a Work Instruction" /></SelectTrigger>
                            <SelectContent>
                              {workInstructions.map(wi => (
                                <SelectItem key={wi.id} value={wi.id}>{wi.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    
                    <h4 className="text-md font-semibold mt-4">Required Parts</h4>
                    <div className="space-y-2">
                      <Controller
                        control={control}
                        name={`steps.${index}.requiredParts`}
                        render={({ field }) => (
                          <>
                            {field.value?.map((part, partIndex) => (
                              <div key={partIndex} className="flex items-center gap-2">
                                <Select onValueChange={(value) => {
                                  const newParts = [...(field.value || [])];
                                  newParts[partIndex] = { ...newParts[partIndex], partId: value };
                                  field.onChange(newParts);
                                }} value={part.partId}>
                                  <SelectTrigger><SelectValue placeholder="Select Part" /></SelectTrigger>
                                  <SelectContent>
                                    {parts.map(p => (
                                      <SelectItem key={p.partId} value={p.partId}>{p.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="number"
                                  placeholder="Quantity"
                                  value={part.quantity}
                                  onChange={(e) => {
                                    const newParts = [...(field.value || [])];
                                    newParts[partIndex] = { ...newParts[partIndex], quantity: parseInt(e.target.value) };
                                    field.onChange(newParts);
                                  }}
                                />
                                <Button type="button" variant="outline" size="sm" onClick={() => {
                                  const newParts = (field.value || []).filter((_, i) => i !== partIndex);
                                  field.onChange(newParts);
                                }}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => {
                              field.onChange([...(field.value || []), { partId: "", quantity: 1 }]);
                            }} className="flex items-center gap-2">
                              <Plus className="w-4 h-4" /> Add Part
                            </Button>
                          </>
                        )}
                      />
                    </div>

                    <h4 className="text-md font-semibold mt-4">Required Tools</h4>
                    <div className="space-y-2">
                      <Controller
                        control={control}
                        name={`steps.${index}.requiredTools`}
                        render={({ field }) => (
                          <>
                            {field.value?.map((tool, toolIndex) => (
                              <div key={toolIndex} className="flex items-center gap-2">
                                <Select onValueChange={(value) => {
                                  const newTools = [...(field.value || [])];
                                  newTools[toolIndex] = { ...newTools[toolIndex], toolId: value };
                                  field.onChange(newTools);
                                }} value={tool.toolId}>
                                  <SelectTrigger><SelectValue placeholder="Select Tool" /></SelectTrigger>
                                  <SelectContent>
                                    {tools.map(t => (
                                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button type="button" variant="outline" size="sm" onClick={() => {
                                  const newTools = (field.value || []).filter((_, i) => i !== toolIndex);
                                  field.onChange(newTools);
                                }}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => {
                              field.onChange([...(field.value || []), { toolId: "" }]);
                            }} className="flex items-center gap-2">
                              <Plus className="w-4 h-4" /> Add Tool
                            </Button>
                          </>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={() => appendStep({ stepNumber: stepFields.length + 1, title: "", requiredParts: [], requiredTools: [] })} className="flex items-center gap-2 mt-4">
              <Plus className="w-4 h-4" /> Add Step
            </Button>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowFormDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingTemplate ? "Update Task List" : "Create Task List"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
