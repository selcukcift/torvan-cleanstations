/**
 * Enhanced PDF Viewer Component
 * Uses react-pdf for better PDF rendering and controls
 */

"use client"

import { useState, useCallback } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Maximize2,
  Minimize2,
  RotateCw,
  FileText,
  Loader2
} from "lucide-react"
import "react-pdf/dist/esm/Page/AnnotationLayer.css"
import "react-pdf/dist/esm/Page/TextLayer.css"

// Set up the worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PDFViewerProps {
  url: string
  fileName?: string
  onDownload?: () => void
  className?: string
  showControls?: boolean
}

export function PDFViewer({ 
  url, 
  fileName = "Document", 
  onDownload, 
  className = "",
  showControls = true 
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [rotation, setRotation] = useState<number>(0)
  const [pageInputValue, setPageInputValue] = useState<string>("1")
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setIsLoading(false)
    setError(null)
  }

  const onDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error)
    setError("Failed to load PDF document")
    setIsLoading(false)
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= numPages) {
      setCurrentPage(page)
      setPageInputValue(page.toString())
    }
  }

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInputValue(e.target.value)
  }

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const pageNum = parseInt(pageInputValue, 10)
    if (!isNaN(pageNum)) {
      goToPage(pageNum)
    }
  }

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3))
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5))
  const resetZoom = () => setScale(1.0)

  const rotate = () => setRotation(prev => (prev + 90) % 360)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const scaleOptions = [
    { value: 0.5, label: "50%" },
    { value: 0.75, label: "75%" },
    { value: 1, label: "100%" },
    { value: 1.25, label: "125%" },
    { value: 1.5, label: "150%" },
    { value: 2, label: "200%" },
  ]

  return (
    <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
      {/* Controls Bar */}
      {showControls && (
        <div className="flex items-center justify-between p-3 bg-white border-b">
          <div className="flex items-center gap-2">
            {/* Page Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                title="First page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                title="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
                <Input
                  type="text"
                  value={pageInputValue}
                  onChange={handlePageInputChange}
                  className="w-12 text-center h-8"
                />
                <span className="text-sm text-muted-foreground">
                  of {numPages || "..."}
                </span>
              </form>

              <Button
                variant="outline"
                size="icon"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === numPages}
                title="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => goToPage(numPages)}
                disabled={currentPage === numPages}
                title="Last page"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="h-6 w-px bg-gray-300" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={zoomOut}
                disabled={scale <= 0.5}
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <select
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="h-8 px-2 text-sm border rounded"
              >
                {scaleOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <Button
                variant="outline"
                size="icon"
                onClick={zoomIn}
                disabled={scale >= 3}
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            <div className="h-6 w-px bg-gray-300" />

            {/* Other Controls */}
            <Button
              variant="outline"
              size="icon"
              onClick={rotate}
              title="Rotate"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {fileName}
            </span>
            
            <div className="h-6 w-px bg-gray-300" />
            
            {onDownload && (
              <Button
                variant="outline"
                size="icon"
                onClick={onDownload}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              variant="outline"
              size="icon"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* PDF Display Area */}
      <ScrollArea className="flex-1">
        <div className="flex justify-center p-4">
          {error ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">{error}</p>
            </div>
          ) : (
            <Document
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Loading PDF...</span>
                </div>
              }
              className="shadow-lg"
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                rotate={rotation}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="border"
              />
            </Document>
          )}
        </div>
      </ScrollArea>

      {/* Quick Navigation Slider */}
      {showControls && numPages > 1 && (
        <div className="p-3 bg-white border-t">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Quick Nav:</span>
            <Slider
              value={[currentPage]}
              onValueChange={([value]) => goToPage(value)}
              min={1}
              max={numPages}
              step={1}
              className="flex-1"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Export a simplified version for inline use
export function InlinePDFViewer({ url, className }: { url: string; className?: string }) {
  return (
    <PDFViewer
      url={url}
      showControls={false}
      className={className}
    />
  )
}