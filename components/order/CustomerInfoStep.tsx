"use client"

import { useState, useEffect } from "react"
import { useOrderCreateStore } from "@/stores/orderCreateStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { DatePickerSimple } from "@/components/ui/date-picker-simple"
import { Upload, FileText, X } from "lucide-react"

export function CustomerInfoStep() {
  const { customerInfo, updateCustomerInfo } = useOrderCreateStore()
  const [uploadedPoFiles, setUploadedPoFiles] = useState<File[]>([])
  const [uploadedDrawingsFiles, setUploadedDrawingsFiles] = useState<File[]>([])

  // Sync local state with store data on mount
  useEffect(() => {
    if (customerInfo.poDocuments) {
      setUploadedPoFiles(customerInfo.poDocuments)
    }
    if (customerInfo.sinkDrawings) {
      setUploadedDrawingsFiles(customerInfo.sinkDrawings)
    }
  }, [customerInfo.poDocuments, customerInfo.sinkDrawings])

  const handlePoFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      const newFiles = [...uploadedPoFiles, ...files]
      setUploadedPoFiles(newFiles)
      updateCustomerInfo({ poDocuments: newFiles })
    }
    // Reset input to allow same file upload again
    event.target.value = ''
  }

  const handleDrawingsFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      const newFiles = [...uploadedDrawingsFiles, ...files]
      setUploadedDrawingsFiles(newFiles)
      updateCustomerInfo({ sinkDrawings: newFiles })
    }
    // Reset input to allow same file upload again
    event.target.value = ''
  }

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      updateCustomerInfo({ wantDate: date })
    }
  }

  const removePoFile = (index: number) => {
    const newFiles = uploadedPoFiles.filter((_, i) => i !== index)
    setUploadedPoFiles(newFiles)
    updateCustomerInfo({ poDocuments: newFiles })
  }

  const removeDrawingFile = (index: number) => {
    const newFiles = uploadedDrawingsFiles.filter((_, i) => i !== index)
    setUploadedDrawingsFiles(newFiles)
    updateCustomerInfo({ sinkDrawings: newFiles })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Customer & Order Information</h2>
        <p className="text-slate-600">
          Enter the basic order details and customer information to begin the order creation process.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Order Details</span>
            </CardTitle>
            <CardDescription>
              Essential order information and references
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="poNumber">PO Number *</Label>
              <Input
                id="poNumber"
                value={customerInfo.poNumber}
                onChange={(e) => updateCustomerInfo({ poNumber: e.target.value })}
                placeholder="Enter PO Number (min 3 characters)"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salesPerson">Sales Person *</Label>
              <Input
                id="salesPerson"
                value={customerInfo.salesPerson}
                onChange={(e) => updateCustomerInfo({ salesPerson: e.target.value })}
                placeholder="Enter Sales Person name"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wantDate">Desired Delivery Date *</Label>
              <DatePickerSimple
                date={customerInfo.wantDate}
                onDateChange={handleDateChange}
                className="w-full"
                minDate={new Date()} // Can't select past dates
              />
            </div>

            <div className="space-y-2">
              <Label>Document Language *</Label>
              <RadioGroup
                value={customerInfo.language}
                onValueChange={(value) => updateCustomerInfo({ language: value as 'EN' | 'FR' | 'ES' })}
                className="flex flex-row space-x-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="EN" id="en" />
                  <Label htmlFor="en">EN</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="FR" id="fr" />
                  <Label htmlFor="fr">FR</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ES" id="es" />
                  <Label htmlFor="es">ES</Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Customer Details */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
            <CardDescription>
              Customer and project information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input
                id="customerName"
                value={customerInfo.customerName}
                onChange={(e) => updateCustomerInfo({ customerName: e.target.value })}
                placeholder="Enter Customer Name (min 3 characters)"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                value={customerInfo.projectName}
                onChange={(e) => updateCustomerInfo({ projectName: e.target.value })}
                placeholder="Enter Project Name (optional)"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={customerInfo.notes}
                onChange={(e) => updateCustomerInfo({ notes: e.target.value })}
                placeholder="Add any additional notes or special instructions..."
                className="w-full min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PO Document Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="w-5 h-5" />
              <span>PO Document Upload</span>
            </CardTitle>
            <CardDescription>
              Upload the purchase order document for reference
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                id="poDocument"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt"
                multiple
                onChange={handlePoFileUpload}
              />
              <label
                htmlFor="poDocument"
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                <Upload className="w-8 h-8 text-gray-400" />
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-blue-600 hover:text-blue-500">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </div>
                <div className="text-xs text-gray-400">
                  PDF, DOC, DOCX, TXT up to 10MB each (multiple files allowed)
                </div>
              </label>
            </div>
            
            {uploadedPoFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <h5 className="text-sm font-medium text-gray-700">Uploaded PO Documents ({uploadedPoFiles.length})</h5>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {uploadedPoFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm font-medium text-green-800 truncate">
                          {file.name}
                        </span>
                        <span className="text-xs text-green-600 flex-shrink-0">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePoFile(index)}
                        className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sink Drawings Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="w-5 h-5" />
              <span>Sink Drawings Upload</span>
            </CardTitle>
            <CardDescription>
              Upload technical drawings of the sink configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                id="sinkDrawings"
                className="hidden"
                accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png"
                multiple
                onChange={handleDrawingsFileUpload}
              />
              <label
                htmlFor="sinkDrawings"
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                <Upload className="w-8 h-8 text-gray-400" />
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-blue-600 hover:text-blue-500">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </div>
                <div className="text-xs text-gray-400">
                  PDF, DWG, DXF, JPG, PNG up to 10MB each (multiple files allowed)
                </div>
              </label>
            </div>
            
            {uploadedDrawingsFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <h5 className="text-sm font-medium text-gray-700">Uploaded Sink Drawings ({uploadedDrawingsFiles.length})</h5>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {uploadedDrawingsFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="text-sm font-medium text-blue-800 truncate">
                          {file.name}
                        </span>
                        <span className="text-xs text-blue-600 flex-shrink-0">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDrawingFile(index)}
                        className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
