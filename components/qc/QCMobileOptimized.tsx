"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  FileText, 
  Camera, 
  ClipboardCheck, 
  Menu,
  Eye,
  ChevronRight,
  Smartphone,
  Tablet
} from "lucide-react"
import { cn } from "@/lib/utils"

interface QCMobileOptimizedProps {
  children: React.ReactNode
  orderData: any
  template: any
  documentsCount: number
  photosCount: number
  onDocumentsClick: () => void
  onPhotoCaptureClick: () => void
}

export function QCMobileOptimized({
  children,
  orderData,
  template,
  documentsCount,
  photosCount,
  onDocumentsClick,
  onPhotoCaptureClick
}: QCMobileOptimizedProps) {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  if (!isMobile) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle>QC Tools</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={onDocumentsClick}
                  >
                    <FileText className="w-4 h-4 mr-3" />
                    Documents
                    <Badge variant="secondary" className="ml-auto">
                      {documentsCount}
                    </Badge>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={onPhotoCaptureClick}
                  >
                    <Camera className="w-4 h-4 mr-3" />
                    Capture Photo
                    <Badge variant="secondary" className="ml-auto">
                      {photosCount}
                    </Badge>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            
            <div>
              <h1 className="font-semibold text-lg">QC Inspection</h1>
              <p className="text-sm text-slate-600">{orderData.poNumber}</p>
            </div>
          </div>
          
          <Badge variant="outline">
            {template?.formType === 'Pre-Production Check' ? 'Pre-QC' : 'Final QC'}
          </Badge>
        </div>
      </div>

      {/* Mobile Content */}
      <div className="p-4">
        {/* Order Info Card */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-600">Customer</p>
                <p className="font-medium">{orderData.customerName}</p>
              </div>
              <div>
                <p className="text-slate-600">Product</p>
                <p className="font-medium">{orderData.productFamily}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Button
            variant="outline"
            className="h-16 flex-col"
            onClick={onDocumentsClick}
          >
            <FileText className="w-6 h-6 mb-1" />
            <span className="text-xs">Documents ({documentsCount})</span>
          </Button>
          
          <Button
            variant="outline"
            className="h-16 flex-col"
            onClick={onPhotoCaptureClick}
          >
            <Camera className="w-6 h-6 mb-1" />
            <span className="text-xs">Photos ({photosCount})</span>
          </Button>
        </div>

        {/* Main Content - Enhanced for Touch */}
        <div className="space-y-4">
          {React.cloneElement(children as React.ReactElement, {
            className: cn(
              "mobile-optimized",
              // Increase touch targets
              "[&_button]:min-h-[44px] [&_input]:min-h-[44px] [&_textarea]:min-h-[44px]",
              // Improve spacing
              "[&_label]:text-base [&_label]:font-medium",
              "[&_.space-y-3]:space-y-4 [&_.space-y-4]:space-y-6",
              // Better contrast for mobile
              "[&_[data-state=checked]]:bg-blue-600"
            )
          })}
        </div>
      </div>

      {/* Mobile FAB for Photo Capture */}
      <Button
        size="lg"
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-50"
        onClick={onPhotoCaptureClick}
      >
        <Camera className="w-6 h-6" />
      </Button>
    </div>
  )
}

// Enhanced Mobile Form Components
export function MobileChecklistSection({ 
  title, 
  items, 
  children 
}: { 
  title: string
  items: number
  children: React.ReactNode 
}) {
  const [expanded, setExpanded] = React.useState(false)

  return (
    <Card className="mb-4">
      <CardHeader 
        className="pb-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <Badge variant="secondary" className="mt-1">
              {items} items
            </Badge>
          </div>
          <ChevronRight 
            className={cn(
              "w-5 h-5 transition-transform",
              expanded && "rotate-90"
            )} 
          />
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  )
}

// Mobile-optimized input components
export function MobileFormField({ 
  label, 
  required, 
  children, 
  notes 
}: { 
  label: string
  required?: boolean
  children: React.ReactNode
  notes?: string 
}) {
  return (
    <div className="space-y-3 p-4 border rounded-lg bg-white">
      <div className="flex items-start justify-between">
        <label className="text-base font-medium leading-relaxed">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      </div>
      
      <div className="space-y-3">
        {children}
        
        {notes && (
          <textarea
            placeholder="Add notes..."
            className="w-full min-h-[88px] p-3 border rounded-md resize-none text-base"
            rows={3}
          />
        )}
      </div>
    </div>
  )
}

// Mobile device detection helper
export function useDeviceType() {
  const [deviceType, setDeviceType] = React.useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  React.useEffect(() => {
    const updateDeviceType = () => {
      const width = window.innerWidth
      if (width < 640) {
        setDeviceType('mobile')
      } else if (width < 1024) {
        setDeviceType('tablet')
      } else {
        setDeviceType('desktop')
      }
    }

    updateDeviceType()
    window.addEventListener('resize', updateDeviceType)
    return () => window.removeEventListener('resize', updateDeviceType)
  }, [])

  return deviceType
}