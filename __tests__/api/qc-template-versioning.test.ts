<<<<<<< HEAD
import { NextRequest } from 'next/server';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { GET as getTemplates, POST as createTemplate } from '@/app/api/admin/qc-templates/route';
import { GET as getTemplate, PUT as updateTemplate, DELETE as deleteTemplate } from '@/app/api/admin/qc-templates/[templateId]/route';
import { POST as cloneTemplate } from '@/app/api/admin/qc-templates/[templateId]/clone/route';
import { GET as getVersions } from '@/app/api/admin/qc-templates/[templateId]/versions/route';
import { GET as getUsage } from '@/app/api/admin/qc-templates/[templateId]/usage/route';

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    qcFormTemplate: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    orderQcResult: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn()
    },
    qcFormTemplateItem: {
      delete: jest.fn(),
      update: jest.fn(),
      create: jest.fn()
    },
    $transaction: jest.fn()
  }))
}));

// Mock auth
jest.mock('@/lib/auth', () => ({
  getAuthUser: jest.fn(() => Promise.resolve({ id: '1', role: 'ADMIN' })),
  checkUserRole: jest.fn(() => true)
}));

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

describe('QC Template Versioning System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Template Updates with Versioning', () => {
    it('should create a new version when updating a used template', async () => {
      // Mock template that has been used
      const existingTemplate = {
        id: 'template-1',
        name: 'T2 Sink Quality Control',
        version: '1.0',
        description: 'QC checklist for T2 sinks',
        appliesToProductFamily: 'MDRD_T2_SINK',
        isActive: true,
        items: [
          {
            id: 'item-1',
            section: 'Visual Inspection',
            checklistItem: 'Check for scratches',
            itemType: 'PASS_FAIL',
            order: 1,
            isRequired: true
          }
        ]
      };

      (prisma.orderQcResult.count as jest.Mock).mockResolvedValue(5);
      (prisma.qcFormTemplate.findUnique as jest.Mock).mockResolvedValue(existingTemplate);
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const tx = {
          qcFormTemplate: {
            update: jest.fn().mockResolvedValue({ ...existingTemplate, isActive: false }),
            create: jest.fn().mockResolvedValue({
              ...existingTemplate,
              id: 'template-2',
              version: '1.1',
              items: existingTemplate.items
            })
          }
        };
        return fn(tx);
      });

      const request = new NextRequest('http://localhost:3005/api/admin/qc-templates/template-1', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'T2 Sink Quality Control - Updated',
          items: existingTemplate.items
        })
      });

      const response = await updateTemplate(request, { params: Promise.resolve({ templateId: 'template-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.template.version).toBe('1.1');
      expect(data.message).toContain('A new version (1.1) has been created');
    });

    it('should update directly when template has not been used', async () => {
      const existingTemplate = {
        id: 'template-1',
        name: 'T2 Sink Quality Control',
        version: '1.0',
        isActive: true
      };

      (prisma.orderQcResult.count as jest.Mock).mockResolvedValue(0);
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const tx = {
          qcFormTemplate: {
            update: jest.fn().mockResolvedValue({
              ...existingTemplate,
              name: 'T2 Sink Quality Control - Updated'
            }),
            findUnique: jest.fn().mockResolvedValue({
              ...existingTemplate,
              name: 'T2 Sink Quality Control - Updated',
              items: []
            })
          }
        };
        return fn(tx);
      });

      const request = new NextRequest('http://localhost:3005/api/admin/qc-templates/template-1', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'T2 Sink Quality Control - Updated'
        })
      });

      const response = await updateTemplate(request, { params: Promise.resolve({ templateId: 'template-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.template.name).toBe('T2 Sink Quality Control - Updated');
      expect(data.message).toBeUndefined();
    });
  });

  describe('Template Cloning', () => {
    it('should successfully clone a template', async () => {
      const sourceTemplate = {
        id: 'template-1',
        name: 'T2 Sink Quality Control',
        version: '1.0',
        description: 'QC checklist for T2 sinks',
        appliesToProductFamily: 'MDRD_T2_SINK',
        items: [
          {
            section: 'Visual Inspection',
            checklistItem: 'Check for scratches',
            itemType: 'PASS_FAIL',
            order: 1,
            isRequired: true
          }
        ]
      };

      (prisma.qcFormTemplate.findUnique as jest.Mock).mockResolvedValue(sourceTemplate);
      (prisma.qcFormTemplate.create as jest.Mock).mockResolvedValue({
        id: 'template-2',
        name: 'T2 Sink Quality Control - Copy',
        version: '1.0',
        description: sourceTemplate.description,
        appliesToProductFamily: sourceTemplate.appliesToProductFamily,
        isActive: true,
        items: sourceTemplate.items
      });

      const request = new NextRequest('http://localhost:3005/api/admin/qc-templates/template-1/clone', {
        method: 'POST',
        body: JSON.stringify({
          name: 'T2 Sink Quality Control - Copy',
          version: '1.0'
        })
      });

      const response = await cloneTemplate(request, { params: Promise.resolve({ templateId: 'template-1' }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.template.name).toBe('T2 Sink Quality Control - Copy');
      expect(data.message).toContain('Template cloned successfully');
    });
  });

  describe('Template Version History', () => {
    it('should return all versions of a template', async () => {
      const currentTemplate = {
        name: 'T2 Sink Quality Control',
        appliesToProductFamily: 'MDRD_T2_SINK'
      };

      const versions = [
        {
          id: 'template-3',
          name: 'T2 Sink Quality Control',
          version: '1.2',
          isActive: true,
          createdAt: new Date('2024-03-01'),
          _count: { orderQcResults: 0, items: 10 }
        },
        {
          id: 'template-2',
          name: 'T2 Sink Quality Control',
          version: '1.1',
          isActive: false,
          createdAt: new Date('2024-02-01'),
          _count: { orderQcResults: 5, items: 9 }
        },
        {
          id: 'template-1',
          name: 'T2 Sink Quality Control',
          version: '1.0',
          isActive: false,
          createdAt: new Date('2024-01-01'),
          _count: { orderQcResults: 10, items: 8 }
        }
      ];

      (prisma.qcFormTemplate.findUnique as jest.Mock).mockResolvedValue(currentTemplate);
      (prisma.qcFormTemplate.findMany as jest.Mock).mockResolvedValue(versions);

      const request = new NextRequest('http://localhost:3005/api/admin/qc-templates/template-3/versions');
      const response = await getVersions(request, { params: Promise.resolve({ templateId: 'template-3' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.versions).toHaveLength(3);
      expect(data.versions[0].version).toBe('1.2');
      expect(data.templateName).toBe('T2 Sink Quality Control');
    });
  });

  describe('Template Usage Check', () => {
    it('should return usage statistics for a template', async () => {
      const template = {
        id: 'template-1',
        name: 'T2 Sink Quality Control',
        version: '1.0',
        isActive: true
      };

      const usageResults = [
        {
          id: 'result-1',
          qcTimestamp: new Date(),
          overallStatus: 'PASSED',
          order: {
            id: 'order-1',
            poNumber: 'PO-001',
            customerName: 'Test Customer',
            orderStatus: 'READY_FOR_SHIP'
          },
          qcPerformedBy: {
            id: 'user-1',
            fullName: 'QC Person',
            username: 'qcperson'
          }
        }
      ];

      (prisma.qcFormTemplate.findUnique as jest.Mock).mockResolvedValue(template);
      (prisma.orderQcResult.findMany as jest.Mock).mockResolvedValue(usageResults);
      (prisma.orderQcResult.count as jest.Mock).mockResolvedValue(5);
      (prisma.orderQcResult.groupBy as jest.Mock).mockResolvedValue([
        { overallStatus: 'PASSED', _count: { id: 4 } },
        { overallStatus: 'FAILED', _count: { id: 1 } }
      ]);

      const request = new NextRequest('http://localhost:3005/api/admin/qc-templates/template-1/usage');
      const response = await getUsage(request, { params: Promise.resolve({ templateId: 'template-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.usage.total).toBe(5);
      expect(data.canModify).toBe(false);
      expect(data.message).toContain('This template has been used 5 times');
      expect(data.usage.statusBreakdown.PASSED).toBe(4);
      expect(data.usage.statusBreakdown.FAILED).toBe(1);
    });
  });

  describe('Template Deletion Protection', () => {
    it('should prevent deletion of used templates', async () => {
      (prisma.orderQcResult.count as jest.Mock).mockResolvedValue(3);

      const request = new NextRequest('http://localhost:3005/api/admin/qc-templates/template-1', {
        method: 'DELETE'
      });

      const response = await deleteTemplate(request, { params: Promise.resolve({ templateId: 'template-1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Cannot delete template that has been used');
      expect(data.usageCount).toBe(3);
    });

    it('should allow deletion of unused templates', async () => {
      (prisma.orderQcResult.count as jest.Mock).mockResolvedValue(0);
      (prisma.qcFormTemplate.delete as jest.Mock).mockResolvedValue({ id: 'template-1' });

      const request = new NextRequest('http://localhost:3005/api/admin/qc-templates/template-1', {
        method: 'DELETE'
      });

      const response = await deleteTemplate(request, { params: Promise.resolve({ templateId: 'template-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Template deleted successfully');
    });
  });
=======
import { NextRequest } from 'next/server';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { GET as getTemplates, POST as createTemplate } from '@/app/api/admin/qc-templates/route';
import { GET as getTemplate, PUT as updateTemplate, DELETE as deleteTemplate } from '@/app/api/admin/qc-templates/[templateId]/route';
import { POST as cloneTemplate } from '@/app/api/admin/qc-templates/[templateId]/clone/route';
import { GET as getVersions } from '@/app/api/admin/qc-templates/[templateId]/versions/route';
import { GET as getUsage } from '@/app/api/admin/qc-templates/[templateId]/usage/route';

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    qcFormTemplate: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    orderQcResult: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn()
    },
    qcFormTemplateItem: {
      delete: jest.fn(),
      update: jest.fn(),
      create: jest.fn()
    },
    $transaction: jest.fn()
  }))
}));

// Mock auth
jest.mock('@/lib/auth', () => ({
  getAuthUser: jest.fn(() => Promise.resolve({ id: '1', role: 'ADMIN' })),
  checkUserRole: jest.fn(() => true)
}));

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

describe('QC Template Versioning System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Template Updates with Versioning', () => {
    it('should create a new version when updating a used template', async () => {
      // Mock template that has been used
      const existingTemplate = {
        id: 'template-1',
        name: 'T2 Sink Quality Control',
        version: '1.0',
        description: 'QC checklist for T2 sinks',
        appliesToProductFamily: 'MDRD_T2_SINK',
        isActive: true,
        items: [
          {
            id: 'item-1',
            section: 'Visual Inspection',
            checklistItem: 'Check for scratches',
            itemType: 'PASS_FAIL',
            order: 1,
            isRequired: true
          }
        ]
      };

      (prisma.orderQcResult.count as jest.Mock).mockResolvedValue(5);
      (prisma.qcFormTemplate.findUnique as jest.Mock).mockResolvedValue(existingTemplate);
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const tx = {
          qcFormTemplate: {
            update: jest.fn().mockResolvedValue({ ...existingTemplate, isActive: false }),
            create: jest.fn().mockResolvedValue({
              ...existingTemplate,
              id: 'template-2',
              version: '1.1',
              items: existingTemplate.items
            })
          }
        };
        return fn(tx);
      });

      const request = new NextRequest('http://localhost:3005/api/admin/qc-templates/template-1', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'T2 Sink Quality Control - Updated',
          items: existingTemplate.items
        })
      });

      const response = await updateTemplate(request, { params: Promise.resolve({ templateId: 'template-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.template.version).toBe('1.1');
      expect(data.message).toContain('A new version (1.1) has been created');
    });

    it('should update directly when template has not been used', async () => {
      const existingTemplate = {
        id: 'template-1',
        name: 'T2 Sink Quality Control',
        version: '1.0',
        isActive: true
      };

      (prisma.orderQcResult.count as jest.Mock).mockResolvedValue(0);
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const tx = {
          qcFormTemplate: {
            update: jest.fn().mockResolvedValue({
              ...existingTemplate,
              name: 'T2 Sink Quality Control - Updated'
            }),
            findUnique: jest.fn().mockResolvedValue({
              ...existingTemplate,
              name: 'T2 Sink Quality Control - Updated',
              items: []
            })
          }
        };
        return fn(tx);
      });

      const request = new NextRequest('http://localhost:3005/api/admin/qc-templates/template-1', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'T2 Sink Quality Control - Updated'
        })
      });

      const response = await updateTemplate(request, { params: Promise.resolve({ templateId: 'template-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.template.name).toBe('T2 Sink Quality Control - Updated');
      expect(data.message).toBeUndefined();
    });
  });

  describe('Template Cloning', () => {
    it('should successfully clone a template', async () => {
      const sourceTemplate = {
        id: 'template-1',
        name: 'T2 Sink Quality Control',
        version: '1.0',
        description: 'QC checklist for T2 sinks',
        appliesToProductFamily: 'MDRD_T2_SINK',
        items: [
          {
            section: 'Visual Inspection',
            checklistItem: 'Check for scratches',
            itemType: 'PASS_FAIL',
            order: 1,
            isRequired: true
          }
        ]
      };

      (prisma.qcFormTemplate.findUnique as jest.Mock).mockResolvedValue(sourceTemplate);
      (prisma.qcFormTemplate.create as jest.Mock).mockResolvedValue({
        id: 'template-2',
        name: 'T2 Sink Quality Control - Copy',
        version: '1.0',
        description: sourceTemplate.description,
        appliesToProductFamily: sourceTemplate.appliesToProductFamily,
        isActive: true,
        items: sourceTemplate.items
      });

      const request = new NextRequest('http://localhost:3005/api/admin/qc-templates/template-1/clone', {
        method: 'POST',
        body: JSON.stringify({
          name: 'T2 Sink Quality Control - Copy',
          version: '1.0'
        })
      });

      const response = await cloneTemplate(request, { params: Promise.resolve({ templateId: 'template-1' }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.template.name).toBe('T2 Sink Quality Control - Copy');
      expect(data.message).toContain('Template cloned successfully');
    });
  });

  describe('Template Version History', () => {
    it('should return all versions of a template', async () => {
      const currentTemplate = {
        name: 'T2 Sink Quality Control',
        appliesToProductFamily: 'MDRD_T2_SINK'
      };

      const versions = [
        {
          id: 'template-3',
          name: 'T2 Sink Quality Control',
          version: '1.2',
          isActive: true,
          createdAt: new Date('2024-03-01'),
          _count: { orderQcResults: 0, items: 10 }
        },
        {
          id: 'template-2',
          name: 'T2 Sink Quality Control',
          version: '1.1',
          isActive: false,
          createdAt: new Date('2024-02-01'),
          _count: { orderQcResults: 5, items: 9 }
        },
        {
          id: 'template-1',
          name: 'T2 Sink Quality Control',
          version: '1.0',
          isActive: false,
          createdAt: new Date('2024-01-01'),
          _count: { orderQcResults: 10, items: 8 }
        }
      ];

      (prisma.qcFormTemplate.findUnique as jest.Mock).mockResolvedValue(currentTemplate);
      (prisma.qcFormTemplate.findMany as jest.Mock).mockResolvedValue(versions);

      const request = new NextRequest('http://localhost:3005/api/admin/qc-templates/template-3/versions');
      const response = await getVersions(request, { params: Promise.resolve({ templateId: 'template-3' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.versions).toHaveLength(3);
      expect(data.versions[0].version).toBe('1.2');
      expect(data.templateName).toBe('T2 Sink Quality Control');
    });
  });

  describe('Template Usage Check', () => {
    it('should return usage statistics for a template', async () => {
      const template = {
        id: 'template-1',
        name: 'T2 Sink Quality Control',
        version: '1.0',
        isActive: true
      };

      const usageResults = [
        {
          id: 'result-1',
          qcTimestamp: new Date(),
          overallStatus: 'PASSED',
          order: {
            id: 'order-1',
            poNumber: 'PO-001',
            customerName: 'Test Customer',
            orderStatus: 'READY_FOR_SHIP'
          },
          qcPerformedBy: {
            id: 'user-1',
            fullName: 'QC Person',
            username: 'qcperson'
          }
        }
      ];

      (prisma.qcFormTemplate.findUnique as jest.Mock).mockResolvedValue(template);
      (prisma.orderQcResult.findMany as jest.Mock).mockResolvedValue(usageResults);
      (prisma.orderQcResult.count as jest.Mock).mockResolvedValue(5);
      (prisma.orderQcResult.groupBy as jest.Mock).mockResolvedValue([
        { overallStatus: 'PASSED', _count: { id: 4 } },
        { overallStatus: 'FAILED', _count: { id: 1 } }
      ]);

      const request = new NextRequest('http://localhost:3005/api/admin/qc-templates/template-1/usage');
      const response = await getUsage(request, { params: Promise.resolve({ templateId: 'template-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.usage.total).toBe(5);
      expect(data.canModify).toBe(false);
      expect(data.message).toContain('This template has been used 5 times');
      expect(data.usage.statusBreakdown.PASSED).toBe(4);
      expect(data.usage.statusBreakdown.FAILED).toBe(1);
    });
  });

  describe('Template Deletion Protection', () => {
    it('should prevent deletion of used templates', async () => {
      (prisma.orderQcResult.count as jest.Mock).mockResolvedValue(3);

      const request = new NextRequest('http://localhost:3005/api/admin/qc-templates/template-1', {
        method: 'DELETE'
      });

      const response = await deleteTemplate(request, { params: Promise.resolve({ templateId: 'template-1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Cannot delete template that has been used');
      expect(data.usageCount).toBe(3);
    });

    it('should allow deletion of unused templates', async () => {
      (prisma.orderQcResult.count as jest.Mock).mockResolvedValue(0);
      (prisma.qcFormTemplate.delete as jest.Mock).mockResolvedValue({ id: 'template-1' });

      const request = new NextRequest('http://localhost:3005/api/admin/qc-templates/template-1', {
        method: 'DELETE'
      });

      const response = await deleteTemplate(request, { params: Promise.resolve({ templateId: 'template-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Template deleted successfully');
    });
  });
>>>>>>> e99bccb212593140bf83da9df463f4b881a5e559
});