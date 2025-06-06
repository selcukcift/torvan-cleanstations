// Sink Configuration Module - Step 3 Logic
SinkConfigApp.prototype.renderSinkConfiguration = function() {
    const content = document.getElementById('sink-config-content');
    this.updateBuildIndicator();
    
    content.innerHTML = `
        <div class="config-section">
            <h3>Sink Body Configuration</h3>
            <div class="form-grid">
                <div class="form-group">
                    <label for="sinkModel">Sink Model (Basins) *</label>
                    <select id="sinkModel" name="sinkModel" required>
                        <option value="">Select Sink Model</option>
                        <option value="T2-B1">T2-B1 (1 basin)</option>
                        <option value="T2-B2">T2-B2 (2 basins)</option>
                        <option value="T2-B3">T2-B3 (3 basins)</option>
                    </select>
                    <div class="error-message"></div>
                </div>

                <div class="form-group">
                    <label for="sinkWidth">Sink Width (inches) *</label>
                    <input type="number" id="sinkWidth" name="sinkWidth" min="24" max="120" required>
                    <div class="error-message"></div>
                </div>

                <div class="form-group">
                    <label for="sinkLength">Sink Length (inches) *</label>
                    <input type="number" id="sinkLength" name="sinkLength" min="34" max="120" required>
                    <div class="error-message"></div>
                </div>

                <div class="form-group">
                    <label for="legsType">Legs Type *</label>
                    <select id="legsType" name="legsType" required>
                        <option value="">Select Legs Type</option>
                        <optgroup label="Height Adjustable">
                            <option value="DL27">DL27</option>
                            <option value="DL14">DL14</option>
                            <option value="LC1">LC1</option>
                        </optgroup>
                        <optgroup label="Fixed Height">
                            <option value="DL27-FH">DL27 (Fixed Height)</option>
                            <option value="DL14-FH">DL14 (Fixed Height)</option>
                        </optgroup>
                    </select>
                    <div class="error-message"></div>
                </div>

                <div class="form-group">
                    <label for="feetType">Feet Type *</label>
                    <select id="feetType" name="feetType" required>
                        <option value="">Select Feet Type</option>
                        <option value="CASTERS">Lock & Leveling Casters</option>
                        <option value="SEISMIC">S.S Adjustable Seismic Feet</option>
                    </select>
                    <div class="error-message"></div>
                </div>

                <div class="form-group">
                    <label for="workFlowDirection">Work Flow Direction *</label>
                    <select id="workFlowDirection" name="workFlowDirection" required>
                        <option value="">Select Direction</option>
                        <option value="LEFT_TO_RIGHT">Left to Right</option>
                        <option value="RIGHT_TO_LEFT">Right to Left</option>
                    </select>
                    <div class="error-message"></div>
                </div>
            </div>

            <div class="form-group">
                <div class="checkbox-item">
                    <input type="checkbox" id="pegboard" name="pegboard">
                    <label for="pegboard">Add Pegboard?</label>
                </div>
            </div>

            <div id="pegboard-options" style="display: none;">
                <div class="form-grid-3">
                    <div class="form-group">
                        <label for="pegboardType">Pegboard Type *</label>
                        <select id="pegboardType" name="pegboardType">
                            <option value="">Select Type</option>
                            <option value="PERFORATED">Perforated</option>
                            <option value="SOLID">Solid</option>
                        </select>
                        <div class="error-message"></div>
                    </div>

                    <div class="form-group">
                        <label for="pegboardSizeOption">Pegboard Size *</label>
                        <select id="pegboardSizeOption" name="pegboardSizeOption">
                            <option value="">Select Size</option>
                            <option value="SAME_AS_SINK">Same as Sink Length</option>
                        </select>
                        <div class="error-message"></div>
                    </div>
                </div>
            </div>
        </div>

        <div id="basin-configuration" class="config-section">
            <h3>Basin Configuration</h3>
            <div id="basin-forms"></div>
        </div>

        <div class="config-section">
            <h3>Faucet Configuration</h3>
            <div class="form-grid">
                <div class="form-group">
                    <label for="faucetType">Faucet Type *</label>
                    <select id="faucetType" name="faucetType" required>
                        <option value="">Select Faucet Type</option>
                        <option value="STD_WRIST_BLADE">10" WRIST BLADE SWING SPOUT...</option>
                        <option value="PRE_RINSE">PRE-RINSE OVERHEAD SPRAY UNIT...</option>
                        <option value="GOOSENECK_DI">GOOSENECK TREATED WATER FAUCET...</option>
                    </select>
                    <div class="error-message"></div>
                </div>

                <div class="form-group">
                    <label for="faucetQuantity">Number of Faucets *</label>
                    <input type="number" id="faucetQuantity" name="faucetQuantity" min="1" max="3" required>
                    <div class="error-message"></div>
                </div>

                <div class="form-group">
                    <label for="faucetPlacement">Faucet Placement *</label>
                    <select id="faucetPlacement" name="faucetPlacement" required>
                        <option value="">Select Placement</option>
                        <option value="CENTER_BASIN_1">Center of Basin 1</option>
                        <option value="BETWEEN_1_2">Between Basins 1/2</option>
                        <option value="CENTER_BASIN_2">Center of Basin 2</option>
                        <option value="BETWEEN_2_3">Between Basins 2/3</option>
                        <option value="CENTER_BASIN_3">Center of Basin 3</option>
                    </select>
                    <div class="error-message"></div>
                </div>
            </div>

            <div class="form-group">
                <div class="checkbox-item">
                    <input type="checkbox" id="sprayer" name="sprayer">
                    <label for="sprayer">Add Sprayer(s)?</label>
                </div>
            </div>

            <div id="sprayer-options" style="display: none;">
                <div class="form-grid-3">
                    <div class="form-group">
                        <label for="sprayerType">Sprayer Type(s) *</label>
                        <select id="sprayerType" name="sprayerType" multiple>
                            <option value="DI_WATER_TURRET">DI WATER GUN KIT & TURRET</option>
                            <option value="DI_WATER_ROSETTE">DI WATER GUN KIT & ROSETTE</option>
                            <option value="AIR_GUN_TURRET">AIR GUN KIT & TURRET</option>
                            <option value="AIR_GUN_ROSETTE">AIR GUN KIT & ROSETTE</option>
                        </select>
                        <div class="error-message"></div>
                    </div>

                    <div class="form-group">
                        <label for="sprayerQuantity">Total Number of Sprayers *</label>
                        <select id="sprayerQuantity" name="sprayerQuantity">
                            <option value="">Select Quantity</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                        </select>
                        <div class="error-message"></div>
                    </div>

                    <div class="form-group">
                        <label for="sprayerLocation">Sprayer Location(s) *</label>
                        <select id="sprayerLocation" name="sprayerLocation">
                            <option value="">Select Location</option>
                            <option value="LEFT_SIDE">Left Side</option>
                            <option value="RIGHT_SIDE">Right Side</option>
                        </select>
                        <div class="error-message"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Set up event listeners for dynamic content
    this.setupSinkConfigEventListeners();
    
    // Load existing configuration if available
    this.loadExistingConfiguration();
};

SinkConfigApp.prototype.setupSinkConfigEventListeners = function() {
    // Sink model change - update basin forms
    document.getElementById('sinkModel').addEventListener('change', (e) => {
        const basinCount = this.getBasinCount(e.target.value);
        this.generateBasinForms(basinCount);
        this.updateFaucetPlacementOptions(basinCount);
        this.updateFaucetQuantityMax(basinCount);
    });

    // Pegboard checkbox
    document.getElementById('pegboard').addEventListener('change', (e) => {
        document.getElementById('pegboard-options').style.display = e.target.checked ? 'block' : 'none';
    });

    // Sprayer checkbox
    document.getElementById('sprayer').addEventListener('change', (e) => {
        document.getElementById('sprayer-options').style.display = e.target.checked ? 'block' : 'none';
    });

    // Monitor basin type changes for DI auto-selection
    document.addEventListener('change', (e) => {
        if (e.target.name && e.target.name.startsWith('basinType')) {
            this.checkDIBasinSelection();
        }
    });
};

SinkConfigApp.prototype.getBasinCount = function(sinkModel) {
    const counts = {
        'T2-B1': 1,
        'T2-B2': 2,
        'T2-B3': 3
    };
    return counts[sinkModel] || 0;
};

SinkConfigApp.prototype.generateBasinForms = function(basinCount) {
    const container = document.getElementById('basin-forms');
    container.innerHTML = '';

    for (let i = 1; i <= basinCount; i++) {
        const basinForm = document.createElement('div');
        basinForm.className = 'config-section';
        basinForm.innerHTML = `
            <h4>Basin ${i}</h4>
            <div class="form-grid-3">
                <div class="form-group">
                    <label for="basinType${i}">Basin ${i} Type *</label>
                    <select id="basinType${i}" name="basinType${i}" required>
                        <option value="">Select Basin Type</option>
                        <option value="E_SINK">E-Sink</option>
                        <option value="E_SINK_DI">E-Sink DI</option>
                        <option value="E_DRAIN">E-Drain</option>
                    </select>
                    <div class="error-message"></div>
                </div>

                <div class="form-group">
                    <label for="basinSize${i}">Basin ${i} Size *</label>
                    <select id="basinSize${i}" name="basinSize${i}" required>
                        <option value="">Select Basin Size</option>
                        <option value="20X20X8">20X20X8</option>
                        <option value="24X20X8">24X20X8</option>
                        <option value="24X20X10">24X20X10</option>
                        <option value="30X20X8">30X20X8</option>
                        <option value="30X20X10">30X20X10</option>
                    </select>
                    <div class="error-message"></div>
                </div>
            </div>

            <div class="form-group">
                <label>Basin ${i} Add-ons</label>
                <div class="checkbox-group">
                    <div class="checkbox-item">
                        <input type="checkbox" id="ptrapDrain${i}" name="basinAddons${i}" value="PTRAP_DRAIN">
                        <label for="ptrapDrain${i}">P-TRAP DISINFECTION DRAIN UNIT</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="checkbox" id="basinLight${i}" name="basinAddons${i}" value="BASIN_LIGHT">
                        <label for="basinLight${i}">BASIN LIGHT</label>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(basinForm);
    }
};

