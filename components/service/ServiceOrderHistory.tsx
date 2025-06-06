"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Clock } from "lucide-react"

export function ServiceOrderHistory() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Order History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 space-y-4">
          <Package className="w-12 h-12 mx-auto text-slate-300" />
          <div>
            <h3 className="font-medium text-slate-900">No Orders Yet</h3>
            <p className="text-sm text-slate-600">
              Your submitted service orders will appear here
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}