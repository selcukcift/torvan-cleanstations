"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Filter, X, Package, Layers } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import type { AssemblyInfo, PartInfo } from "@/lib/inventoryBrowserService"

interface SearchResult {
  parts: PartInfo[]
  assemblies: AssemblyInfo[]
}

interface InventorySearchAndFilterProps {
  onAssemblySelect?: (assembly: AssemblyInfo) => void
  onPartSelect?: (partId: string) => void
}

export function InventorySearchAndFilter({
  onAssemblySelect,
  onPartSelect
}: InventorySearchAndFilterProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchType, setSearchType] = useState("all")
  const [searchResults, setSearchResults] = useState<SearchResult>({ parts: [], assemblies: [] })
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string, type: string) => {
      if (query.length < 2) {
        setSearchResults({ parts: [], assemblies: [] })
        setShowResults(false)
        return
      }

      setIsSearching(true)
      try {
        const response = await fetch(
          `/api/procurement/inventory/search?q=${encodeURIComponent(query)}&type=${type}&limit=20`
        )
        
        if (response.ok) {
          const data = await response.json()
          setSearchResults(data.data.results)
          setShowResults(true)
        }
      } catch (error) {
        console.error('Search failed:', error)
      }
      setIsSearching(false)
    }, 300),
    []
  )

  useEffect(() => {
    debouncedSearch(searchQuery, searchType)
  }, [searchQuery, searchType, debouncedSearch])

  const handleAssemblyClick = (assembly: AssemblyInfo) => {
    onAssemblySelect?.(assembly)
    setShowResults(false)
    setSearchQuery("")
  }

  const handlePartClick = (partId: string) => {
    onPartSelect?.(partId)
    setShowResults(false)
    setSearchQuery("")
  }

  const clearSearch = () => {
    setSearchQuery("")
    setSearchResults({ parts: [], assemblies: [] })
    setShowResults(false)
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Search Inventory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search parts, assemblies, or part numbers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={clearSearch}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <Select value={searchType} onValueChange={setSearchType}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="parts">Parts Only</SelectItem>
                <SelectItem value="assemblies">Assemblies Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Status */}
          {isSearching && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
              Searching...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      {showResults && searchQuery.length >= 2 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Search Results</CardTitle>
              <Badge variant="outline">
                {searchResults.parts.length + searchResults.assemblies.length} found
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Assemblies Results */}
            {searchResults.assemblies.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="h-4 w-4 text-orange-500" />
                  <h4 className="font-medium">Assemblies ({searchResults.assemblies.length})</h4>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {searchResults.assemblies.map((assembly) => (
                    <div
                      key={assembly.id}
                      className="flex items-center justify-between p-3 border rounded hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleAssemblyClick(assembly)}
                    >
                      <div className="flex items-center gap-3">
                        <Layers className="h-4 w-4 text-orange-500" />
                        <div>
                          <div className="font-mono text-sm font-medium">{assembly.id}</div>
                          <div className="text-sm text-gray-600 truncate max-w-64">
                            {assembly.name}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          assembly.type === 'KIT' ? 'bg-blue-100 text-blue-700' :
                          assembly.type === 'SERVICE_PART' ? 'bg-green-100 text-green-700' :
                          'bg-orange-100 text-orange-700'
                        }>
                          {assembly.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {assembly.components.length} components
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Separator */}
            {searchResults.assemblies.length > 0 && searchResults.parts.length > 0 && (
              <Separator />
            )}

            {/* Parts Results */}
            {searchResults.parts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4 text-green-500" />
                  <h4 className="font-medium">Parts ({searchResults.parts.length})</h4>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {searchResults.parts.map((part) => (
                    <div
                      key={part.id}
                      className="flex items-center justify-between p-3 border rounded hover:bg-gray-50 cursor-pointer"
                      onClick={() => handlePartClick(part.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Package className="h-4 w-4 text-green-500" />
                        <div>
                          <div className="font-mono text-sm font-medium">{part.id}</div>
                          <div className="text-sm text-gray-600 truncate max-w-64">
                            {part.name}
                          </div>
                          {part.manufacturerPartNumber && (
                            <div className="text-xs text-gray-500">
                              MPN: {part.manufacturerPartNumber}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-700">
                          {part.type}
                        </Badge>
                        {part.manufacturerInfo && (
                          <Badge variant="outline" className="text-xs">
                            {part.manufacturerInfo}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {searchResults.assemblies.length === 0 && searchResults.parts.length === 0 && !isSearching && (
              <div className="text-center py-8 text-gray-500">
                <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No items found matching "{searchQuery}"</p>
                <p className="text-sm">Try a different search term or check spelling</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("T2-CTRL")
                setSearchType("assemblies")
              }}
            >
              <Layers className="h-4 w-4 mr-2" />
              Control Boxes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("T2-BSN")
                setSearchType("assemblies")
              }}
            >
              <Package className="h-4 w-4 mr-2" />
              Basin Kits
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("KIT")
                setSearchType("assemblies")
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              All Kits
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("SERVICE")
                setSearchType("all")
              }}
            >
              <Package className="h-4 w-4 mr-2" />
              Service Parts
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func(...args), wait)
  }
}