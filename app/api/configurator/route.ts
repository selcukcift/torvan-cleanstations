import { NextRequest, NextResponse } from 'next/server'
import configuratorService from '@/lib/configuratorService.native'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('Configurator API called')
    
    // Add authentication as per Prompt 2.B
    try {
      const user = await getAuthUser()
      if (!user) {
        console.log('User authentication failed')
        return NextResponse.json(
          { success: false, message: 'Authentication required' },
          { status: 401 }
        )
      }
      console.log('User authenticated:', user.username)
    } catch (authError) {
      console.error('Authentication error:', authError)
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }
    const { searchParams } = new URL(request.url)
    const queryType = searchParams.get('queryType')
    const width = searchParams.get('width')
    const length = searchParams.get('length')

    // Handle legacy 'type' parameter for sink-families
    const type = searchParams.get('type')
    if (type === 'sink-families') {
      const data = await configuratorService.getSinkFamilies()
      return NextResponse.json({ success: true, data })
    }

    switch (queryType) {
      case 'sinkFamilies': {
        const data = await configuratorService.getSinkFamilies()
        return NextResponse.json({ success: true, data })
      }
      case 'sinkModels': {
        const family = searchParams.get('family') || 'MDRD'
        const data = await configuratorService.getSinkModels(family)
        return NextResponse.json({ success: true, data })
      }
      case 'legTypes': {
        const data = await configuratorService.getLegTypes()
        return NextResponse.json({ success: true, data })
      }
      case 'feetTypes': {
        const data = await configuratorService.getFeetTypes()
        return NextResponse.json({ success: true, data })
      }
      case 'pegboardOptions': {
        const sinkDimensions = (width && length) ? { 
          width: parseInt(width), 
          length: parseInt(length) 
        } : {}
        const data = await configuratorService.getPegboardOptions(sinkDimensions)
        return NextResponse.json({ success: true, data })
      }
      case 'basinTypes': {
        const data = await configuratorService.getBasinTypeOptions()
        return NextResponse.json({ success: true, data })
      }
      case 'basinSizes': {
        const data = await configuratorService.getBasinSizeOptions()
        return NextResponse.json({ success: true, data })
      }
      case 'faucetTypes': {
        const basinType = searchParams.get('basinType') || ''
        const data = await configuratorService.getFaucetTypeOptions(basinType)
        return NextResponse.json({ success: true, data })
      }
      case 'sprayerTypes': {
        const data = await configuratorService.getSprayerTypeOptions()
        return NextResponse.json({ success: true, data })
      }
      case 'all': {
        // Optionally fetch all config data at once
        const [sinkModels, legsTypes, feetTypes, pegboardTypes, basinTypes, basinSizes, faucetTypes, sprayerTypes] = await Promise.all([
          configuratorService.getSinkModels('MDRD'),
          configuratorService.getLegTypes(),
          configuratorService.getFeetTypes(),
          configuratorService.getPegboardOptions(),
          configuratorService.getBasinTypeOptions(),
          configuratorService.getBasinSizeOptions(),
          configuratorService.getFaucetTypeOptions(''),
          configuratorService.getSprayerTypeOptions()
        ])
        return NextResponse.json({
          success: true,
          data: {
            sinkModels,
            legsTypes,
            feetTypes,
            pegboardTypes,
            basinTypes,
            basinSizes,
            faucetTypes,
            sprayerTypes
          }
        })
      }
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid configuration type' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error fetching configuration:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
