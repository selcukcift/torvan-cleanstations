// BOM Generator Module - Display Logic for BOM and Order Summary

// Removed: generateBOM, addSystemItems, addSinkConfigurationToBOM, 
// addSinkBodyAssembly, addLegsKit, addFeetType, addPegboardAssemblies, 
// addBasinAssemblies, addControlBox, addFaucetAssemblies, addSprayerAssemblies, 
// addAccessoriesToBOM, addItemToBOM, consolidateBOM
// These are now handled by the backend bomService.js

SinkConfigApp.prototype.displayReview = function() {
    this.displayOrderSummary();
    this.displayBOM();
};

SinkConfigApp.prototype.displayOrderSummary = function() {
    const container = document.getElementById('summary-details');
    const customer = this.orderData.customer;
    
    let summaryHTML = `
        <div class="summary-section">
            <h4>Customer Information</h4>
            <div class="summary-item">
                <span class="summary-label">PO Number:</span>
                <span class="summary-value">${customer.poNumber}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Customer Name:</span>
                <span class="summary-value">${customer.customerName}</span>
            </div>
            ${customer.projectName ? `
            <div class="summary-item">
                <span class="summary-label">Project Name:</span>
                <span class="summary-value">${customer.projectName}</span>
            </div>
            ` : ''}
            <div class="summary-item">
                <span class="summary-label">Sales Person:</span>
                <span class="summary-value">${customer.salesPerson}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Delivery Date:</span>
                <span class="summary-value">${customer.wantDate}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Language:</span>
                <span class="summary-value">${customer.language === 'EN' ? 'English' : 'French'}</span>
            </div>
            ${customer.notes ? `
            <div class="summary-item">
                <span class="summary-label">Notes:</span>
                <span class="summary-value">${customer.notes}</span>
            </div>
            ` : ''}
        </div>

        <div class="summary-section">
            <h4>Sink Configuration</h4>
            <div class="summary-item">
                <span class="summary-label">Sink Family:</span>
                <span class="summary-value">${this.orderData.sinkFamily}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Number of Sinks:</span>
                <span class="summary-value">${this.orderData.quantity}</span>
            </div>
        </div>
    `;
    
    // Add configuration details for each build number
    this.orderData.buildNumbers.forEach(buildNumber => {
        const config = this.orderData.configurations[buildNumber];
        const accessories = this.orderData.accessories[buildNumber] || [];
        
        summaryHTML += `
            <div class="summary-section">
                <h4>Build #${buildNumber} Configuration</h4>
                <div class="summary-item">
                    <span class="summary-label">Sink Model:</span>
                    <span class="summary-value">${config.sinkBody.sinkModel} (${this.getBasinCount(config.sinkBody.sinkModel)} basin${this.getBasinCount(config.sinkBody.sinkModel) > 1 ? 's' : ''})</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Dimensions:</span>
                    <span class="summary-value">${config.sinkBody.sinkWidth}" W × ${config.sinkBody.sinkLength}" L</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Legs/Feet:</span>
                    <span class="summary-value">${config.sinkBody.legsType} / ${config.sinkBody.feetType}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Pegboard:</span>
                    <span class="summary-value">${config.sinkBody.pegboard ? `Yes (${config.sinkBody.pegboardType})` : 'No'}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Faucets:</span>
                    <span class="summary-value">${config.faucets.faucetQuantity} × ${config.faucets.faucetType}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Accessories:</span>
                    <span class="summary-value">${accessories.length} selected</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = summaryHTML;
};

SinkConfigApp.prototype.displayBOM = function() {
    const container = document.getElementById('bom-display');
    
    let tableHTML = `
        <table class="bom-table">
            <thead>
                <tr>
                    <th>Part Number</th>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Category</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    this.bom.forEach(item => {
        tableHTML += this.renderBOMItem(item, 0, item.quantity);
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
};

// New helper function to recursively render BOM items with proper nesting
SinkConfigApp.prototype.renderBOMItem = function(item, level, parentQuantity) {
    const indent = '└─ '.repeat(level);
    const isTopLevel = level === 0;
    const rowClass = isTopLevel ? 'bom-assembly' : 'bom-component';
    
    let html = `
        <tr class="${rowClass}">
            <td>${indent}${item.assemblyId || item.part_id}</td>
            <td>${item.name}</td>
            <td>${item.quantity * parentQuantity}</td>
            <td>${isTopLevel ? item.category : 'Component'}</td>
        </tr>
    `;
    
    // Add components if it's a complex assembly or kit
    if (isTopLevel && (item.type === 'COMPLEX' || item.type === 'KIT') && item.components && item.components.length > 0) {
        item.components.forEach(component => {
            html += this.renderComponentTree(component, level + 1, item.quantity);
        });
    }
    
    return html;
};

// New helper function to recursively render component tree
SinkConfigApp.prototype.renderComponentTree = function(component, level, parentQuantity) {
    const part = this.data.parts.parts[component.part_id];
    if (!part) return '';
    
    const indent = '└─ '.repeat(level);
    const totalQuantity = component.quantity * parentQuantity;
    
    let html = `
        <tr class="bom-component">
            <td>${indent}${component.part_id}</td>
            <td>${part.name}</td>
            <td>${totalQuantity}</td>
            <td>Component</td>
        </tr>
    `;
    
    // Check if this component is also an assembly with its own components
    const componentAssembly = this.data.assemblies.assemblies[component.part_id];
    if (componentAssembly && (componentAssembly.type === 'COMPLEX' || componentAssembly.type === 'KIT') && componentAssembly.components && componentAssembly.components.length > 0) {
        componentAssembly.components.forEach(subComponent => {
            html += this.renderComponentTree(subComponent, level + 1, totalQuantity);
        });
    }
    
    return html;
};

// Enhanced CSV generation to include nested components
SinkConfigApp.prototype.generateCSV = function() {
    let csvContent = "Level,Part Number,Description,Quantity,Category\n";
    
    this.bom.forEach(item => {
        csvContent += this.renderCSVItem(item, 0, item.quantity);
    });
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `BOM_${this.orderData.customer.poNumber}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// Helper function for CSV generation with nested structure
SinkConfigApp.prototype.renderCSVItem = function(item, level, parentQuantity) {
    const isTopLevel = level === 0;
    let csvLines = `${level},"${item.assemblyId || item.part_id}","${item.name}",${item.quantity * parentQuantity},"${isTopLevel ? item.category : 'Component'}"\n`;
    
    // Add components if it's a complex assembly or kit
    if (isTopLevel && (item.type === 'COMPLEX' || item.type === 'KIT') && item.components && item.components.length > 0) {
        item.components.forEach(component => {
            csvLines += this.renderCSVComponentTree(component, level + 1, item.quantity);
        });
    }
    
    return csvLines;
};

// Helper function for CSV component tree
SinkConfigApp.prototype.renderCSVComponentTree = function(component, level, parentQuantity) {
    const part = this.data.parts.parts[component.part_id];
    if (!part) return '';
    
    const totalQuantity = component.quantity * parentQuantity;
    let csvLines = `${level},"${component.part_id}","${part.name}",${totalQuantity},"Component"\n`;
    
    // Check if this component is also an assembly with its own components
    const componentAssembly = this.data.assemblies.assemblies[component.part_id];
    if (componentAssembly && (componentAssembly.type === 'COMPLEX' || componentAssembly.type === 'KIT') && componentAssembly.components && componentAssembly.components.length > 0) {
        componentAssembly.components.forEach(subComponent => {
            csvLines += this.renderCSVComponentTree(subComponent, level + 1, totalQuantity);
        });
    }
    
    return csvLines;
};

SinkConfigApp.prototype.editConfiguration = function() {
    // Navigate back to step 1 to allow editing
    this.currentStep = 1;
    this.showStep(this.currentStep);
};