SinkConfigApp.prototype.checkDIBasinSelection = function() {
    const basinForms = document.querySelectorAll('[name^="basinType"]');
    let hasDIBasin = false;

    basinForms.forEach(select => {
        if (select.value === 'E_SINK_DI') {
            hasDIBasin = true;
        }
    });

    const faucetTypeSelect = document.getElementById('faucetType');
    if (hasDIBasin) {
        faucetTypeSelect.value = 'GOOSENECK_DI';
        faucetTypeSelect.disabled = true;
    } else {
        faucetTypeSelect.disabled = false;
    }
};

SinkConfigApp.prototype.updateFaucetPlacementOptions = function(basinCount) {
    const select = document.getElementById('faucetPlacement');
    const options = ['<option value="">Select Placement</option>'];

    for (let i = 1; i <= basinCount; i++) {
        options.push(`<option value="CENTER_BASIN_${i}">Center of Basin ${i}</option>`);
        if (i < basinCount) {
            options.push(`<option value="BETWEEN_${i}_${i+1}">Between Basins ${i}/${i+1}</option>`);
        }
    }

    select.innerHTML = options.join('');
};

SinkConfigApp.prototype.updateFaucetQuantityMax = function(basinCount) {
    const input = document.getElementById('faucetQuantity');
    const maxFaucets = basinCount === 3 ? 3 : 2;
    input.max = maxFaucets;
    
    if (parseInt(input.value) > maxFaucets) {
        input.value = maxFaucets;
    }
};

