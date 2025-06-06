// QC-related type definitions

export type QcItemType = 
  | 'PASS_FAIL'
  | 'TEXT_INPUT'
  | 'NUMERIC_INPUT'
  | 'SINGLE_SELECT'
  | 'MULTI_SELECT'
  | 'DATE_INPUT'
  | 'CHECKBOX';

export type QcStatus = 
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'PASSED'
  | 'FAILED'
  | 'REQUIRES_REVIEW';

export interface QcFormTemplate {
  id: string;
  name: string;
  version: string;
  description?: string | null;
  isActive: boolean;
  appliesToProductFamily?: string | null;
  createdAt: Date;
  updatedAt: Date;
  items?: QcFormTemplateItem[];
  _count?: {
    orderQcResults: number;
  };
}

export interface QcFormTemplateItem {
  id: string;
  templateId: string;
  section: string;
  checklistItem: string;
  itemType: QcItemType;
  options?: any;
  expectedValue?: string | null;
  order: number;
  isRequired: boolean;
  template?: QcFormTemplate;
}

export interface OrderQcResult {
  id: string;
  orderId: string;
  qcFormTemplateId: string;
  qcPerformedById: string;
  qcTimestamp: Date;
  overallStatus: QcStatus;
  notes?: string | null;
  order?: any;
  qcFormTemplate?: QcFormTemplate;
  qcPerformedBy?: {
    id: string;
    fullName: string;
    initials: string;
    role: string;
  };
  itemResults?: OrderQcItemResult[];
}

export interface OrderQcItemResult {
  id: string;
  orderQcResultId: string;
  qcFormTemplateItemId: string;
  resultValue?: string | null;
  isConformant?: boolean | null;
  notes?: string | null;
  orderQcResult?: OrderQcResult;
  qcFormTemplateItem?: QcFormTemplateItem;
}

export interface QcFormData {
  [itemId: string]: {
    value?: string;
    isConformant?: boolean;
    notes?: string;
  };
  generalNotes?: string;
}

export interface QcSummaryStats {
  totalQcResults: number;
  passedCount: number;
  failedCount: number;
  requiresReviewCount: number;
  inProgressCount: number;
  passRate: string;
  periodDays: number;
}

export interface QcTemplateUsage {
  id: string;
  name: string;
  version: string;
  usageCount: number;
}

export interface QcInspectorStats {
  id: string;
  fullName: string;
  initials: string;
  totalInspections: number;
  passed: number;
  failed: number;
  passRate: string;
}

export interface QcDailyTrend {
  date: string;
  passed: number;
  failed: number;
  total: number;
}