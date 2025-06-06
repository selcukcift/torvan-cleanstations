"use client"

import { User, Menu, X } from "lucide-react"
import { useState } from "react"
import { LogoutButton } from "@/components/ui/logout-button"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { useNavigation } from "@/hooks/use-navigation"
import { cn } from "@/lib/utils"

interface AppHeaderProps {
  title?: string
  showUserInfo?: boolean
  className?: string
}

export function AppHeader({ 
  title = "Torvan Medical CleanStation",
  showUserInfo = true,
  className = ""
}: AppHeaderProps) {
  const { data: session } = useSession()
  const user = session?.user
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { isActive } = useNavigation()

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen)

  return (
    <header className={`bg-white border-b border-slate-200 shadow-sm ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Title */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-slate-900">
                {title}
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                ISO 13485:2016 Compliant System
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          {showUserInfo && user && (
            <div className="hidden md:flex items-center space-x-6">
              {/* Main Navigation Links */}
              <nav className="flex items-center space-x-6">
                <Button 
                  variant={isActive("/dashboard") ? "secondary" : "ghost"} 
                  size="sm" 
                  asChild
                >
                  <a href="/dashboard" className="text-sm font-medium">
                    Dashboard
                  </a>
                </Button>
                {(['PRODUCTION_COORDINATOR', 'ADMIN'].includes(user.role)) && (
                  <Button 
                    variant={isActive("/orders/create") ? "secondary" : "ghost"} 
                    size="sm" 
                    asChild
                  >
                    <a href="/orders/create" className="text-sm font-medium">
                      Create Order
                    </a>
                  </Button>
                )}
              </nav>

              {/* User Actions */}
              <div className="flex items-center space-x-4">
                {/* Notification Bell */}
                <NotificationBell />
                
                <div className="flex items-center space-x-3">
                {/* User Avatar */}
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.initials}
                  </span>
                </div>
                
                {/* User Info */}
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500 capitalize">
                    {user.role.toLowerCase().replace('_', ' ')}
                  </p>
                </div>
              </div>

              {/* Logout Button */}
              <LogoutButton />
              </div>
            </div>
          )}

          {/* Mobile Menu Button */}
          {showUserInfo && user && (
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMobileMenu}
                className="p-2"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && showUserInfo && user && (
          <div className="md:hidden border-t border-slate-200 py-4">
            <div className="space-y-4">
              {/* Mobile User Info */}
              <div className="flex items-center space-x-3 px-2">
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.initials}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500 capitalize">
                    {user.role.toLowerCase().replace('_', ' ')}
                  </p>
                </div>
              </div>

              {/* Mobile Navigation Links */}
              <div className="px-2 space-y-2">
                <Button 
                  variant={isActive("/dashboard") ? "secondary" : "ghost"} 
                  size="sm" 
                  asChild 
                  className="w-full justify-start"
                >
                  <a href="/dashboard" className="text-sm font-medium">
                    Dashboard
                  </a>
                </Button>
                {(['PRODUCTION_COORDINATOR', 'ADMIN'].includes(user.role)) && (
                  <Button 
                    variant={isActive("/orders/create") ? "secondary" : "ghost"} 
                    size="sm" 
                    asChild 
                    className="w-full justify-start"
                  >
                    <a href="/orders/create" className="text-sm font-medium">
                      Create Order
                    </a>
                  </Button>
                )}
              </div>

              {/* Mobile Actions */}
              <div className="px-2 space-y-2 border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Notifications</span>
                  <NotificationBell />
                </div>
                <LogoutButton className="w-full" />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
