// Payment Processing Demo JavaScript

class PaymentDemo {
    constructor() {
        this.apiBase = '/api/v1';
        this.transactions = JSON.parse(localStorage.getItem('demoTransactions') || '[]');
        this.demoMerchantId = null;
        this.chart = null;
        this.isAuthenticated = false;

        this.init();
    }

    init() {
        // Wait for auth manager to be ready
        if (window.authManager) {
            this.isAuthenticated = window.authManager.isAuthenticated();
        }

        this.setupEventListeners();
        this.updateAnalytics();
        this.loadTransactionHistory();
        this.initChart();
        this.createDemoMerchant();
        this.updateAuthUI();
    }

    setupEventListeners() {
        const form = document.getElementById('payment-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processPayment();
            });
        }
    }

    updateAuthUI() {
        // Update authentication status display
        if (window.authManager) {
            this.isAuthenticated = window.authManager.isAuthenticated();
            window.authManager.updateAuthUI();
        }
    }

    async createDemoMerchant() {
        try {
            // Try to create a demo merchant for the demo
            const merchantData = {
                businessName: "Demo Coffee Shop",
                contactEmail: "demo@coffeeshop.com",
                contactPhone: "+1-555-DEMO-123",
                businessAddress: {
                    street: "123 Demo Street",
                    city: "Demo City",
                    state: "DC",
                    zipCode: "12345",
                    country: "US"
                },
                businessType: "retail",
                website: "https://demo-coffee.com",
                description: "A demo coffee shop for testing payments"
            };

            // This might fail if authentication is required, which is fine for demo
            const response = await fetch(`${this.apiBase}/merchants`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(merchantData)
            });

            if (response.ok) {
                const merchant = await response.json();
                this.demoMerchantId = merchant.id;
                console.log('Demo merchant created:', merchant.id);
            }
        } catch (error) {
            console.log('Demo merchant creation skipped (authentication required)');
            // Use a mock merchant ID for demo purposes
            this.demoMerchantId = 'demo-merchant-' + Date.now();
        }
    }

    async processPayment() {
        this.updateStatus('pending', 'Processing payment...');
        this.updateStep(2);

        const formData = {
            merchantId: document.getElementById('merchant-id').value || this.demoMerchantId,
            amount: parseFloat(document.getElementById('amount').value),
            currency: document.getElementById('currency').value,
            paymentMethod: document.getElementById('payment-method').value,
            customerEmail: document.getElementById('customer-email').value,
            description: document.getElementById('description').value,
            metadata: {
                demo: true,
                timestamp: new Date().toISOString(),
                source: 'interactive-demo'
            }
        };

        try {
            // Prepare headers - use auth if available
            const headers = {
                'Content-Type': 'application/json'
            };

            if (this.isAuthenticated && window.authManager) {
                const authHeaders = window.authManager.getAuthHeaders();
                Object.assign(headers, authHeaders);
            }

            const response = await fetch(`${this.apiBase}/transactions`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const transaction = await response.json();
                this.handleSuccessfulTransaction(transaction, formData);
            } else {
                const error = await response.json();

                // Handle authentication errors specially
                if (response.status === 401 || response.status === 403) {
                    this.handleAuthenticationError(error, formData);
                } else {
                    this.handleTransactionError(error, formData);
                }
            }
        } catch (error) {
            console.error('Transaction error:', error);
            this.handleTransactionError({ 
                message: 'Network error - using demo mode',
                code: 'DEMO_MODE'
            }, formData);
        }
    }

    handleSuccessfulTransaction(transaction, formData) {
        this.updateStatus('success', 'Payment processed successfully!');
        this.updateStep(3);

        // Display API response
        this.updateApiResponse({
            success: true,
            message: "Transaction processed successfully",
            data: {
                transactionId: transaction.transactionId || `demo-tx-${Date.now()}`,
                status: transaction.status || 'completed',
                amount: formData.amount,
                currency: formData.currency,
                paymentMethod: formData.paymentMethod,
                riskAssessment: {
                    score: Math.random() * 0.3, // Low risk for demo
                    level: 'low',
                    factors: ['verified_email', 'normal_amount', 'trusted_device']
                },
                fees: {
                    processing: (formData.amount * 0.029).toFixed(2),
                    fixed: 0.30
                },
                estimatedSettlement: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            timestamp: new Date().toISOString(),
            requestId: `req-${Date.now()}`
        });

        // Add to transaction history
        const demoTransaction = {
            id: transaction.id || `demo-${Date.now()}`,
            transactionId: transaction.transactionId || `demo-tx-${Date.now()}`,
            amount: formData.amount,
            currency: formData.currency,
            status: transaction.status || 'completed',
            paymentMethod: formData.paymentMethod,
            customerEmail: formData.customerEmail,
            description: formData.description,
            createdAt: new Date().toISOString(),
            riskScore: Math.random() * 0.3
        };

        this.transactions.unshift(demoTransaction);
        this.saveTransactions();
        this.updateAnalytics();
        this.loadTransactionHistory();
        this.updateChart();

        setTimeout(() => {
            this.updateStep(4);
        }, 2000);
    }

    handleAuthenticationError(error, formData) {
        this.updateStatus('error', 'Authentication required for live transactions');

        // Show authentication error but offer demo mode
        this.updateApiResponse({
            success: false,
            error: {
                code: "AUTHENTICATION_REQUIRED",
                message: "Authentication required for live transactions",
                details: "You can still try the demo mode below, or login for full API access"
            },
            demo_mode_available: true,
            login_url: "/ui/auth/login.html",
            timestamp: new Date().toISOString(),
            requestId: `req-${Date.now()}`
        });

        // Offer to create demo transaction instead
        setTimeout(() => {
            if (confirm('Authentication required for live transactions. Would you like to create a demo transaction instead?')) {
                this.createDemoTransaction(formData);
            }
        }, 1000);
    }

    handleTransactionError(error, formData) {
        // Even on error, create a demo transaction for demonstration
        this.updateStatus('error', error.message || 'Transaction failed');
        
        // Show error response but still create demo data
        this.updateApiResponse({
            success: false,
            error: {
                code: error.code || 'DEMO_ERROR',
                message: error.message || 'This is a demo error for illustration',
                details: 'In a real environment, this would contain specific error details'
            },
            timestamp: new Date().toISOString(),
            requestId: `req-${Date.now()}`
        });

        // Create a demo failed transaction
        const demoTransaction = {
            id: `demo-failed-${Date.now()}`,
            transactionId: `demo-tx-failed-${Date.now()}`,
            amount: formData.amount,
            currency: formData.currency,
            status: 'failed',
            paymentMethod: formData.paymentMethod,
            customerEmail: formData.customerEmail,
            description: formData.description,
            createdAt: new Date().toISOString(),
            riskScore: Math.random() * 0.8 + 0.2, // Higher risk for failed transactions
            errorReason: error.message || 'Demo error'
        };

        this.transactions.unshift(demoTransaction);
        this.saveTransactions();
        this.updateAnalytics();
        this.loadTransactionHistory();
    }

    createDemoTransaction(formData) {
        this.updateStatus('success', 'Demo transaction created successfully!');
        this.updateStep(3);

        // Create a successful demo transaction
        this.updateApiResponse({
            success: true,
            message: "Demo transaction created successfully",
            demo_mode: true,
            data: {
                transactionId: `demo-tx-${Date.now()}`,
                status: 'completed',
                amount: formData.amount,
                currency: formData.currency,
                paymentMethod: formData.paymentMethod,
                riskAssessment: {
                    score: Math.random() * 0.3, // Low risk for demo
                    level: 'low',
                    factors: ['demo_mode', 'verified_email', 'normal_amount']
                },
                fees: {
                    processing: (formData.amount * 0.029).toFixed(2),
                    fixed: 0.30
                },
                estimatedSettlement: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            timestamp: new Date().toISOString(),
            requestId: `req-${Date.now()}`
        });

        // Add to transaction history
        const demoTransaction = {
            id: `demo-${Date.now()}`,
            transactionId: `demo-tx-${Date.now()}`,
            amount: formData.amount,
            currency: formData.currency,
            status: 'completed',
            paymentMethod: formData.paymentMethod,
            customerEmail: formData.customerEmail,
            description: formData.description + ' (Demo Mode)',
            createdAt: new Date().toISOString(),
            riskScore: Math.random() * 0.3,
            demo: true
        };

        this.transactions.unshift(demoTransaction);
        this.saveTransactions();
        this.updateAnalytics();
        this.loadTransactionHistory();

        // Continue to next step
        setTimeout(() => {
            this.updateStep(4);
        }, 2000);
    }

    updateStatus(type, message) {
        const statusElement = document.getElementById('api-status');
        const iconMap = {
            pending: 'fas fa-spinner fa-spin',
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle'
        };

        statusElement.innerHTML = `
            <span class="status-indicator status-${type}">
                <i class="${iconMap[type]} me-1"></i>
                ${message}
            </span>
        `;
    }

    updateApiResponse(data) {
        const responseElement = document.getElementById('api-response');
        responseElement.textContent = JSON.stringify(data, null, 2);
    }

    updateStep(stepNumber) {
        // Update step indicators
        for (let i = 1; i <= 4; i++) {
            const step = document.getElementById(`step-${i}`);
            if (i < stepNumber) {
                step.className = 'step completed';
            } else if (i === stepNumber) {
                step.className = 'step active';
            } else {
                step.className = 'step';
            }
        }
    }

    updateAnalytics() {
        const completedTransactions = this.transactions.filter(tx => tx.status === 'completed');
        const totalVolume = completedTransactions.reduce((sum, tx) => sum + tx.amount, 0);
        const avgAmount = completedTransactions.length > 0 ? totalVolume / completedTransactions.length : 0;

        document.getElementById('demo-total-transactions').textContent = this.transactions.length;
        document.getElementById('demo-total-volume').textContent = `$${totalVolume.toFixed(2)}`;
        document.getElementById('demo-avg-amount').textContent = `$${avgAmount.toFixed(2)}`;
    }

    loadTransactionHistory() {
        const historyElement = document.getElementById('transaction-history');
        
        if (this.transactions.length === 0) {
            historyElement.innerHTML = '<p class="text-muted text-center">No transactions yet. Create your first payment above!</p>';
            return;
        }

        const html = this.transactions.slice(0, 5).map(tx => `
            <div class="transaction-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${tx.transactionId}</strong>
                        <br>
                        <small class="text-muted">${tx.description}</small>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold">$${tx.amount} ${tx.currency}</div>
                        <span class="status-indicator status-${tx.status === 'completed' ? 'success' : tx.status}">
                            ${tx.status}
                        </span>
                    </div>
                </div>
                <div class="mt-2">
                    <small class="text-muted">
                        ${tx.paymentMethod} • Risk: ${(tx.riskScore * 100).toFixed(1)}% • 
                        ${new Date(tx.createdAt).toLocaleString()}
                    </small>
                </div>
            </div>
        `).join('');

        historyElement.innerHTML = html;
    }

    initChart() {
        const ctx = document.getElementById('demo-chart');
        if (!ctx) return;

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Start'],
                datasets: [{
                    label: 'Transaction Volume',
                    data: [0],
                    borderColor: 'rgb(102, 126, 234)',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    }
                }
            }
        });
    }

    updateChart() {
        if (!this.chart) return;

        const completedTransactions = this.transactions.filter(tx => tx.status === 'completed');
        let runningTotal = 0;
        const data = [0]; // Start with 0
        const labels = ['Start'];

        completedTransactions.reverse().forEach((tx, index) => {
            runningTotal += tx.amount;
            data.push(runningTotal);
            labels.push(`Tx ${index + 1}`);
        });

        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = data;
        this.chart.update();
    }

    saveTransactions() {
        localStorage.setItem('demoTransactions', JSON.stringify(this.transactions));
    }

    clearDemoData() {
        this.transactions = [];
        this.saveTransactions();
        this.updateAnalytics();
        this.loadTransactionHistory();
        this.updateChart();
        this.updateStatus('pending', 'Demo data cleared - ready for new transactions');
        this.updateStep(1);
    }
}

