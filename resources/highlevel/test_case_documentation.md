# Test Case Documentation
## Torvan Medical CleanStation Production Workflow Digitalization

**Version:** 1.0  
**Date:** June 2, 2025  
**Document Type:** Test Case Documentation  

---

## 1. Test Strategy Overview

### 1.1 Testing Approach
- **Test-Driven Development (TDD):** Unit tests written before implementation
- **Behavior-Driven Development (BDD):** Integration tests based on user stories
- **End-to-End Testing:** Complete workflow validation
- **Performance Testing:** Load and stress testing
- **Security Testing:** Vulnerability and penetration testing
- **Accessibility Testing:** WCAG 2.1 compliance validation

### 1.2 Test Levels
```
┌─────────────────────────────────────────┐
│             E2E Tests                   │ ← Full workflow testing
├─────────────────────────────────────────┤
│         Integration Tests               │ ← API and component integration
├─────────────────────────────────────────┤
│           Unit Tests                    │ ← Individual function testing
└─────────────────────────────────────────┘
```

### 1.3 Testing Framework Stack
- **Unit Testing:** Jest + React Testing Library
- **Integration Testing:** Jest + Supertest (API testing)
- **E2E Testing:** Playwright
- **Visual Testing:** Percy or Chromatic
- **Performance Testing:** Lighthouse CI + k6
- **Security Testing:** OWASP ZAP + Snyk

### 1.4 Test Environment Strategy
- **Development:** Local testing with mock data
- **Staging:** Full-featured environment with production-like data
- **UAT:** User acceptance testing environment
- **Production:** Smoke tests and monitoring

## 2. Unit Test Cases

### 2.1 Authentication Module

#### Test Suite: User Authentication
```typescript
describe('User Authentication', () => {
  describe('login function', () => {
    test('TC001: Should authenticate valid user credentials', async () => {
      // Arrange
      const validCredentials = {
        username: 'test.coordinator',
        password: 'ValidPass123!'
      };
      
      // Act
      const result = await authenticateUser(validCredentials);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.user.role).toBe('PRODUCTION_COORDINATOR');
      expect(result.token).toBeDefined();
    });

    test('TC002: Should reject invalid credentials', async () => {
      // Arrange
      const invalidCredentials = {
        username: 'test.coordinator',
        password: 'wrongpassword'
      };
      
      // Act
      const result = await authenticateUser(invalidCredentials);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('AUTH_001');
    });

    test('TC003: Should lock account after 5 failed attempts', async () => {
      // Arrange
      const invalidCredentials = {
        username: 'test.coordinator',
        password: 'wrongpassword'
      };
      
      // Act
      for (let i = 0; i < 5; i++) {
        await authenticateUser(invalidCredentials);
      }
      const finalAttempt = await authenticateUser(invalidCredentials);
      
      // Assert
      expect(finalAttempt.error.code).toBe('AUTH_003');
      expect(finalAttempt.error.message).toContain('Account locked');
    });
  });

  describe('authorization function', () => {
    test('TC004: Should authorize user for role-appropriate actions', () => {
      // Arrange
      const user = { role: 'PRODUCTION_COORDINATOR' };
      const action = 'orders:create';
      
      // Act
      const result = checkPermission(user, action);
      
      // Assert
      expect(result).toBe(true);
    });

    test('TC005: Should deny unauthorized actions', () => {
      // Arrange
      const user = { role: 'ASSEMBLER' };
      const action = 'orders:create';
      
      // Act
      const result = checkPermission(user, action);
      
      // Assert
      expect(result).toBe(false);
    });
  });
});
```

### 2.2 Order Management Module

#### Test Suite: Order Creation
```typescript
describe('Order Creation', () => {
  describe('validateOrderInput function', () => {
    test('TC006: Should validate complete order data', () => {
      // Arrange
      const validOrder = {
        customerInfo: {
          poNumber: 'PO-2025-001',
          customerName: 'Test Customer Inc',
          salesPerson: 'John Doe',
          wantDate: '2025-07-01',
          documentLanguage: 'EN'
        },
        sinkSelection: {
          sinkFamily: 'MDRD',
          quantity: 1,
          buildNumbers: ['BUILD-001']
        }
        // ... complete order structure
      };
      
      // Act
      const result = validateOrderInput(validOrder);
      
      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('TC007: Should reject order with missing required fields', () => {
      // Arrange
      const incompleteOrder = {
        customerInfo: {
          poNumber: '', // Missing required field
          customerName: 'Test Customer Inc'
        }
      };
      
      // Act
      const result = validateOrderInput(incompleteOrder);
      
      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('PO Number is required');
    });

    test('TC008: Should validate PO Number uniqueness', async () => {
      // Arrange
      const duplicateOrder = {
        customerInfo: {
          poNumber: 'EXISTING-PO-001'
        }
      };
      
      // Act
      const result = await validatePOUniqueness(duplicateOrder.customerInfo.poNumber);
      
      // Assert
      expect(result.isUnique).toBe(false);
      expect(result.error).toContain('PO Number already exists');
    });
  });

  describe('generateBuildNumber function', () => {
    test('TC009: Should generate unique build numbers', () => {
      // Arrange
      const poNumber = 'PO-2025-001';
      const quantity = 3;
      
      // Act
      const buildNumbers = generateBuildNumbers(poNumber, quantity);
      
      // Assert
      expect(buildNumbers).toHaveLength(3);
      expect(new Set(buildNumbers).size).toBe(3); // All unique
      buildNumbers.forEach(bn => {
        expect(bn).toMatch(/^BUILD-\d{3}$/);
      });
    });
  });
});
```

