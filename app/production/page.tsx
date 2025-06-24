"use client"

import { useState } from 'react'
import { ProductionProgressDashboard } from '@/components/production/ProductionProgressDashboard'
import { ProductionDocumentManagement } from '@/components/production/ProductionDocumentManagement'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ProductionPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Production Dashboard</TabsTrigger>
          <TabsTrigger value="documents">Document Management</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <ProductionProgressDashboard />
        </TabsContent>

        <TabsContent value="documents">
          <ProductionDocumentManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}