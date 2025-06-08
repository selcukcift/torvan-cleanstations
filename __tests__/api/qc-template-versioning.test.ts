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

  describe('GET /api/admin/qc-templates', () => {
    it('should return all QC templates with counts', async () => {
      const mockTemplates = [
        {
          id: '1',
          formName: 'Pre-Production Check',
          formType: 'Pre-Production Check',
          version: '1.0',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { items: 5, orderQcResults: 10 }
        }
      ];

      (prisma.qcFormTemplate.findMany as jest.Mock).mockResolvedValue(mockTemplates);

      const request = new NextRequest('http://localhost:3000/api/admin/qc-templates');
      const response = await getTemplates(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockTemplates);
    });

    it('should handle errors gracefully', async () => {
      (prisma.qcFormTemplate.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/qc-templates');
      const response = await getTemplates(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/admin/qc-templates', () => {
    it('should create a new QC template', async () => {
      const templateData = {
        formName: 'New Template',
        formType: 'Production Check',
        version: '1.0',
        items: [
          {
            section: 'Quality Control',
            checklistItem: 'Check item 1',
            itemType: 'CHECKBOX',
            isBasinSpecific: false,
            isRequired: true
          }
        ]
      };

      const mockCreatedTemplate = {
        id: '1',
        ...templateData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (prisma.$transaction as jest.Mock).mockResolvedValue(mockCreatedTemplate);

      const request = new NextRequest('http://localhost:3000/api/admin/qc-templates', {
        method: 'POST',
        body: JSON.stringify(templateData)
      });

      const response = await createTemplate(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.formName).toBe(templateData.formName);
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        formName: '', // Invalid: empty name
        formType: 'Production Check'
      };

      const request = new NextRequest('http://localhost:3000/api/admin/qc-templates', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });

      const response = await createTemplate(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/admin/qc-templates/[templateId]', () => {
    it('should return a specific template with items', async () => {
      const mockTemplate = {
        id: '1',
        formName: 'Test Template',
        formType: 'Production Check',
        version: '1.0',
        items: [
          {
            id: '1',
            section: 'Quality Control',
            checklistItem: 'Check item 1',
            itemType: 'CHECKBOX',
            isBasinSpecific: false,
            isRequired: true
          }
        ]
      };

      (prisma.qcFormTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);

      const request = new NextRequest('http://localhost:3000/api/admin/qc-templates/1');
      const response = await getTemplate(request, { params: { templateId: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockTemplate);
    });

    it('should return 404 for non-existent template', async () => {
      (prisma.qcFormTemplate.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/qc-templates/999');
      const response = await getTemplate(request, { params: { templateId: '999' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('PUT /api/admin/qc-templates/[templateId]', () => {
    it('should update an existing template', async () => {
      const updateData = {
        formName: 'Updated Template',
        formType: 'Final QC',
        version: '2.0'
      };

      const mockUpdatedTemplate = {
        id: '1',
        ...updateData,
        updatedAt: new Date()
      };

      (prisma.qcFormTemplate.findUnique as jest.Mock).mockResolvedValue({ id: '1' });
      (prisma.$transaction as jest.Mock).mockResolvedValue(mockUpdatedTemplate);

      const request = new NextRequest('http://localhost:3000/api/admin/qc-templates/1', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      const response = await updateTemplate(request, { params: { templateId: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.formName).toBe(updateData.formName);
    });

    it('should return 404 when updating non-existent template', async () => {
      (prisma.qcFormTemplate.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/qc-templates/999', {
        method: 'PUT',
        body: JSON.stringify({ formName: 'Updated' })
      });

      const response = await updateTemplate(request, { params: { templateId: '999' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('DELETE /api/admin/qc-templates/[templateId]', () => {
    it('should delete an existing template', async () => {
      (prisma.qcFormTemplate.findUnique as jest.Mock).mockResolvedValue({ id: '1' });
      (prisma.$transaction as jest.Mock).mockResolvedValue({ id: '1' });

      const request = new NextRequest('http://localhost:3000/api/admin/qc-templates/1', {
        method: 'DELETE'
      });

      const response = await deleteTemplate(request, { params: { templateId: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Template deleted successfully');
    });

    it('should return 404 when deleting non-existent template', async () => {
      (prisma.qcFormTemplate.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/qc-templates/999', {
        method: 'DELETE'
      });

      const response = await deleteTemplate(request, { params: { templateId: '999' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/admin/qc-templates/[templateId]/clone', () => {
    it('should clone an existing template with new version', async () => {
      const originalTemplate = {
        id: '1',
        formName: 'Original Template',
        formType: 'Production Check',
        version: '1.0',
        items: [
          {
            section: 'Quality Control',
            checklistItem: 'Check item 1',
            itemType: 'CHECKBOX',
            isBasinSpecific: false,
            isRequired: true
          }
        ]
      };

      const clonedTemplate = {
        id: '2',
        formName: 'Original Template (Copy)',
        formType: 'Production Check',
        version: '1.1',
        items: originalTemplate.items
      };

      (prisma.qcFormTemplate.findUnique as jest.Mock).mockResolvedValue(originalTemplate);
      (prisma.$transaction as jest.Mock).mockResolvedValue(clonedTemplate);

      const request = new NextRequest('http://localhost:3000/api/admin/qc-templates/1/clone', {
        method: 'POST',
        body: JSON.stringify({ version: '1.1' })
      });

      const response = await cloneTemplate(request, { params: { templateId: '1' } });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.version).toBe('1.1');
      expect(data.data.formName).toBe('Original Template (Copy)');
    });

    it('should return 404 when cloning non-existent template', async () => {
      (prisma.qcFormTemplate.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/qc-templates/999/clone', {
        method: 'POST',
        body: JSON.stringify({ version: '2.0' })
      });

      const response = await cloneTemplate(request, { params: { templateId: '999' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/admin/qc-templates/[templateId]/versions', () => {
    it('should return version history for a template', async () => {
      const mockVersions = [
        {
          version: '1.0',
          createdAt: new Date('2024-01-01'),
          _count: { orderQcResults: 5 }
        },
        {
          version: '1.1',
          createdAt: new Date('2024-02-01'),
          _count: { orderQcResults: 3 }
        }
      ];

      (prisma.qcFormTemplate.findMany as jest.Mock).mockResolvedValue(mockVersions);

      const request = new NextRequest('http://localhost:3000/api/admin/qc-templates/1/versions');
      const response = await getVersions(request, { params: { templateId: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].version).toBe('1.0');
    });
  });

  describe('GET /api/admin/qc-templates/[templateId]/usage', () => {
    it('should return usage statistics for a template', async () => {
      const mockUsage = {
        totalUsage: 15,
        monthlyUsage: [
          { month: '2024-01', count: 5 },
          { month: '2024-02', count: 10 }
        ],
        statusBreakdown: [
          { status: 'PASSED', count: 12 },
          { status: 'FAILED', count: 3 }
        ]
      };

      (prisma.orderQcResult.count as jest.Mock).mockResolvedValue(15);
      (prisma.orderQcResult.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          { createdAt: new Date('2024-01-15'), _count: { id: 5 } },
          { createdAt: new Date('2024-02-15'), _count: { id: 10 } }
        ])
        .mockResolvedValueOnce([
          { status: 'PASSED', _count: { id: 12 } },
          { status: 'FAILED', _count: { id: 3 } }
        ]);

      const request = new NextRequest('http://localhost:3000/api/admin/qc-templates/1/usage');
      const response = await getUsage(request, { params: { templateId: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.totalUsage).toBe(15);
    });
  });
});