SinkConfigApp.prototype.validateStep3 = function() {
    let isValid = true;
    const buildConfig = this.orderData.configurations[this.currentBuildNumber] || {};

    // Clear previous errors
    document.querySelectorAll('#step3 .error-message').forEach(msg => {
        msg.classList.remove('show');
    });

    // Validate sink body configuration
    const requiredFields = ['sinkModel', 'sinkWidth', 'sinkLength', 'legsType', 'feetType', 'workFlowDirection'];
    
    requiredFields.forEach(field => {
        const input = document.getElementById(field);
        if (!input || !input.value.trim()) {
            const errorMsg = input?.parentElement?.querySelector('.error-message');
            if (errorMsg) {
                this.showError(errorMsg, `${this.getFieldLabel(field)} is required`);
                isValid = false;
            }
        }
    });

    // Validate sink dimensions
    const sinkLength = parseInt(document.getElementById('sinkLength').value);
    if (sinkLength < 34 || sinkLength > 120) {
        const errorMsg = document.getElementById('sinkLength').parentElement.querySelector('.error-message');
        this.showError(errorMsg, 'Sink length must be between 34 and 120 inches');
        isValid = false;
    }

    // Validate pegboard options if selected
    const pegboard = document.getElementById('pegboard').checked;
    if (pegboard) {
        const pegboardType = document.getElementById('pegboardType').value;
        const pegboardSize = document.getElementById('pegboardSizeOption').value;
        
        if (!pegboardType) {
            const errorMsg = document.getElementById('pegboardType').parentElement.querySelector('.error-message');
            this.showError(errorMsg, 'Pegboard type is required');
            isValid = false;
        }
        
        if (!pegboardSize) {
            const errorMsg = document.getElementById('pegboardSizeOption').parentElement.querySelector('.error-message');
            this.showError(errorMsg, 'Pegboard size is required');
            isValid = false;
        }
    }

    // Validate basin configuration
    const sinkModel = document.getElementById('sinkModel').value;
    const basinCount = this.getBasinCount(sinkModel);
    
    for (let i = 1; i <= basinCount; i++) {
        const basinType = document.getElementById(`basinType${i}`)?.value;
        const basinSize = document.getElementById(`basinSize${i}`)?.value;
        
        if (!basinType) {
            const errorMsg = document.getElementById(`basinType${i}`).parentElement.querySelector('.error-message');
            this.showError(errorMsg, `Basin ${i} type is required`);
            isValid = false;
        }
        
        if (!basinSize) {
            const errorMsg = document.getElementById(`basinSize${i}`).parentElement.querySelector('.error-message');
            this.showError(errorMsg, `Basin ${i} size is required`);
            isValid = false;
        }
    }

    // Validate faucet configuration
    const faucetType = document.getElementById('faucetType').value;
    const faucetQuantity = parseInt(document.getElementById('faucetQuantity').value);
    const faucetPlacement = document.getElementById('faucetPlacement').value;

    if (!faucetType) {
        const errorMsg = document.getElementById('faucetType').parentElement.querySelector('.error-message');
        this.showError(errorMsg, 'Faucet type is required');
        isValid = false;
    }

    if (!faucetQuantity || faucetQuantity < 1) {
        const errorMsg = document.getElementById('faucetQuantity').parentElement.querySelector('.error-message');
        this.showError(errorMsg, 'Number of faucets is required');
        isValid = false;
    } else {
        const maxFaucets = basinCount === 3 ? 3 : 2;
        if (faucetQuantity > maxFaucets) {
            const errorMsg = document.getElementById('faucetQuantity').parentElement.querySelector('.error-message');
            this.showError(errorMsg, `Maximum ${maxFaucets} faucets allowed for ${basinCount} basin sink`);
            isValid = false;
        }
    }

    if (!faucetPlacement) {
        const errorMsg = document.getElementById('faucetPlacement').parentElement.querySelector('.error-message');
        this.showError(errorMsg, 'Faucet placement is required');
        isValid = false;
    }

    // Validate sprayer options if selected
    const sprayer = document.getElementById('sprayer').checked;
    if (sprayer) {
        const sprayerType = document.getElementById('sprayerType').value;
        const sprayerQuantity = document.getElementById('sprayerQuantity').value;
        const sprayerLocation = document.getElementById('sprayerLocation').value;
        
        if (!sprayerType) {
            const errorMsg = document.getElementById('sprayerType').parentElement.querySelector('.error-message');
            this.showError(errorMsg, 'Sprayer type is required');
            isValid = false;
        }
        
        if (!sprayerQuantity) {
            const errorMsg = document.getElementById('sprayerQuantity').parentElement.querySelector('.error-message');
            this.showError(errorMsg, 'Sprayer quantity is required');
            isValid = false;
        }
        
        if (!sprayerLocation) {
            const errorMsg = document.getElementById('sprayerLocation').parentElement.querySelector('.error-message');
            this.showError(errorMsg, 'Sprayer location is required');
            isValid = false;
        }
    }

    return isValid;
};

