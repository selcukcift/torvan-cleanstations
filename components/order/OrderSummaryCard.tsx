"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { 
  Calendar,
  User,
  Package,
  Wrench,
  CheckCircle,
  Clock,
  AlertCircle,
  Building,
  FileText,
  Settings
} from "lucide-react"
import { format } from "date-fns"

interface OrderSummaryProps {
  order: {
    id: string
    poNumber: string
    customerName: string
    projectName?: string
    salesPerson: string
    wantDate: string
    createdAt: string
    orderStatus: string
    buildNumbers: string[]
    configurations?: any[]
    accessories?: any[]
    language: string
    notes?: string
  }
}

const statusConfig = {
  ORDER_CREATED: { 
    label: "Order Created", 
    color: "bg-blue-100 text-blue-700", 
    icon: FileText,
    progress: 10 
  },
  SINK_BODY_EXTERNAL_PRODUCTION: { 
    label: "External Production", 
    color: "bg-purple-100 text-purple-700", 
    icon: Package,
    progress: 20 
  },
  READY_FOR_PRE_QC: { 
    label: "Ready for Pre-QC", 
    color: "bg-yellow-100 text-yellow-700", 
    icon: AlertCircle,
    progress: 35 
  },
  READY_FOR_PRODUCTION: { 
    label: "Ready for Production", 
    color: "bg-orange-100 text-orange-700", 
    icon: Wrench,
    progress: 50 
  },
  TESTING_COMPLETE: { 
    label: "Testing Complete", 
    color: "bg-green-100 text-green-700", 
    icon: CheckCircle,
    progress: 70 
  },
  PACKAGING_COMPLETE: { 
    label: "Packaging Complete", 
    color: "bg-teal-100 text-teal-700", 
    icon: Package,
    progress: 85 
  },
  READY_FOR_FINAL_QC: { 
    label: "Ready for Final QC", 
    color: "bg-indigo-100 text-indigo-700", 
    icon: AlertCircle,
    progress: 90 
  },
  READY_FOR_SHIP: { 
    label: "Ready for Ship", 
    color: "bg-emerald-100 text-emerald-700", 
    icon: CheckCircle,
    progress: 95 
  },
  SHIPPED: { 
    label: "Shipped", 
    color: "bg-gray-100 text-gray-700", 
    icon: Package,
    progress: 100 
  }
}

export function OrderSummaryCard({ order }: OrderSummaryProps) {
  const status = statusConfig[order.orderStatus as keyof typeof statusConfig] || {
    label: order.orderStatus,
    color: "bg-gray-100 text-gray-700",
    icon: Clock,
    progress: 0
  }

  const StatusIcon = status.icon

  // Calculate days until want date
  const daysUntilWantDate = Math.ceil(
    (new Date(order.wantDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <Card className="overflow-hidden">
      <div className={`h-2 ${status.color.split(' ')[0]}`} />
      
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">Order #{order.poNumber}</CardTitle>
            <CardDescription>
              Created {format(new Date(order.createdAt), "MMM dd, yyyy")}
            </CardDescription>
          </div>
          <Badge className={status.color} variant="secondary">
            <StatusIcon className="w-4 h-4 mr-1" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Order Progress</span>
            <span className="font-medium">{status.progress}%</span>
          </div>
          <Progress value={status.progress} className="h-2" />
        </div>

        <Separator />

        {/* Key Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Info */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Building className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-900">{order.customerName}</p>
                {order.projectName && (
                  <p className="text-sm text-slate-600">{order.projectName}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-600">Sales Person</p>
                <p className="text-sm font-medium">{order.salesPerson}</p>
              </div>
            </div>
          </div>

          {/* Dates and Timeline */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-600">Want Date</p>
                <p className="text-sm font-medium">
                  {format(new Date(order.wantDate), "MMM dd, yyyy")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm text-slate-600">Time Remaining</p>
                <p className="text-sm font-medium">
                  {daysUntilWantDate > 0 ? (
                    <span className={daysUntilWantDate < 7 ? "text-orange-600" : ""}>
                      {daysUntilWantDate} days
                    </span>
                  ) : (
                    <span className="text-red-600">Overdue by {Math.abs(daysUntilWantDate)} days</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Build Configuration Summary */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Build Configuration
          </h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Build Numbers</span>
              <div className="flex gap-1">
                {order.buildNumbers.map(bn => (
                  <Badge key={bn} variant="outline" className="text-xs">
                    {bn}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Sink Units</span>
              <span className="font-medium">{order.buildNumbers.length}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Language</span>
              <span className="font-medium">
                {order.language === 'EN' ? 'English' : 
                 order.language === 'FR' ? 'French' : 'Spanish'}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-900">Notes</h4>
              <p className="text-sm text-slate-600">{order.notes}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}