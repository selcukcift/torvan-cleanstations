/**
 * Integration Test: Database Migrations and Schema Validation
 * Tests database migrations, schema integrity, and data validation
 */

import { jest } from '@jest/globals'
import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Use test database
const testDatabaseUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/torvan_test'

describe('Database Migrations and Schema Validation Integration', () => {
  let prisma: PrismaClient
  
  beforeAll(async () => {
    // Set test database URL
    process.env.DATABASE_URL = testDatabaseUrl
    
    // Initialize Prisma with test database
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDatabaseUrl
        }
      }
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Reset database to clean state before each test
    await prisma.$executeRaw`DROP SCHEMA IF EXISTS public CASCADE`
    await prisma.$executeRaw`CREATE SCHEMA public`
  })

  it('should run all migrations successfully from scratch', async () => {
    try {
      // Run migrations
      const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: testDatabaseUrl }
      })
      
      expect(stderr).toBe('')
      expect(stdout).toContain('migrations applied')
      
      // Verify database connection after migration
      const result = await prisma.$queryRaw`SELECT 1 as test`
      expect(result).toEqual([{ test: 1 }])
      
    } catch (error) {
      console.error('Migration failed:', error)
      throw error
    }
  })

  it('should validate all required tables exist after migration', async () => {
    // Run migrations first
    await execAsync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: testDatabaseUrl }
    })

    // Check core tables exist
    const coreTableNames = [
      'User', 'Order', 'Part', 'Assembly', 'AssemblyComponent',
      'QcFormTemplate', 'QcFormTemplateItem', 'OrderQcResult', 'OrderQcItemResult',
      'ServiceOrder', 'ServiceOrderItem', 'Bom', 'BomItem'
    ]

    for (const tableName of coreTableNames) {
      const tableExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        ) as exists
      `
      
      expect((tableExists as any)[0].exists).toBe(true)
    }
  })

  it('should validate enhanced feature tables exist', async () => {
    // Run migrations first
    await execAsync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: testDatabaseUrl }
    })

    // Check enhanced tables exist
    const enhancedTableNames = [
      'WorkInstruction', 'WorkInstructionStep', 'Tool', 'Task', 'TaskDependency',
      'TaskTool', 'TaskNote', 'SystemNotification', 'FileUpload',
      'InventoryItem', 'InventoryTransaction', 'AuditLog'
    ]

    for (const tableName of enhancedTableNames) {
      const tableExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        ) as exists
      `
      
      expect((tableExists as any)[0].exists).toBe(true)
    }
  })

  it('should validate foreign key constraints are properly set', async () => {
    // Run migrations first
    await execAsync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: testDatabaseUrl }
    })

    // Test foreign key constraints
    const foreignKeyTests = [
      {
        name: 'Order -> User (createdBy)',
        setup: async () => {
          // Create user first
          const user = await prisma.user.create({
            data: {
              id: 'user-1',
              username: 'testuser',
              email: 'test@example.com',
              name: 'Test User',
              role: 'ADMIN'
            }
          })
          return user.id
        },
        test: async (userId: string) => {
          // Create order with valid user ID
          const order = await prisma.order.create({
            data: {
              orderNumber: 'ORD-001',
              customerName: 'Test Customer',
              contactEmail: 'customer@test.com',
              poNumber: 'PO-001',
              createdById: userId
            }
          })
          expect(order.createdById).toBe(userId)
        }
      },
      {
        name: 'Task -> Order relationship',
        setup: async () => {
          const user = await prisma.user.create({
            data: {
              id: 'user-2',
              username: 'testuser2',
              email: 'test2@example.com',
              name: 'Test User 2',
              role: 'ADMIN'
            }
          })
          
          const order = await prisma.order.create({
            data: {
              orderNumber: 'ORD-002',
              customerName: 'Test Customer 2',
              contactEmail: 'customer2@test.com',
              poNumber: 'PO-002',
              createdById: user.id
            }
          })
          return order.id
        },
        test: async (orderId: string) => {
          const task = await prisma.task.create({
            data: {
              orderId,
              title: 'Test Task',
              description: 'Test task description',
              status: 'PENDING'
            }
          })
          expect(task.orderId).toBe(orderId)
        }
      },
      {
        name: 'QC Result -> Order and Template relationship',
        setup: async () => {
          const user = await prisma.user.create({
            data: {
              id: 'user-3',
              username: 'qcuser',
              email: 'qc@example.com',
              name: 'QC User',
              role: 'QC_PERSON'
            }
          })
          
          const order = await prisma.order.create({
            data: {
              orderNumber: 'ORD-003',
              customerName: 'Test Customer 3',
              contactEmail: 'customer3@test.com',
              poNumber: 'PO-003',
              createdById: user.id
            }
          })

          const template = await prisma.qcFormTemplate.create({
            data: {
              name: 'Test QC Template',
              description: 'Test template for QC'
            }
          })

          return { orderId: order.id, templateId: template.id, userId: user.id }
        },
        test: async ({ orderId, templateId, userId }: any) => {
          const qcResult = await prisma.orderQcResult.create({
            data: {
              orderId,
              qcFormTemplateId: templateId,
              qcPerformedById: userId,
              overallStatus: 'PENDING'
            }
          })
          expect(qcResult.orderId).toBe(orderId)
          expect(qcResult.qcFormTemplateId).toBe(templateId)
        }
      }
    ]

    for (const fkTest of foreignKeyTests) {
      const setupResult = await fkTest.setup()
      await fkTest.test(setupResult)
    }
  })

  it('should enforce unique constraints properly', async () => {
    // Run migrations first
    await execAsync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: testDatabaseUrl }
    })

    // Test unique constraints
    const user = await prisma.user.create({
      data: {
        id: 'unique-test-user',
        username: 'uniqueuser',
        email: 'unique@example.com',
        name: 'Unique User',
        role: 'ADMIN'
      }
    })

    // Try to create another user with same username - should fail
    await expect(
      prisma.user.create({
        data: {
          id: 'unique-test-user-2',
          username: 'uniqueuser', // Same username
          email: 'different@example.com',
          name: 'Different User',
          role: 'ADMIN'
        }
      })
    ).rejects.toThrow()

    // Try to create another user with same email - should fail
    await expect(
      prisma.user.create({
        data: {
          id: 'unique-test-user-3',
          username: 'differentuser',
          email: 'unique@example.com', // Same email
          name: 'Different User',
          role: 'ADMIN'
        }
      })
    ).rejects.toThrow()
  })

  it('should validate enum constraints are working', async () => {
    // Run migrations first
    await execAsync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: testDatabaseUrl }
    })

    const user = await prisma.user.create({
      data: {
        id: 'enum-test-user',
        username: 'enumuser',
        email: 'enum@example.com',
        name: 'Enum User',
        role: 'ADMIN'
      }
    })

    // Test valid enum values
    const validRoles = ['ADMIN', 'PRODUCTION_COORDINATOR', 'PROCUREMENT_SPECIALIST', 'QC_PERSON', 'ASSEMBLER', 'SERVICE_DEPARTMENT']
    
    for (const role of validRoles) {
      await expect(
        prisma.user.create({
          data: {
            id: `enum-user-${role}`,
            username: `user-${role.toLowerCase()}`,
            email: `${role.toLowerCase()}@example.com`,
            name: `${role} User`,
            role: role as any
          }
        })
      ).resolves.toBeDefined()
    }

    // Test task status enums
    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-ENUM-001',
        customerName: 'Enum Customer',
        contactEmail: 'enumcustomer@test.com',
        poNumber: 'PO-ENUM-001',
        createdById: user.id
      }
    })

    const validTaskStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED']
    
    for (const status of validTaskStatuses) {
      await expect(
        prisma.task.create({
          data: {
            orderId: order.id,
            title: `Task with ${status} status`,
            status: status as any
          }
        })
      ).resolves.toBeDefined()
    }
  })

  it('should validate required field constraints', async () => {
    // Run migrations first
    await execAsync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: testDatabaseUrl }
    })

    // Test missing required fields
    const requiredFieldTests = [
      {
        model: 'User',
        test: () => prisma.user.create({
          data: {
            username: 'incompleteuser',
            // Missing required email field
            name: 'Incomplete User',
            role: 'ADMIN'
          } as any
        })
      },
      {
        model: 'Order',
        test: () => prisma.order.create({
          data: {
            orderNumber: 'ORD-INCOMPLETE',
            // Missing required customerName
            contactEmail: 'incomplete@test.com',
            poNumber: 'PO-INCOMPLETE'
          } as any
        })
      },
      {
        model: 'QcFormTemplate',
        test: () => prisma.qcFormTemplate.create({
          data: {
            // Missing required name field
            description: 'Template without name'
          } as any
        })
      }
    ]

    for (const test of requiredFieldTests) {
      await expect(test.test()).rejects.toThrow()
    }
  })

  it('should validate cascade delete behavior', async () => {
    // Run migrations first
    await execAsync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: testDatabaseUrl }
    })

    // Create test data with relationships
    const user = await prisma.user.create({
      data: {
        id: 'cascade-user',
        username: 'cascadeuser',
        email: 'cascade@example.com',
        name: 'Cascade User',
        role: 'ADMIN'
      }
    })

    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-CASCADE',
        customerName: 'Cascade Customer',
        contactEmail: 'cascade@test.com',
        poNumber: 'PO-CASCADE',
        createdById: user.id
      }
    })

    const task = await prisma.task.create({
      data: {
        orderId: order.id,
        title: 'Cascade Test Task',
        description: 'Task that should be deleted with order'
      }
    })

    // Verify task exists
    const taskExists = await prisma.task.findUnique({
      where: { id: task.id }
    })
    expect(taskExists).toBeDefined()

    // Delete order - should cascade delete task
    await prisma.order.delete({
      where: { id: order.id }
    })

    // Verify task was deleted
    const taskAfterDelete = await prisma.task.findUnique({
      where: { id: task.id }
    })
    expect(taskAfterDelete).toBeNull()
  })

  it('should handle index performance on large datasets', async () => {
    // Run migrations first
    await execAsync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: testDatabaseUrl }
    })

    // Create test user
    const user = await prisma.user.create({
      data: {
        id: 'perf-user',
        username: 'perfuser',
        email: 'perf@example.com',
        name: 'Performance User',
        role: 'ADMIN'
      }
    })

    // Create multiple orders and tasks to test index performance
    const startTime = Date.now()
    
    const orderPromises = Array.from({ length: 100 }, (_, i) => 
      prisma.order.create({
        data: {
          orderNumber: `ORD-PERF-${i.toString().padStart(3, '0')}`,
          customerName: `Customer ${i}`,
          contactEmail: `customer${i}@test.com`,
          poNumber: `PO-PERF-${i}`,
          createdById: user.id,
          status: i % 5 === 0 ? 'IN_PROGRESS' : 'ORDER_CREATED' // Mix of statuses
        }
      })
    )

    const orders = await Promise.all(orderPromises)
    
    // Create tasks for each order
    const taskPromises = orders.flatMap(order => 
      Array.from({ length: 5 }, (_, j) => 
        prisma.task.create({
          data: {
            orderId: order.id,
            title: `Task ${j + 1} for ${order.orderNumber}`,
            status: j % 3 === 0 ? 'COMPLETED' : 'PENDING',
            priority: j % 2 === 0 ? 'HIGH' : 'MEDIUM'
          }
        })
      )
    )

    await Promise.all(taskPromises)
    
    const creationTime = Date.now() - startTime
    expect(creationTime).toBeLessThan(30000) // Should complete within 30 seconds

    // Test indexed queries performance
    const queryStartTime = Date.now()
    
    // Query by order status (should use index)
    const inProgressOrders = await prisma.order.findMany({
      where: { status: 'IN_PROGRESS' }
    })
    
    // Query tasks by status and priority (should use index)
    const highPriorityTasks = await prisma.task.findMany({
      where: {
        status: 'PENDING',
        priority: 'HIGH'
      }
    })
    
    const queryTime = Date.now() - queryStartTime
    
    expect(inProgressOrders.length).toBeGreaterThan(0)
    expect(highPriorityTasks.length).toBeGreaterThan(0)
    expect(queryTime).toBeLessThan(1000) // Should complete within 1 second
  })

  it('should validate database connection pooling and concurrent operations', async () => {
    // Run migrations first
    await execAsync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: testDatabaseUrl }
    })

    // Create base user
    const user = await prisma.user.create({
      data: {
        id: 'concurrent-user',
        username: 'concurrentuser',
        email: 'concurrent@example.com',
        name: 'Concurrent User',
        role: 'ADMIN'
      }
    })

    // Simulate concurrent operations
    const concurrentOperations = Array.from({ length: 20 }, (_, i) => 
      prisma.order.create({
        data: {
          orderNumber: `ORD-CONCURRENT-${i}`,
          customerName: `Concurrent Customer ${i}`,
          contactEmail: `concurrent${i}@test.com`,
          poNumber: `PO-CONCURRENT-${i}`,
          createdById: user.id
        }
      })
    )

    const startTime = Date.now()
    const results = await Promise.all(concurrentOperations)
    const completionTime = Date.now() - startTime

    // All operations should succeed
    expect(results).toHaveLength(20)
    results.forEach((result, index) => {
      expect(result.orderNumber).toBe(`ORD-CONCURRENT-${index}`)
    })

    // Should complete reasonably quickly (connection pooling working)
    expect(completionTime).toBeLessThan(10000) // Within 10 seconds
  })
})