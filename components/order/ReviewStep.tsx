"use client"

import { useState } from "react"
import { useOrderCreateStore, SelectedAccessory } from "@/stores/orderCreateStore"
import { DetailedReviewSection } from "./DetailedReviewSection"
import { BOMViewer } from "./BOMViewer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  CheckCircle, 
  Loader2,
  AlertCircle
} from "lucide-react"
import { nextJsApiClient } from '@/lib/api'

interface OrderSubmitResponse {
  success: boolean
  orderId?: string
  message?: string
  bomId?: string
}

interface ReviewStepProps {
  isEditMode?: boolean
  orderId?: string
}


export function ReviewStep({ isEditMode = false, orderId }: ReviewStepProps) {
  const { 
    customerInfo, 
    sinkSelection, 
    configurations, 
    accessories, 
    resetForm 
  } = useOrderCreateStore()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<OrderSubmitResponse | null>(null)

  const handleSubmitOrder = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const orderData = {
        customerInfo: {
          ...customerInfo,
          wantDate: customerInfo.wantDate?.toISOString() || new Date().toISOString()
        },
        sinkSelection,
        configurations,
        accessories
      }
      
      console.log('Submitting order data:', JSON.stringify(orderData, null, 2))

      let response
      if (isEditMode && orderId) {
        // Update existing order
        response = await nextJsApiClient.put(`/orders/${orderId}`, orderData)
      } else {
        // Create new order
        response = await nextJsApiClient.post('/orders', orderData)
      }

      const result: OrderSubmitResponse = response.data
      
      if (result.success) {
        setSubmitSuccess(result)
        // Reset form after successful submission (only for new orders)
        if (!isEditMode) {
          setTimeout(() => {
            resetForm()
          }, 3000)
        }
      } else {
        setSubmitError(result.message || `Order ${isEditMode ? 'update' : 'submission'} failed`)
      }
    } catch (error: any) {
      console.error(`Error ${isEditMode ? 'updating' : 'submitting'} order:`, error)
      console.error('Error response:', error.response?.data)
      
      let errorMessage = `Failed to ${isEditMode ? 'update' : 'submit'} order. Please try again.`
      
      if (error.response?.data?.errors) {
        // Handle Zod validation errors
        const validationErrors = error.response.data.errors
        errorMessage = `Validation errors: ${validationErrors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      
      setSubmitError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'Not specified'
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date)
  }

  const getAccessoryCount = () => {
    return Object.values(accessories).reduce((total, buildAccessories) => {
      return total + buildAccessories.reduce((sum, acc) => sum + acc.quantity, 0)
    }, 0)
  }

  const getTotalSinkCount = () => {
    return sinkSelection.buildNumbers.length
  }

  if (submitSuccess) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-green-700">
              Order {isEditMode ? 'Updated' : 'Submitted'} Successfully!
            </h2>
            <p className="text-muted-foreground">
              {isEditMode 
                ? `Order ${orderId} has been updated successfully.`
                : `Your order has been created and assigned ID: ${submitSuccess.orderId}`
              }
              {!isEditMode && <Badge variant="secondary" className="ml-2">{submitSuccess.orderId}</Badge>}
            </p>
            {submitSuccess.bomId && (
              <p className="text-muted-foreground">
                BOM {isEditMode ? 'regenerated' : 'generated'} with ID: <Badge variant="outline">{submitSuccess.bomId}</Badge>
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {isEditMode 
                ? 'Redirecting to order details...'
                : 'Redirecting to order dashboard in 3 seconds...'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <ScrollArea className="h-[700px] pr-4">
        <div className="space-y-6">
          {/* Use the new detailed review section */}
          <DetailedReviewSection 
            customerInfo={customerInfo}
            sinkSelection={sinkSelection}
            configurations={configurations}
            accessories={accessories}
          />

          {/* BOM Viewer Section */}
          <BOMViewer 
            orderData={configurations}
            customerInfo={customerInfo}
          />

          {/* Submit Actions */}
          <Card>
            <CardContent className="pt-6">
              {submitError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}
              
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting}
                  size="lg"
                  className="min-w-[150px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditMode ? 'Updating...' : 'Submitting...'}
                    </>
                  ) : (
                    isEditMode ? 'Update Order' : 'Submit Order'
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground text-center mt-4">
                By submitting this order, you confirm that all information is accurate and complete.
              </p>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
