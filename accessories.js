// Accessories Module - Step 4 Logic
SinkConfigApp.prototype.renderAccessories = function() {
    const content = document.getElementById('accessories-content');
    this.updateBuildIndicator();
    
    content.innerHTML = `
        <div class="accessory-category">
            <h4>Baskets, Bins & Shelves</h4>
            <div class="accessory-grid">
                <div class="accessory-item">
                    <label>
                        <input type="checkbox" name="accessory" value="T-OA-BINRAIL-24-KIT">
                        <span class="accessory-name">BIN RAIL, 24" KIT</span>
                    </label>
                    <input type="number" class="quantity-input" min="1" max="10" value="1" placeholder="Qty">
                </div>
                
                <div class="accessory-item">
                    <label>
                        <input type="checkbox" name="accessory" value="T-OA-PFW1236FM-KIT">
                        <span class="accessory-name">WIRE BASKET, SLOT BRACKET HELD, CHROME, 36"W X 12"D KIT</span>
                    </label>
                    <input type="number" class="quantity-input" min="1" max="10" value="1" placeholder="Qty">
                </div>
                
                <div class="accessory-item">
                    <label>
                        <input type="checkbox" name="accessory" value="T-OA-SSSHELF-1812">
                        <span class="accessory-name">STAINLESS STEEL SHELF, 18" x 12"</span>
                    </label>
                    <input type="number" class="quantity-input" min="1" max="10" value="1" placeholder="Qty">
                </div>
                
                <div class="accessory-item">
                    <label>
                        <input type="checkbox" name="accessory" value="T-OA-SSSHELF-3612">
                        <span class="accessory-name">STAINLESS STEEL SHELF, 36" x 12"</span>
                    </label>
                    <input type="number" class="quantity-input" min="1" max="10" value="1" placeholder="Qty">
                </div>
            </div>
        </div>

        <div class="accessory-category">
            <h4>Holders, Plates & Hangers</h4>
            <div class="accessory-grid">
                <div class="accessory-item">
                    <label>
                        <input type="checkbox" name="accessory" value="T-OA-1BRUSH-ORG-PB-KIT">
                        <span class="accessory-name">1 BRUSH ORGANIZER PEGBOARD KIT</span>
                    </label>
                    <input type="number" class="quantity-input" min="1" max="10" value="1" placeholder="Qty">
                </div>
                
                <div class="accessory-item">
                    <label>
                        <input type="checkbox" name="accessory" value="T-OA-6BRUSH-ORG-PB-KIT">
                        <span class="accessory-name">6 BRUSH ORGANIZER PEGBOARD KIT</span>
                    </label>
                    <input type="number" class="quantity-input" min="1" max="10" value="1" placeholder="Qty">
                </div>
                
                <div class="accessory-item">
                    <label>
                        <input type="checkbox" name="accessory" value="T-OA-PB-SS-1L-SHLF">
                        <span class="accessory-name">PEGBOARD SS 1 LITER SHELF</span>
                    </label>
                    <input type="number" class="quantity-input" min="1" max="10" value="1" placeholder="Qty">
                </div>
                
                <div class="accessory-item">
                    <label>
                        <input type="checkbox" name="accessory" value="T-OA-PB-SS-2GLOVE">
                        <span class="accessory-name">PEGBOARD SS 2 GLOVE DISPENSER</span>
                    </label>
                    <input type="number" class="quantity-input" min="1" max="10" value="1" placeholder="Qty">
                </div>
            </div>
        </div>

        <div class="accessory-category">
            <h4>Lighting Add-ons</h4>
            <div class="accessory-grid">
                <div class="accessory-item">
                    <label>
                        <input type="checkbox" name="accessory" value="T-OA-MLIGHT-PB-KIT">
                        <span class="accessory-name">MONITOR LIGHT PEGBOARD KIT</span>
                    </label>
                    <input type="number" class="quantity-input" min="1" max="10" value="1" placeholder="Qty">
                </div>
                
                <div class="accessory-item">
                    <label>
                        <input type="checkbox" name="accessory" value="T-OA-TASKLIGHT-PB">
                        <span class="accessory-name">TASK LIGHT PEGBOARD</span>
                    </label>
                    <input type="number" class="quantity-input" min="1" max="10" value="1" placeholder="Qty">
                </div>
            </div>
        </div>

        <div class="accessory-category">
            <h4>Electronic & Digital Add-ons</h4>
            <div class="accessory-grid">
                <div class="accessory-item">
                    <label>
                        <input type="checkbox" name="accessory" value="T-OA-MNT-ARM">
                        <span class="accessory-name">MONITOR MOUNTING ARM</span>
                    </label>
                    <input type="number" class="quantity-input" min="1" max="10" value="1" placeholder="Qty">
                </div>
                
                <div class="accessory-item">
                    <label>
                        <input type="checkbox" name="accessory" value="T-OA-KB-MOUSE-ARM">
                        <span class="accessory-name">KEYBOARD & MOUSE ARM</span>
                    </label>
                    <input type="number" class="quantity-input" min="1" max="10" value="1" placeholder="Qty">
                </div>
            </div>
        </div>

        <div class="accessory-category">
            <h4>Faucet, Outlet, Drain, Sprayer Kits</h4>
            <div class="accessory-grid">
                <div class="accessory-item">
                    <label>
                        <input type="checkbox" name="accessory" value="T2-OA-MS-1026">
                        <span class="accessory-name">P-TRAP DISINFECTION DRAIN UNIT</span>
                    </label>
                    <input type="number" class="quantity-input" min="1" max="10" value="1" placeholder="Qty">
                </div>
                
                <div class="accessory-item">
                    <label>
                        <input type="checkbox" name="accessory" value="T2-EYEWASH-FAUCET-MNT">
                        <span class="accessory-name">EYEWASH FAUCET MOUNT</span>
                    </label>
                    <input type="number" class="quantity-input" min="1" max="10" value="1" placeholder="Qty">
                </div>
            </div>
        </div>

        <div class="accessory-category">
            <h4>Drawers & Compartments</h4>
            <div class="accessory-grid">
                <div class="accessory-item">
                    <label>
                        <input type="checkbox" name="accessory" value="T2-OA-2D-152012-STACKED-KIT">
                        <span class="accessory-name">2 DRAWER STACKED KIT (15"x20"x12")</span>
                    </label>
                    <input type="number" class="quantity-input" min="1" max="10" value="1" placeholder="Qty">
                </div>
                
                <div class="accessory-item">
                    <label>
                        <input type="checkbox" name="accessory" value="T2-OA-PO-SHLF-1212">
                        <span class="accessory-name">PULL-OUT SHELF (12"x12")</span>
                    </label>
                    <input type="number" class="quantity-input" min="1" max="10" value="1" placeholder="Qty">
                </div>
            </div>
        </div>

        <div style="text-align: center; margin-top: 30px;">
            <p class="text-muted">
                Configuring accessories for <strong>${this.currentBuildNumber}</strong>
                <br>
                <small>You can select multiple accessories and specify quantities for each</small>
            </p>
        </div>
    `;

    // Load existing accessory selections if available
    this.loadExistingAccessories();
    
    // Set up event listeners for accessories
    this.setupAccessoryEventListeners();
};

