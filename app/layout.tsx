import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Providers } from "@/components/Providers"
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Torvan Medical CleanStation Workflow",
  description: "Production workflow management system for CleanStation reprocessing sinks",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <Providers>
            <header className="border-b bg-white">
              <div className="flex items-center justify-between px-6 py-3">
                <h1 className="text-xl font-semibold">Torvan Medical CleanStation</h1>
                <div className="flex items-center gap-4">
                  <SignedOut>
                    <SignInButton mode="modal" />
                    <SignUpButton mode="modal" />
                  </SignedOut>
                  <SignedIn>
                    <UserButton afterSignOutUrl="/sign-in" />
                  </SignedIn>
                </div>
              </div>
            </header>
            {children}
            <Toaster />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}
