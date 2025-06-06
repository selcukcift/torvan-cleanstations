// DEPRECATED (2025-06-01): This handler is now replaced by Next.js API Routes in app/api/orders/*.ts as per 'Coding Prompt Chains for Torvan Medical Workflow App Expansion (v5 - Hybrid Backend)'.
// This file will be removed in a future version. Do not add new logic here.
// See: resources/Coding Prompt Chains for Torvan Medical Workflow App Expansion (v4 - Next.js, Node.js, Prisma, PostgreSQL).md

const { PrismaClient } = require('@prisma/client');
const { parseJSONBody, sendJSONResponse } = require('../lib/requestUtils');

const prisma = new PrismaClient();

/**
 * Create a new order
 * POST /api/orders
 * Protected: PRODUCTION_COORDINATOR, ADMIN
 */
async function createOrder(req, res) {
  try {
    const orderData = await parseJSONBody(req);
    
    // Validate required fields
    const { 
      poNumber, 
      buildNumbers, 
      customerName, 
      salesPerson, 
      wantDate,
      configurations,
      accessories,
      projectName,
      notes,
      language = 'EN'
    } = orderData;

    if (!poNumber || !buildNumbers || !Array.isArray(buildNumbers) || buildNumbers.length === 0) {
      return sendJSONResponse(res, 400, { 
        error: 'Missing required fields: poNumber, buildNumbers (array)' 
      });
    }

    if (!customerName || !salesPerson || !wantDate) {
      return sendJSONResponse(res, 400, { 
        error: 'Missing required fields: customerName, salesPerson, wantDate' 
      });
    }

    // Validate date format
    const wantDateObj = new Date(wantDate);
    if (isNaN(wantDateObj.getTime())) {
      return sendJSONResponse(res, 400, { 
        error: 'Invalid wantDate format. Use ISO date string.' 
      });
    }

    // Check if future date
    if (wantDateObj <= new Date()) {
      return sendJSONResponse(res, 400, { 
        error: 'wantDate must be in the future.' 
      });
    }

    // Check if PO number already exists
    const existingOrder = await prisma.order.findUnique({
      where: { poNumber }
    });

    if (existingOrder) {
      return sendJSONResponse(res, 409, { 
        error: 'An order with this PO number already exists.' 
      });
    }

    // Validate build numbers are unique
    const uniqueBuildNumbers = [...new Set(buildNumbers)];
    if (uniqueBuildNumbers.length !== buildNumbers.length) {
      return sendJSONResponse(res, 400, { 
        error: 'Build numbers must be unique within the order.' 
      });
    }

    // Create order with related configurations using nested writes
    const order = await prisma.order.create({
      data: {
        poNumber,
        buildNumbers,
        customerName,
        projectName,
        salesPerson,
        wantDate: wantDateObj,
        notes,
        language,
        createdById: req.user.userId,
        
        // Create basin configurations if provided
        basinConfigurations: configurations ? {
          create: Object.entries(configurations).map(([buildNumber, config]) => ({
            buildNumber,
            basinTypeId: config.basins?.[0]?.basinTypeId || '',
            basinSizePartNumber: config.basins?.[0]?.basinSizePartNumber,
            basinCount: config.basins?.length || 1,
            addonIds: config.basins?.[0]?.addonIds || []
          })).filter(config => config.basinTypeId) // Only create if we have basin data
        } : undefined,

        // Create faucet configurations if provided
        faucetConfigurations: configurations ? {
          create: Object.entries(configurations).map(([buildNumber, config]) => ({
            buildNumber,
            faucetTypeId: config.faucetTypeId || '',
            faucetQuantity: config.faucetQuantity || 1,
            faucetPlacement: config.faucetPlacement
          })).filter(config => config.faucetTypeId) // Only create if we have faucet data
        } : undefined,

        // Create sprayer configurations if provided
        sprayerConfigurations: configurations ? {
          create: Object.entries(configurations).map(([buildNumber, config]) => ({
            buildNumber,
            hasSpray: config.sprayer || false,
            sprayerTypeIds: config.sprayerTypeIds || [],
            sprayerQuantity: config.sprayerQuantity || 0,
            sprayerLocations: config.sprayerLocations || []
          }))
        } : undefined,

        // Create selected accessories if provided
        selectedAccessories: accessories ? {
          create: Object.entries(accessories).flatMap(([buildNumber, buildAccessories]) => 
            buildAccessories.map(accessory => ({
              buildNumber,
              assemblyId: accessory.assemblyId,
              quantity: accessory.quantity || 1
            }))
          )
        } : undefined
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            fullName: true,
            role: true
          }
        },
        basinConfigurations: true,
        faucetConfigurations: true,
        sprayerConfigurations: true,
        selectedAccessories: true
      }
    });

    // Create initial history log
    await prisma.orderHistoryLog.create({
      data: {
        orderId: order.id,
        userId: req.user.userId,
        action: 'ORDER_CREATED',
        newStatus: 'ORDER_CREATED',
        notes: 'Order created successfully'
      }
    });

    sendJSONResponse(res, 201, {
      message: 'Order created successfully',
      order
    });

  } catch (error) {
    console.error('Create order error:', error);
    sendJSONResponse(res, 500, { 
      error: 'Internal server error while creating order'
    });
  }
}

