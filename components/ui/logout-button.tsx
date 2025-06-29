"use client"

import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useClerk } from "@clerk/nextjs"

interface LogoutButtonProps {
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  showIcon?: boolean
  showText?: boolean
  className?: string
}

export function LogoutButton({ 
  variant = "outline",
  size = "sm",
  showIcon = true,
  showText = true,
  className = ""
}: LogoutButtonProps) {
  const { toast } = useToast()
  const { signOut } = useClerk()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/sign-in')
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      })
    } catch (error) {
      console.error('Logout error:', error)
      toast({
        variant: "destructive",
        title: "Logout Error",
        description: "There was an error logging you out.",
      })
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      className={`flex items-center space-x-1 ${className}`}
    >
      {showIcon && <LogOut className="h-4 w-4" />}
      {showText && <span>Logout</span>}
    </Button>
  )
}