### 2.3 BOM Generation Module

#### Test Suite: BOM Generation Engine
```typescript
describe('BOM Generation Engine', () => {
  describe('generateBOM function', () => {
    test('TC010: Should generate BOM for basic MDRD configuration', () => {
      // Arrange
      const sinkConfig = {
        sinkModel: 'T2-B2',
        dimensions: { width: 48, length: 60 },
        legsType: 'HEIGHT_ADJUSTABLE',
        legsModel: 'DL27',
        feetType: 'LOCK_LEVELING_CASTERS',
        hasPegboard: false,
        workflowDirection: 'LEFT_TO_RIGHT',
        basins: [
          { type: 'E_SINK', size: '24X20X8', addons: [] },
          { type: 'E_DRAIN', size: '24X20X8', addons: ['BASIN_LIGHT'] }
        ]
      };
      
      // Act
      const bom = generateBOM(sinkConfig);
      
      // Assert
      expect(bom.items).toBeDefined();
      expect(bom.items.length).toBeGreaterThan(0);
      expect(bom.items.some(item => item.itemId.includes('T2-BODY'))).toBe(true);
      expect(bom.items.some(item => item.itemId.includes('DL27'))).toBe(true);
    });

    test('TC011: Should include pegboard components when enabled', () => {
      // Arrange
      const configWithPegboard = {
        sinkModel: 'T2-B1',
        hasPegboard: true,
        pegboardColor: 'GREEN',
        pegboardType: 'PERFORATED',
        pegboardSize: { type: 'SAME_AS_SINK' }
      };
      
      // Act
      const bom = generateBOM(configWithPegboard);
      
      // Assert
      expect(bom.items.some(item => 
        item.itemId.includes('T2-OHL-MDRD-KIT')
      )).toBe(true);
      expect(bom.items.some(item => 
        item.itemId.includes('PB') && item.itemId.includes('GREEN')
      )).toBe(true);
    });

    test('TC012: Should generate custom part numbers for custom sizes', () => {
      // Arrange
      const configWithCustom = {
        basins: [{
          type: 'E_SINK',
          size: 'CUSTOM',
          dimensions: { width: 28, length: 22, depth: 10 }
        }]
      };
      
      // Act
      const bom = generateBOM(configWithCustom);
      
      // Assert
      expect(bom.items.some(item => 
        item.itemId.includes('720.215.001') && 
        item.itemId.includes('28x22x10')
      )).toBe(true);
    });

    test('TC013: Should calculate correct quantities for multiple basins', () => {
      // Arrange
      const configMultiBasin = {
        sinkModel: 'T2-B3',
        basins: [
          { type: 'E_SINK' },
          { type: 'E_SINK' },
          { type: 'E_DRAIN' }
        ]
      };
      
      // Act
      const bom = generateBOM(configMultiBasin);
      
      // Assert
      const drainAssemblies = bom.items.filter(item => 
        item.itemId.includes('DRAIN-ASSEMBLY')
      );
      expect(drainAssemblies[0].quantity).toBe(3);
    });
  });

  describe('BOM validation', () => {
    test('TC014: Should validate BOM completeness', () => {
      // Arrange
      const bom = {
        items: [
          { itemId: 'T2-BODY-48-60', type: 'ASSEMBLY', quantity: 1 },
          { itemId: 'LEGS-DL27', type: 'ASSEMBLY', quantity: 4 }
        ]
      };
      
      // Act
      const validation = validateBOM(bom);
      
      // Assert
      expect(validation.isComplete).toBe(false);
      expect(validation.missingComponents).toContain('Control Box');
    });
  });
});
```

### 2.4 Quality Control Module

