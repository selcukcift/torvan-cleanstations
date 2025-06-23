/**
 * Intelligent Pre-QC Template Generator
 * Generates contextual, specific checklist items based on order configuration
 */

export interface QCItem {
  id: string
  order: number
  checklistItem: string
  itemType: 'CHECKBOX' | 'TEXT_INPUT' | 'SINGLE_SELECT' | 'MULTI_SELECT'
  isRequired: boolean
  options?: string[]
  section: string
}

export interface OrderConfiguration {
  buildNumber: string
  sinkModel: string
  dimensions: {
    width: number
    length: number
    unit: string
  }
  structuralComponents: {
    legs: {
      typeId: string
      name: string
      type: string
    }
    feet: {
      typeId: string
      name: string
      type: string
    }
  }
  pegboard?: boolean
  pegboardType?: string
  basins: Array<{
    position: number
    type: string
    size: string
    addons: string[]
    dimensions?: {
      width: number
      length: number
      depth: number
    }
  }>
  faucetConfiguration?: any
  additionalFeatures?: string[]
}

export class PreQCTemplateGenerator {
  private config: OrderConfiguration
  private items: QCItem[] = []
  private itemCounter = 0

  constructor(configuration: OrderConfiguration) {
    this.config = configuration
  }

  /**
   * Generate the complete Pre-QC checklist
   */
  generateChecklist(): QCItem[] {
    this.items = []
    this.itemCounter = 0

    // 1. Job ID (always first)
    this.addJobIdItem()

    // 2. Pegboard verification (if applicable)
    this.addPegboardItems()

    // 3. Structural components
    this.addStructuralItems()

    // 4. Hole verifications (specific based on configuration)
    this.addHoleVerificationItems()

    // 5. Basin-specific items
    this.addBasinItems()

    // 6. General assembly items
    this.addGeneralAssemblyItems()

    return this.items.sort((a, b) => a.order - b.order)
  }

  private addJobIdItem(): void {
    this.addItem({
      checklistItem: 'Job ID Number verified',
      itemType: 'TEXT_INPUT',
      isRequired: true,
      section: 'Job Information'
    })
  }

  private addPegboardItems(): void {
    if (this.config.pegboard) {
      const pegboardSize = this.calculatePegboardSize()
      this.addItem({
        checklistItem: `Pegboard: Yes - ${pegboardSize} perforated pegboard installed and secured`,
        itemType: 'CHECKBOX',
        isRequired: true,
        section: 'Structural Components'
      })
    }
  }

  private addStructuralItems(): void {
    // Feet/Casters verification
    const feetType = this.config.structuralComponents.feet
    if (feetType.type === 'LEVELING_CASTERS') {
      this.addItem({
        checklistItem: `${feetType.name} installed and functional - test locking mechanism and leveling adjustment`,
        itemType: 'CHECKBOX',
        isRequired: true,
        section: 'Structural Components'
      })
    } else if (feetType.type === 'LEVELING_FEET') {
      this.addItem({
        checklistItem: `${feetType.name} installed and functional - test leveling adjustment mechanism`,
        itemType: 'CHECKBOX',
        isRequired: true,
        section: 'Structural Components'
      })
    }

    // Height-adjustable legs - lifter controls (both as separate items)
    if (this.isHeightAdjustableLegs()) {
      this.addItem({
        checklistItem: 'DPF1K (Non-Programmable) lifter control button installed and functional',
        itemType: 'CHECKBOX',
        isRequired: false,
        section: 'Structural Components'
      })
      
      this.addItem({
        checklistItem: 'DP1C (Programmable) lifter control button installed and functional',
        itemType: 'CHECKBOX',
        isRequired: false,
        section: 'Structural Components'
      })

      this.addItem({
        checklistItem: 'Lifter controller installed underneath sink and properly mounted',
        itemType: 'CHECKBOX',
        isRequired: true,
        section: 'Structural Components'
      })
    }
  }

