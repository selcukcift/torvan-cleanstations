'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

export default function TestOrderPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const { data: session, status } = useSession()
  const router = useRouter()

  // Redirect to login if not authenticated
  if (status === 'loading') {
    return <div className="container mx-auto p-8">Loading...</div>
  }

  if (status === 'unauthenticated') {
    router.push('/login')
    return null
  }

  const testOrderCreation = async () => {
    setLoading(true)
    setResult(null)

    try {
      // Create test order data
      const orderData = {
        customerInfo: {
          poNumber: `TEST-${Date.now()}`,
          customerName: 'Test Customer',
          projectName: 'Test Project',
          salesPerson: 'John Doe',
          wantDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          language: 'EN',
          notes: 'Test order created via test page'
        },
        sinkSelection: {
          sinkModelId: 'T2-SINGLE',
          quantity: 1,
          buildNumbers: ['001']
        },
        configurations: {
          '001': {
            sinkModelId: 'T2-SINGLE',
            width: 36,
            length: 24,
            legsTypeId: 'T2-DL27-KIT',
            feetTypeId: 'T2-LEVELING-CASTOR-475',
            pegboard: false,
            workflowDirection: 'LEFT_TO_RIGHT',
            basins: [{
              basinTypeId: 'T2-BR1-BOWL',
              basinSizePartNumber: 'T2-BR1-14x10x6',
              addonIds: []
            }],
            faucets: [{
              faucetTypeId: 'T2-FA1-F',
              quantity: 1
            }],
            sprayers: []
          }
        },
        accessories: {
          '001': []
        }
      }

      console.log('Sending order data:', orderData)

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      })

      const data = await response.json()
      console.log('Response:', data)
      
      setResult({
        status: response.status,
        data
      })
    } catch (error) {
      console.error('Error:', error)
      setResult({
        status: 'error',
        data: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Test Order Creation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testOrderCreation} 
            disabled={loading}
          >
            {loading ? 'Creating Order...' : 'Create Test Order'}
          </Button>
          
          {result && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <h3 className="font-bold mb-2">Result:</h3>
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
          
          <div className="mt-4 text-sm text-gray-600">
            <p>Open browser console to see detailed logs</p>
            <p className="mt-2">Logged in as: {session?.user?.email || 'Unknown'}</p>
            <p>Role: {session?.user?.role || 'Unknown'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}