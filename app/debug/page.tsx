"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { signIn, useSession } from "next-auth/react"

export default function DebugPage() {
  const [result, setResult] = useState("")
  const [error, setError] = useState("")
  const { data: session, status } = useSession()

  const testLogin = async () => {
    try {
      setResult("")
      setError("")
      
      console.log("Testing NextAuth login...")
      
      const result = await signIn('credentials', {
        email: 'admin@torvan.com',
        password: 'password123',
        redirect: false
      })

      console.log("Login result:", result)
      setResult(JSON.stringify(result, null, 2))
      
    } catch (err: any) {
      console.error("Login error:", err)
      setError(`Error: ${err.message}`)
    }
  }

  const testSession = async () => {
    try {
      setResult("")
      setError("")
      
      console.log("Testing current session...")
      
      if (session) {
        setResult(JSON.stringify({
          status: "authenticated",
          user: session.user,
          expires: session.expires
        }, null, 2))
      } else {
        setResult(JSON.stringify({
          status: status,
          message: "No active session"
        }, null, 2))
      }
      
    } catch (err: any) {
      console.error("Session error:", err)
      setError(err.message)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Login Debug Page</h1>
      
      <div className="space-y-4 mb-6">
        <Button onClick={testLogin} className="mr-4">
          Test NextAuth Login
        </Button>
        <Button onClick={testSession} variant="outline">
          Test Current Session
        </Button>
      </div>

      {result && (
        <div className="bg-green-50 border border-green-200 p-4 rounded mb-4">
          <h3 className="font-semibold text-green-800 mb-2">Success:</h3>
          <pre className="text-sm">{result}</pre>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded">
          <h3 className="font-semibold text-red-800 mb-2">Error:</h3>
          <pre className="text-sm">{error}</pre>
        </div>
      )}
    </div>
  )
}
