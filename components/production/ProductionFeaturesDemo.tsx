"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Factory,
  CheckCircle,
  Smartphone,
  Shield,
  Settings,
  Package,
  ClipboardCheck,
  Wrench,
  Monitor,
  FileText,
  Users,
  Award,
  Zap
} from "lucide-react"
import { ProductionChecklistInterface } from "./ProductionChecklistInterface"
import { ConfigurationDrivenTasks } from "./ConfigurationDrivenTasks"
import { ProductionWorkstationInterface } from "./ProductionWorkstationInterface"
import { DigitalSignOffSystem } from "./DigitalSignOffSystem"
import { TaskManagement } from "../assembly/TaskManagement"

// Mock data for demonstration
const mockOrderConfiguration = {
  sinkDimensions: { width: 48, length: 60 },
  sinkModel: 'T2-B2',
  legsType: 'Height Adjustable',
  legsModel: 'DL27',
  feetType: 'Lock & Leveling Casters',
  hasPegboard: true,
  pegboardType: 'Perforated',
  pegboardColor: 'Green',
  pegboardSize: '48x36',
  numberOfBasins: 2,
  basins: [
    {
      type: 'E-Sink',
      size: '24X20X8',
      addOns: ['BASIN_LIGHT']
    },
    {
      type: 'E-Drain',
      size: '20X20X8',
      addOns: ['P-TRAP']
    }
  ],
  faucets: [
    {
      type: '10" WRIST BLADE SWING SPOUT WALL MOUNTED FAUCET KIT',
      placement: 'Between Basins'
    }
  ],
  sprayers: [
    {
      type: 'DI WATER GUN KIT & TURRET',
      location: 'Right Side'
    }
  ],
  accessories: [
    { name: 'Wire Basket Kit', partNumber: 'T-OA-PFW1236FM-KIT' },
    { name: 'Stainless Steel Shelf', partNumber: 'T-OA-SSSHELF-1812' }
  ]
}

const mockDocumentData = {
  orderId: 'DEMO-001',
  buildNumber: 'B001',
  completionStatus: 'ready_for_signoff',
  checklistItems: 47,
  completedItems: 47,
  qualityScore: 98.5
}

const featureHighlights = [
  {
    icon: <ClipboardCheck className="w-6 h-6" />,
    title: "Digital Production Checklist",
    description: "Complete digitization of CLP.T2.001.V01 with all 4 sections: Pre-Production, Sink Production, Basin Production, and Standard Packaging",
    benefits: ["Eliminates paper checklists", "Real-time progress tracking", "Automatic compliance recording"]
  },
  {
    icon: <Settings className="w-6 h-6" />,
    title: "Configuration-Driven Tasks",
    description: "Automatically generates production tasks based on specific order configuration and BOM data",
    benefits: ["Order-specific workflows", "Dynamic task generation", "Parts and tools integration"]
  },
  {
    icon: <Smartphone className="w-6 h-6" />,
    title: "Mobile Workstation Interface",
    description: "Shop floor optimized interface with offline support, camera integration, and QR scanning",
    benefits: ["Mobile-first design", "Offline capability", "Photo documentation", "Timer functionality"]
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Digital Sign-Off System",
    description: "ISO 13485:2016 compliant digital signatures with complete audit trail and compliance recording",
    benefits: ["Legal compliance", "Audit trail", "Digital signatures", "Document retention"]
  },
  {
    icon: <Monitor className="w-6 h-6" />,
    title: "Enhanced Task Management",
    description: "Upgraded existing TaskManagement with deep integration to new production features",
    benefits: ["Seamless integration", "Multiple view modes", "Progress tracking", "Status updates"]
  }
]

const complianceFeatures = [
  "ISO 13485:2016 Medical Device Quality Management",
  "21 CFR Part 820 FDA Quality System Regulation",
  "Digital signature with legal binding",
  "Complete audit trail documentation",
  "10-year document retention",
  "Cryptographic signature verification"
]

