/**
 * Notification Preferences API
 * Manage user notification configuration and preferences
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getAuthUser } from '@/lib/auth'

const prisma = new PrismaClient()

/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 */
export async function GET() {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get all notification preferences for the user
    const preferences = await prisma.notificationPreference.findMany({
      where: { userId: user.id },
      orderBy: { notificationType: 'asc' }
    })

    // Get all available notification types
    const availableTypes = [
      'ORDER_STATUS_CHANGE',
      'TASK_ASSIGNMENT', 
      'QC_APPROVAL_REQUIRED',
      'ASSEMBLY_MILESTONE',
      'SERVICE_REQUEST',
      'SYSTEM_ALERT',
      'INVENTORY_LOW',
      'DEADLINE_APPROACHING'
    ]

    // Create default preferences for types that don't exist
    const existingTypes = preferences.map(p => p.notificationType)
    const missingTypes = availableTypes.filter(type => !existingTypes.includes(type))

    // Only return preferences relevant to user's role
    const roleRelevantTypes = getRelevantNotificationTypes(user.role)
    const filteredPreferences = preferences.filter(p => 
      roleRelevantTypes.includes(p.notificationType)
    )

    // Add default preferences for missing relevant types
    const defaultPreferences = missingTypes
      .filter(type => roleRelevantTypes.includes(type))
      .map(type => ({
        id: `default_${type}`,
        userId: user.id,
        notificationType: type,
        inAppEnabled: true,
        emailEnabled: getDefaultEmailSetting(type, user.role),
        frequency: getDefaultFrequency(type),
        quietHoursStart: null,
        quietHoursEnd: null,
        emailAddress: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }))

    return NextResponse.json({
      success: true,
      data: {
        preferences: [...filteredPreferences, ...defaultPreferences],
        userEmail: user.email,
        userRole: user.role
      }
    })

  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST/PUT /api/notifications/preferences
 * Update user's notification preferences
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { preferences } = body

    if (!Array.isArray(preferences)) {
      return NextResponse.json(
        { success: false, message: 'Preferences must be an array' },
        { status: 400 }
      )
    }

    const updatedPreferences = []

    for (const pref of preferences) {
      const {
        notificationType,
        inAppEnabled,
        emailEnabled,
        frequency,
        quietHoursStart,
        quietHoursEnd,
        emailAddress
      } = pref

      // Validate notification type is relevant to user's role
      const roleRelevantTypes = getRelevantNotificationTypes(user.role)
      if (!roleRelevantTypes.includes(notificationType)) {
        continue // Skip irrelevant types
      }

      // Validate frequency
      const validFrequencies = ['IMMEDIATE', 'HOURLY', 'DAILY', 'WEEKLY']
      if (frequency && !validFrequencies.includes(frequency)) {
        return NextResponse.json(
          { success: false, message: `Invalid frequency: ${frequency}` },
          { status: 400 }
        )
      }

      // Validate quiet hours
      if (quietHoursStart !== null && (quietHoursStart < 0 || quietHoursStart > 23)) {
        return NextResponse.json(
          { success: false, message: 'Quiet hours start must be between 0 and 23' },
          { status: 400 }
        )
      }

      if (quietHoursEnd !== null && (quietHoursEnd < 0 || quietHoursEnd > 23)) {
        return NextResponse.json(
          { success: false, message: 'Quiet hours end must be between 0 and 23' },
          { status: 400 }
        )
      }

      // Upsert preference
      const updatedPref = await prisma.notificationPreference.upsert({
        where: {
          userId_notificationType: {
            userId: user.id,
            notificationType
          }
        },
        update: {
          inAppEnabled: inAppEnabled ?? true,
          emailEnabled: emailEnabled ?? false,
          frequency: frequency ?? 'IMMEDIATE',
          quietHoursStart,
          quietHoursEnd,
          emailAddress,
          isActive: true,
          updatedAt: new Date()
        },
        create: {
          userId: user.id,
          notificationType,
          inAppEnabled: inAppEnabled ?? true,
          emailEnabled: emailEnabled ?? false,
          frequency: frequency ?? 'IMMEDIATE',
          quietHoursStart,
          quietHoursEnd,
          emailAddress,
          isActive: true
        }
      })

      updatedPreferences.push(updatedPref)
    }

    return NextResponse.json({
      success: true,
      data: {
        preferences: updatedPreferences,
        message: `Updated ${updatedPreferences.length} notification preferences`
      }
    })

  } catch (error) {
    console.error('Error updating notification preferences:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions

function getRelevantNotificationTypes(userRole: string): string[] {
  const baseTypes = ['SYSTEM_ALERT']
  
  switch (userRole) {
    case 'ADMIN':
      return [
        'ORDER_STATUS_CHANGE',
        'TASK_ASSIGNMENT',
        'QC_APPROVAL_REQUIRED', 
        'ASSEMBLY_MILESTONE',
        'SERVICE_REQUEST',
        'SYSTEM_ALERT',
        'INVENTORY_LOW',
        'DEADLINE_APPROACHING'
      ]
      
    case 'PRODUCTION_COORDINATOR':
      return [
        'ORDER_STATUS_CHANGE',
        'TASK_ASSIGNMENT',
        'QC_APPROVAL_REQUIRED',
        'ASSEMBLY_MILESTONE', 
        'DEADLINE_APPROACHING',
        'SYSTEM_ALERT'
      ]
      
    case 'PROCUREMENT_SPECIALIST':
      return [
        'ORDER_STATUS_CHANGE',
        'SERVICE_REQUEST',
        'INVENTORY_LOW',
        'SYSTEM_ALERT'
      ]
      
    case 'QC_PERSON':
      return [
        'QC_APPROVAL_REQUIRED',
        'ORDER_STATUS_CHANGE',
        'SYSTEM_ALERT'
      ]
      
    case 'ASSEMBLER':
      return [
        'TASK_ASSIGNMENT',
        'ASSEMBLY_MILESTONE',
        'ORDER_STATUS_CHANGE',
        'SYSTEM_ALERT'
      ]
      
    case 'SERVICE_DEPARTMENT':
      return [
        'SERVICE_REQUEST',
        'SYSTEM_ALERT'
      ]
      
    default:
      return baseTypes
  }
}

function getDefaultEmailSetting(notificationType: string, userRole: string): boolean {
  // Production Coordinators get email for critical events by default
  if (userRole === 'PRODUCTION_COORDINATOR') {
    return ['QC_APPROVAL_REQUIRED', 'DEADLINE_APPROACHING', 'SYSTEM_ALERT'].includes(notificationType)
  }
  
  // Other roles have email disabled by default
  return false
}

function getDefaultFrequency(notificationType: string): string {
  // Time-sensitive notifications should be immediate
  if (['QC_APPROVAL_REQUIRED', 'SYSTEM_ALERT', 'DEADLINE_APPROACHING'].includes(notificationType)) {
    return 'IMMEDIATE'
  }
  
  // Status changes can be grouped
  if (notificationType === 'ORDER_STATUS_CHANGE') {
    return 'HOURLY'
  }
  
  return 'IMMEDIATE'
}