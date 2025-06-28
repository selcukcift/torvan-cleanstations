"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
import { Checkbox } from "@/components/ui/checkbox"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

// Zod Schemas (mirroring API)
const WorkInstructionStepSchema = z.object({
  id: z.string().optional(),
  stepNumber: z.number().int().positive(),
  title: z.string().min(1, "Step title is required"),
  description: z.string().min(1, "Step description is required"),
  estimatedMinutes: z.number().int().positive().optional().nullable(),
  images: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
  checkpoints: z.array(z.string()).optional(),
  _action: z.enum(['create', 'update', 'delete']).optional(),
});

const WorkInstructionSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  assemblyId: z.string().optional().nullable(),
  version: z.string().default("1.0"),
  isActive: z.boolean().default(true),
  estimatedMinutes: z.number().int().positive().optional().nullable(),
  steps: z.array(WorkInstructionStepSchema).min(1, "At least one step is required"),
});

type WorkInstruction = z.infer<typeof WorkInstructionSchema>;

export default function WorkInstructionsPage() {
  const { toast } = useToast();
  const [workInstructions, setWorkInstructions] = useState<WorkInstruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState<WorkInstruction | null>(null);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<WorkInstruction>({
    resolver: zodResolver(WorkInstructionSchema),
    defaultValues: { steps: [] }
  });

  const { fields: stepFields, append: appendStep, remove: removeStep } = useFieldArray({
    control,
    name: "steps",
  });

  useEffect(() => {
    fetchWorkInstructions();
  }, [fetchWorkInstructions]);

  const fetchWorkInstructions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await nextJsApiClient.get('/v1/admin/work-instructions');
      setWorkInstructions(response.data.workInstructions);
    } catch {
      toast({ title: "Error", description: "Failed to load work instructions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleCreateInstruction = () => {
    setEditingInstruction(null);
    reset({
      title: "",
      description: "",
      assemblyId: null,
      version: "1.0",
      isActive: true,
      estimatedMinutes: null,
      steps: [{ stepNumber: 1, title: "", description: "", estimatedMinutes: null }],
    });
    setShowFormDialog(true);
  };

  const handleEditInstruction = (instruction: WorkInstruction) => {
    setEditingInstruction(instruction);
    reset(instruction);
    setShowFormDialog(true);
  };

  const onSubmit = async (data: WorkInstruction) => {
    try {
      setSaving(true);
      let response;
      if (editingInstruction) {
        // Mark existing steps for update/delete and new ones for create
        const updatedSteps = data.steps.map(step => {
          const existingStep = editingInstruction.steps.find(s => s.id === step.id);
          if (existingStep) {
            return { ...step, _action: 'update' };
          } else {
            return { ...step, _action: 'create' };
          }
        });
        // Identify steps to be deleted
        const stepsToDelete = editingInstruction.steps.filter(existingStep => 
          !data.steps.some(newStep => newStep.id === existingStep.id)
        ).map(step => ({ ...step, _action: 'delete' }));

        response = await nextJsApiClient.put(`/v1/admin/work-instructions/${editingInstruction.id}`, { ...data, steps: [...updatedSteps, ...stepsToDelete] });
      } else {
        response = await nextJsApiClient.post('/v1/admin/work-instructions', data);
      }
      toast({ title: "Success", description: response.data.message });
      setShowFormDialog(false);
      fetchWorkInstructions();
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to save work instruction", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInstruction = async (id: string) => {
    try {
      await nextJsApiClient.delete(`/v1/admin/work-instructions/${id}`);
      toast({ title: "Success", description: "Work instruction deleted successfully" });
      fetchWorkInstructions();
    } catch {
      toast({ title: "Error", description: "Failed to delete work instruction", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Work Instruction Management</h2>
          <p className="text-slate-600">Create and manage detailed work instructions for assembly and production.</p>
        </div>
        <Button onClick={handleCreateInstruction} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Instruction
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Work Instructions</CardTitle>
          <CardDescription>{workInstructions.length} instructions available</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Steps</TableHead>
                  <TableHead>Est. Time (min)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workInstructions.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-8">No work instructions found.</TableCell></TableRow>
                ) : (
                  workInstructions.map((instruction) => (
                    <TableRow key={instruction.id}>
                      <TableCell className="font-medium">{instruction.title}</TableCell>
                      <TableCell>v{instruction.version}</TableCell>
                      <TableCell>{instruction.steps.length}</TableCell>
                      <TableCell>{instruction.estimatedMinutes || 'N/A'}</TableCell>
                      <TableCell><Badge variant={instruction.isActive ? "default" : "secondary"}>{instruction.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditInstruction(instruction)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>This action cannot be undone. This will permanently delete the work instruction.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteInstruction(instruction.id!)} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingInstruction ? "Edit Work Instruction" : "Create New Work Instruction"}</DialogTitle>
            <DialogDescription>Define the details and steps for this work instruction.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input id="title" {...register("title")} />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
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
            <div>
              <Label htmlFor="assemblyId">Associated Assembly ID (Optional)</Label>
              <Input id="assemblyId" {...register("assemblyId")} placeholder="e.g., T2-BODY-48-60-HA" />
              {errors.assemblyId && <p className="text-red-500 text-xs mt-1">{errors.assemblyId.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimatedMinutes">Estimated Time (minutes)</Label>
                <Input id="estimatedMinutes" type="number" {...register("estimatedMinutes", { valueAsNumber: true })} />
                {errors.estimatedMinutes && <p className="text-red-500 text-xs mt-1">{errors.estimatedMinutes.message}</p>}
              </div>
              <div className="flex items-center space-x-2 mt-6">
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <Checkbox
                      id="isActive"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="isActive">Active Instruction</Label>
              </div>
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
                      <Label htmlFor={`steps.${index}.description`}>Description *</Label>
                      <Textarea id={`steps.${index}.description`} {...register(`steps.${index}.description`)} />
                      {errors.steps?.[index]?.description && <p className="text-red-500 text-xs mt-1">{errors.steps[index]?.description?.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor={`steps.${index}.estimatedMinutes`}>Estimated Step Time (minutes)</Label>
                      <Input id={`steps.${index}.estimatedMinutes`} type="number" {...register(`steps.${index}.estimatedMinutes`, { valueAsNumber: true })} />
                      {errors.steps?.[index]?.estimatedMinutes && <p className="text-red-500 text-xs mt-1">{errors.steps[index]?.estimatedMinutes?.message}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={() => appendStep({ stepNumber: stepFields.length + 1, title: "", description: "" })} className="flex items-center gap-2 mt-4">
              <Plus className="w-4 h-4" /> Add Step
            </Button>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowFormDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingInstruction ? "Update Instruction" : "Create Instruction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
