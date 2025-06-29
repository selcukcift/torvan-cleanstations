"use client"

export function Providers({ children }: { children: React.ReactNode }) {
  // Clerk authentication is handled in the root layout
  return <>{children}</>
}