"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Save,
  X,
  FileText,
  List,
  Loader2,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import { nextJsApiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface WorkInstructionStep {
  id?: string
  stepNumber: number
  description: string
  notes?: string
}

interface WorkInstruction {
  id?: string
  title: string
  description?: string
  steps: WorkInstructionStep[]
  createdAt?: string
  updatedAt?: string
}

export default function WorkInstructionsPage() {
  const { toast } = useToast()
  const [instructions, setInstructions] = useState<WorkInstruction[]>([])
  const [editingInstruction, setEditingInstruction] = useState<WorkInstruction | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDialog, setShowDialog] = useState(false)

  useEffect(() => {
    fetchInstructions()
  }, [])

  const fetchInstructions = async () => {
    try {
      setLoading(true)
      const response = await nextJsApiClient.get('/v1/admin/work-instructions')
      
      if (response.data.success) {
        setInstructions(response.data.instructions)
      }
    } catch (error: any) {
      console.error('Error fetching work instructions:', error)
      toast({
        title: "Error",
        description: "Failed to load work instructions",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInstruction = () => {
    const newInstruction: WorkInstruction = {
      title: "",
      description: "",
      steps: [{ stepNumber: 1, description: "" }]
    }
    setEditingInstruction(newInstruction)
    setShowDialog(true)
  }

  const handleEditInstruction = (instruction: WorkInstruction) => {
    setEditingInstruction({ ...instruction })
    setShowDialog(true)
  }

  const handleSaveInstruction = async () => {
    if (!editingInstruction) return

    if (!editingInstruction.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Instruction title is required",
        variant: "destructive"
      })
      return
    }

    if (editingInstruction.steps.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one step is required",
        variant: "destructive"
      })
      return
    }

    try {
      setSaving(true)
      
      if (editingInstruction.id) {
        // Update existing instruction
        const response = await nextJsApiClient.put(`/v1/admin/work-instructions/${editingInstruction.id}`, editingInstruction)
        if (response.data.success) {
          toast({
            title: "Success",
            description: "Work instruction updated successfully"
          })
        }
      } else {
        // Create new instruction
        const response = await nextJsApiClient.post('/v1/admin/work-instructions', editingInstruction)
        if (response.data.success) {
          toast({
            title: "Success",
            description: "Work instruction created successfully"
          })
        }
      }
      
      setShowDialog(false)
      setEditingInstruction(null)
      await fetchInstructions()
    } catch (error: any) {
      console.error('Error saving work instruction:', error)
      toast({
        title: "Error",
        description: "Failed to save work instruction",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteInstruction = async (instructionId: string) => {
    try {
      const response = await nextJsApiClient.delete(`/v1/admin/work-instructions/${instructionId}`)
      if (response.data.success) {
        toast({
          title: "Success",
          description: "Work instruction deleted successfully"
        })
        await fetchInstructions()
      }
    } catch (error: any) {
      console.error('Error deleting work instruction:', error)
      toast({
        title: "Error",
        description: "Failed to delete work instruction",
        variant: "destructive"
      })
    }
  }

  const handleAddStep = () => {
    if (!editingInstruction) return

    const newStep: WorkInstructionStep = {
      stepNumber: editingInstruction.steps.length + 1,
      description: ""
    }

    setEditingInstruction({
      ...editingInstruction,
      steps: [...editingInstruction.steps, newStep]
    })
  }

  const handleRemoveStep = (stepIndex: number) => {
    if (!editingInstruction) return

    const updatedSteps = editingInstruction.steps.filter((_, index) => index !== stepIndex)
    // Renumber steps
    updatedSteps.forEach((step, index) => {
      step.stepNumber = index + 1
    })

    setEditingInstruction({
      ...editingInstruction,
      steps: updatedSteps
    })
  }

  const handleMoveStep = (stepIndex: number, direction: 'up' | 'down') => {
    if (!editingInstruction) return

    const steps = [...editingInstruction.steps]
    const newIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1
    
    if (newIndex < 0 || newIndex >= steps.length) return

    // Swap steps
    const temp = steps[stepIndex]
    steps[stepIndex] = steps[newIndex]
    steps[newIndex] = temp

    // Renumber steps
    steps.forEach((step, index) => {
      step.stepNumber = index + 1
    })

    setEditingInstruction({
      ...editingInstruction,
      steps
    })
  }

  const handleStepChange = (stepIndex: number, field: keyof WorkInstructionStep, value: string) => {
    if (!editingInstruction) return

    const updatedSteps = [...editingInstruction.steps]
    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      [field]: value
    }

    setEditingInstruction({
      ...editingInstruction,
      steps: updatedSteps
    })
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
          <h1 className="text-3xl font-bold">Work Instructions</h1>
          <p className="text-slate-600">Create and manage step-by-step work instructions</p>
        </div>
        <Button onClick={handleCreateInstruction} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Instruction
        </Button>
      </div>

      {/* Instructions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Work Instructions</CardTitle>
          <CardDescription>{instructions.length} instructions available</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instructions.map((instruction) => (
                <TableRow key={instruction.id}>
                  <TableCell className="font-medium">{instruction.title}</TableCell>
                  <TableCell>{instruction.description || '-'}</TableCell>
                  <TableCell>{instruction.steps.length}</TableCell>
                  <TableCell>
                    {instruction.createdAt ? new Date(instruction.createdAt).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditInstruction(instruction)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Work Instruction</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{instruction.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => instruction.id && handleDeleteInstruction(instruction.id)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              
              {instructions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>No work instructions created yet</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingInstruction?.id ? 'Edit Work Instruction' : 'Create New Work Instruction'}
            </DialogTitle>
            <DialogDescription>
              Create step-by-step instructions for assembly tasks
            </DialogDescription>
          </DialogHeader>
          
          {editingInstruction && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="instruction-title">Title *</Label>
                <Input
                  id="instruction-title"
                  value={editingInstruction.title}
                  onChange={(e) => setEditingInstruction({
                    ...editingInstruction,
                    title: e.target.value
                  })}
                  placeholder="e.g., Basin Installation Procedure"
                />
              </div>
              
              <div>
                <Label htmlFor="instruction-description">Description</Label>
                <Textarea
                  id="instruction-description"
                  value={editingInstruction.description || ''}
                  onChange={(e) => setEditingInstruction({
                    ...editingInstruction,
                    description: e.target.value
                  })}
                  placeholder="Brief description of the work instruction"
                />
              </div>
              
              {/* Steps */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label>Steps</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddStep}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Step
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {editingInstruction.steps.map((step, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveStep(index, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <span className="text-sm font-medium text-center">
                            {step.stepNumber}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveStep(index, 'down')}
                            disabled={index === editingInstruction.steps.length - 1}
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div>
                            <Label htmlFor={`step-${index}-description`}>Step Description *</Label>
                            <Textarea
                              id={`step-${index}-description`}
                              value={step.description}
                              onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                              placeholder="Describe what to do in this step"
                              rows={3}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`step-${index}-notes`}>Notes (optional)</Label>
                            <Textarea
                              id={`step-${index}-notes`}
                              value={step.notes || ''}
                              onChange={(e) => handleStepChange(index, 'notes', e.target.value)}
                              placeholder="Additional notes or warnings"
                              rows={2}
                            />
                          </div>
                        </div>
                        
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveStep(index)}
                          className="text-red-600 hover:text-red-700"
                          disabled={editingInstruction.steps.length === 1}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveInstruction} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {editingInstruction?.id ? 'Update' : 'Create'} Instruction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}