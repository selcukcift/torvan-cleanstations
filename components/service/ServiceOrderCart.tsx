"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Package } from "lucide-react"

interface ServiceOrderCartProps {
  onOrderCreated?: () => void
}

export function ServiceOrderCart({ onOrderCreated }: ServiceOrderCartProps) {
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
          <Button variant="outline" disabled>
            Submit Service Order
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}