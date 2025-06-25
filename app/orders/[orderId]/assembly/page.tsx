"use client"

import { use, Suspense } from 'react'
import { AssemblyWorkflowInterface } from '@/components/assembly/AssemblyWorkflowInterface'
import { Loader2 } from 'lucide-react'

interface AssemblyPageProps {
  params: Promise<{ orderId: string }>
}

function AssemblyPageContent({ params }: AssemblyPageProps) {
  const { orderId } = use(params)

  return (
    <div className="container mx-auto p-6">
      <AssemblyWorkflowInterface orderId={orderId} />
    </div>
  )
}

export default function AssemblyPage(props: AssemblyPageProps) {
  return (
    <Suspense 
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading assembly workflow...</span>
        </div>
      }
    >
      <AssemblyPageContent {...props} />
    </Suspense>
  )
}