"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { plainNodeApiClient } from "@/lib/api"

export default function DebugPage() {
  const [result, setResult] = useState("")
  const [error, setError] = useState("")

  const testLogin = async () => {
    try {
      setResult("")
      setError("")
      
      console.log("Testing login via frontend API client...")
      
      const response = await plainNodeApiClient.post('/auth/login', {
        username: 'admin',
        password: 'admin123'
      })

      console.log("Login response:", response)
      setResult(JSON.stringify(response.data, null, 2))
      
    } catch (err: any) {
      console.error("Login error:", err)
      setError(`Status: ${err.response?.status}, Error: ${err.response?.data?.error || err.message}`)
    }
  }

  const testDirect = async () => {
    try {
      setResult("")
      setError("")
      
      console.log("Testing direct fetch...")
      
      const response = await fetch('http://localhost:3004/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'admin123'
        })
      })

      const data = await response.text()
      console.log("Direct fetch response:", response.status, data)
      setResult(`Status: ${response.status}, Data: ${data}`)
      
    } catch (err: any) {
      console.error("Direct fetch error:", err)
      setError(err.message)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Login Debug Page</h1>
      
      <div className="space-y-4 mb-6">
        <Button onClick={testLogin} className="mr-4">
          Test Login (Via API Client)
        </Button>
        <Button onClick={testDirect} variant="outline">
          Test Direct Fetch
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
