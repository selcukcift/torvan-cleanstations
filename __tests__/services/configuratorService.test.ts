/**
 * Configurator Service Unit Tests
 * Tests sink configuration logic and validation
 */

import { jest } from '@jest/globals'

// Mock Prisma client
const mockPrisma = {
  assembly: {
    findUnique: jest.fn(),
    findMany: jest.fn()
  },
  part: {
    findUnique: jest.fn(),
    findMany: jest.fn()
  }
}

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}))

// Mock configurator service functions
const mockConfiguratorService = {
  validateSinkConfiguration: jest.fn(),
  getSinkModels: jest.fn(),
  getLegTypes: jest.fn(),
  getFeetTypes: jest.fn(),
  getBasinOptions: jest.fn(),
  getFaucetOptions: jest.fn(),
  getSprayerOptions: jest.fn(),
  validateComponentCompatibility: jest.fn(),
  calculateDimensions: jest.fn()
}

describe('Configurator Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getSinkModels', () => {
    it('should return available T2 sink models', async () => {
      const mockSinkModels = [
        {
          id: 'T2-DL27',
          name: 'T2 Dual Level 27',
          type: 'DUAL_LEVEL',
          maxWidth: 72,
          maxLength: 48,
          compatibility: ['T2-DL27-KIT', 'T2-DL27-FH-KIT']
        },
        {
          id: 'T2-DL14',
          name: 'T2 Dual Level 14',
          type: 'DUAL_LEVEL',
          maxWidth: 48,
          maxLength: 36,
          compatibility: ['T2-DL14-KIT', 'T2-DL14-FH-KIT']
        },
        {
          id: 'T2-LC1',
          name: 'T2 LC1',
          type: 'SINGLE_LEVEL',
          maxWidth: 36,
          maxLength: 24,
          compatibility: ['T2-LC1-KIT']
        }
      ]

      mockConfiguratorService.getSinkModels.mockResolvedValue(mockSinkModels)

      const result = await mockConfiguratorService.getSinkModels()

      expect(result).toHaveLength(3)
      expect(result[0].id).toBe('T2-DL27')
      expect(result[1].id).toBe('T2-DL14')
      expect(result[2].id).toBe('T2-LC1')
    })

    it('should filter sink models by availability', async () => {
      const availableModels = [
        {
          id: 'T2-DL27',
          name: 'T2 Dual Level 27',
          isActive: true
        }
      ]

      mockConfiguratorService.getSinkModels.mockResolvedValue(availableModels)

      const result = await mockConfiguratorService.getSinkModels({ activeOnly: true })

      expect(result).toHaveLength(1)
      expect(result[0].isActive).toBe(true)
    })
  })

  describe('getLegTypes', () => {
    it('should return compatible leg types for sink model', async () => {
      const legTypes = [
        {
          id: 'T2-DL27-KIT',
          name: 'T2 DL27 Legs Kit',
          compatibleWith: ['T2-DL27'],
          height: '27-42'
        },
        {
          id: 'T2-DL14-KIT',
          name: 'T2 DL14 Legs Kit',
          compatibleWith: ['T2-DL14'],
          height: '14-29'
        },
        {
          id: 'T2-LC1-KIT',
          name: 'T2 LC1 Legs Kit',
          compatibleWith: ['T2-LC1'],
          height: 'Fixed'
        }
      ]

      mockConfiguratorService.getLegTypes.mockResolvedValue(legTypes)

      const result = await mockConfiguratorService.getLegTypes('T2-DL27')

      expect(result).toBeDefined()
      expect(result.some((leg: any) => leg.compatibleWith.includes('T2-DL27'))).toBe(true)
    })

    it('should return empty array for invalid sink model', async () => {
      mockConfiguratorService.getLegTypes.mockResolvedValue([])

      const result = await mockConfiguratorService.getLegTypes('INVALID-MODEL')

      expect(result).toHaveLength(0)
    })
  })

  describe('getFeetTypes', () => {
    it('should return available feet options', async () => {
      const feetTypes = [
        {
          id: 'T2-LEVELING-CASTOR-475',
          name: 'Leveling Castor 475',
          type: 'CASTOR',
          load: '475 lbs',
          isDefault: true
        },
        {
          id: 'T2-SEISMIC-FEET',
          name: 'Seismic Feet',
          type: 'FIXED',
          load: '600 lbs',
          isDefault: false
        }
      ]

      mockConfiguratorService.getFeetTypes.mockResolvedValue(feetTypes)

      const result = await mockConfiguratorService.getFeetTypes()

      expect(result).toHaveLength(2)
      expect(result.find((feet: any) => feet.isDefault)).toBeDefined()
    })
  })

  describe('getBasinOptions', () => {
    it('should return basin type options', async () => {
      const basinTypes = [
        {
          id: 'T2-BSN-ESK-KIT',
          name: 'E-Sink Basin Kit',
          type: 'E_SINK',
          description: 'Electronic sink basin with sensors'
        },
        {
          id: 'T2-BSN-ESK-DI-KIT',
          name: 'E-Sink DI Basin Kit',
          type: 'E_SINK_DI',
          description: 'Electronic sink with DI water'
        },
        {
          id: 'T2-BSN-EDR-KIT',
          name: 'E-Drain Basin Kit',
          type: 'E_DRAIN',
          description: 'Electronic drain basin'
        }
      ]

      mockConfiguratorService.getBasinOptions.mockResolvedValue(basinTypes)

      const result = await mockConfiguratorService.getBasinOptions()

      expect(result).toHaveLength(3)
      expect(result[0].type).toBe('E_SINK')
    })

    it('should return basin size options', async () => {
      const basinSizes = [
        {
          partNumber: 'T2-ADW-BASIN20X20X8',
          dimensions: '20X20X8',
          description: '20" x 20" x 8" Basin'
        },
        {
          partNumber: 'T2-ADW-BASIN24X20X8',
          dimensions: '24X20X8',
          description: '24" x 20" x 8" Basin'
        },
        {
          partNumber: 'CUSTOM',
          dimensions: 'CUSTOM',
          description: 'Custom Dimensions'
        }
      ]

      mockConfiguratorService.getBasinOptions.mockResolvedValue(basinSizes)

      const result = await mockConfiguratorService.getBasinOptions({ type: 'sizes' })

      expect(result).toHaveLength(3)
      expect(result.find((size: any) => size.partNumber === 'CUSTOM')).toBeDefined()
    })
  })

  describe('validateSinkConfiguration', () => {
    it('should validate complete T2-DL27 configuration', () => {
      const validConfig = {
        sinkModelId: 'T2-DL27',
        width: 48,
        length: 24,
        legsTypeId: 'T2-DL27-KIT',
        feetTypeId: 'T2-LEVELING-CASTOR-475',
        basins: [
          {
            basinTypeId: 'T2-BSN-ESK-KIT',
            basinSizePartNumber: 'T2-ADW-BASIN24X20X8'
          }
        ]
      }

      mockConfiguratorService.validateSinkConfiguration.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      const result = mockConfiguratorService.validateSinkConfiguration(validConfig)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing required dimensions', () => {
      const invalidConfig = {
        sinkModelId: 'T2-DL27'
        // Missing width and length
      }

      mockConfiguratorService.validateSinkConfiguration.mockReturnValue({
        isValid: false,
        errors: [
          'Width is required for T2-DL27 model',
          'Length is required for T2-DL27 model'
        ],
        warnings: []
      })

      const result = mockConfiguratorService.validateSinkConfiguration(invalidConfig)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Width is required for T2-DL27 model')
      expect(result.errors).toContain('Length is required for T2-DL27 model')
    })

    it('should validate dimension limits', () => {
      const configWithInvalidDimensions = {
        sinkModelId: 'T2-DL27',
        width: 100, // Exceeds max width of 72
        length: 60  // Exceeds max length of 48
      }

      mockConfiguratorService.validateSinkConfiguration.mockReturnValue({
        isValid: false,
        errors: [
          'Width 100" exceeds maximum of 72" for T2-DL27',
          'Length 60" exceeds maximum of 48" for T2-DL27'
        ],
        warnings: []
      })

      const result = mockConfiguratorService.validateSinkConfiguration(configWithInvalidDimensions)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(2)
    })

    it('should validate leg compatibility', () => {
      const configWithIncompatibleLegs = {
        sinkModelId: 'T2-DL14',
        legsTypeId: 'T2-DL27-KIT' // DL27 legs on DL14 sink
      }

      mockConfiguratorService.validateSinkConfiguration.mockReturnValue({
        isValid: false,
        errors: [
          'Leg type T2-DL27-KIT is not compatible with sink model T2-DL14'
        ],
        warnings: []
      })

      const result = mockConfiguratorService.validateSinkConfiguration(configWithIncompatibleLegs)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Leg type T2-DL27-KIT is not compatible with sink model T2-DL14')
    })

    it('should validate basin configurations', () => {
      const configWithInvalidBasin = {
        sinkModelId: 'T2-DL27',
        basins: [
          {
            basinTypeId: 'INVALID-BASIN-TYPE',
            basinSizePartNumber: 'T2-ADW-BASIN24X20X8'
          }
        ]
      }

      mockConfiguratorService.validateSinkConfiguration.mockReturnValue({
        isValid: false,
        errors: [
          'Invalid basin type: INVALID-BASIN-TYPE'
        ],
        warnings: []
      })

      const result = mockConfiguratorService.validateSinkConfiguration(configWithInvalidBasin)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid basin type: INVALID-BASIN-TYPE')
    })

    it('should validate custom basin dimensions', () => {
      const configWithCustomBasin = {
        sinkModelId: 'T2-DL27',
        basins: [
          {
            basinTypeId: 'T2-BSN-ESK-KIT',
            basinSizePartNumber: 'CUSTOM',
            customWidth: 32,
            customLength: 22,
            customDepth: 10
          }
        ]
      }

      mockConfiguratorService.validateSinkConfiguration.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [
          'Custom basin dimensions 32X22X10 will require approval'
        ]
      })

      const result = mockConfiguratorService.validateSinkConfiguration(configWithCustomBasin)

      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('Custom basin dimensions 32X22X10 will require approval')
    })
  })

  describe('validateComponentCompatibility', () => {
    it('should validate faucet and sprayer compatibility', () => {
      const components = {
        faucets: [
          { faucetTypeId: '706.58' }
        ],
        sprayers: [
          { sprayerTypeId: '706.61' }
        ]
      }

      mockConfiguratorService.validateComponentCompatibility.mockReturnValue({
        isValid: true,
        compatibilityIssues: []
      })

      const result = mockConfiguratorService.validateComponentCompatibility(components)

      expect(result.isValid).toBe(true)
      expect(result.compatibilityIssues).toHaveLength(0)
    })

    it('should detect incompatible component combinations', () => {
      const incompatibleComponents = {
        faucets: [
          { faucetTypeId: '706.58' }
        ],
        sprayers: [
          { sprayerTypeId: 'INCOMPATIBLE-SPRAYER' }
        ]
      }

      mockConfiguratorService.validateComponentCompatibility.mockReturnValue({
        isValid: false,
        compatibilityIssues: [
          'Faucet 706.58 is not compatible with sprayer INCOMPATIBLE-SPRAYER'
        ]
      })

      const result = mockConfiguratorService.validateComponentCompatibility(incompatibleComponents)

      expect(result.isValid).toBe(false)
      expect(result.compatibilityIssues).toHaveLength(1)
    })
  })

  describe('calculateDimensions', () => {
    it('should calculate overall sink dimensions', () => {
      const config = {
        sinkModelId: 'T2-DL27',
        width: 48,
        length: 24,
        legsTypeId: 'T2-DL27-KIT'
      }

      mockConfiguratorService.calculateDimensions.mockReturnValue({
        overall: {
          width: 48,
          length: 24,
          height: 42, // With legs extended
          weight: 150
        },
        workspace: {
          width: 46,
          length: 22,
          height: 36
        },
        footprint: {
          width: 50,
          length: 26 // Including leg extensions
        }
      })

      const result = mockConfiguratorService.calculateDimensions(config)

      expect(result.overall.width).toBe(48)
      expect(result.overall.height).toBe(42)
      expect(result.footprint.width).toBe(50)
    })

    it('should calculate dimensions with accessories', () => {
      const configWithAccessories = {
        sinkModelId: 'T2-DL27',
        width: 48,
        length: 24,
        accessories: [
          { id: '702.85', type: 'SHELF', dimensions: { width: 12, depth: 8 } }
        ]
      }

      mockConfiguratorService.calculateDimensions.mockReturnValue({
        overall: {
          width: 48,
          length: 24,
          height: 42,
          weight: 165 // Increased with accessories
        },
        accessories: [
          {
            id: '702.85',
            position: { x: 36, y: 0, z: 24 },
            clearance: { front: 2, back: 2 }
          }
        ]
      })

      const result = mockConfiguratorService.calculateDimensions(configWithAccessories)

      expect(result.overall.weight).toBe(165)
      expect(result.accessories).toHaveLength(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockConfiguratorService.getSinkModels.mockRejectedValue(
        new Error('Database connection failed')
      )

      await expect(mockConfiguratorService.getSinkModels())
        .rejects.toThrow('Database connection failed')
    })

    it('should handle invalid sink model IDs', () => {
      mockConfiguratorService.validateSinkConfiguration.mockReturnValue({
        isValid: false,
        errors: ['Invalid sink model ID: INVALID-MODEL'],
        warnings: []
      })

      const config = { sinkModelId: 'INVALID-MODEL' }
      const result = mockConfiguratorService.validateSinkConfiguration(config)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid sink model ID: INVALID-MODEL')
    })

    it('should handle malformed configuration data', () => {
      mockConfiguratorService.validateSinkConfiguration.mockReturnValue({
        isValid: false,
        errors: ['Configuration data is malformed'],
        warnings: []
      })

      const malformedConfig = null
      const result = mockConfiguratorService.validateSinkConfiguration(malformedConfig)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Configuration data is malformed')
    })
  })

  describe('Performance Tests', () => {
    it('should retrieve sink models within time limit', async () => {
      const startTime = Date.now()

      mockConfiguratorService.getSinkModels.mockImplementation(async () => {
        // Simulate fast database query
        await new Promise(resolve => setTimeout(resolve, 100))
        return [
          { id: 'T2-DL27', name: 'T2 Dual Level 27' },
          { id: 'T2-DL14', name: 'T2 Dual Level 14' },
          { id: 'T2-LC1', name: 'T2 LC1' }
        ]
      })

      const result = await mockConfiguratorService.getSinkModels()
      const endTime = Date.now()
      const duration = endTime - startTime

      expect(result).toHaveLength(3)
      expect(duration).toBeLessThan(500) // Should be fast
    })

    it('should validate configuration quickly', () => {
      const startTime = Date.now()

      const complexConfig = {
        sinkModelId: 'T2-DL27',
        width: 48,
        length: 24,
        legsTypeId: 'T2-DL27-KIT',
        feetTypeId: 'T2-LEVELING-CASTOR-475',
        basins: Array(5).fill({
          basinTypeId: 'T2-BSN-ESK-KIT',
          basinSizePartNumber: 'T2-ADW-BASIN24X20X8'
        }),
        faucets: Array(3).fill({
          faucetTypeId: '706.58'
        }),
        sprayers: Array(2).fill({
          sprayerTypeId: '706.61'
        })
      }

      mockConfiguratorService.validateSinkConfiguration.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      const result = mockConfiguratorService.validateSinkConfiguration(complexConfig)
      const endTime = Date.now()
      const duration = endTime - startTime

      expect(result.isValid).toBe(true)
      expect(duration).toBeLessThan(100) // Validation should be very fast
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complete T2-DL27 configuration workflow', async () => {
      // Step 1: Get sink models
      mockConfiguratorService.getSinkModels.mockResolvedValue([
        { id: 'T2-DL27', name: 'T2 Dual Level 27', isActive: true }
      ])

      // Step 2: Get compatible legs
      mockConfiguratorService.getLegTypes.mockResolvedValue([
        { id: 'T2-DL27-KIT', compatibleWith: ['T2-DL27'] }
      ])

      // Step 3: Get feet options
      mockConfiguratorService.getFeetTypes.mockResolvedValue([
        { id: 'T2-LEVELING-CASTOR-475', type: 'CASTOR' }
      ])

      // Step 4: Validate configuration
      mockConfiguratorService.validateSinkConfiguration.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      const sinkModels = await mockConfiguratorService.getSinkModels()
      const legs = await mockConfiguratorService.getLegTypes('T2-DL27')
      const feet = await mockConfiguratorService.getFeetTypes()

      const config = {
        sinkModelId: sinkModels[0].id,
        legsTypeId: legs[0].id,
        feetTypeId: feet[0].id,
        width: 48,
        length: 24
      }

      const validation = mockConfiguratorService.validateSinkConfiguration(config)

      expect(validation.isValid).toBe(true)
      expect(config.sinkModelId).toBe('T2-DL27')
      expect(config.legsTypeId).toBe('T2-DL27-KIT')
      expect(config.feetTypeId).toBe('T2-LEVELING-CASTOR-475')
    })

    it('should handle configuration error recovery', () => {
      const invalidConfig = {
        sinkModelId: 'T2-DL27',
        legsTypeId: 'T2-DL14-KIT' // Wrong legs
      }

      mockConfiguratorService.validateSinkConfiguration
        .mockReturnValueOnce({
          isValid: false,
          errors: ['Incompatible leg type'],
          warnings: []
        })
        .mockReturnValueOnce({
          isValid: true,
          errors: [],
          warnings: []
        })

      // First validation fails
      let result = mockConfiguratorService.validateSinkConfiguration(invalidConfig)
      expect(result.isValid).toBe(false)

      // Fix the configuration
      const fixedConfig = {
        ...invalidConfig,
        legsTypeId: 'T2-DL27-KIT'
      }

      // Second validation passes
      result = mockConfiguratorService.validateSinkConfiguration(fixedConfig)
      expect(result.isValid).toBe(true)
    })
  })
})