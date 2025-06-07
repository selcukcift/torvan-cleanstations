"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { nextJsApiClient } from "@/lib/api"

export default function TestBasinConfig() {
  const [basinTypes, setBasinTypes] = useState<any[]>([])
  const [basinSizes, setBasinSizes] = useState<any>({})
  const [selectedBasinType, setSelectedBasinType] = useState('')
  const [selectedBasinSize, setSelectedBasinSize] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBasinData()
  }, [])

  const loadBasinData = async () => {
    setLoading(true)
    try {
      const [typesRes, sizesRes] = await Promise.all([
        nextJsApiClient.get('/configurator?queryType=basinTypes'),
        nextJsApiClient.get('/configurator?queryType=basinSizes')
      ])

      console.log('Basin Types Response:', typesRes.data)
      console.log('Basin Sizes Response:', sizesRes.data)

      setBasinTypes(typesRes.data.data || [])
      setBasinSizes(sizesRes.data.data || {})
    } catch (error) {
      console.error('Error loading basin data:', error)
      setError('Failed to load basin data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading basin configuration data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Basin Configuration Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Raw API Data</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Basin Types ({basinTypes.length} items):</h4>
                <pre className="bg-gray-100 p-2 text-xs rounded overflow-auto">
                  {JSON.stringify(basinTypes, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="font-medium">Basin Sizes:</h4>
                <pre className="bg-gray-100 p-2 text-xs rounded overflow-auto">
                  {JSON.stringify(basinSizes, null, 2)}
                </pre>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Basin Type</label>
              <Select value={selectedBasinType} onValueChange={setSelectedBasinType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select basin type" />
                </SelectTrigger>
                <SelectContent>
                  {basinTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} ({type.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Basin Size</label>
              <Select value={selectedBasinSize} onValueChange={setSelectedBasinSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Select basin size" />
                </SelectTrigger>
                <SelectContent>
                  {basinSizes.standardSizes?.map((size: any) => (
                    <SelectItem key={size.assemblyId} value={size.assemblyId}>
                      {size.dimensions} ({size.assemblyId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Selected Configuration</h3>
            <div className="bg-blue-50 p-4 rounded">
              <p><strong>Basin Type:</strong> {selectedBasinType || 'None selected'}</p>
              <p><strong>Basin Size:</strong> {selectedBasinSize || 'None selected'}</p>
            </div>
          </div>

          <Button onClick={loadBasinData}>Reload Data</Button>
        </CardContent>
      </Card>
    </div>
  )
}