"use client"

import { useUser } from "@clerk/nextjs"
import { useEffect, useState } from "react"
import { getAuthUser } from "@/lib/auth"

export default function TestAuthPage() {
  const { user, isLoaded, isSignedIn } = useUser()
  const [dbUser, setDbUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDbUser() {
      try {
        const response = await fetch('/api/test-auth')
        if (response.ok) {
          const data = await response.json()
          setDbUser(data.user)
        } else {
          setError('Failed to fetch DB user')
        }
      } catch (err) {
        setError('Error fetching DB user')
      } finally {
        setLoading(false)
      }
    }

    if (isSignedIn) {
      fetchDbUser()
    } else {
      setLoading(false)
    }
  }, [isSignedIn])

  if (!isLoaded) {
    return <div className="p-8">Loading Clerk...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Authentication Test Page</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Clerk Authentication Status</h2>
          <p>Signed In: {isSignedIn ? 'Yes' : 'No'}</p>
          {user && (
            <>
              <p>Clerk ID: {user.id}</p>
              <p>Email: {user.emailAddresses[0]?.emailAddress}</p>
              <p>Name: {user.firstName} {user.lastName}</p>
              <p>Username: {user.username}</p>
              <p>Role (from metadata): {JSON.stringify(user.publicMetadata)}</p>
            </>
          )}
        </div>

        <div className="bg-blue-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Database User</h2>
          {loading ? (
            <p>Loading database user...</p>
          ) : error ? (
            <p className="text-red-600">Error: {error}</p>
          ) : dbUser ? (
            <>
              <p>DB ID: {dbUser.id}</p>
              <p>Username: {dbUser.username}</p>
              <p>Email: {dbUser.email}</p>
              <p>Full Name: {dbUser.name}</p>
              <p>Role: {dbUser.role}</p>
              <p>Initials: {dbUser.initials}</p>
              <p>Clerk ID in DB: {dbUser.clerkId}</p>
            </>
          ) : (
            <p>No database user found</p>
          )}
        </div>
      </div>
    </div>
  )
}