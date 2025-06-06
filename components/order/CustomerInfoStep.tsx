"use client"

import { useState } from "react"
import { useOrderCreateStore } from "@/stores/orderCreateStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { DatePicker } from "@/components/ui/date-picker"
import { Upload, FileText } from "lucide-react"

export function CustomerInfoStep() {
  const { customerInfo, updateCustomerInfo } = useOrderCreateStore()
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      // Store file in customer info for later upload
      updateCustomerInfo({ poDocument: file })
    }
  }

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      updateCustomerInfo({ wantDate: date })
    }
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
              <DatePicker
                date={customerInfo.wantDate}
                onDateChange={handleDateChange}
                className="w-full"
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
              onChange={handleFileUpload}
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
                PDF, DOC, DOCX, TXT up to 10MB
              </div>
            </label>
          </div>
          
          {uploadedFile && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  {uploadedFile.name}
                </span>
                <span className="text-xs text-green-600">
                  ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