SinkConfigApp.prototype.setupAccessoryEventListeners = function() {
    const accessoryCheckboxes = document.querySelectorAll('[name="accessory"]');
    
    accessoryCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const quantityInput = e.target.closest('.accessory-item').querySelector('.quantity-input');
            quantityInput.disabled = !e.target.checked;
            if (!e.target.checked) {
                quantityInput.value = 1; // Reset to 1 when unchecked
            }
        });
    });

    // Initially disable quantity inputs for unchecked accessories
    accessoryCheckboxes.forEach(checkbox => {
        const quantityInput = checkbox.closest('.accessory-item').querySelector('.quantity-input');
        quantityInput.disabled = !checkbox.checked;
    });
};

SinkConfigApp.prototype.saveAccessories = function() {
    const accessories = [];
    const checkedAccessories = document.querySelectorAll('[name="accessory"]:checked');
    
    checkedAccessories.forEach(checkbox => {
        const quantityInput = checkbox.closest('.accessory-item').querySelector('.quantity-input');
        const quantity = parseInt(quantityInput.value) || 1;
        
        accessories.push({
            assemblyId: checkbox.value,
            quantity: quantity
        });
    });

    this.orderData.accessories[this.currentBuildNumber] = accessories;
};

SinkConfigApp.prototype.loadExistingAccessories = function() {
    const accessories = this.orderData.accessories[this.currentBuildNumber];
    if (!accessories) return;

    accessories.forEach(accessory => {
        const checkbox = document.querySelector(`[name="accessory"][value="${accessory.assemblyId}"]`);
        if (checkbox) {
            checkbox.checked = true;
            const quantityInput = checkbox.closest('.accessory-item').querySelector('.quantity-input');
            quantityInput.value = accessory.quantity;
            quantityInput.disabled = false;
        }
    });
};

SinkConfigApp.prototype.validateStep4 = function() {
    // Step 4 validation is optional - no required accessories
    return true;
}; 