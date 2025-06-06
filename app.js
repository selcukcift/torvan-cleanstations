// CleanStation Sink Configuration Tool - Main Application
class SinkConfigApp {
    constructor() {
        this.currentStep = 1;
        this.currentBuildNumber = null;
        this.currentBuildIndex = 0;
        this.data = {
            assemblies: null,
            parts: null,
            categories: null
        };
        this.orderData = {
            customer: {},
            sinks: [],
            buildNumbers: [],
            configurations: {},
            accessories: {}
        };
        this.bom = [];
        
        this.init();
    }

    async init() {
        this.showLoading(true);
        await this.loadData();
        this.setupEventListeners();
        this.showLoading(false);
    }

    async loadData() {
        try {
            const [assembliesResponse, partsResponse, categoriesResponse] = await Promise.all([
                fetch('/api/assemblies'), // Updated endpoint
                fetch('/api/parts'),       // Updated endpoint
                fetch('/api/categories')  // Updated endpoint
            ]);

            this.data.assemblies = await assembliesResponse.json();
            this.data.parts = await partsResponse.json();
            this.data.categories = await categoriesResponse.json();

            console.log('Data loaded successfully from backend APIs');
        } catch (error) {
            console.error('Error loading data from backend APIs:', error);
            alert('Error loading configuration data. Please refresh the page.');
        }
    }

