# QC Person Quick Reference Guide
## Torvan Medical CleanStation QC System

### QC Phase Quick Reference

| Order Status | QC Phase | Template | Next Status |
|--------------|----------|----------|-------------|
| `READY_FOR_PRE_QC` | Pre-Production Check | CLP.T2.001.V01 Sec 1 | `READY_FOR_PRODUCTION` |
| `READY_FOR_PRODUCTION` | Production Check | CLP.T2.001.V01 Sec 2 | `TESTING_COMPLETE` |
| `READY_FOR_PRODUCTION` | Basin Production Check | CLP.T2.001.V01 Sec 3 | `TESTING_COMPLETE` |
| `READY_FOR_FINAL_QC` | Final Quality Check | CLQ.T2.001.V01 | `READY_FOR_SHIP` |
| Various | End-of-Line Testing | CLT.T2.001.V01 | `READY_FOR_FINAL_QC` |

### Conditional Logic Quick Reference

| Configuration | Shows Items For | Hides Items For |
|---------------|-----------------|-----------------|
| **Pegboard = true** | Pegboard installation, color verification | N/A |
| **Pegboard = false** | N/A (items marked N/A) | Pegboard-specific items |
| **E-Drain Basin** | Drainage, P-trap verification | Faucet, dosing port items |
| **E-Sink Basin** | All basin items, faucets, dosing ports | E-Drain specific items |
| **Multiple Basins** | Per-basin inspection items | Single basin items |

### Digital Signature Requirements

✅ **Correct Format**: "John Smith" (Full legal name)  
❌ **Incorrect**: "J.S.", "John", "Inspector"

### Common Item Types

| Type | Description | How to Complete |
|------|-------------|-----------------|
| **PASS_FAIL** | Pass/Fail inspection | Select from dropdown |
| **TEXT_INPUT** | Job IDs, measurements | Enter text/numbers |
| **SINGLE_SELECT** | One choice from list | Select one option |
| **MULTI_SELECT** | Multiple choices | Select all applicable |
| **MEASUREMENT** | Numerical values | Enter number with units |

### Emergency Contacts

| Issue Type | Contact |
|------------|---------|
| **Critical Production Defect** | Production Manager (Immediate) |
| **System Technical Issues** | IT Support |
| **Process Questions** | Production Coordinator |
| **Template Problems** | QC Manager/Admin |

### Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Template not loading | Check order status, refresh page |
| Items missing | Verify order configuration matches |
| Submission fails | Complete all required items, check network |
| Signature won't save | Use full name, clear browser cache |

### Key Inspection Points by Phase

#### Pre-Production Check
- Job ID verification
- Final sink dimensions
- Pegboard type/color (if applicable)
- Parts inventory confirmation

#### Production Check
- LED light installation
- Power bar placement
- Cable management and routing
- Assembly torque specifications

#### Basin Production Check
- Basin type verification (E-Drain/E-Sink)
- P-trap installation and seal
- Addon component installation
- Basin-specific safety checks

#### Final Quality Check
- Hi-Pot electrical testing
- Surface cleanliness standards
- Sharp edge inspection
- Packaging verification

#### End-of-Line Testing
- Comprehensive electrical testing
- Performance verification
- Safety compliance checks
- Documentation completion

### Status Codes Reference

| Code | Meaning | QC Action |
|------|---------|-----------|
| `ORDER_CREATED` | New order | Wait for procurement |
| `PARTS_SENT` | Parts ordered | Wait for arrival |
| `READY_FOR_PRE_QC` | ⚡ **Pre-QC Required** | Conduct Pre-Production Check |
| `READY_FOR_PRODUCTION` | In production | Monitor for Production/Basin Checks |
| `TESTING_COMPLETE` | Production done | Prepare for Final QC |
| `READY_FOR_FINAL_QC` | ⚡ **Final QC Required** | Conduct Final Quality Check |
| `READY_FOR_SHIP` | QC complete | Order ready for shipping |

### Browser Compatibility

✅ **Supported**: Chrome 90+, Firefox 85+, Safari 14+, Edge 90+  
❌ **Not Supported**: Internet Explorer

---

**Print this page for quick reference at your workstation**