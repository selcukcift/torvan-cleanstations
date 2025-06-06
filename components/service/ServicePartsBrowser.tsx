"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Search,
  ShoppingCart,
  Package,
  Image as ImageIcon,
  Plus,
  Filter
} from "lucide-react"
import { nextJsApiClient } from '@/lib/api'
import { useToast } from "@/hooks/use-toast"

// Simple cart store (in a real app, use Zustand or Redux)
let cartItems: any[] = []

export function ServicePartsBrowser() {
  const [parts, setParts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const { toast } = useToast()

  useEffect(() => {
    fetchParts()
  }, [search, page])

  const fetchParts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12'
      })
      
      if (search) {
        params.append('search', search)
      }

      const response = await nextJsApiClient.get(`/service-parts?${params}`)
      if (response.data.success) {
        setParts(response.data.data.parts)
      }
    } catch (error: any) {
      console.error('Error fetching parts:', error)
      toast({
        title: "Error",
        description: "Failed to load parts",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (part: any) => {
    const existingItem = cartItems.find(item => item.partId === part.partId)
    if (existingItem) {
      existingItem.quantity += 1
    } else {
      cartItems.push({
        partId: part.partId,
        name: part.name,
        photoURL: part.photoURL,
        quantity: 1
      })
    }
    
    toast({
      title: "Added to Cart",
      description: `${part.name} added to cart`
    })
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Service Parts Browser
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Search parts by name, part number, or manufacturer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Parts Grid */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {parts.map((part) => (
            <Card key={part.partId} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Part Image */}
                  <div className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center">
                    {part.photoURL ? (
                      <img 
                        src={part.photoURL} 
                        alt={part.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  
                  {/* Part Details */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm leading-tight line-clamp-2">
                      {part.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      ID: {part.partId}
                    </p>
                    {part.manufacturerPartNumber && (
                      <p className="text-xs text-slate-500">
                        MPN: {part.manufacturerPartNumber}
                      </p>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {part.type}
                    </Badge>
                  </div>
                  
                  {/* Add to Cart Button */}
                  <Button 
                    onClick={() => addToCart(part)}
                    className="w-full"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Cart
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination would go here */}
      <div className="flex justify-center">
        <Button 
          variant="outline" 
          onClick={() => setPage(page + 1)}
          disabled={loading}
        >
          Load More Parts
        </Button>
      </div>
    </div>
  )
}