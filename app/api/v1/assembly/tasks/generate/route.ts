import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

interface AssemblyTask {
  id: string;
  title: string;
  description?: string;
  instructions?: string[];
  completed: boolean;
  required: boolean;
  order?: number;
  requiredTools?: string[];
  requiredParts?: string[];
  workInstruction?: {
    id: string;
    title: string;
    steps: string[];
  };
}

interface PackagingItem {
  id: string;
  section: string;
  item: string;
  completed: boolean;
  required: boolean;
  isBasinSpecific?: boolean;
  basinNumber?: number;
}

async function parseAssemblyChecklistFile(orderConfig: any): Promise<{ tasks: AssemblyTask[]; packaging: PackagingItem[] }> {
  const filePath = path.join(process.cwd(), 'resources', 'CLP.T2.001.V01 - T2SinkProduction.txt');
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const sections = fileContent.split(/SECTION \d+/).slice(1);
  const tasks: AssemblyTask[] = [];
  const packaging: PackagingItem[] = [];
  let taskOrder = 1;

  // Section 2: SINK PRODUCTION CHECK
  const sinkProductionSection = sections[1]; // Assuming Section 2 is the second split part
  if (sinkProductionSection) {
    const lines = sinkProductionSection.split(/\r?\n/).filter(line => line.trim());
    let currentSectionTitle = '';
    
    lines.forEach(line => {
      if (line.startsWith('SINK PRODUCTION CHECK')) {
        currentSectionTitle = line.trim();
      } else if (line.startsWith('☐')) {
        const checklistItem = line.replace('☐', '').replace(/N\/A$/, '').trim();
        if (checklistItem) {
          // Basic filtering based on order configuration (can be expanded)
          let includeTask = true;
          if (checklistItem.includes('Pegboard') && !orderConfig.pegboard) {
            includeTask = false;
          }
          // Add more conditions based on orderConfig (e.g., specific faucet types, basin types)
          if (includeTask) {
            tasks.push({
              id: `sink-prod-task-${taskOrder}`,
              title: checklistItem,
              description: `Verify: ${checklistItem}`,
              completed: false,
              required: true,
              order: taskOrder++,
            });
          }
        }
      }
    });
  }

  // Section 3: BASIN PRODUCTION
  const basinProductionSection = sections[2]; // Assuming Section 3 is the third split part
  if (basinProductionSection && orderConfig.basins && orderConfig.basins.length > 0) {
    const lines = basinProductionSection.split(/\r?\n/).filter(line => line.trim());
    const basinTypes = orderConfig.basins.map((b: any) => b.basinType || b.basinTypeId);
    
    lines.forEach(line => {
      if (line.includes('E-DRAIN BASIN CHECKS') && basinTypes.includes('E_DRAIN')) {
        // Handle E-Drain specific checks
        orderConfig.basins.forEach((basin: any, idx: number) => {
          if (basin.basinType === 'E_DRAIN') {
            const basinLines = lines.slice(lines.indexOf(line) + 1).filter(l => l.includes('☐') && !l.includes('E-SINK BASIN CHECKS'));
            basinLines.forEach(bLine => {
              const checklistItem = bLine.replace('☐', '').replace(/N\/A$/, '').trim();
              if (checklistItem) {
                tasks.push({
                  id: `basin-edrain-${idx + 1}-${taskOrder}`,
                  title: `Basin ${idx + 1} (E-Drain): ${checklistItem}`,
                  description: `Verify E-Drain Basin ${idx + 1}: ${checklistItem}`,
                  completed: false,
                  required: true,
                  order: taskOrder++,
                });
              }
            });
          }
        });
      } else if (line.includes('E-SINK BASIN CHECKS') && (basinTypes.includes('E_SINK') || basinTypes.includes('E_SINK_DI'))) {
        // Handle E-Sink specific checks
        orderConfig.basins.forEach((basin: any, idx: number) => {
          if (basin.basinType === 'E_SINK' || basin.basinType === 'E_SINK_DI') {
            const basinLines = lines.slice(lines.indexOf(line) + 1).filter(l => l.includes('☐'));
            basinLines.forEach(bLine => {
              const checklistItem = bLine.replace('☐', '').replace(/N\/A$/, '').trim();
              if (checklistItem) {
                tasks.push({
                  id: `basin-esink-${idx + 1}-${taskOrder}`,
                  title: `Basin ${idx + 1} (E-Sink): ${checklistItem}`,
                  description: `Verify E-Sink Basin ${idx + 1}: ${checklistItem}`,
                  completed: false,
                  required: true,
                  order: taskOrder++,
                });
              }
            });
          }
        });
      }
    });
  }

  // Section 4: STANDARD PACKAGING & KITS
  const packagingSection = sections[3]; // Assuming Section 4 is the fourth split part
  if (packagingSection) {
    const lines = packagingSection.split(/\r?\n/).filter(line => line.trim());
    lines.forEach(line => {
      if (line.startsWith('☐')) {
        const item = line.replace('☐', '').trim();
        if (item) {
          packaging.push({
            id: `packaging-${item.replace(/[^a-zA-Z0-9]/g, '')}`,
            section: 'STANDARD PACKAGING & KITS',
            item: item,
            completed: false,
            required: true,
          });
        }
      }
    });
  }

  return { tasks, packaging };
}

export async function POST(request: Request) {
  try {
    const { orderId, buildNumber } = await request.json();

    if (!orderId) {
      return NextResponse.json({ message: "Order ID is required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        sinkConfigurations: true,
        basinConfigurations: true,
        faucetConfigurations: true,
        sprayerConfigurations: true,
        selectedAccessories: true,
      },
    });

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    // Get the specific sink configuration for the build number, or the first one if no buildNumber is specified
    const targetConfig = buildNumber
      ? order.sinkConfigurations.find(config => config.buildNumber === buildNumber)
      : order.sinkConfigurations[0];

    if (!targetConfig) {
      return NextResponse.json({ message: "Sink configuration not found for the given build number" }, { status: 404 });
    }

    // Combine relevant configurations for parsing
    const orderConfig = {
      ...targetConfig,
      basins: order.basinConfigurations.filter(b => b.buildNumber === targetConfig.buildNumber),
      faucets: order.faucetConfigurations.filter(f => f.buildNumber === targetConfig.buildNumber),
      sprayers: order.sprayerConfigurations.filter(s => s.buildNumber === targetConfig.buildNumber),
      accessories: order.selectedAccessories.filter(a => a.buildNumber === targetConfig.buildNumber),
    };

    const { tasks, packaging } = await parseAssemblyChecklistFile(orderConfig);

    return NextResponse.json({ success: true, tasks, packaging });
  } catch (error) {
    console.error("Error generating assembly tasks:", error);
    return NextResponse.json({ message: "Failed to generate assembly tasks" }, { status: 500 });
  }
}