    setupEventListeners() {
        // Navigation buttons
        document.getElementById('next-btn').addEventListener('click', () => this.nextStep());
        document.getElementById('prev-btn').addEventListener('click', () => this.prevStep());

        // Step 1 - Customer form
        document.getElementById('customer-form').addEventListener('input', this.validateStep1);

        // Step 2 - Sink selection
        document.getElementById('sinkFamily').addEventListener('change', this.handleSinkFamilyChange);
        document.getElementById('quantity').addEventListener('input', this.handleQuantityChange);

        // Step 5 - BOM generation
        document.getElementById('generate-csv').addEventListener('click', () => this.generateCSV());
        document.getElementById('edit-config').addEventListener('click', () => this.editConfiguration());

        // Set minimum date for delivery date
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('wantDate').min = today;
    }

    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
    }

    updateProgressBar() {
        const steps = document.querySelectorAll('.progress-bar .step');
        steps.forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNumber === this.currentStep) {
                step.classList.add('active');
            } else if (stepNumber < this.currentStep) {
                step.classList.add('completed');
            }
        });
    }

    showStep(stepNumber) {
        // Hide all steps
        document.querySelectorAll('.step-content').forEach(step => {
            step.classList.remove('active');
        });

        // Show current step
        document.getElementById(`step${stepNumber}`).classList.add('active');

        // Update navigation buttons
        document.getElementById('prev-btn').style.display = stepNumber > 1 ? 'block' : 'none';
        
        const nextBtn = document.getElementById('next-btn');
        if (stepNumber === 5) {
            nextBtn.style.display = 'none';
        } else {
            nextBtn.style.display = 'block';
            nextBtn.textContent = stepNumber === 4 ? 'Review & Generate BOM' : 'Next';
        }

        this.updateProgressBar();
    }

    validateStep1 = () => {
        const form = document.getElementById('customer-form');
        const formData = new FormData(form);
        let isValid = true;

        // Clear previous errors
        document.querySelectorAll('#step1 .error-message').forEach(msg => {
            msg.classList.remove('show');
        });

        // Validate required fields
        const requiredFields = ['poNumber', 'customerName', 'salesPerson', 'wantDate', 'language'];
        
        requiredFields.forEach(field => {
            const input = document.getElementById(field);
            const value = formData.get(field)?.trim();
            const errorMsg = input.parentElement.querySelector('.error-message');

            if (!value) {
                this.showError(errorMsg, `${this.getFieldLabel(field)} is required`);
                isValid = false;
            } else if (field !== 'wantDate' && field !== 'language' && value.length < 3) {
                this.showError(errorMsg, `${this.getFieldLabel(field)} must be at least 3 characters`);
                isValid = false;
            } else if (field === 'wantDate') {
                const selectedDate = new Date(value);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                if (selectedDate <= today) {
                    this.showError(errorMsg, 'Delivery date must be in the future');
                    isValid = false;
                }
            }
        });

        // Validate project name if provided
        const projectName = formData.get('projectName')?.trim();
        if (projectName && projectName.length < 3) {
            const errorMsg = document.getElementById('projectName').parentElement.querySelector('.error-message');
            this.showError(errorMsg, 'Project name must be at least 3 characters if provided');
            isValid = false;
        }

        return isValid;
    };

    validateStep2() {
        const sinkFamily = document.getElementById('sinkFamily').value;
        if (!sinkFamily) {
            this.showError(
                document.getElementById('sinkFamily').parentElement.querySelector('.error-message'),
                'Please select a sink family'
            );
            return false;
        }

        if (sinkFamily === 'MDRD') {
            const quantity = parseInt(document.getElementById('quantity').value);
            if (!quantity || quantity < 1) {
                this.showError(
                    document.getElementById('quantity').parentElement.querySelector('.error-message'),
                    'Please enter a valid quantity'
                );
                return false;
            }

            // Validate build numbers
            const buildInputs = document.querySelectorAll('[name^="buildNumber"]');
            const buildNumbers = [];
            let isValid = true;

            buildInputs.forEach(input => {
                const value = input.value.trim();
                const errorMsg = input.parentElement.querySelector('.error-message');

                if (!value) {
                    this.showError(errorMsg, 'Build number is required');
                    isValid = false;
                } else if (buildNumbers.includes(value)) {
                    this.showError(errorMsg, 'Build numbers must be unique');
                    isValid = false;
                } else {
                    buildNumbers.push(value);
                }
            });

            return isValid;
        }

        return sinkFamily !== '';
    }

    handleSinkFamilyChange = (e) => {
        const family = e.target.value;
        const constructionMsg = document.getElementById('construction-message');
        const mdrdOptions = document.getElementById('mdrd-options');

        if (family === 'MDRD') {
            constructionMsg.style.display = 'none';
            mdrdOptions.style.display = 'block';
        } else if (family === 'Endoscope' || family === 'InstroSink') {
            constructionMsg.style.display = 'block';
            mdrdOptions.style.display = 'none';
        } else {
            constructionMsg.style.display = 'none';
            mdrdOptions.style.display = 'none';
        }
    };

    handleQuantityChange = (e) => {
        const quantity = parseInt(e.target.value);
        const container = document.getElementById('build-numbers-container');
        const section = document.getElementById('build-numbers-section');

        if (quantity > 0) {
            section.style.display = 'block';
            this.generateBuildNumberInputs(quantity);
        } else {
            section.style.display = 'none';
        }
    };

    generateBuildNumberInputs(quantity) {
        const container = document.getElementById('build-numbers-container');
        container.innerHTML = '';

        for (let i = 1; i <= quantity; i++) {
            const div = document.createElement('div');
            div.className = 'form-group';
            div.innerHTML = `
                <label for="buildNumber${i}">Enter Unique Build # for Sink ${i} *</label>
                <input type="text" id="buildNumber${i}" name="buildNumber${i}" required>
                <div class="error-message"></div>
            `;
            container.appendChild(div);
        }
    }

    showError(errorElement, message) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }

    getFieldLabel(fieldName) {
        const labels = {
            poNumber: 'PO Number',
            customerName: 'Customer Name',
            projectName: 'Project Name',
            salesPerson: 'Sales Person',
            wantDate: 'Desired Delivery Date',
            language: 'Order Language',
            sinkModel: 'Sink Model',
            sinkWidth: 'Sink Width',
            sinkLength: 'Sink Length',
            legsType: 'Legs Type',
            feetType: 'Feet Type',
            workFlowDirection: 'Work Flow Direction'
        };
        return labels[fieldName] || fieldName;
    }

    async nextStep() {
        let canProceed = false;

        switch (this.currentStep) {
            case 1:
                canProceed = this.validateStep1();
                if (canProceed) {
                    this.saveCustomerData();
                }
                break;
            case 2:
                canProceed = this.validateStep2();
                if (canProceed) {
                    this.saveSinkSelection();
                    this.initializeConfigurations();
                }
                break;
            case 3:
                canProceed = this.validateStep3();
                if (canProceed) {
                    this.saveSinkConfiguration();
                    this.proceedToNextSinkOrStep();
                    return; // Don't increment step here, handled in proceedToNextSinkOrStep
                }
                break;
            case 4:
                canProceed = this.validateStep4();
                if (canProceed) {
                    this.saveAccessories();
                    this.proceedToNextAccessoryOrStep();
                    return; // Don't increment step here, handled in proceedToNextAccessoryOrStep
                }
                break;
        }

        if (canProceed && this.currentStep < 5) {
            this.currentStep++;
            this.showStep(this.currentStep);
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.showStep(this.currentStep);
        }
    }

    saveCustomerData() {
        const form = document.getElementById('customer-form');
        const formData = new FormData(form);
        
        this.orderData.customer = {
            poNumber: formData.get('poNumber'),
            customerName: formData.get('customerName'),
            projectName: formData.get('projectName') || '',
            salesPerson: formData.get('salesPerson'),
            wantDate: formData.get('wantDate'),
            language: formData.get('language'),
            notes: formData.get('notes') || ''
        };
    }

    saveSinkSelection() {
        const sinkFamily = document.getElementById('sinkFamily').value;
        const quantity = parseInt(document.getElementById('quantity').value);
        
        this.orderData.sinkFamily = sinkFamily;
        this.orderData.quantity = quantity;

        if (sinkFamily === 'MDRD') {
            const buildNumbers = [];
            for (let i = 1; i <= quantity; i++) {
                const buildNumber = document.getElementById(`buildNumber${i}`).value.trim();
                buildNumbers.push(buildNumber);
            }
            this.orderData.buildNumbers = buildNumbers;
        }
    }

    initializeConfigurations() {
        if (this.orderData.sinkFamily === 'MDRD') {
            this.orderData.buildNumbers.forEach(buildNumber => {
                this.orderData.configurations[buildNumber] = {};
                this.orderData.accessories[buildNumber] = {};
            });
            this.currentBuildIndex = 0;
            this.currentBuildNumber = this.orderData.buildNumbers[0];
            this.renderSinkConfiguration();
        }
    }

    proceedToNextSinkOrStep() {
        this.currentBuildIndex++;
        
        if (this.currentBuildIndex < this.orderData.buildNumbers.length) {
            // Configure next sink
            this.currentBuildNumber = this.orderData.buildNumbers[this.currentBuildIndex];
            this.renderSinkConfiguration();
            this.updateBuildIndicator();
        } else {
            // All sinks configured, move to accessories
            this.currentStep++;
            this.currentBuildIndex = 0;
            this.currentBuildNumber = this.orderData.buildNumbers[0];
            this.renderAccessories();
            this.showStep(this.currentStep);
        }
    }

    async proceedToNextAccessoryOrStep() { // Made async
        this.currentBuildIndex++;
        
        if (this.currentBuildIndex < this.orderData.buildNumbers.length) {
            // Configure accessories for next sink
            this.currentBuildNumber = this.orderData.buildNumbers[this.currentBuildIndex];
            this.renderAccessories();
            this.updateBuildIndicator();
        } else {
            // All accessories configured, move to review
            this.currentStep++;
            this.currentBuildIndex = 0;
            this.currentBuildNumber = null;
            
            // Call backend to generate BOM
            this.showLoading(true);
            try {
                const response = await fetch('/api/bom/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(this.orderData),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }

                this.bom = await response.json();
                console.log('BOM received from backend:', this.bom);
                this.displayReview();
            } catch (error) {
                console.error('Error generating BOM:', error);
                alert(`Error generating BOM: ${error.message}. Please try again.`);
                // Optionally, revert to a previous step or allow user to retry
                this.currentStep--; // Go back to accessories step
            } finally {
                this.showLoading(false);
            }
            
            this.showStep(this.currentStep);
        }
    }

    updateBuildIndicator() {
        const indicator = document.getElementById('current-build-indicator');
        const buildNumberSpan = document.getElementById('current-build-number');
        
        if (this.currentStep === 3 || this.currentStep === 4) {
            indicator.style.display = 'block';
            buildNumberSpan.textContent = this.currentBuildNumber;
        } else {
            indicator.style.display = 'none';
        }
    }

    // Additional methods will be added in separate files for modularity
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.sinkConfigApp = new SinkConfigApp();
});