"use client"

import { useRouter } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'

export default function SimpleSignInPage() {
  const { redirectToSignIn } = useClerk()
  const router = useRouter()

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Torvan Medical CleanStation
          </h1>
          <p className="text-gray-600">
            Sign in to your account
          </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={() => redirectToSignIn()}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In with Clerk
          </button>
          
          <button
            onClick={() => router.push('/sign-up')}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  )
}