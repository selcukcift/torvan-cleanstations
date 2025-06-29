"use client"

import { useUser } from "@clerk/nextjs"

export default function DebugClerkPage() {
  const { user, isLoaded } = useUser()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Clerk Debug Page</h1>
      
      <div className="space-y-4">
        <div>
          <strong>Environment Variables:</strong>
          <pre className="bg-gray-100 p-2 mt-2 text-sm">
            NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'Present' : 'Missing'}
          </pre>
        </div>

        <div>
          <strong>Clerk State:</strong>
          <pre className="bg-gray-100 p-2 mt-2 text-sm">
            isLoaded: {isLoaded.toString()}
            {'\n'}user: {user ? 'Present' : 'Null'}
            {user && `
User ID: ${user.id}
Email: ${user.primaryEmailAddress?.emailAddress}
Name: ${user.firstName} ${user.lastName}`}
          </pre>
        </div>
      </div>
    </div>
  )
}