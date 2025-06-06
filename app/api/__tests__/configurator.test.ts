import { createMocks } from 'node-mocks-http'
import { GET } from '../configurator/route'
import { POST as POST_CONTROL_BOX } from '../configurator/control-box/route'
import { getAuthUser } from '@/lib/auth'
import configuratorService from '@/src/services/configuratorService'

// Mock dependencies
jest.mock('@/lib/auth')
jest.mock('@/src/services/configuratorService')

describe('/api/configurator', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getAuthUser as jest.Mock).mockResolvedValue({
      id: 'test-user-id',
      username: 'testuser',
      role: 'PRODUCTION_COORDINATOR'
    })
  })

  describe('GET /api/configurator', () => {
    it('returns sink families', async () => {
      const mockFamilies = [
        { code: 'MDRD', name: 'MDRD CleanStation', available: true },
        { code: 'ENDOSCOPE', name: 'Endoscope CleanStation', available: false }
      ]
      
      ;(configuratorService.getSinkFamilies as jest.Mock).mockResolvedValue(mockFamilies)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/configurator?queryType=sinkFamilies',
      })

      const response = await GET(req as any)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockFamilies)
      expect(configuratorService.getSinkFamilies).toHaveBeenCalled()
    })

    it('returns sink models for a family', async () => {
      const mockModels = [
        { id: 'T2-B1', name: 'T2-B1 (Single Basin)', basinCount: 1 },
        { id: 'T2-B2', name: 'T2-B2 (Dual Basin)', basinCount: 2 }
      ]
      
      ;(configuratorService.getSinkModels as jest.Mock).mockResolvedValue(mockModels)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/configurator?queryType=sinkModels&family=MDRD',
      })

      const response = await GET(req as any)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockModels)
      expect(configuratorService.getSinkModels).toHaveBeenCalledWith('MDRD')
    })

    it('returns basin types', async () => {
      const mockBasinTypes = [
        { id: 'E_SINK', name: 'E-Sink', kitAssemblyId: '713.109' },
        { id: 'E_DRAIN', name: 'E-Drain', kitAssemblyId: '713.107' }
      ]
      
      ;(configuratorService.getBasinTypeOptions as jest.Mock).mockResolvedValue(mockBasinTypes)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/configurator?queryType=basinTypes',
      })

      const response = await GET(req as any)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockBasinTypes)
    })

    it('returns pegboard options based on sink dimensions', async () => {
      const mockPegboardOptions = {
        types: [
          { id: 'COLORSAFE', name: 'ColorSafe+' },
          { id: 'PERFORATED', name: 'Perforated' }
        ],
        recommendedPegboard: {
          assemblyId: '715.122',
          name: 'T2-ADW-PB-6036',
          dimensions: '60X36'
        }
      }
      
      ;(configuratorService.getPegboardOptions as jest.Mock).mockResolvedValue(mockPegboardOptions)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/configurator?queryType=pegboardOptions&width=60&length=72',
      })

      const response = await GET(req as any)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockPegboardOptions)
      expect(configuratorService.getPegboardOptions).toHaveBeenCalledWith({
        width: 60,
        length: 72
      })
    })

    it('returns 401 when not authenticated', async () => {
      ;(getAuthUser as jest.Mock).mockResolvedValue(null)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/configurator?queryType=sinkFamilies',
      })

      const response = await GET(req as any)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.success).toBe(false)
      expect(json.message).toBe('Authentication required')
    })

    it('returns 400 for invalid query type', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/configurator?queryType=invalid',
      })

      const response = await GET(req as any)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.message).toBe('Invalid or missing queryType parameter')
    })
  })

  describe('POST /api/configurator/control-box', () => {
    it('returns control box based on basin configuration', async () => {
      const mockControlBox = {
        assemblyId: 'T2-CTRL-EDR1-ESK1',
        name: 'CONTROL BOX FOR 1 EDRAIN AND 1 ESINK',
        basinConfiguration: { eDrainCount: 1, eSinkCount: 1 }
      }
      
      ;(configuratorService.getControlBox as jest.Mock).mockResolvedValue(mockControlBox)

      const basinConfigurations = [
        { basinType: 'E_DRAIN' },
        { basinType: 'E_SINK' }
      ]

      const { req } = createMocks({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: { basinConfigurations },
      })

      const response = await POST_CONTROL_BOX(req as any)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual(mockControlBox)
      expect(configuratorService.getControlBox).toHaveBeenCalledWith(basinConfigurations)
    })

    it('returns 400 when basin configurations are invalid', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: { basinConfigurations: null },
      })

      const response = await POST_CONTROL_BOX(req as any)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.success).toBe(false)
      expect(json.message).toBe('Invalid basin configurations')
    })

    it('returns null when no matching control box found', async () => {
      ;(configuratorService.getControlBox as jest.Mock).mockResolvedValue(null)

      const basinConfigurations = [
        { basinType: 'INVALID_TYPE' }
      ]

      const { req } = createMocks({
        method: 'POST',
        body: { basinConfigurations },
      })

      const response = await POST_CONTROL_BOX(req as any)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toBeNull()
    })
  })
})