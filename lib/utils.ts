import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert text to Title Case with proper handling of common prepositions
 */
export function toTitleCase(str: string): string {
  if (!str) return str
  
  // Words that should remain lowercase unless they're the first word
  const lowercaseWords = ['of', 'and', 'the', 'a', 'an', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'by', 'with']
  
  return str.toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Always capitalize the first word
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1)
      }
      
      // Keep certain words lowercase unless they're the first word
      if (lowercaseWords.includes(word)) {
        return word
      }
      
      // Capitalize other words
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

/**
 * Generate enhanced basin configuration description
 */
export function getEnhancedBasinDescription(basinConfigs: any[]): string {
  if (!basinConfigs || basinConfigs.length === 0) {
    return 'No basins configured'
  }
  
  const eDrainCount = basinConfigs.filter(b => 
    b.basinTypeId === 'E_DRAIN' || b.basinType === 'E_DRAIN'
  ).length
  
  const eSinkCount = basinConfigs.filter(b => 
    b.basinTypeId === 'E_SINK' || b.basinType === 'E_SINK'
  ).length
  
  const eSinkDICount = basinConfigs.filter(b => 
    b.basinTypeId === 'E_SINK_DI' || b.basinType === 'E_SINK_DI'
  ).length
  
  const total = basinConfigs.length
  const parts = []
  
  if (eDrainCount > 0) parts.push(`${eDrainCount} E-Drain`)
  if (eSinkCount > 0) parts.push(`${eSinkCount} E-Sink`)
  if (eSinkDICount > 0) parts.push(`${eSinkDICount} E-Sink DI`)
  
  if (parts.length === 0) {
    return `${total} basin${total !== 1 ? 's' : ''} reprocessing sink`
  }
  
  return `${total} basin${total !== 1 ? 's' : ''} reprocessing sink (${parts.join(', ')})`
}

/**
 * Format accessories display - show "Yes" if any accessories, "No" if none
 */
export function formatAccessoriesDisplay(accessories: any[]): string {
  return accessories && accessories.length > 0 ? 'Yes' : 'No'
}

/**
 * Format documents display - show actual filenames or "None"
 */
export function formatDocumentsDisplay(documents: any[]): string {
  if (!documents || documents.length === 0) {
    return 'None'
  }
  
  // Show up to 3 filenames, then add "and X more" if there are more
  const filenames = documents.map(doc => doc.docName || doc.filename || 'Unknown file')
  
  if (filenames.length <= 3) {
    return filenames.join(', ')
  }
  
  const firstThree = filenames.slice(0, 3)
  const remaining = filenames.length - 3
  return `${firstThree.join(', ')} and ${remaining} more`
}
