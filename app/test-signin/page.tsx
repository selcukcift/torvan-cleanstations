"use client"

import { SignIn } from "@clerk/nextjs"

export default function TestSignInPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Sign In Page</h1>
      <p>Environment: {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'Keys present' : 'Keys missing'}</p>
      
      <div style={{ marginTop: '20px', border: '1px solid red', padding: '10px' }}>
        <h2>Clerk SignIn Component:</h2>
        <SignIn />
      </div>
    </div>
  )
}