#### Test Suite: QC Form Processing
```typescript
describe('QC Form Processing', () => {
  describe('processQCResults function', () => {
    test('TC015: Should process complete Pre-QC results', () => {
      // Arrange
      const qcResults = {
        orderId: 'order-123',
        templateId: 'preqc-mdrd-v1',
        itemResults: [
          { checklistItemId: 'check-001', resultValue: 'true', isNA: false },
          { checklistItemId: 'check-002', resultValue: '48x60', isNA: false }
        ],
        overallStatus: 'PASS',
        performedBy: 'qc-user-001'
      };
      
      // Act
      const result = processQCResults(qcResults);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.digitalSignature).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    test('TC016: Should handle N/A responses correctly', () => {
      // Arrange
      const qcResults = {
        itemResults: [
          { checklistItemId: 'pegboard-check', resultValue: '', isNA: true }
        ]
      };
      
      // Act
      const result = processQCResults(qcResults);
      
      // Assert
      expect(result.itemResults[0].isNA).toBe(true);
      expect(result.itemResults[0].resultValue).toBe('');
    });

    test('TC017: Should generate digital signature', () => {
      // Arrange
      const qcResults = {
        performedBy: 'qc-user-001',
        timestamp: '2025-06-02T10:30:00Z'
      };
      
      // Act
      const signature = generateDigitalSignature(qcResults);
      
      // Assert
      expect(signature).toMatch(/^QC-[A-Z0-9]+$/);
      expect(signature.length).toBeGreaterThan(10);
    });
  });
});
```

## 3. Integration Test Cases

### 3.1 API Integration Tests