SinkConfigApp.prototype.saveSinkConfiguration = function() {
    const config = {};
    const sinkModel = document.getElementById('sinkModel').value;
    const basinCount = this.getBasinCount(sinkModel);

    // Save sink body configuration
    config.sinkBody = {
        sinkModel: sinkModel,
        sinkWidth: parseInt(document.getElementById('sinkWidth').value),
        sinkLength: parseInt(document.getElementById('sinkLength').value),
        legsType: document.getElementById('legsType').value,
        feetType: document.getElementById('feetType').value,
        workFlowDirection: document.getElementById('workFlowDirection').value,
        pegboard: document.getElementById('pegboard').checked,
        pegboardType: document.getElementById('pegboardType')?.value || null,
        pegboardSizeOption: document.getElementById('pegboardSizeOption')?.value || null
    };

    // Save basin configuration
    config.basins = [];
    for (let i = 1; i <= basinCount; i++) {
        const basin = {
            basinNumber: i,
            basinType: document.getElementById(`basinType${i}`).value,
            basinSize: document.getElementById(`basinSize${i}`).value,
            addons: []
        };

        // Get basin add-ons
        const addons = document.querySelectorAll(`[name="basinAddons${i}"]:checked`);
        addons.forEach(addon => {
            basin.addons.push(addon.value);
        });

        config.basins.push(basin);
    }

    // Save faucet configuration
    config.faucets = {
        faucetType: document.getElementById('faucetType').value,
        faucetQuantity: parseInt(document.getElementById('faucetQuantity').value),
        faucetPlacement: document.getElementById('faucetPlacement').value,
        sprayer: document.getElementById('sprayer').checked,
        sprayerType: document.getElementById('sprayerType')?.value || null,
        sprayerQuantity: parseInt(document.getElementById('sprayerQuantity')?.value) || null,
        sprayerLocation: document.getElementById('sprayerLocation')?.value || null
    };

    this.orderData.configurations[this.currentBuildNumber] = config;
};

