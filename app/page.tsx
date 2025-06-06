import { Loader2 } from "lucide-react"

export default function HomePage() {
  // Middleware will handle the redirect, this is just a fallback loading state
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          Loading Torvan Medical CleanStation
        </h1>
        <p className="text-slate-600">
          Redirecting...
        </p>
      </div>
    </div>
  )
}