#### Test Suite: Order API Integration
```typescript
describe('Order API Integration', () => {
  describe('POST /api/v1/orders', () => {
    test('TC018: Should create order and generate BOM', async () => {
      // Arrange
      const orderData = {
        customerInfo: {
          poNumber: 'API-TEST-001',
          customerName: 'Test Customer',
          salesPerson: 'Test Sales',
          wantDate: '2025-07-01',
          documentLanguage: 'EN'
        },
        sinkSelection: {
          sinkFamily: 'MDRD',
          quantity: 1,
          buildNumbers: ['BUILD-API-001']
        }
        // ... complete order data
      };
      
      // Act
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201);
      
      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.orderId).toBeDefined();
      expect(response.body.data.bomGenerated).toBe(true);
      
      // Verify BOM was created
      const bomResponse = await request(app)
        .get(`/api/v1/orders/${response.body.data.orderId}/bom`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(bomResponse.body.data.items.length).toBeGreaterThan(0);
    });

    test('TC019: Should reject order with invalid data', async () => {
      // Arrange
      const invalidOrderData = {
        customerInfo: {
          poNumber: '', // Invalid: empty
          customerName: 'Test Customer'
        }
      };
      
      // Act & Assert
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidOrderData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VAL_001');
    });

    test('TC020: Should require authentication', async () => {
      // Act & Assert
      await request(app)
        .post('/api/v1/orders')
        .send({})
        .expect(401);
    });
  });

  describe('GET /api/v1/orders', () => {
    test('TC021: Should return paginated orders list', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/orders?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.metadata.pagination).toBeDefined();
      expect(response.body.metadata.pagination.page).toBe(1);
      expect(response.body.metadata.pagination.limit).toBe(10);
    });

    test('TC022: Should filter orders by status', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/orders?status=ORDER_CREATED')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      // Assert
      expect(response.body.data.every(order => 
        order.orderStatus === 'ORDER_CREATED'
      )).toBe(true);
    });
  });

  describe('PUT /api/v1/orders/{orderId}/status', () => {
    test('TC023: Should update order status with proper authorization', async () => {
      // Arrange
      const orderId = 'test-order-001';
      const statusUpdate = {
        status: 'PARTS_SENT',
        notes: 'All parts ordered and sent to supplier'
      };
      
      // Act
      const response = await request(app)
        .put(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${procurementToken}`)
        .send(statusUpdate)
        .expect(200);
      
      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.newStatus).toBe('PARTS_SENT');
    });

    test('TC024: Should reject unauthorized status updates', async () => {
      // Arrange
      const orderId = 'test-order-001';
      const statusUpdate = {
        status: 'PARTS_SENT'
      };
      
      // Act & Assert
      await request(app)
        .put(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${assemblerToken}`) // Wrong role
        .send(statusUpdate)
        .expect(403);
    });
  });
});
```

### 3.2 Database Integration Tests

#### Test Suite: Database Operations
```typescript
describe('Database Integration', () => {
  describe('Order persistence', () => {
    test('TC025: Should save order with all relationships', async () => {
      // Arrange
      const orderData = {
        poNumber: 'DB-TEST-001',
        buildNumber: 'BUILD-DB-001',
        customerName: 'Test Customer',
        basins: [
          { basinIndex: 1, basinType: 'E_SINK' },
          { basinIndex: 2, basinType: 'E_DRAIN' }
        ],
        faucets: [
          { faucetType: 'WRIST_BLADE_SWING_SPOUT', quantity: 2 }
        ]
      };
      
      // Act
      const savedOrder = await createOrder(orderData);
      
      // Assert
      expect(savedOrder.id).toBeDefined();
      
      // Verify relationships
      const retrievedOrder = await getOrderWithDetails(savedOrder.id);
      expect(retrievedOrder.basins).toHaveLength(2);
      expect(retrievedOrder.faucets).toHaveLength(1);
      expect(retrievedOrder.basins[0].basinType).toBe('E_SINK');
    });

    test('TC026: Should enforce foreign key constraints', async () => {
      // Arrange
      const orderWithInvalidUser = {
        poNumber: 'CONSTRAINT-TEST',
        currentAssigneeId: 'non-existent-user-id'
      };
      
      // Act & Assert
      await expect(createOrder(orderWithInvalidUser))
        .rejects.toThrow('Foreign key constraint violation');
    });

    test('TC027: Should maintain audit trail', async () => {
      // Arrange
      const orderId = 'audit-test-order';
      
      // Act
      await updateOrderStatus(orderId, 'PARTS_SENT', 'user-001');
      
      // Assert
      const auditEntries = await getAuditLog('ProductionOrder', orderId);
      expect(auditEntries.length).toBeGreaterThan(0);
      expect(auditEntries[0].action).toBe('UPDATE');
      expect(auditEntries[0].userId).toBe('user-001');
    });
  });

  describe('BOM persistence', () => {
    test('TC028: Should save hierarchical BOM structure', async () => {
      // Arrange
      const bomData = {
        orderId: 'test-order-001',
        items: [
          {
            itemType: 'ASSEMBLY',
            itemId: 'T2-BODY-48-60',
            level: 0,
            quantity: 1,
            children: ['item-1', 'item-2']
          },
          {
            itemType: 'PART',
            itemId: 'BOLT-001',
            level: 1,
            parentItemId: 'parent-item-id',
            quantity: 8
          }
        ]
      };
      
      // Act
      const savedBOM = await saveBOM(bomData);
      
      // Assert
      expect(savedBOM.id).toBeDefined();
      
      // Verify hierarchy
      const retrievedBOM = await getBOMWithHierarchy(savedBOM.id);
      expect(retrievedBOM.items.some(item => item.level === 0)).toBe(true);
      expect(retrievedBOM.items.some(item => item.level === 1)).toBe(true);
    });
  });
});
```

## 4. End-to-End Test Cases

### 4.1 Complete Order Workflow

#### Test Suite: Order Creation to Shipment
```typescript
describe('Complete Order Workflow E2E', () => {
  test('TC029: Complete order lifecycle from creation to shipment', async () => {
    const { page } = await browser.newContext();
    
    // Step 1: Login as Production Coordinator
    await page.goto('/login');
    await page.fill('[data-testid="username"]', 'prod.coordinator');
    await page.fill('[data-testid="password"]', 'TestPass123!');
    await page.click('[data-testid="login-button"]');
    
    // Verify dashboard load
    await expect(page.locator('[data-testid="dashboard-title"]')).toBeVisible();
    
    // Step 2: Create new order
    await page.click('[data-testid="create-order-button"]');
    
    // Step 2a: Customer Information
    await page.fill('[data-testid="po-number"]', 'E2E-TEST-001');
    await page.fill('[data-testid="customer-name"]', 'E2E Test Customer');
    await page.fill('[data-testid="sales-person"]', 'Test Sales Rep');
    await page.fill('[data-testid="want-date"]', '2025-08-01');
    await page.selectOption('[data-testid="document-language"]', 'EN');
    await page.click('[data-testid="next-button"]');
    
    // Step 2b: Sink Selection
    await page.selectOption('[data-testid="sink-family"]', 'MDRD');
    await page.fill('[data-testid="quantity"]', '1');
    await page.fill('[data-testid="build-number-0"]', 'E2E-BUILD-001');
    await page.click('[data-testid="next-button"]');
    
    // Step 2c: Sink Configuration
    await page.selectOption('[data-testid="sink-model"]', 'T2-B2');
    await page.fill('[data-testid="sink-width"]', '48');
    await page.fill('[data-testid="sink-length"]', '60');
    await page.selectOption('[data-testid="legs-type"]', 'HEIGHT_ADJUSTABLE');
    await page.selectOption('[data-testid="legs-model"]', 'DL27');
    await page.selectOption('[data-testid="feet-type"]', 'LOCK_LEVELING_CASTERS');
    
    // Configure basins
    await page.selectOption('[data-testid="basin-0-type"]', 'E_SINK');
    await page.selectOption('[data-testid="basin-1-type"]', 'E_DRAIN');
    
    await page.click('[data-testid="next-button"]');
    
    // Step 2d: Accessories (skip)
    await page.click('[data-testid="next-button"]');
    
    // Step 2e: Review and Submit
    await expect(page.locator('[data-testid="order-summary"]')).toBeVisible();
    await page.click('[data-testid="submit-order"]');
    
    // Verify order creation
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    const orderNumber = await page.textContent('[data-testid="order-number"]');
    expect(orderNumber).toContain('E2E-TEST-001');
    
    // Step 3: Procurement Review (login as procurement specialist)
    await page.goto('/logout');
    await page.goto('/login');
    await page.fill('[data-testid="username"]', 'procurement.specialist');
    await page.fill('[data-testid="password"]', 'TestPass123!');
    await page.click('[data-testid="login-button"]');
    
    // Find the order in procurement queue
    await expect(page.locator(`[data-testid="order-${orderNumber}"]`)).toBeVisible();
    await page.click(`[data-testid="order-${orderNumber}"]`);
    
    // Review and approve BOM
    await expect(page.locator('[data-testid="bom-items"]')).toBeVisible();
    await page.click('[data-testid="approve-bom"]');
    await page.selectOption('[data-testid="status-update"]', 'PARTS_SENT');
    await page.fill('[data-testid="status-notes"]', 'Parts ordered and sent');
    await page.click('[data-testid="update-status"]');
    
    // Step 4: QC Pre-Production (login as QC person)
    await page.goto('/logout');
    await page.goto('/login');
    await page.fill('[data-testid="username"]', 'qc.person');
    await page.fill('[data-testid="password"]', 'TestPass123!');
    await page.click('[data-testid="login-button"]');
    
    // Simulate parts arrival and start Pre-QC
    await page.click(`[data-testid="order-${orderNumber}"]`);
    await page.selectOption('[data-testid="status-update"]', 'READY_FOR_PRE_QC');
    await page.click('[data-testid="update-status"]');
    
    // Perform Pre-QC checks
    await page.click('[data-testid="start-preqc"]');
    await page.check('[data-testid="preqc-check-1"]'); // Dimensions check
    await page.check('[data-testid="preqc-check-2"]'); // Drawing verification
    await page.check('[data-testid="preqc-check-3"]'); // Hole locations
    await page.selectOption('[data-testid="overall-status"]', 'PASS');
    await page.click('[data-testid="submit-preqc"]');
    
    // Step 5: Assembly (login as assembler)
    await page.goto('/logout');
    await page.goto('/login');
    await page.fill('[data-testid="username"]', 'assembler');
    await page.fill('[data-testid="password"]', 'TestPass123!');
    await page.click('[data-testid="login-button"]');
    
    // Assign order to self
    await page.click(`[data-testid="assign-order-${orderNumber}"]`);
    
    // Complete assembly tasks
    const taskCount = await page.locator('[data-testid^="task-"]').count();
    for (let i = 0; i < taskCount; i++) {
      await page.check(`[data-testid="task-${i}-complete"]`);
      await page.fill(`[data-testid="task-${i}-notes"]`, `Task ${i} completed`);
    }
    
    // Perform testing
    await page.click('[data-testid="start-testing"]');
    await page.selectOption('[data-testid="touchscreen-test"]', 'PASS');
    await page.selectOption('[data-testid="drain-test"]', 'PASS');
    await page.click('[data-testid="submit-testing"]');
    
    // Complete packaging
    await page.click('[data-testid="start-packaging"]');
    const packagingItems = await page.locator('[data-testid^="packaging-item-"]').count();
    for (let i = 0; i < packagingItems; i++) {
      await page.check(`[data-testid="packaging-item-${i}"]`);
    }
    await page.click('[data-testid="complete-packaging"]');
    
    // Step 6: Final QC
    await page.goto('/logout');
    await page.goto('/login');
    await page.fill('[data-testid="username"]', 'qc.person');
    await page.fill('[data-testid="password"]', 'TestPass123!');
    await page.click('[data-testid="login-button"]');
    
    // Perform Final QC
    await page.click(`[data-testid="order-${orderNumber}"]`);
    await page.click('[data-testid="start-final-qc"]');
    
    // Complete all final QC checks
    await page.check('[data-testid="final-qc-cleanliness"]');
    await page.check('[data-testid="final-qc-components"]');
    await page.check('[data-testid="final-qc-labeling"]');
    await page.check('[data-testid="final-qc-packaging"]');
    await page.selectOption('[data-testid="final-overall-status"]', 'PASS');
    await page.click('[data-testid="submit-final-qc"]');
    
    // Step 7: Mark as shipped (Production Coordinator)
    await page.goto('/logout');
    await page.goto('/login');
    await page.fill('[data-testid="username"]', 'prod.coordinator');
    await page.fill('[data-testid="password"]', 'TestPass123!');
    await page.click('[data-testid="login-button"]');
    
    await page.click(`[data-testid="order-${orderNumber}"]`);
    await page.selectOption('[data-testid="status-update"]', 'SHIPPED');
    await page.fill('[data-testid="tracking-number"]', 'TRACK123456');
    await page.click('[data-testid="update-status"]');
    
    // Verify final status
    await expect(page.locator('[data-testid="order-status"]')).toHaveText('SHIPPED');
    
    await page.close();
  }, 300000); // 5 minute timeout for complete workflow
});
```

### 4.2 Service Department Workflow

#### Test Suite: Service Parts Ordering
```typescript
describe('Service Parts Ordering E2E', () => {
  test('TC030: Complete service parts order workflow', async () => {
    const { page } = await browser.newContext();
    
    // Login as Service Department user
    await page.goto('/login');
    await page.fill('[data-testid="username"]', 'service.user');
    await page.fill('[data-testid="password"]', 'TestPass123!');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to service parts
    await page.click('[data-testid="service-parts-menu"]');
    
    // Browse and search parts
    await page.fill('[data-testid="parts-search"]', 'gasket');
    await page.click('[data-testid="search-button"]');
    
    // Add parts to cart
    await page.click('[data-testid="add-to-cart-gasket-001"]');
    await page.fill('[data-testid="quantity-gasket-001"]', '5');
    
    await page.fill('[data-testid="parts-search"]', 'sensor');
    await page.click('[data-testid="search-button"]');
    await page.click('[data-testid="add-to-cart-sensor-002"]');
    await page.fill('[data-testid="quantity-sensor-002"]', '2');
    
    // Review cart
    await page.click('[data-testid="view-cart"]');
    await expect(page.locator('[data-testid="cart-item-gasket-001"]')).toBeVisible();
    await expect(page.locator('[data-testid="cart-item-sensor-002"]')).toBeVisible();
    
    // Submit order
    await page.fill('[data-testid="service-order-notes"]', 'Emergency repair parts needed');
    await page.click('[data-testid="submit-service-order"]');
    
    // Verify confirmation
    await expect(page.locator('[data-testid="service-order-confirmation"]')).toBeVisible();
    const serviceOrderNumber = await page.textContent('[data-testid="service-order-number"]');
    
    // Switch to Procurement Specialist to process request
    await page.goto('/logout');
    await page.goto('/login');
    await page.fill('[data-testid="username"]', 'procurement.specialist');
    await page.fill('[data-testid="password"]', 'TestPass123!');
    await page.click('[data-testid="login-button"]');
    
    // Process service order
    await page.click('[data-testid="service-orders-queue"]');
    await page.click(`[data-testid="service-order-${serviceOrderNumber}"]`);
    
    // Review and approve
    await expect(page.locator('[data-testid="service-order-details"]')).toBeVisible();
    await page.click('[data-testid="approve-service-order"]');
    await page.fill('[data-testid="processing-notes"]', 'Parts available, processing shipment');
    await page.click('[data-testid="update-service-status"]');
    
    await page.close();
  });
});
```

## 5. Performance Test Cases

### 5.1 Load Testing

#### Test Suite: API Performance
```javascript
// k6 load testing script
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'], // Error rate under 10%
  },
};

export default function() {
  // TC031: Login performance
  let loginResponse = http.post('http://localhost:3000/api/v1/auth/login', {
    username: 'testuser',
    password: 'testpass'
  });
  
  check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  let token = loginResponse.json('data.token');
  
  // TC032: Orders list performance
  let ordersResponse = http.get('http://localhost:3000/api/v1/orders', {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  check(ordersResponse, {
    'orders status is 200': (r) => r.status === 200,
    'orders response time < 300ms': (r) => r.timings.duration < 300,
    'orders returns data': (r) => r.json('data').length > 0,
  });
  
  // TC033: BOM generation performance
  let bomResponse = http.get(`http://localhost:3000/api/v1/orders/${orderId}/bom`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  check(bomResponse, {
    'BOM status is 200': (r) => r.status === 200,
    'BOM response time < 1000ms': (r) => r.timings.duration < 1000,
    'BOM contains items': (r) => r.json('data.items').length > 0,
  });
  
  sleep(1);
}
```

### 5.2 Frontend Performance

#### Test Suite: Core Web Vitals
```typescript
describe('Frontend Performance', () => {
  test('TC034: Page load performance', async () => {
    const { page } = await browser.newContext();
    
    // Start performance measurement
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    
    // Measure Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals = {};
          
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime;
            }
            if (entry.name === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime;
            }
          });
          
          resolve(vitals);
        }).observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
      });
    });
    
    // Assert performance thresholds
    expect(metrics.fcp).toBeLessThan(1800); // FCP < 1.8s
    expect(metrics.lcp).toBeLessThan(2500); // LCP < 2.5s
    
    await page.close();
  });

  test('TC035: Order creation form performance', async () => {
    const { page } = await browser.newContext();
    
    await page.goto('/orders/create');
    
    // Measure form interaction performance
    const startTime = Date.now();
    
    // Fill form rapidly
    await page.fill('[data-testid="po-number"]', 'PERF-TEST-001');
    await page.fill('[data-testid="customer-name"]', 'Performance Test');
    await page.selectOption('[data-testid="sink-family"]', 'MDRD');
    
    const formResponseTime = Date.now() - startTime;
    
    // Form should be responsive
    expect(formResponseTime).toBeLessThan(100);
    
    await page.close();
  });
});
```

## 6. Security Test Cases

### 6.1 Authentication Security

#### Test Suite: Authentication Vulnerabilities
```typescript
describe('Authentication Security', () => {
  test('TC036: SQL injection in login', async () => {
    const maliciousPayload = {
      username: "admin'; DROP TABLE User; --",
      password: 'password'
    };
    
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send(maliciousPayload)
      .expect(400);
    
    expect(response.body.error.code).toBe('VAL_001');
    
    // Verify table still exists
    const userCount = await User.count();
    expect(userCount).toBeGreaterThan(0);
  });

  test('TC037: Password brute force protection', async () => {
    const username = 'test.user';
    
    // Attempt 6 failed logins
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ username, password: 'wrongpassword' });
    }
    
    // 7th attempt should be blocked
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ username, password: 'correctpassword' })
      .expect(429);
    
    expect(response.body.error.message).toContain('Account locked');
  });

  test('TC038: JWT token validation', async () => {
    const invalidToken = 'invalid.jwt.token';
    
    const response = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${invalidToken}`)
      .expect(401);
    
    expect(response.body.error.code).toBe('AUTH_001');
  });
});
```

### 6.2 Authorization Security

#### Test Suite: Role-Based Access Control
```typescript
describe('Authorization Security', () => {
  test('TC039: Assembler cannot create orders', async () => {
    const assemblerToken = await getAuthToken('assembler');
    
    const orderData = {
      customerInfo: {
        poNumber: 'UNAUTHORIZED-001',
        customerName: 'Test Customer'
      }
    };
    
    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${assemblerToken}`)
      .send(orderData)
      .expect(403);
    
    expect(response.body.error.code).toBe('AUTH_002');
  });

  test('TC040: Service department cannot access procurement data', async () => {
    const serviceToken = await getAuthToken('service.user');
    
    const response = await request(app)
      .get('/api/v1/orders/order-123/bom')
      .set('Authorization', `Bearer ${serviceToken}`)
      .expect(403);
    
    expect(response.body.error.code).toBe('AUTH_002');
  });
});
```

### 6.3 Input Validation Security

#### Test Suite: Input Sanitization
```typescript
describe('Input Validation Security', () => {
  test('TC041: XSS prevention in order notes', async () => {
    const xssPayload = '<script>alert("XSS")</script>';
    
    const orderData = {
      customerInfo: {
        poNumber: 'XSS-TEST-001',
        customerName: 'Test Customer',
        notes: xssPayload
      }
    };
    
    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send(orderData)
      .expect(201);
    
    // Verify XSS payload is sanitized
    const savedOrder = await Order.findById(response.body.data.orderId);
    expect(savedOrder.notes).not.toContain('<script>');
    expect(savedOrder.notes).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
  });

  test('TC042: File upload validation', async () => {
    const maliciousFile = Buffer.from('<?php phpinfo(); ?>');
    
    const response = await request(app)
      .post('/api/v1/files/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', maliciousFile, 'malicious.php')
      .field('orderId', 'test-order-001')
      .expect(400);
    
    expect(response.body.error.message).toContain('Invalid file type');
  });
});
```

## 7. Accessibility Test Cases

### 7.1 WCAG 2.1 Compliance

#### Test Suite: Accessibility Standards
```typescript
describe('Accessibility Compliance', () => {
  test('TC043: Keyboard navigation', async () => {
    const { page } = await browser.newContext();
    
    await page.goto('/orders/create');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    let focusedElement = await page.evaluate(() => document.activeElement.getAttribute('data-testid'));
    expect(focusedElement).toBe('po-number');
    
    await page.keyboard.press('Tab');
    focusedElement = await page.evaluate(() => document.activeElement.getAttribute('data-testid'));
    expect(focusedElement).toBe('customer-name');
    
    // Test form submission with Enter key
    await page.fill('[data-testid="po-number"]', 'KEYBOARD-TEST');
    await page.keyboard.press('Enter');
    
    // Should not submit incomplete form
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    
    await page.close();
  });

  test('TC044: Screen reader compatibility', async () => {
    const { page } = await browser.newContext();
    
    await page.goto('/dashboard');
    
    // Check for proper ARIA labels
    const createOrderButton = page.locator('[data-testid="create-order-button"]');
    const ariaLabel = await createOrderButton.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    
    // Check for proper heading structure
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);
    
    // Verify main landmark
    const main = page.locator('main');
    await expect(main).toBeVisible();
    
    await page.close();
  });

  test('TC045: Color contrast compliance', async () => {
    const { page } = await browser.newContext();
    
    await page.goto('/dashboard');
    
    // Use axe-core for automated accessibility testing
    await page.addScriptTag({ path: './node_modules/axe-core/axe.min.js' });
    
    const results = await page.evaluate(() => {
      return new Promise((resolve) => {
        axe.run({
          rules: {
            'color-contrast': { enabled: true }
          }
        }, (err, results) => {
          resolve(results);
        });
      });
    });
    
    expect(results.violations.length).toBe(0);
    
    await page.close();
  });
});
```

## 8. Test Data Management

### 8.1 Test Data Setup

#### Test Data Factory
```typescript
export class TestDataFactory {
  static createValidOrder(overrides = {}) {
    return {
      customerInfo: {
        poNumber: `TEST-${Date.now()}`,
        customerName: 'Test Customer Inc',
        projectName: 'Test Project',
        salesPerson: 'Test Sales Rep',
        wantDate: '2025-07-01',
        documentLanguage: 'EN',
        notes: 'Test order notes'
      },
      sinkSelection: {
        sinkFamily: 'MDRD',
        quantity: 1,
        buildNumbers: [`BUILD-${Date.now()}`]
      },
      sinkConfigurations: [{
        buildNumber: `BUILD-${Date.now()}`,
        sinkBody: {
          sinkModel: 'T2-B2',
          dimensions: { width: 48, length: 60 },
          legsType: 'HEIGHT_ADJUSTABLE',
          legsModel: 'DL27',
          feetType: 'LOCK_LEVELING_CASTERS',
          pegboard: { enabled: false },
          workflowDirection: 'LEFT_TO_RIGHT'
        },
        basinConfigurations: [
          {
            basinIndex: 1,
            basinType: 'E_SINK',
            basinSize: { type: 'STANDARD', dimensions: { width: 24, length: 20, depth: 8 } },
            addons: []
          },
          {
            basinIndex: 2,
            basinType: 'E_DRAIN',
            basinSize: { type: 'STANDARD', dimensions: { width: 24, length: 20, depth: 8 } },
            addons: ['BASIN_LIGHT']
          }
        ]
      }],
      accessories: [],
      ...overrides
    };
  }

