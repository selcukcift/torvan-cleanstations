import { z } from 'zod';

// QC Item Types enum matching Prisma schema
export const QcItemTypeEnum = z.enum([
  'PASS_FAIL',
  'TEXT_INPUT',
  'NUMERIC_INPUT',
  'SINGLE_SELECT',
  'MULTI_SELECT',
  'DATE_INPUT',
  'CHECKBOX'
]);

// QC Status enum matching Prisma schema
export const QcStatusEnum = z.enum([
  'PENDING',
  'IN_PROGRESS',
  'PASSED',
  'FAILED',
  'REQUIRES_REVIEW'
]);

// Schema for creating a QC template item
export const QcTemplateItemSchema = z.object({
  id: z.string().optional(),
  section: z.string().min(1, 'Section is required'),
  checklistItem: z.string().min(1, 'Checklist item is required'),
  itemType: QcItemTypeEnum,
  options: z.array(z.string()).optional().nullable(),
  expectedValue: z.string().optional().nullable(),
  order: z.number().int().positive(),
  isRequired: z.boolean().default(true),
  repeatPer: z.string().optional().nullable(),
  applicabilityCondition: z.string().optional().nullable(),
  relatedPartNumber: z.string().optional().nullable(),
  relatedAssemblyId: z.string().optional().nullable(),
  defaultValue: z.string().optional().nullable(),
  notesPrompt: z.string().optional().nullable(),
  _action: z.enum(['create', 'update', 'delete']).optional()
});

// Schema for creating a QC template
export const QcTemplateCreateSchema = z.object({
  formName: z.string().min(1, 'Form name is required'),
  formType: z.enum(['Pre-Production Check', 'Production Check', 'Final QC', 'End-of-Line Testing']),
  version: z.string().default('1.0'),
  description: z.string().optional().nullable(),
  appliesToProductFamily: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  items: z.array(QcTemplateItemSchema).min(1, 'At least one checklist item is required')
});

// Schema for updating a QC template
export const QcTemplateUpdateSchema = z.object({
  formName: z.string().min(1).optional(),
  formType: z.enum(['Pre-Production Check', 'Production Check', 'Final QC', 'End-of-Line Testing']).optional(),
  version: z.string().optional(),
  description: z.string().optional().nullable(),
  appliesToProductFamily: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  items: z.array(QcTemplateItemSchema).optional()
});

// Schema for QC item result
export const QcItemResultSchema = z.object({
  templateItemId: z.string(),
  resultValue: z.string().optional().nullable(),
  isConformant: z.boolean().optional().nullable(),
  notes: z.string().optional().nullable(),
  isNotApplicable: z.boolean().default(false),
  repetitionInstanceKey: z.string().optional().nullable(),
  attachedDocumentId: z.string().optional().nullable()
});

// Schema for submitting QC results
export const QcResultSubmissionSchema = z.object({
  templateId: z.string(),
  overallStatus: QcStatusEnum,
  notes: z.string().optional().nullable(),
  externalJobId: z.string().optional().nullable(),
  itemResults: z.array(QcItemResultSchema)
});

// Validation helper functions
export function validateQcItemResult(item: any, itemType: string): boolean {
  switch (itemType) {
    case 'PASS_FAIL':
      return typeof item.isConformant === 'boolean';
    case 'TEXT_INPUT':
    case 'DATE_INPUT':
      return typeof item.resultValue === 'string' && item.resultValue.length > 0;
    case 'NUMERIC_INPUT':
      return !isNaN(Number(item.resultValue));
    case 'SINGLE_SELECT':
      return typeof item.resultValue === 'string' && item.resultValue.length > 0;
    case 'MULTI_SELECT':
      try {
        const values = JSON.parse(item.resultValue || '[]');
        return Array.isArray(values) && values.length > 0;
      } catch {
        return false;
      }
    case 'CHECKBOX':
      return item.resultValue === 'true' || item.resultValue === 'false';
    default:
      return false;
  }
}

export function calculateQcCompletionPercentage(
  template: any,
  itemResults: any[]
): number {
  if (!template || !template.items || template.items.length === 0) {
    return 0;
  }

  const requiredItems = template.items.filter((item: any) => item.isRequired);
  if (requiredItems.length === 0) {
    return 100;
  }

  const completedRequiredItems = requiredItems.filter((item: any) => {
    const result = itemResults.find(r => r.qcFormTemplateItemId === item.id);
    return result && validateQcItemResult(result, item.itemType);
  });

  return Math.round((completedRequiredItems.length / requiredItems.length) * 100);
}

export function determineOverallQcStatus(
  template: any,
  itemResults: any[]
): string {
  const passFailItems = template.items.filter((item: any) => 
    item.itemType === 'PASS_FAIL' && item.isRequired
  );

  if (passFailItems.length === 0) {
    return 'PASSED'; // No pass/fail items to check
  }

  let hasFailure = false;
  let hasIncomplete = false;

  for (const item of passFailItems) {
    const result = itemResults.find(r => r.qcFormTemplateItemId === item.id);
    
    if (!result || result.isConformant === null || result.isConformant === undefined) {
      hasIncomplete = true;
    } else if (result.isConformant === false) {
      hasFailure = true;
    }
  }

  if (hasFailure) {
    return 'FAILED';
  } else if (hasIncomplete) {
    return 'IN_PROGRESS';
  } else {
    return 'PASSED';
  }
}