/**
 * Get all orders with filtering and pagination
 * GET /api/orders
 * Protected: All authenticated users (with role-based filtering)
 */
async function getOrders(req, res) {
  try {
    const url = require('url');
    const parsedUrl = url.parse(req.url, true);
    const query = parsedUrl.query;

    // Pagination
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build where clause based on user role and filters
    let whereClause = {};

    // Role-based filtering
    switch (req.user.role) {
      case 'ADMIN':
      case 'PRODUCTION_COORDINATOR':
        // Can see all orders
        break;
      case 'PROCUREMENT_SPECIALIST':
        // Can see orders that need procurement attention
        whereClause.orderStatus = {
          in: ['ORDER_CREATED', 'PARTS_SENT_WAITING_ARRIVAL']
        };
        break;
      case 'QC_PERSON':
        // Can see orders that need QC
        whereClause.orderStatus = {
          in: ['READY_FOR_PRE_QC', 'READY_FOR_FINAL_QC']
        };
        break;
      case 'ASSEMBLER':
        // Can see orders ready for production
        whereClause.orderStatus = {
          in: ['READY_FOR_PRODUCTION', 'TESTING_COMPLETE', 'PACKAGING_COMPLETE']
        };
        break;
      default:
        // Default: can only see own orders
        whereClause.createdById = req.user.userId;
        break;
    }

    // Additional filters
    if (query.status) {
      whereClause.orderStatus = query.status;
    }
    if (query.customerName) {
      whereClause.customerName = {
        contains: query.customerName,
        mode: 'insensitive'
      };
    }
    if (query.poNumber) {
      whereClause.poNumber = {
        contains: query.poNumber,
        mode: 'insensitive'
      };
    }

    // Fetch orders with pagination
    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              fullName: true,
              role: true
            }
          },
          _count: {
            select: {
              basinConfigurations: true,
              selectedAccessories: true,
              generatedBoms: true
            }
          }
        }
      }),
      prisma.order.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    sendJSONResponse(res, 200, {
      data: orders,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    sendJSONResponse(res, 500, { 
      error: 'Internal server error while fetching orders'
    });
  }
}

/**
 * Get a specific order by ID
 * GET /api/orders/:orderId
 * Protected: All authenticated users (with role-based access control)
 */
async function getOrderById(req, res, orderId) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            fullName: true,
            role: true,
            initials: true
          }
        },
        basinConfigurations: true,
        faucetConfigurations: true,
        sprayerConfigurations: true,
        selectedAccessories: true,
        associatedDocuments: true,
        generatedBoms: {
          include: {
            bomItems: {
              include: {
                children: true
              }
            }
          }
        },
        historyLogs: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                fullName: true,
                role: true
              }
            }
          },
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!order) {
      return sendJSONResponse(res, 404, { 
        error: 'Order not found' 
      });
    }

    // Role-based access control
    const hasAccess = checkOrderAccess(order, req.user);
    if (!hasAccess) {
      return sendJSONResponse(res, 403, { 
        error: 'Access denied to this order' 
      });
    }

    sendJSONResponse(res, 200, { order });

  } catch (error) {
    console.error('Get order by ID error:', error);
    sendJSONResponse(res, 500, { 
      error: 'Internal server error while fetching order'
    });
  }
}

/**
 * Update order status
 * PUT /api/orders/:orderId/status
 * Protected: Role-based access for status transitions
 */