// Global functions for UI interactions
function downloadSDK() {
    alert('SDK download would be available in production. This includes:\n\n• Node.js SDK\n• Python SDK\n• PHP SDK\n• Java SDK\n• Code examples\n• Integration guides');
}

function scheduleDemo() {
    alert('Demo scheduling would redirect to a calendar booking system in production.\n\nFeatures would include:\n\n• Live 1-on-1 demo\n• Custom use case discussion\n• Integration planning\n• Q&A session');
}

function clearDemoData() {
    if (confirm('Clear all demo transaction data?')) {
        window.demo.clearDemoData();
    }
}

// Initialize demo when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.demo = new PaymentDemo();

    // Add clear data button to the page
    const clearButton = document.createElement('button');
    clearButton.className = 'btn btn-outline-danger btn-sm position-fixed';
    clearButton.style.cssText = 'bottom: 20px; right: 20px; z-index: 1000;';
    clearButton.innerHTML = '<i class="fas fa-trash me-1"></i>Clear Demo Data';
    clearButton.onclick = clearDemoData;
    document.body.appendChild(clearButton);

    // Add monitoring dashboard link
    const monitorButton = document.createElement('button');
    monitorButton.className = 'btn btn-outline-info btn-sm position-fixed';
    monitorButton.style.cssText = 'bottom: 70px; right: 20px; z-index: 1000;';
    monitorButton.innerHTML = '<i class="fas fa-chart-line me-1"></i>Live Monitor';
    monitorButton.onclick = () => window.open('/ui/dashboard', '_blank');
    document.body.appendChild(monitorButton);
});
