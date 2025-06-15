"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { CalendarIcon, Loader2 } from "lucide-react"

export interface OutsourcedPartData {
  id?: string
  bomItemId?: string
  partNumber: string
  partName: string
  quantity: number
  supplier?: string
  status?: string
  notes?: string
  expectedReturnDate?: Date | string
  actualReturnDate?: Date | string
}

interface OutsourcingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  part: OutsourcedPartData | null
  mode: "create" | "edit"
  onSave: (data: OutsourcedPartData) => Promise<void>
  loading?: boolean
}

const statusOptions = [
  { value: "PENDING", label: "Pending", color: "bg-yellow-100 text-yellow-700" },
  { value: "SENT", label: "Sent", color: "bg-blue-100 text-blue-700" },
  { value: "IN_PROGRESS", label: "In Progress", color: "bg-purple-100 text-purple-700" },
  { value: "RECEIVED", label: "Received", color: "bg-green-100 text-green-700" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-red-100 text-red-700" },
]

const commonSuppliers = [
  "Sink Body Manufacturer",
  "Acme Manufacturing",
  "Global Parts Co.",
  "Precision Components Ltd.",
  "Quality Suppliers Inc.",
  "Tech Parts Solutions",
]

export function OutsourcingDialog({
  open,
  onOpenChange,
  part,
  mode,
  onSave,
  loading = false,
}: OutsourcingDialogProps) {
  const [formData, setFormData] = useState<OutsourcedPartData>({
    partNumber: part?.partNumber || "",
    partName: part?.partName || "",
    quantity: part?.quantity || 1,
    supplier: part?.supplier || "",
    status: part?.status || "PENDING",
    notes: part?.notes || "",
    expectedReturnDate: part?.expectedReturnDate || undefined,
    actualReturnDate: part?.actualReturnDate || undefined,
  })

  const [expectedDate, setExpectedDate] = useState<Date | undefined>(
    part?.expectedReturnDate ? new Date(part.expectedReturnDate) : undefined
  )
  const [actualDate, setActualDate] = useState<Date | undefined>(
    part?.actualReturnDate ? new Date(part.actualReturnDate) : undefined
  )

  const handleSubmit = async () => {
    const dataToSave: OutsourcedPartData = {
      ...formData,
      expectedReturnDate: expectedDate?.toISOString(),
      actualReturnDate: actualDate?.toISOString(),
    }
    
    if (mode === "edit" && part?.id) {
      dataToSave.id = part.id
    }
    
    await onSave(dataToSave)
  }

  const getStatusBadge = (status: string) => {
    const option = statusOptions.find((opt) => opt.value === status)
    return option ? (
      <Badge className={cn(option.color, "ml-2")}>
        {option.label}
      </Badge>
    ) : null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Mark Part for Outsourcing" : "Edit Outsourced Part"}
            {mode === "edit" && formData.status && getStatusBadge(formData.status)}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Provide details for the part to be outsourced"
              : "Update the outsourcing information for this part"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Part Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="partNumber">Part Number</Label>
              <Input
                id="partNumber"
                value={formData.partNumber}
                onChange={(e) =>
                  setFormData({ ...formData, partNumber: e.target.value })
                }
                disabled={mode === "edit"}
              />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
                }
                disabled={mode === "edit"}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="partName">Part Name</Label>
            <Input
              id="partName"
              value={formData.partName}
              onChange={(e) =>
                setFormData({ ...formData, partName: e.target.value })
              }
              disabled={mode === "edit"}
            />
          </div>

          {/* Supplier */}
          <div>
            <Label htmlFor="supplier">Supplier</Label>
            <Select
              value={formData.supplier}
              onValueChange={(value) =>
                setFormData({ ...formData, supplier: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select or enter a supplier" />
              </SelectTrigger>
              <SelectContent>
                {commonSuppliers.map((supplier) => (
                  <SelectItem key={supplier} value={supplier}>
                    {supplier}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="mt-2"
              placeholder="Or enter custom supplier name"
              value={formData.supplier}
              onChange={(e) =>
                setFormData({ ...formData, supplier: e.target.value })
              }
            />
          </div>

          {/* Status (Edit mode only) */}
          {mode === "edit" && (
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center">
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Expected Return Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expectedDate ? format(expectedDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={expectedDate}
                    onSelect={setExpectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {mode === "edit" && (
              <div>
                <Label>Actual Return Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !actualDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {actualDate ? format(actualDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={actualDate}
                      onSelect={setActualDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Any additional information about this outsourcing..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Mark for Outsourcing" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}