export function ProductionFeaturesDemo() {
  const [activeDemo, setActiveDemo] = useState<string>("overview")
  const [selectedOrder] = useState("DEMO-001")
  const [selectedBuild] = useState("B001")

  const handleTaskComplete = (taskId: string) => {
    console.log('Task completed:', taskId)
  }

  const handleChecklistComplete = (checklistData: any) => {
    console.log('Checklist completed:', checklistData)
  }

  const handleSignOffComplete = (record: any) => {
    console.log('Sign-off completed:', record)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl flex items-center gap-3">
                  <Factory className="w-8 h-8 text-blue-600" />
                  Enhanced Production Workflow System
                </CardTitle>
                <CardDescription className="text-lg mt-2">
                  Complete digital transformation of T2 Sink production with CLP.T2.001.V01 implementation
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-green-100 text-green-700 px-3 py-1">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Production Ready
                </Badge>
                <Badge className="bg-blue-100 text-blue-700 px-3 py-1">
                  ISO 13485:2016
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs value={activeDemo} onValueChange={setActiveDemo} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="checklist">Digital Checklist</TabsTrigger>
            <TabsTrigger value="tasks">Config Tasks</TabsTrigger>
            <TabsTrigger value="workstation">Workstation</TabsTrigger>
            <TabsTrigger value="signoff">Digital Sign-Off</TabsTrigger>
            <TabsTrigger value="enhanced">Enhanced Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Feature Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featureHighlights.map((feature, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        {feature.icon}
                      </div>
                      {feature.title}
                    </CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {feature.benefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Implementation Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Implementation Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                  <div>
                    <div className="text-3xl font-bold text-blue-600">5</div>
                    <div className="text-sm text-muted-foreground">Components Built</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-600">47</div>
                    <div className="text-sm text-muted-foreground">Checklist Items</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-purple-600">4</div>
                    <div className="text-sm text-muted-foreground">CLP Sections</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-orange-600">100%</div>
                    <div className="text-sm text-muted-foreground">Digital</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compliance Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Regulatory Compliance Features
                </CardTitle>
                <CardDescription>
                  Built for medical device manufacturing standards
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {complianceFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checklist" className="space-y-6">
            <Alert>
              <ClipboardCheck className="w-4 h-4" />
              <AlertDescription>
                <strong>Production Checklist Demo:</strong> Complete digital implementation of CLP.T2.001.V01 
                with all 4 sections. This replaces paper checklists with interactive digital forms including 
                basin-specific checks, conditional logic, and digital sign-off.
              </AlertDescription>
            </Alert>

            <ProductionChecklistInterface
              orderId={selectedOrder}
              buildNumber={selectedBuild}
              orderConfiguration={mockOrderConfiguration}
              onComplete={handleChecklistComplete}
              readonly={false}
            />
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <Alert>
              <Settings className="w-4 h-4" />
              <AlertDescription>
                <strong>Configuration-Driven Tasks Demo:</strong> Tasks are automatically generated based on 
                the specific order configuration. Each selection (basin type, pegboard, accessories) creates 
                relevant production tasks with required parts, tools, and dependencies.
              </AlertDescription>
            </Alert>

            <ConfigurationDrivenTasks
              orderId={selectedOrder}
              buildNumber={selectedBuild}
              orderConfiguration={mockOrderConfiguration}
              onTaskUpdate={(taskId, updates) => console.log('Task updated:', taskId, updates)}
              onAllTasksComplete={() => console.log('All tasks complete')}
              readonly={false}
            />
          </TabsContent>

          <TabsContent value="workstation" className="space-y-6">
            <Alert>
              <Smartphone className="w-4 h-4" />
              <AlertDescription>
                <strong>Mobile Workstation Demo:</strong> Shop floor optimized interface with offline 
                support, timer functionality, photo capture, QR scanning, and mobile-first design. 
                Perfect for tablet or phone use in production environment.
              </AlertDescription>
            </Alert>

            <div className="border rounded-lg overflow-hidden" style={{ height: '800px' }}>
              <ProductionWorkstationInterface
                orderId={selectedOrder}
                buildNumber={selectedBuild}
                mode="both"
                enableOffline={true}
                enableCamera={true}
                enableQR={true}
                enableTimer={true}
                onTaskComplete={handleTaskComplete}
              />
            </div>
          </TabsContent>

          <TabsContent value="signoff" className="space-y-6">
            <Alert>
              <Shield className="w-4 h-4" />
              <AlertDescription>
                <strong>Digital Sign-Off Demo:</strong> ISO 13485:2016 compliant digital signature system 
                with complete audit trail, cryptographic verification, and legal binding signatures. 
                Maintains full compliance documentation for regulatory purposes.
              </AlertDescription>
            </Alert>

            <DigitalSignOffSystem
              orderId={selectedOrder}
              buildNumber={selectedBuild}
              documentType="checklist"
              documentTitle="T2 Sink Production Checklist - CLP.T2.001.V01"
              documentData={mockDocumentData}
              requiredSignatures={[
                { role: 'ASSEMBLER', description: 'Production completion verification', required: true },
                { role: 'QC_PERSON', description: 'Quality control approval', required: true }
              ]}
              onSignOffComplete={handleSignOffComplete}
              readonly={false}
            />
          </TabsContent>

          <TabsContent value="enhanced" className="space-y-6">
            <Alert>
              <Monitor className="w-4 h-4" />
              <AlertDescription>
                <strong>Enhanced Task Management Demo:</strong> Upgraded existing TaskManagement component 
                with seamless integration to all new production features. Includes traditional tasks view, 
                configuration-driven tasks, and digital checklist - all in one interface.
              </AlertDescription>
            </Alert>

            <TaskManagement
              orderId={selectedOrder}
              buildNumber={selectedBuild}
              userRole="ASSEMBLER"
              viewMode="enhanced"
              onTaskSelect={(taskId) => console.log('Task selected:', taskId)}
            />
          </TabsContent>
        </Tabs>

        {/* Technology Stack */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Technology Stack & Architecture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Frontend Components
                </h4>
                <div className="space-y-2 text-sm">
                  <div>• Next.js 15 with App Router</div>
                  <div>• TypeScript for type safety</div>
                  <div>• ShadCN UI components</div>
                  <div>• Tailwind CSS styling</div>
                  <div>• Framer Motion animations</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  User Experience
                </h4>
                <div className="space-y-2 text-sm">
                  <div>• Mobile-first responsive design</div>
                  <div>• Offline capability with sync</div>
                  <div>• Progressive web app features</div>
                  <div>• Accessibility compliance</div>
                  <div>• Touch-optimized interfaces</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Data & Compliance
                </h4>
                <div className="space-y-2 text-sm">
                  <div>• Prisma ORM integration</div>
                  <div>• Digital signature cryptography</div>
                  <div>• Audit trail logging</div>
                  <div>• Document retention policies</div>
                  <div>• ISO 13485:2016 compliance</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Integration Ready</CardTitle>
            <CardDescription>
              All components are built and ready for integration with your existing order management system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Database Integration</h4>
                <p className="text-sm text-muted-foreground">
                  Components expect order configuration data and can be easily connected to your existing 
                  Prisma schema with order, configuration, and BOM models.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">API Endpoints</h4>
                <p className="text-sm text-muted-foreground">
                  Ready for backend API integration with endpoints for production tasks, checklist data, 
                  compliance records, and digital signatures.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}