  static createTestUser(role = 'PRODUCTION_COORDINATOR') {
    return {
      username: `test.${role.toLowerCase()}.${Date.now()}`,
      fullName: `Test ${role.replace('_', ' ')} User`,
      role,
      initials: 'TU',
      isActive: true
    };
  }

  static createQCTemplate(type = 'PRE_QC') {
    return {
      formName: `Test ${type} Form`,
      formType: type,
      version: 1,
      checklistItems: [
        {
          section: 'Test Section 1',
          itemDescription: 'Test check item 1',
          checkType: 'BOOLEAN',
          isBasinSpecific: false,
          isRequired: true,
          sequenceOrder: 1
        },
        {
          section: 'Test Section 1',
          itemDescription: 'Test measurement item',
          checkType: 'MEASUREMENT',
          isBasinSpecific: true,
          isRequired: true,
          sequenceOrder: 2
        }
      ]
    };
  }
}
```

### 8.2 Database Seeding

#### Test Database Setup
```typescript
export class TestDatabaseSetup {
  static async seedTestData() {
    // Create test users
    const users = await Promise.all([
      User.create(TestDataFactory.createTestUser('ADMIN')),
      User.create(TestDataFactory.createTestUser('PRODUCTION_COORDINATOR')),
      User.create(TestDataFactory.createTestUser('PROCUREMENT_SPECIALIST')),
      User.create(TestDataFactory.createTestUser('QC_PERSON')),
      User.create(TestDataFactory.createTestUser('ASSEMBLER')),
      User.create(TestDataFactory.createTestUser('SERVICE_DEPARTMENT'))
    ]);
    
    // Create test parts
    const parts = await Promise.all([
      Part.create({ id: 'TEST-PART-001', name: 'Test Component 1', type: 'COMPONENT' }),
      Part.create({ id: 'TEST-PART-002', name: 'Test Material 1', type: 'MATERIAL' })
    ]);
    
    // Create test assemblies
    const assemblies = await Promise.all([
      Assembly.create({
        id: 'TEST-ASSEMBLY-001',
        name: 'Test Assembly 1',
        type: 'SIMPLE',
        categoryCode: 'TEST',
        canOrder: true
      })
    ]);
    
    // Create QC templates
    const qcTemplates = await Promise.all([
      QCFormTemplate.create(TestDataFactory.createQCTemplate('PRE_QC')),
      QCFormTemplate.create(TestDataFactory.createQCTemplate('FINAL_QC'))
    ]);
    
    return { users, parts, assemblies, qcTemplates };
  }
  