  private addHoleVerificationItems(): void {
    // Basin-specific holes
    this.config.basins.forEach((basin, index) => {
      // Basin light holes
      if (basin.addons.includes('BASIN_LIGHT') || basin.addons.includes('LIGHT')) {
        this.addItem({
          checklistItem: `Basin ${basin.position}: Light hole drilled and positioned correctly`,
          itemType: 'CHECKBOX',
          isRequired: true,
          section: 'Mounting & Holes'
        })
      }

      // Drain button holes
      if (basin.addons.includes('DRAIN_BUTTON')) {
        this.addItem({
          checklistItem: `Basin ${basin.position}: Drain button hole drilled and positioned correctly`,
          itemType: 'CHECKBOX',
          isRequired: true,
          section: 'Mounting & Holes'
        })
      }
    })

    // Sprayer holes (if configured)
    if (this.config.additionalFeatures?.includes('SPRAYER')) {
      this.addItem({
        checklistItem: 'Sprayer hole drilled at correct position per specifications',
        itemType: 'CHECKBOX',
        isRequired: true,
        section: 'Mounting & Holes'
      })
    }

    // Faucet mounting holes
    this.addItem({
      checklistItem: 'Faucet mounting holes drilled and positioned per drawing specifications',
      itemType: 'CHECKBOX',
      isRequired: true,
      section: 'Mounting & Holes'
    })

    // General mounting holes
    this.addItem({
      checklistItem: 'All mounting holes match drawing specifications - check positions and sizes',
      itemType: 'CHECKBOX',
      isRequired: true,
      section: 'Mounting & Holes'
    })
  }

  private addBasinItems(): void {
    this.config.basins.forEach((basin) => {
      const basinDimensions = basin.dimensions 
        ? `${basin.dimensions.width}″ × ${basin.dimensions.length}″ × ${basin.dimensions.depth}″`
        : this.getStandardBasinDimensions(basin.size)

      // Basin dimensions
      this.addItem({
        checklistItem: `Basin ${basin.position}: ${basinDimensions} dimensions verified and match specifications`,
        itemType: 'CHECKBOX',
        isRequired: true,
        section: 'Basin Inspection'
      })

      // Drain location
      this.addItem({
        checklistItem: `Basin ${basin.position}: Drain location verified`,
        itemType: 'SINGLE_SELECT',
        isRequired: true,
        section: 'Basin Inspection',
        options: ['Center', 'Left', 'Right', 'Back-Left', 'Back-Right']
      })
    })
  }

  private addGeneralAssemblyItems(): void {
    // Final assembly verification
    this.addItem({
      checklistItem: `Sink dimensions: ${this.config.dimensions.width}″ × ${this.config.dimensions.length}″ verified and match specifications`,
      itemType: 'CHECKBOX',
      isRequired: true,
      section: 'Final Assembly'
    })
  }

  private addItem(itemData: Omit<QCItem, 'id' | 'order'>): void {
    this.items.push({
      id: `preqc-${this.itemCounter++}`,
      order: this.itemCounter * 10,
      ...itemData
    })
  }

  private calculatePegboardSize(): string {
    // Calculate pegboard size based on sink dimensions
    const { width, length } = this.config.dimensions
    return `${width}″ × ${Math.floor(length * 0.4)}″`
  }

  private isHeightAdjustableLegs(): boolean {
    return this.config.structuralComponents.legs.typeId && 
           !this.config.structuralComponents.legs.typeId.includes('-FH-')
  }

  private getStandardBasinDimensions(basinSize: string): string {
    // Map basin size to standard dimensions
    const dimensionMap: Record<string, string> = {
      'T2-BASIN-18X24': '18″ × 24″ × 10″',
      'T2-BASIN-16X20': '16″ × 20″ × 8″',
      'T2-ADW-BASIN30X20X10': '30″ × 20″ × 10″',
      'LARGE': '18″ × 24″ × 10″',
      'MEDIUM': '16″ × 20″ × 8″',
      'SMALL': '14″ × 18″ × 8″'
    }
    return dimensionMap[basinSize] || '18″ × 24″ × 10″'
  }
}