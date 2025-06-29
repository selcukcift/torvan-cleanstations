import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET not set')
    return new Response('Webhook secret not configured', { status: 500 })
  }

  // Get the headers
  const headerPayload = headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400
    })
  }

  // Handle the webhook
  const eventType = evt.type
  
  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, username, first_name, last_name, public_metadata } = evt.data
    
    const primaryEmail = email_addresses.find((email) => email.id === evt.data.primary_email_address_id)?.email_address
    
    if (!primaryEmail) {
      console.error('No primary email found for user:', id)
      return new Response('No primary email found', { status: 400 })
    }

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { clerkId: id },
            { email: primaryEmail }
          ]
        }
      })

      const userUsername = username || primaryEmail.split('@')[0]
      const fullName = `${first_name || ''} ${last_name || ''}`.trim() || userUsername
      const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      const role = (public_metadata?.role as string) || 'ASSEMBLER'

      if (existingUser) {
        // Update existing user
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            clerkId: id,
            email: primaryEmail,
            username: userUsername,
            fullName,
            initials,
            role: role as any,
            clerkEmail: primaryEmail
          }
        })
        console.log('Updated user:', existingUser.id)
      } else {
        // Create new user
        await prisma.user.create({
          data: {
            clerkId: id,
            email: primaryEmail,
            username: userUsername,
            fullName,
            initials,
            role: role as any,
            passwordHash: 'CLERK_USER',
            clerkEmail: primaryEmail
          }
        })
        console.log('Created new user for Clerk ID:', id)
      }
    } catch (error) {
      console.error('Error syncing user:', error)
      return new Response('Error syncing user', { status: 500 })
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data
    
    try {
      // Find and delete user
      const user = await prisma.user.findUnique({
        where: { clerkId: id }
      })
      
      if (user) {
        // You might want to soft delete instead of hard delete
        await prisma.user.update({
          where: { clerkId: id },
          data: {
            email: `deleted_${user.email}`,
            username: `deleted_${user.username}`,
            clerkId: null,
            clerkEmail: null
          }
        })
        console.log('Soft deleted user:', user.id)
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      return new Response('Error deleting user', { status: 500 })
    }
  }

  return NextResponse.json({ message: 'Webhook received' }, { status: 200 })
}