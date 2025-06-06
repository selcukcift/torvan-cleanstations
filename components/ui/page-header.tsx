"use client"

import React from "react"
import Link from "next/link"
import { ArrowLeft, Home, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  Breadcrumb, 
  BreadcrumbList, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb"
import { cn } from "@/lib/utils"

export interface BreadcrumbNavItem {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbNavItem[]
  showBackButton?: boolean
  backUrl?: string
  backLabel?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  breadcrumbs = [],
  showBackButton = false,
  backUrl = "/dashboard",
  backLabel = "Back to Dashboard",
  actions,
  className
}: PageHeaderProps) {
  // Always include dashboard as the first breadcrumb
  const allBreadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    ...breadcrumbs
  ]

  return (
    <div className={cn("space-y-4 pb-4 border-b border-slate-200", className)}>
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          {allBreadcrumbs.map((item, index) => {
            const isLast = index === allBreadcrumbs.length - 1
            const isFirst = index === 0

            return (
              <React.Fragment key={index}>
                <BreadcrumbItem>
                  {isFirst && (
                    <Home className="h-4 w-4 mr-1 text-muted-foreground" />
                  )}
                  {isLast || !item.href ? (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={item.href}>{item.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </React.Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header Content */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          {/* Back Button */}
          {showBackButton && (
            <div className="mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                asChild
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
              >
                <Link href={backUrl}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  {backLabel}
                </Link>
              </Button>
            </div>
          )}
          
          {/* Title and Description */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {description && (
              <p className="text-muted-foreground mt-2 max-w-2xl">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

// Helper component for quick navigation actions
export function QuickActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center space-x-2">
      {children}
    </div>
  )
}