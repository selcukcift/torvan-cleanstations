import { prisma } from './prisma';

export interface CustomPartConfig {
  type: 'pegboard' | 'basin';
  width?: number;
  length?: number;
  depth?: number;
}

export interface GeneratedPartNumber {
  partNumber: string;
  spec: CustomPartConfig;
}

/**
 * Service for generating unique custom part numbers for configurable items
 * Format examples:
 * - Pegboard: T2-ADW-PB-[width]x[length]
 * - Basin: T2-ADW-BSN-[width]x[length]x[depth]
 */
export class CustomPartNumberGenerator {
  private static prefixes = {
    pegboard: 'T2-ADW-PB',
    basin: 'T2-ADW-BSN'
  };

  /**
   * Generate a custom part number based on configuration
   */
  static async generate(config: CustomPartConfig): Promise<GeneratedPartNumber> {
    const prefix = this.prefixes[config.type];
    if (!prefix) {
      throw new Error(`Invalid custom part type: ${config.type}`);
    }

    let partNumber: string;
    
    switch (config.type) {
      case 'pegboard':
        if (!config.width || !config.length) {
          throw new Error('Pegboard requires width and length dimensions');
        }
        partNumber = `${prefix}-${config.width}x${config.length}`;
        break;
        
      case 'basin':
        if (!config.width || !config.length || !config.depth) {
          throw new Error('Basin requires width, length, and depth dimensions');
        }
        partNumber = `${prefix}-${config.width}x${config.length}x${config.depth}`;
        break;
    }

    // Validate format
    if (!this.validateFormat(partNumber)) {
      throw new Error(`Generated part number has invalid format: ${partNumber}`);
    }

    // Check for conflicts with existing standard parts
    const existingPart = await prisma.part.findFirst({
      where: { partId: partNumber }
    });
    
    if (existingPart) {
      throw new Error(`Part number conflicts with existing standard part: ${partNumber}`);
    }

    return {
      partNumber,
      spec: config
    };
  }

  /**
   * Validate the format of a generated part number
   */
  private static validateFormat(partNumber: string): boolean {
    const patterns = {
      pegboard: /^T2-ADW-PB-\d+x\d+$/,
      basin: /^T2-ADW-BSN-\d+x\d+x\d+$/
    };

    return Object.values(patterns).some(pattern => pattern.test(partNumber));
  }

  /**
   * Parse a custom part number back into its configuration
   */
  static parse(partNumber: string): CustomPartConfig | null {
    const pegboardMatch = partNumber.match(/^T2-ADW-PB-(\d+)x(\d+)$/);
    if (pegboardMatch) {
      return {
        type: 'pegboard',
        width: parseInt(pegboardMatch[1]),
        length: parseInt(pegboardMatch[2])
      };
    }

    const basinMatch = partNumber.match(/^T2-ADW-BSN-(\d+)x(\d+)x(\d+)$/);
    if (basinMatch) {
      return {
        type: 'basin',
        width: parseInt(basinMatch[1]),
        length: parseInt(basinMatch[2]),
        depth: parseInt(basinMatch[3])
      };
    }

    return null;
  }

  /**
   * Check if a part number is a custom generated one
   */
  static isCustomPartNumber(partNumber: string): boolean {
    return this.validateFormat(partNumber);
  }

  /**
   * Generate a display name for the custom part
   */
  static generateDisplayName(config: CustomPartConfig): string {
    switch (config.type) {
      case 'pegboard':
        return `Custom Pegboard ${config.width}"x${config.length}"`;
      case 'basin':
        return `Custom Basin ${config.width}"x${config.length}"x${config.depth}"`;
      default:
        return 'Custom Part';
    }
  }
}