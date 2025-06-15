"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  ShoppingCart, 
  Package, 
  Plus, 
  Minus, 
  Trash2, 
  Send,
  Loader2,
  CheckCircle
} from "lucide-react"
import { useServiceCartStore } from "@/stores/serviceCartStore"
import { useToast } from "@/hooks/use-toast"
import { nextJsApiClient } from "@/lib/api"
import { useSession } from "next-auth/react"

interface ServiceOrderCartProps {
  onOrderCreated?: () => void
}

export function ServiceOrderCart({ onOrderCreated }: ServiceOrderCartProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  
  // Cart store
  const { 
    items, 
    updateQuantity, 
    removeItem, 
    clearCart, 
    getTotalItems, 
    isSubmitting, 
    setSubmitting,
    setLastSubmittedOrderId 
  } = useServiceCartStore()
  
  // Form state
  const [notes, setNotes] = useState("")
  const [priority, setPriority] = useState<"NORMAL" | "URGENT">("NORMAL")

  const handleQuantityChange = (partId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(partId)
    } else {
      updateQuantity(partId, newQuantity)
    }
  }

  const handleSubmitOrder = async () => {
    if (items.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Add some parts to your cart before submitting",
        variant: "destructive"
      })
      return
    }

    if (!session?.user) {
      toast({
        title: "Authentication required",
        description: "Please log in to submit a service order",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    try {
      const response = await nextJsApiClient.post('/service-orders', {
        items: items.map(item => ({
          partId: item.partId,
          partName: item.name,
          quantity: item.quantity
        })),
        notes,
        priority
      })

      if (response.data.success) {
        const orderId = response.data.data.id
        setLastSubmittedOrderId(orderId)
        clearCart()
        setNotes("")
        setPriority("NORMAL")
        
        toast({
          title: "Service Order Submitted",
          description: `Order #${orderId} has been submitted for procurement review`,
        })

        if (onOrderCreated) {
          onOrderCreated()
        }
      } else {
        throw new Error(response.data.message || "Failed to submit order")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to submit service order",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Service Order Cart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <Package className="w-12 h-12 mx-auto text-slate-300" />
            <div>
              <h3 className="font-medium text-slate-900">Cart is Empty</h3>
              <p className="text-sm text-slate-600">
                Browse parts and add them to your cart to create a service order
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Service Order Cart
          </div>
          <Badge variant="outline">
            {getTotalItems()} items
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cart Items */}
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.partId} className="flex items-center gap-3 p-3 border rounded-lg">
              {/* Part Image */}
              <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
                {item.photoURL ? (
                  <img 
                    src={item.photoURL} 
                    alt={item.name}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <Package className="w-6 h-6 text-slate-400" />
                )}
              </div>
              
              {/* Part Details */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm leading-tight truncate">
                  {item.name}
                </h4>
                <p className="text-xs text-slate-500">
                  ID: {item.partId}
                </p>
                {item.partNumber && (
                  <p className="text-xs text-slate-500">
                    PN: {item.partNumber}
                  </p>
                )}
                <Badge variant="outline" className="text-xs mt-1">
                  {item.type}
                </Badge>
              </div>
              
              {/* Quantity Controls */}
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => handleQuantityChange(item.partId, item.quantity - 1)}
                  variant="outline"
                  size="sm"
                  className="w-8 h-8 p-0"
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-8 text-center text-sm font-medium">
                  {item.quantity}
                </span>
                <Button 
                  onClick={() => handleQuantityChange(item.partId, item.quantity + 1)}
                  variant="outline"
                  size="sm"
                  className="w-8 h-8 p-0"
                >
                  <Plus className="w-3 h-3" />
                </Button>
                <Button 
                  onClick={() => removeItem(item.partId)}
                  variant="outline"
                  size="sm"
                  className="w-8 h-8 p-0 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Details Form */}
        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as "NORMAL" | "URGENT")}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="NORMAL">Normal</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special instructions or notes for this service order..."
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button 
            onClick={() => clearCart()}
            variant="outline"
            disabled={isSubmitting}
          >
            Clear Cart
          </Button>
          <Button 
            onClick={handleSubmitOrder}
            className="flex-1"
            disabled={isSubmitting || items.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Service Order
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}