async function updateOrderStatus(req, res, orderId) {
  try {
    const { newStatus, notes } = await parseJSONBody(req);

    if (!newStatus) {
      return sendJSONResponse(res, 400, { 
        error: 'newStatus is required' 
      });
    }

    // Validate status enum
    const validStatuses = [
      'ORDER_CREATED', 'PARTS_SENT_WAITING_ARRIVAL', 'READY_FOR_PRE_QC',
      'READY_FOR_PRODUCTION', 'TESTING_COMPLETE', 'PACKAGING_COMPLETE',
      'READY_FOR_FINAL_QC', 'READY_FOR_SHIP', 'SHIPPED'
    ];

    if (!validStatuses.includes(newStatus)) {
      return sendJSONResponse(res, 400, { 
        error: 'Invalid status value' 
      });
    }

    // Fetch current order
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return sendJSONResponse(res, 404, { 
        error: 'Order not found' 
      });
    }

    // Role-based status transition validation
    const canUpdateStatus = validateStatusTransition(order.orderStatus, newStatus, req.user.role);
    if (!canUpdateStatus) {
      return sendJSONResponse(res, 403, { 
        error: `You don't have permission to change status from ${order.orderStatus} to ${newStatus}` 
      });
    }

    // Update order status and create history log in a transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update order
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { 
          orderStatus: newStatus,
          updatedAt: new Date()
        },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              fullName: true,
              role: true
            }
          }
        }
      });

      // Create history log
      await tx.orderHistoryLog.create({
        data: {
          orderId,
          userId: req.user.userId,
          action: 'STATUS_UPDATED',
          oldStatus: order.orderStatus,
          newStatus,
          notes
        }
      });

      return updated;
    });

    sendJSONResponse(res, 200, {
      message: 'Order status updated successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Update order status error:', error);
    sendJSONResponse(res, 500, { 
      error: 'Internal server error while updating order status'
    });
  }
}

/**
 * Helper function to check if user has access to an order
 */
function checkOrderAccess(order, user) {
  switch (user.role) {
    case 'ADMIN':
    case 'PRODUCTION_COORDINATOR':
      return true; // Can access all orders
    case 'PROCUREMENT_SPECIALIST':
      return ['ORDER_CREATED', 'PARTS_SENT_WAITING_ARRIVAL'].includes(order.orderStatus);
    case 'QC_PERSON':
      return ['READY_FOR_PRE_QC', 'READY_FOR_FINAL_QC'].includes(order.orderStatus);
    case 'ASSEMBLER':
      return ['READY_FOR_PRODUCTION', 'TESTING_COMPLETE', 'PACKAGING_COMPLETE'].includes(order.orderStatus);
    default:
      return order.createdById === user.userId; // Own orders only
  }
}

/**
 * Helper function to validate status transitions based on user role
 */
function validateStatusTransition(currentStatus, newStatus, userRole) {
  const transitions = {
    'PRODUCTION_COORDINATOR': {
      'ORDER_CREATED': ['PARTS_SENT_WAITING_ARRIVAL', 'READY_FOR_PRE_QC'],
      'READY_FOR_SHIP': ['SHIPPED']
    },
    'PROCUREMENT_SPECIALIST': {
      'ORDER_CREATED': ['PARTS_SENT_WAITING_ARRIVAL'],
      'PARTS_SENT_WAITING_ARRIVAL': ['READY_FOR_PRE_QC']
    },
    'QC_PERSON': {
      'READY_FOR_PRE_QC': ['READY_FOR_PRODUCTION'],
      'READY_FOR_FINAL_QC': ['READY_FOR_SHIP']
    },
    'ASSEMBLER': {
      'READY_FOR_PRODUCTION': ['TESTING_COMPLETE'],
      'TESTING_COMPLETE': ['PACKAGING_COMPLETE'],
      'PACKAGING_COMPLETE': ['READY_FOR_FINAL_QC']
    },
    'ADMIN': {
      // Admin can transition to any status
      'ORDER_CREATED': validStatuses.slice(1),
      'PARTS_SENT_WAITING_ARRIVAL': validStatuses.slice(2),
      'READY_FOR_PRE_QC': validStatuses.slice(3),
      'READY_FOR_PRODUCTION': validStatuses.slice(4),
      'TESTING_COMPLETE': validStatuses.slice(5),
      'PACKAGING_COMPLETE': validStatuses.slice(6),
      'READY_FOR_FINAL_QC': validStatuses.slice(7),
      'READY_FOR_SHIP': validStatuses.slice(8)
    }
  };

  const validStatuses = [
    'ORDER_CREATED', 'PARTS_SENT_WAITING_ARRIVAL', 'READY_FOR_PRE_QC',
    'READY_FOR_PRODUCTION', 'TESTING_COMPLETE', 'PACKAGING_COMPLETE',
    'READY_FOR_FINAL_QC', 'READY_FOR_SHIP', 'SHIPPED'
  ];

  const allowedTransitions = transitions[userRole]?.[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
}

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus
};