SinkConfigApp.prototype.loadExistingConfiguration = function() {
    const config = this.orderData.configurations[this.currentBuildNumber];
    if (!config) return;

    // Load sink body configuration
    if (config.sinkBody) {
        Object.keys(config.sinkBody).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = config.sinkBody[key];
                } else {
                    element.value = config.sinkBody[key] || '';
                }
            }
        });

        // Trigger events to show/hide dependent sections
        if (config.sinkBody.pegboard) {
            document.getElementById('pegboard-options').style.display = 'block';
        }

        // Generate basin forms based on sink model
        const basinCount = this.getBasinCount(config.sinkBody.sinkModel);
        if (basinCount > 0) {
            this.generateBasinForms(basinCount);
            this.updateFaucetPlacementOptions(basinCount);
            this.updateFaucetQuantityMax(basinCount);
        }
    }

    // Load basin configuration
    if (config.basins) {
        config.basins.forEach(basin => {
            const basinTypeEl = document.getElementById(`basinType${basin.basinNumber}`);
            const basinSizeEl = document.getElementById(`basinSize${basin.basinNumber}`);
            
            if (basinTypeEl) basinTypeEl.value = basin.basinType;
            if (basinSizeEl) basinSizeEl.value = basin.basinSize;

            // Load add-ons
            basin.addons.forEach(addon => {
                const addonEl = document.querySelector(`[name="basinAddons${basin.basinNumber}"][value="${addon}"]`);
                if (addonEl) addonEl.checked = true;
            });
        });
    }

    // Load faucet configuration
    if (config.faucets) {
        Object.keys(config.faucets).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = config.faucets[key];
                } else {
                    element.value = config.faucets[key] || '';
                }
            }
        });

        // Show sprayer options if sprayer is selected
        if (config.faucets.sprayer) {
            document.getElementById('sprayer-options').style.display = 'block';
        }
    }

    // Check for DI basin selection
    this.checkDIBasinSelection();
}; 