"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { 
  Construction, 
  ArrowLeft, 
  Calendar, 
  CheckCircle,
  Wrench,
  FileText
} from "lucide-react"

export default function InstroSinkUnderConstructionPage() {
  const router = useRouter()

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Order Creation
        </Button>
        
        <div className="flex items-center gap-3 mb-2">
          <Construction className="w-8 h-8 text-orange-500" />
          <h1 className="text-3xl font-bold text-slate-900">InstroSink</h1>
          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
            Under Construction
          </Badge>
        </div>
        
        <p className="text-lg text-slate-600">
          Specialized instrument cleaning and reprocessing sink solutions
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feature Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Coming Soon: InstroSink Features
            </CardTitle>
            <CardDescription>
              We're developing specialized solutions for instrument cleaning and reprocessing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Planned Features
                </h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• Dedicated instrument cleaning basins</li>
                  <li>• Ultrasonic cleaning integration</li>
                  <li>• Automated pre-cleaning protocols</li>
                  <li>• Instrument sorting and organization</li>
                  <li>• Chemical management systems</li>
                  <li>• Workflow optimization tools</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  Technical Specifications
                </h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• Modular basin configurations</li>
                  <li>• Enhanced drainage systems</li>
                  <li>• Temperature controlled water delivery</li>
                  <li>• Integrated documentation</li>
                  <li>• Quality assurance protocols</li>
                  <li>• Compliance tracking features</li>
                </ul>
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Development Status</h4>
              <p className="text-sm text-blue-700">
                The InstroSink product line is in early development stages. Our team is researching 
                optimal configurations for various instrument cleaning workflows and developing 
                features that streamline the reprocessing workflow.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Development Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Requirements Analysis</span>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                  In Progress
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Product Design</span>
                <Badge variant="outline" className="text-slate-500">
                  Planned
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Prototype Development</span>
                <Badge variant="outline" className="text-slate-500">
                  Planned
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Production Ready</span>
                <Badge variant="outline" className="text-slate-500">
                  Future
                </Badge>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-sm text-slate-600 mb-3">
                Interested in InstroSink developments?
              </p>
              <Button className="w-full" variant="outline">
                Request Updates
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Alternative */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">
              Need a Cleaning Solution Now?
            </h3>
            <p className="text-slate-600">
              Our MDRD CleanStation can be configured for various instrument cleaning and reprocessing workflows.
            </p>
            <Button 
              onClick={() => router.push('/orders/create')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Create MDRD CleanStation Order
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}