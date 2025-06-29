"use client"

import { useEffect, useState } from 'react'

export default function BasicClerkTestPage() {
  const [mounted, setMounted] = useState(false)
  const [envVars, setEnvVars] = useState<any>({})

  useEffect(() => {
    setMounted(true)
    setEnvVars({
      publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      clerkLoaded: typeof window !== 'undefined' && window.Clerk !== undefined
    })
  }, [])

  if (!mounted) return <div>Loading...</div>

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Basic Clerk Test</h1>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-100 rounded">
          <h3 className="font-semibold">Environment Check:</h3>
          <pre className="text-sm mt-2">
            {JSON.stringify(envVars, null, 2)}
          </pre>
        </div>

        <div className="p-4 bg-blue-100 rounded">
          <h3 className="font-semibold">Next Steps:</h3>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Check if publishableKey is present</li>
            <li>Visit /test-signin to test SignIn component</li>
            <li>Check browser console for errors</li>
            <li>Verify Clerk domain configuration</li>
          </ol>
        </div>

        <div className="p-4 bg-yellow-100 rounded">
          <h3 className="font-semibold">Common Issues:</h3>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Environment variables not loaded</li>
            <li>CSP blocking Clerk scripts</li>
            <li>Clerk app configured for wrong domain</li>
            <li>Browser blocking third-party requests</li>
          </ul>
        </div>
      </div>
    </div>
  )
}