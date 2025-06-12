# QC Person User Training Guide
## Torvan Medical CleanStation Production Workflow

### Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [QC Workflow Phases](#qc-workflow-phases)
4. [Step-by-Step QC Procedures](#step-by-step-qc-procedures)
5. [Digital Signature & Compliance](#digital-signature--compliance)
6. [Troubleshooting](#troubleshooting)
7. [FAQs](#faqs)

---

## Overview

The Torvan Medical CleanStation QC system digitizes our ISO 13485:2016 compliant quality control processes. As a QC Person, you'll conduct inspections at multiple production phases using digital templates derived from our official QC documents.

### Key Benefits
- **Digital Templates**: All paper checklists (CLP.T2.001.V01, CLQ.T2.001.V01, CLT.T2.001.V01) are now digital
- **Conditional Logic**: Only relevant checklist items appear based on order configuration
- **Audit Trail**: Every inspection is digitally signed and tracked
- **Real-time Status Updates**: Order status automatically advances upon QC completion

---

## Getting Started

### Accessing the QC System

1. **Login**: Navigate to the application and log in with your QC Person credentials
2. **Dashboard**: Your QC Person Dashboard shows:
   - Orders ready for QC inspection
   - Recent QC activities
   - Performance analytics
3. **Navigation**: Click on any order to view details and access QC functions

### User Interface Overview

The QC interface consists of:
- **Order Header**: PO number, customer, build numbers
- **QC Phase Indicator**: Shows current inspection phase
- **Template Sections**: Organized by CLP document sections
- **Digital Signature**: ISO compliance tracking
- **Submit Button**: Completes inspection and updates order status

---

## QC Workflow Phases

### Phase 1: Pre-Production Check
**Status**: `READY_FOR_PRE_QC` → `READY_FOR_PRODUCTION`

**When**: After parts arrive, before production begins
**Template**: Pre-Production Check (CLP.T2.001.V01 Section 1)

**Key Inspections**:
- Job ID verification
- Final sink dimensions
- Pegboard specifications (if applicable)
- Parts availability confirmation

### Phase 2: Production Check
**Status**: `READY_FOR_PRODUCTION` → `TESTING_COMPLETE`

**When**: During production assembly
**Template**: Production Check (CLP.T2.001.V01 Section 2)

**Key Inspections**:
- LED light installation
- Power bar placement
- Cable management
- Assembly quality

### Phase 3: Basin Production Check
**Status**: `READY_FOR_PRODUCTION` → `TESTING_COMPLETE`

**When**: After basin installation
**Template**: Basin Production Check (CLP.T2.001.V01 Section 3)

**Key Inspections**:
- Basin type verification (E-Drain vs E-Sink)
- P-trap installation
- Addon components
- Basin-specific requirements

### Phase 4: Final Quality Check
**Status**: `READY_FOR_FINAL_QC` → `READY_FOR_SHIP`

**When**: Before packaging and shipping
**Template**: Final Quality Check (CLQ.T2.001.V01)

**Key Inspections**:
- Hi-Pot testing
- Cleanliness standards
- Sharp edge inspection
- Final packaging verification

### Phase 5: End-of-Line Testing
**Status**: Various → `READY_FOR_FINAL_QC`

**When**: Comprehensive final testing
**Template**: End-of-Line Testing (CLT.T2.001.V01)

**Key Inspections**:
- Electrical testing
- Performance verification
- Safety compliance
- Documentation completion

---

## Step-by-Step QC Procedures

### Starting a QC Inspection

1. **Navigate to Order**: From your dashboard, click on an order ready for QC
2. **Verify Order Status**: Confirm the order is in the correct status for inspection
3. **Access QC Page**: Click "QC Inspection" button
4. **Review Order Details**: Verify PO number, customer, and build numbers

### Conducting the Inspection

1. **Template Loading**: The system automatically loads the appropriate QC template
2. **Section Navigation**: Use tabs to navigate between inspection sections
3. **Conditional Items**: Only applicable items display based on order configuration:
   - **Pegboard items**: Only show if order includes pegboard
   - **E-Drain items**: Only show for E-Drain basin configurations
   - **E-Sink items**: Only show for E-Sink basin configurations

### Filling Out Checklist Items

#### Item Types and How to Complete Them:

**PASS_FAIL Items**:
- Select "Pass" or "Fail" from dropdown
- Required for most inspection points

**TEXT_INPUT Items**:
- Enter specific values (job IDs, measurements, etc.)
- Use provided prompts for guidance

**SINGLE_SELECT Items**:
- Choose one option from predefined list
- Common for standard configurations

**MULTI_SELECT Items**:
- Choose multiple applicable options
- Used for addon components and features

**MEASUREMENT Items**:
- Enter numerical values with units
- Verify against specifications

#### Handling N/A (Not Applicable) Items:

1. **Automatic N/A**: System automatically hides items not applicable to the configuration
2. **Manual N/A**: For items that appear but don't apply, check "N/A" checkbox
3. **Notes Required**: Always add notes explaining why item is N/A

### Digital Signature Process

1. **Complete All Items**: Ensure all applicable items are filled
2. **Overall Status**: Select "PASSED" or "FAILED"
3. **Inspector Notes**: Add summary notes about the inspection
4. **Digital Signature**: Enter your full name as digital signature
5. **Submit**: Click "Submit QC Inspection"

### Post-Submission

1. **Status Update**: Order status automatically advances
2. **Audit Trail**: Inspection is logged with timestamp and signature
3. **Notifications**: Relevant team members are notified
4. **Documentation**: QC results are permanently stored

---

## Digital Signature & Compliance

### ISO 13485:2016 Requirements

Our digital signature system ensures compliance with:
- **Traceability**: Every inspection linked to inspector ID and timestamp
- **Integrity**: Digital records cannot be altered after submission
- **Accountability**: Full audit trail for regulatory reviews

### Best Practices

1. **Use Your Full Name**: Enter your complete legal name as signature
2. **Accurate Timestamp**: System automatically records inspection time
3. **Detailed Notes**: Provide sufficient detail for audit purposes
4. **Failed Inspections**: Document specific failure reasons clearly

---

## Troubleshooting

### Common Issues and Solutions

#### Template Not Loading
**Symptoms**: "No QC template available" message
**Solutions**:
1. Verify order status is correct for QC phase
2. Contact admin if template is missing
3. Check if template is active in system

#### Items Not Displaying Correctly
**Symptoms**: Expected checklist items missing
**Solutions**:
1. Verify order configuration in system
2. Check if items have conditional logic
3. Confirm template version is current

#### Submission Failures
**Symptoms**: Error when submitting QC inspection
**Solutions**:
1. Ensure all required items are completed
2. Verify network connection
3. Check if order status allows QC submission
4. Contact IT support if error persists

#### Digital Signature Issues
**Symptoms**: Signature not saving or validation errors
**Solutions**:
1. Use full legal name (no initials or abbreviations)
2. Clear browser cache if signature field frozen
3. Ensure session hasn't expired

### Getting Help

1. **Technical Issues**: Contact IT Support
2. **Process Questions**: Contact Production Coordinator
3. **Template Issues**: Contact QC Manager or Admin
4. **Urgent Production Issues**: Contact Production Manager immediately

---

## FAQs

### General Questions

**Q: Can I modify a QC inspection after submission?**
A: No, submissions are final for audit compliance. Contact your supervisor for corrections.

**Q: What if I find a defect during inspection?**
A: Mark relevant items as "FAILED", document the issue in notes, and notify Production Coordinator immediately.

**Q: Why don't I see pegboard items on some orders?**
A: The system only shows applicable items. Orders without pegboard won't display pegboard inspection items.

### Process Questions

**Q: What's the difference between E-Drain and E-Sink inspections?**
A: E-Drain basins are drainage-only; E-Sink basins include faucets and additional components. Different checklist items apply.

**Q: Can I skip items that seem irrelevant?**
A: Use the N/A checkbox for truly non-applicable items, but add notes explaining why.

**Q: What happens if I select "FAILED" for overall status?**
A: Order remains in current status, production team is notified, and corrective action is required before re-inspection.

### Technical Questions

**Q: Why is the template different from our paper checklists?**
A: Digital templates include conditional logic to show only relevant items, making inspections more efficient.

**Q: Can I access QC results later?**
A: Yes, all QC results are stored in the system and accessible from the order details page.

**Q: What if the system is slow or crashes during inspection?**
A: The system auto-saves progress. Refresh the page and continue where you left off.

---

## Training Checklist

Before conducting independent QC inspections, ensure you can:

- [ ] Log into the system and navigate to QC dashboard
- [ ] Identify orders ready for different QC phases
- [ ] Access and understand QC templates
- [ ] Complete all types of checklist items (Pass/Fail, Text Input, etc.)
- [ ] Use N/A functionality appropriately
- [ ] Provide digital signature and submit inspections
- [ ] Understand conditional logic for different configurations
- [ ] Troubleshoot common issues
- [ ] Know who to contact for different types of problems

---

## Updates and Version Control

**Document Version**: 1.0  
**Last Updated**: January 11, 2025  
**Next Review**: March 11, 2025  

**Change History**:
- v1.0: Initial release with comprehensive QC system training

For the most current training materials, always check the system documentation or contact your supervisor.