"use client"

import { useOrderCreateStore } from "@/stores/orderCreateStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugSinkSelectionPage() {
  const { sinkSelection, isStepValid } = useOrderCreateStore()
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Debug: Sink Selection Validation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Current Sink Selection State:</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(sinkSelection, null, 2)}
            </pre>
          </div>
          
          <div>
            <h3 className="text-lg font-medium">Step Validation Results:</h3>
            <div className="space-y-2">
              <div>Step 1 Valid: {isStepValid(1) ? "✅ Yes" : "❌ No"}</div>
              <div>Step 2 Valid: {isStepValid(2) ? "✅ Yes" : "❌ No"}</div>
              <div>Step 3 Valid: {isStepValid(3) ? "✅ Yes" : "❌ No"}</div>
              <div>Step 4 Valid: {isStepValid(4) ? "✅ Yes" : "❌ No"}</div>
              <div>Step 5 Valid: {isStepValid(5) ? "✅ Yes" : "❌ No"}</div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium">Validation Logic Details:</h3>
            <div className="space-y-1 text-sm">
              <div>sinkFamily: {sinkSelection.sinkFamily || "❌ Not set"}</div>
              <div>quantity: {sinkSelection.quantity || "❌ Not set"}</div>
              <div>buildNumbers length: {sinkSelection.buildNumbers?.length || 0}</div>
              <div>buildNumbers: {JSON.stringify(sinkSelection.buildNumbers)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
