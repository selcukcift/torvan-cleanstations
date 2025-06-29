import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, checkUserRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/qc/summary - Get QC summary statistics
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    if (!checkUserRole(user, ['QC_PERSON', 'PRODUCTION_COORDINATOR', 'ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get QC statistics
    const [
      totalQcResults,
      passedCount,
      failedCount,
      requiresReviewCount,
      inProgressCount,
      recentResults,
      templateUsage,
      inspectorStats
    ] = await Promise.all([
      // Total QC results
      prisma.orderQcResult.count({
        where: {
          qcTimestamp: { gte: startDate }
        }
      }),
      
      // Passed count
      prisma.orderQcResult.count({
        where: {
          qcTimestamp: { gte: startDate },
          overallStatus: 'PASSED'
        }
      }),
      
      // Failed count
      prisma.orderQcResult.count({
        where: {
          qcTimestamp: { gte: startDate },
          overallStatus: 'FAILED'
        }
      }),
      
      // Requires review count
      prisma.orderQcResult.count({
        where: {
          qcTimestamp: { gte: startDate },
          overallStatus: 'REQUIRES_REVIEW'
        }
      }),
      
      // In progress count
      prisma.orderQcResult.count({
        where: {
          qcTimestamp: { gte: startDate },
          overallStatus: 'IN_PROGRESS'
        }
      }),
      
      // Recent QC results
      prisma.orderQcResult.findMany({
        where: {
          qcTimestamp: { gte: startDate }
        },
        include: {
          order: {
            select: {
              poNumber: true,
              customerName: true
            }
          },
          qcFormTemplate: {
            select: {
              name: true
            }
          },
          qcPerformedBy: {
            select: {
              fullName: true,
              initials: true
            }
          }
        },
        orderBy: {
          qcTimestamp: 'desc'
        },
        take: 10
      }),
      
      // Template usage statistics
      prisma.qcFormTemplate.findMany({
        where: {
          isActive: true
        },
        include: {
          _count: {
            select: {
              orderQcResults: {
                where: {
                  qcTimestamp: { gte: startDate }
                }
              }
            }
          }
        }
      }),
      
      // Inspector performance statistics
      prisma.user.findMany({
        where: {
          role: { in: ['QC_PERSON', 'ASSEMBLER'] },
          qcResults: {
            some: {
              qcTimestamp: { gte: startDate }
            }
          }
        },
        select: {
          id: true,
          fullName: true,
          initials: true,
          _count: {
            select: {
              qcResults: {
                where: {
                  qcTimestamp: { gte: startDate }
                }
              }
            }
          },
          qcResults: {
            where: {
              qcTimestamp: { gte: startDate }
            },
            select: {
              overallStatus: true
            }
          }
        }
      })
    ]);

    // Calculate pass rate
    const totalCompleted = passedCount + failedCount;
    const passRate = totalCompleted > 0 ? Number((passedCount / totalCompleted * 100).toFixed(1)) : 0;

    // Process inspector stats
    const inspectorStatsSummary = inspectorStats.map(inspector => {
      const passed = inspector.qcResults.filter(r => r.overallStatus === 'PASSED').length;
      const failed = inspector.qcResults.filter(r => r.overallStatus === 'FAILED').length;
      const total = inspector._count.qcResults;
      const inspectorPassRate = (passed + failed) > 0 ? Number((passed / (passed + failed) * 100).toFixed(1)) : 0;

      return {
        id: inspector.id,
        fullName: inspector.fullName,
        initials: inspector.initials,
        totalInspections: total,
        passed,
        failed,
        passRate: inspectorPassRate
      };
    });

    // Calculate daily trend for the last 7 days
    const dailyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayResults = await prisma.orderQcResult.groupBy({
        by: ['overallStatus'],
        where: {
          qcTimestamp: {
            gte: date,
            lt: nextDate
          }
        },
        _count: true
      });

      dailyTrend.push({
        date: date.toISOString().split('T')[0],
        passed: dayResults.find(r => r.overallStatus === 'PASSED')?._count || 0,
        failed: dayResults.find(r => r.overallStatus === 'FAILED')?._count || 0,
        total: dayResults.reduce((sum, r) => sum + r._count, 0)
      });
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalQcResults,
        passedCount,
        failedCount,
        requiresReviewCount,
        inProgressCount,
        passRate,
        periodDays: days,
        recentResults,
        templateUsage: templateUsage.map(t => ({
          id: t.id,
          name: t.name,
          version: t.version,
          usageCount: t._count.orderQcResults
        })),
        inspectorStats: inspectorStatsSummary,
        dailyTrend
      }
    });
  } catch (error) {
    console.error('Error fetching QC summary:', error);
    return NextResponse.json({ error: 'Failed to fetch QC summary' }, { status: 500 });
  }
}