import { prisma } from './prisma'

export interface OutsourcedPartUpdate {
  bomItemId: string
  status: 'PENDING_ORDER' | 'ORDERED' | 'IN_TRANSIT' | 'RECEIVED' | 'DELAYED' | 'CANCELLED'
  supplier?: string
  expectedDelivery?: Date
  trackingNumber?: string
  notes?: string
}

export class OutsourcedPartsService {
  /**
   * Initialize outsourced parts tracking for a BOM
   */
  static async initializeOutsourcedParts(bomId: string): Promise<void> {
    try {
      // Find all BOM items that reference outsourced parts or assemblies
      // For now, assume all BOM items can potentially be outsourced
      // TODO: Implement proper part/assembly relationship checking
      const outsourcedBomItems = await prisma.bomItem.findMany({
        where: {
          bomId
        }
      })

      // Update BOM items to set initial outsourced status
      if (outsourcedBomItems.length > 0) {
        const updatePromises = outsourcedBomItems.map(item =>
          prisma.bomItem.update({
            where: { id: item.id },
            data: {
              outsourcedStatus: 'PENDING_ORDER',
              outsourcedUpdatedAt: new Date()
            }
          })
        )

        await Promise.all(updatePromises)

        console.log(`Initialized ${outsourcedBomItems.length} outsourced parts for BOM ${bomId}`)
      }
    } catch (error) {
      console.error('Error initializing outsourced parts:', error)
      throw error
    }
  }

  /**
   * Get all outsourced parts for an order
   */
  static async getOutsourcedPartsForOrder(orderId: string) {
    try {
      // For now, get all BOM items with outsourced tracking data
      const bomItems = await prisma.bomItem.findMany({
        where: {
          bom: {
            orderId
          },
          outsourcedStatus: {
            not: null
          }
        },
        include: {
          outsourcedUpdater: {
            select: {
              fullName: true
            }
          }
        },
        orderBy: {
          outsourcedUpdatedAt: 'desc'
        }
      })

      return bomItems.map(item => ({
        id: item.id,
        partId: item.partIdOrAssemblyId,
        partName: item.name,
        partNumber: item.partIdOrAssemblyId,
        quantity: item.quantity,
        supplier: item.outsourcedSupplier,
        expectedDelivery: item.outsourcedExpectedDelivery?.toISOString(),
        status: item.outsourcedStatus || 'PENDING_ORDER',
        trackingNumber: item.outsourcedTrackingNumber,
        notes: item.outsourcedNotes,
        orderedBy: item.outsourcedUpdater?.fullName,
        orderedDate: item.outsourcedUpdatedAt?.toISOString(),
        receivedDate: item.outsourcedStatus === 'RECEIVED' ? item.outsourcedUpdatedAt?.toISOString() : undefined
      }))
    } catch (error) {
      console.error('Error getting outsourced parts:', error)
      throw error
    }
  }

  /**
   * Check if all outsourced parts for an order are received
   */
  static async areAllOutsourcedPartsReceived(orderId: string): Promise<boolean> {
    try {
      const pendingOutsourcedParts = await prisma.bomItem.count({
        where: {
          bom: {
            orderId
          },
          outsourcedStatus: {
            notIn: ['RECEIVED', 'CANCELLED']
          }
        }
      })

      return pendingOutsourcedParts === 0
    } catch (error) {
      console.error('Error checking outsourced parts status:', error)
      throw error
    }
  }

  /**
   * Get outsourced parts summary for dashboard
   */
  static async getOutsourcedPartsSummary() {
    try {
      const summary = await prisma.bomItem.groupBy({
        by: ['outsourcedStatus'],
        where: {
          outsourcedStatus: {
            not: null
          }
        },
        _count: {
          id: true
        }
      })

      const statusCounts = {
        PENDING_ORDER: 0,
        ORDERED: 0,
        IN_TRANSIT: 0,
        RECEIVED: 0,
        DELAYED: 0,
        CANCELLED: 0
      }

      summary.forEach(item => {
        const status = item.outsourcedStatus || 'PENDING_ORDER'
        statusCounts[status as keyof typeof statusCounts] = item._count.id
      })

      return statusCounts
    } catch (error) {
      console.error('Error getting outsourced parts summary:', error)
      throw error
    }
  }

  /**
   * Get overdue outsourced parts
   */
  static async getOverdueOutsourcedParts() {
    try {
      const today = new Date()
      
      const overdueParts = await prisma.bomItem.findMany({
        where: {
          outsourcedExpectedDelivery: {
            lt: today
          },
          outsourcedStatus: {
            notIn: ['RECEIVED', 'CANCELLED']
          }
        },
        include: {
          bom: {
            include: {
              order: {
                select: {
                  poNumber: true,
                  customerName: true
                }
              }
            }
          }
        },
        orderBy: {
          outsourcedExpectedDelivery: 'asc'
        }
      })

      return overdueParts.map(item => ({
        id: item.id,
        partName: item.name,
        partNumber: item.partIdOrAssemblyId,
        expectedDelivery: item.outsourcedExpectedDelivery,
        status: item.outsourcedStatus,
        supplier: item.outsourcedSupplier,
        orderPoNumber: item.bom.order.poNumber,
        customerName: item.bom.order.customerName,
        daysOverdue: Math.floor((today.getTime() - (item.outsourcedExpectedDelivery?.getTime() || 0)) / (1000 * 60 * 60 * 24))
      }))
    } catch (error) {
      console.error('Error getting overdue outsourced parts:', error)
      throw error
    }
  }
}