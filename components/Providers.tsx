"use client"

import { SessionProvider } from "next-auth/react"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider 
      refetchInterval={5 * 60} // 5 minutes instead of 0
      refetchOnWindowFocus={false} // Disable aggressive refetching
      refetchWhenOffline={false}
    >
      {children}
    </SessionProvider>
  )
}