  static async cleanupTestData() {
    // Clean up in reverse dependency order
    await QCResult.deleteMany({ orderId: { $regex: /^TEST-/ } });
    await ProductionOrder.deleteMany({ poNumber: { $regex: /^TEST-/ } });
    await QCFormTemplate.deleteMany({ formName: { $regex: /^Test / } });
    await Assembly.deleteMany({ id: { $regex: /^TEST-/ } });
    await Part.deleteMany({ id: { $regex: /^TEST-/ } });
    await User.deleteMany({ username: { $regex: /^test\./ } });
  }
}
```

## 9. Test Execution Strategy

### 9.1 Continuous Integration Pipeline

#### GitHub Actions Test Workflow
```yaml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:testpass@localhost:5432/testdb

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  performance-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: grafana/k6-action@v0.3.0
        with:
          filename: tests/performance/load-test.js
```

### 9.2 Test Coverage Requirements

#### Coverage Thresholds
```json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      },
      "./src/lib/": {
        "branches": 90,
        "functions": 90,
        "lines": 90,
        "statements": 90
      }
    }
  }
}
```

---

*This comprehensive test case documentation ensures thorough validation of the Torvan Medical CleanStation Production Workflow system across all functional and non-functional requirements. Regular execution of these tests will maintain system quality and reliability throughout the development lifecycle.*