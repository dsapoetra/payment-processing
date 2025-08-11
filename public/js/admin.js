// Admin Dashboard JavaScript
console.log('=== ADMIN.JS LOADING ===', new Date());

class AdminDashboard {
    constructor() {
        this.apiBase = '/api/v1';
        this.token = localStorage.getItem('authToken');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.tenant = JSON.parse(localStorage.getItem('tenant') || 'null');
        this.charts = {};
        this.refreshInterval = null;

        this.init();
    }

    async init() {
        console.log('=== ADMIN INIT CALLED ===');

        // Check authentication AGGRESSIVELY
        const authCheck = this.isAuthenticated();
        console.log('Basic authentication check result:', authCheck);

        if (!authCheck) {
            console.log('BASIC AUTH FAILED - Redirecting to login');
            this.redirectToLogin();
            return;
        }

        // TEMPORARILY SKIP SERVER VALIDATION - just use basic auth check
        console.log('Basic auth passed, skipping server validation for now...');

        console.log('FULLY AUTHENTICATED - Loading dashboard');

        // Show the page content by adding authenticated class
        document.body.classList.add('authenticated');
        console.log('Page content now visible');

        this.setupNavigation();
        this.setupEventListeners();
        this.loadDashboardData();
        this.loadMerchants();
        this.startAutoRefresh();
        this.startAuthCheck();

        // Handle URL hash for SPA navigation
        this.initSPANavigation();
    }

    initSPANavigation() {
        // Handle initial page load with hash
        const hash = window.location.hash.substring(1); // Remove the # symbol
        if (hash && hash !== 'dashboard') {
            // Check if the section exists
            const sectionElement = document.getElementById(`${hash}-section`);
            if (sectionElement) {
                this.showSection(hash);
                this.updateActiveNav(document.querySelector(`[data-section="${hash}"]`));
            } else {
                // Invalid hash, show dashboard
                this.showSection('dashboard');
            }
        } else {
            // No hash or dashboard hash, show dashboard
            this.showSection('dashboard');
        }

        // Handle browser back/forward navigation
        window.addEventListener('hashchange', () => {
            const newHash = window.location.hash.substring(1);
            if (newHash && newHash !== 'dashboard') {
                const sectionElement = document.getElementById(`${newHash}-section`);
                if (sectionElement) {
                    this.showSection(newHash);
                    this.updateActiveNav(document.querySelector(`[data-section="${newHash}"]`));
                }
            } else {
                this.showSection('dashboard');
                this.updateActiveNav(document.querySelector(`[data-section="dashboard"]`));
            }
        });
    }

    redirectToLogin() {
        console.log('Authentication required. Redirecting to login.');
        window.location.href = '/ui/auth/login.html?redirect=' + encodeURIComponent(window.location.pathname);
    }

    isAuthenticated() {
        // Always check localStorage directly to ensure fresh data
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('user');
        const tenant = localStorage.getItem('tenant');

        console.log('Auth check - Token exists:', !!token);
        console.log('Auth check - User exists:', !!user);
        console.log('Auth check - Tenant exists:', !!tenant);

        // Update instance variables
        this.token = token;
        this.user = user ? JSON.parse(user) : null;
        this.tenant = tenant ? JSON.parse(tenant) : null;

        return !!(token && user && tenant);
    }

    async validateTokenWithServer() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.log('No token found');
            return false;
        }

        try {
            console.log('Validating token with server using /auth/me...');
            const response = await fetch('/api/v1/auth/me', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Token validation response status:', response.status);

            if (response.status === 401 || response.status === 403) {
                console.log('Token is invalid or expired');
                this.clearAuthData();
                return false;
            }

            if (response.ok) {
                console.log('Token is valid');
                return true;
            }

            console.log('Token validation failed with status:', response.status);
            return false;

        } catch (error) {
            console.error('Token validation error:', error);
            // Don't fail validation on network errors - assume token is valid
            console.log('Network error during validation, assuming token is valid');
            return true;
        }
    }

    clearAuthData() {
        console.log('Clearing all auth data...');

        // Clear localStorage
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('tenant');
        localStorage.removeItem('refreshToken');

        // Clear sessionStorage
        sessionStorage.clear();

        // Clear instance variables
        this.token = null;
        this.user = null;
        this.tenant = null;

        console.log('Auth data cleared');
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('[data-section]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.getAttribute('data-section');
                this.showSection(section);
                this.updateActiveNav(e.target);
            });
        });
    }

    setupEventListeners() {
        // Transaction filters
        const statusFilter = document.getElementById('transaction-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterTransactions());
        }

        // Create transaction button
        const createTransactionBtn = document.getElementById('create-transaction-btn');
        if (createTransactionBtn) {
            createTransactionBtn.addEventListener('click', () => this.createTransaction());
        }

        // Create merchant button
        const createMerchantBtn = document.getElementById('create-merchant-btn');
        if (createMerchantBtn) {
            createMerchantBtn.addEventListener('click', () => this.createMerchant());
        }

        // Create user button
        const createUserBtn = document.getElementById('create-user-btn');
        if (createUserBtn) {
            createUserBtn.addEventListener('click', () => this.createUser());
        }

        // Process refund button
        const processRefundBtn = document.getElementById('process-refund-btn');
        if (processRefundBtn) {
            processRefundBtn.addEventListener('click', () => this.processRefund());
        }

        // Refresh merchants when transaction modal opens
        const createTransactionModal = document.getElementById('createTransactionModal');
        if (createTransactionModal) {
            createTransactionModal.addEventListener('show.bs.modal', () => {
                console.log('Transaction modal opening, refreshing merchants...');
                this.loadMerchants();
            });
        }

        // Populate countries when merchant modal opens
        const createMerchantModal = document.getElementById('createMerchantModal');
        if (createMerchantModal) {
            createMerchantModal.addEventListener('show.bs.modal', () => {
                console.log('Merchant modal opening, populating countries...');
                this.populateCountries();
            });
        }

        // Add logout event listeners with debugging
        const logoutBtn = document.getElementById('logout-btn');
        console.log('Logout button found:', !!logoutBtn);
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Dropdown logout button clicked');
                logout();
            });
            console.log('Dropdown logout event listener added');
        }

        const emergencyLogoutBtn = document.getElementById('emergency-logout');
        console.log('Emergency logout button found:', !!emergencyLogoutBtn);
        if (emergencyLogoutBtn) {
            emergencyLogoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Emergency logout button clicked');
                logout();
            });
            console.log('Emergency logout event listener added');
        }

        // Add a global test function
        window.testLogout = function() {
            console.log('TEST LOGOUT CALLED');
            logout();
        };

        // Add refresh merchants button
        const refreshMerchantsBtn = document.getElementById('refresh-merchants-btn');
        if (refreshMerchantsBtn) {
            refreshMerchantsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Refresh merchants button clicked');
                this.refreshMerchants();
            });
        }

        // Add refresh transactions button
        const refreshTransactionsBtn = document.getElementById('refresh-transactions-btn');
        if (refreshTransactionsBtn) {
            refreshTransactionsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Refresh transactions button clicked');
                this.refreshTransactions();
            });
        }

        // Auto-refresh toggle
        document.addEventListener('keydown', (e) => {
            if (e.key === 'r' && e.ctrlKey) {
                e.preventDefault();
                this.refreshDashboard();
            }
        });
    }

    showSection(sectionName) {
        // Hide all sections
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => {
            section.style.display = 'none';
        });

        // Show selected section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.style.display = 'block';
            targetSection.classList.add('fade-in');
        }

        // Update URL hash for SPA navigation
        if (sectionName !== 'dashboard') {
            window.location.hash = sectionName;
        } else {
            // Clear hash for dashboard
            if (window.location.hash) {
                history.replaceState(null, null, window.location.pathname);
            }
        }

        // Load section-specific data
        switch (sectionName) {
            case 'transactions':
                this.loadTransactions();
                break;
            case 'merchants':
                this.loadMerchants();
                this.loadMerchantsTable();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
            case 'security':
                this.loadSecurityData();
                break;
        }
    }

    updateActiveNav(activeLink) {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => link.classList.remove('active'));
        activeLink.classList.add('active');
    }

    async loadDashboardData() {
        try {
            await Promise.all([
                this.loadKPIs(),
                this.loadRecentTransactions(),
                this.loadSecurityAlerts(),
                this.loadCharts()
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    async loadKPIs() {
        try {
            // Try analytics dashboard first, fall back to individual endpoints
            let data;
            try {
                const response = await this.apiCall('/analytics/dashboard');
                data = response;
            } catch (dashboardError) {
                console.log('Analytics dashboard API error, trying individual endpoints');
                // Try to get data from individual endpoints
                try {
                    const [transactionMetrics, merchantMetrics, fraudMetrics] = await Promise.all([
                        this.apiCall('/analytics/transactions/metrics').catch(() => ({})),
                        this.apiCall('/analytics/merchants/metrics').catch(() => ({})),
                        this.apiCall('/analytics/fraud/metrics').catch(() => ({}))
                    ]);

                    data = {
                        transactionMetrics,
                        merchantMetrics,
                        fraudMetrics
                    };
                } catch (individualError) {
                    console.log('Individual analytics endpoints also failed, using mock data');
                    data = this.getMockAnalyticsData();
                }
            }

            // Update KPI cards with dashboard data structure
            document.getElementById('total-transactions').textContent =
                data.transactionMetrics?.totalTransactions?.toLocaleString() || '0';

            document.getElementById('total-volume').textContent =
                '$' + (data.transactionMetrics?.totalVolume?.toLocaleString() || '0');

            document.getElementById('active-merchants').textContent =
                data.merchantMetrics?.activeMerchants?.toLocaleString() || '0';

            document.getElementById('avg-risk-score').textContent =
                (data.fraudMetrics?.averageRiskScore || 0).toFixed(1) + '%';

        } catch (error) {
            console.error('Error loading KPIs:', error);
            // Set fallback values
            const fallbackElements = {
                'total-transactions': '0',
                'total-volume': '$0',
                'active-merchants': '0',
                'avg-risk-score': '0%'
            };

            Object.keys(fallbackElements).forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = fallbackElements[id];
                }
            });
        }
    }

    async loadRecentTransactions() {
        try {
            const response = await this.apiCall('/transactions?limit=5');
            const transactions = response.data || [];

            const container = document.getElementById('recent-transactions');
            if (transactions.length === 0) {
                container.innerHTML = '<p class="text-muted">No recent transactions</p>';
                return;
            }

            const html = transactions.map(tx => `
                <div class="activity-item d-flex align-items-center">
                    <div class="activity-icon bg-primary text-white me-3">
                        <i class="fas fa-exchange-alt"></i>
                    </div>
                    <div class="flex-grow-1">
                        <div class="fw-semibold">${tx.transactionId}</div>
                        <div class="text-muted small">
                            $${tx.amount} • ${tx.paymentMethod}
                        </div>
                    </div>
                    <div class="text-end">
                        <span class="status-badge status-${tx.status}">${tx.status}</span>
                        <div class="activity-time">${this.formatDate(tx.createdAt)}</div>
                    </div>
                </div>
            `).join('');

            container.innerHTML = html;
        } catch (error) {
            console.error('Error loading recent transactions:', error);
            document.getElementById('recent-transactions').innerHTML = 
                '<p class="text-muted">Unable to load recent transactions</p>';
        }
    }

    async loadSecurityAlerts() {
        try {
            // Mock security alerts for demo
            const alerts = [
                {
                    type: 'warning',
                    message: 'High risk transaction detected',
                    time: new Date(Date.now() - 300000) // 5 minutes ago
                },
                {
                    type: 'info',
                    message: 'New merchant registration pending',
                    time: new Date(Date.now() - 900000) // 15 minutes ago
                }
            ];

            const container = document.getElementById('security-alerts');
            if (alerts.length === 0) {
                container.innerHTML = '<p class="text-muted">No security alerts</p>';
                return;
            }

            const html = alerts.map(alert => `
                <div class="activity-item d-flex align-items-center">
                    <div class="activity-icon bg-${alert.type === 'warning' ? 'warning' : 'info'} text-white me-3">
                        <i class="fas fa-${alert.type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                    </div>
                    <div class="flex-grow-1">
                        <div class="fw-semibold">${alert.message}</div>
                        <div class="activity-time">${this.formatDate(alert.time)}</div>
                    </div>
                </div>
            `).join('');

            container.innerHTML = html;
        } catch (error) {
            console.error('Error loading security alerts:', error);
            document.getElementById('security-alerts').innerHTML = 
                '<p class="text-muted">Unable to load security alerts</p>';
        }
    }

    async loadCharts() {
        await Promise.all([
            this.loadVolumeChart(),
            this.loadPaymentMethodChart()
        ]);
    }

    async loadVolumeChart() {
        const ctx = document.getElementById('volumeChart');
        if (!ctx) return;

        try {
            // Get real transaction time series data from API
            const response = await this.apiCall('/analytics/transactions/timeseries?hours=168&interval=day'); // 7 days
            const timeSeries = response || [];

            // Extract labels and data from API response
            const labels = timeSeries.map(item => {
                const date = new Date(item.timestamp);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });

            // Use volume data from the API response (now returns total_volume in 'value')
            const volumeData = timeSeries.map(item => {
                return parseFloat(item.value) || 0; // Now contains actual transaction volume in dollars
            });

            // If no data, show empty chart
            if (timeSeries.length === 0) {
                const emptyData = {
                    labels: ['No Data'],
                    datasets: [{
                        label: 'Transaction Volume ($)',
                        data: [0],
                        borderColor: 'rgb(13, 110, 253)',
                        backgroundColor: 'rgba(13, 110, 253, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                };

                this.charts.volume = new Chart(ctx, {
                    type: 'line',
                    data: emptyData,
                    options: this.getVolumeChartOptions()
                });
                return;
            }

            const data = {
                labels: labels,
                datasets: [{
                    label: 'Transaction Volume ($)',
                    data: volumeData,
                    borderColor: 'rgb(13, 110, 253)',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            };

            this.charts.volume = new Chart(ctx, {
                type: 'line',
                data: data,
                options: this.getVolumeChartOptions()
            });

        } catch (error) {
            console.error('Error loading volume chart:', error);
            // Fallback to empty chart
            this.loadEmptyVolumeChart(ctx);
        }
    }

    getVolumeChartOptions() {
        return {
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
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            }
        };
    }

    loadEmptyVolumeChart(ctx) {
        const emptyData = {
            labels: ['No Data'],
            datasets: [{
                label: 'Transaction Volume ($)',
                data: [0],
                borderColor: 'rgb(13, 110, 253)',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                tension: 0.4,
                fill: true
            }]
        };

        this.charts.volume = new Chart(ctx, {
            type: 'line',
            data: emptyData,
            options: this.getVolumeChartOptions()
        });
    }

    async loadPaymentMethodChart() {
        const ctx = document.getElementById('paymentMethodChart');
        if (!ctx) return;

        try {
            // Get real payment method data from API
            const response = await this.apiCall('/transactions/stats');
            const paymentMethodBreakdown = response.paymentMethodBreakdown || {};

            // Convert payment method keys to readable labels
            const methodLabels = {
                'credit_card': 'Credit Card',
                'debit_card': 'Debit Card',
                'bank_transfer': 'Bank Transfer',
                'digital_wallet': 'Digital Wallet',
                'paypal': 'PayPal',
                'apple_pay': 'Apple Pay',
                'google_pay': 'Google Pay'
            };

            // Extract labels and data from real API response
            const labels = [];
            const chartData = [];
            const colors = [
                'rgb(13, 110, 253)',   // Blue
                'rgb(25, 135, 84)',    // Green
                'rgb(255, 193, 7)',    // Yellow
                'rgb(220, 53, 69)',    // Red
                'rgb(102, 16, 242)',   // Purple
                'rgb(253, 126, 20)',   // Orange
                'rgb(111, 66, 193)'    // Indigo
            ];

            let colorIndex = 0;
            const backgroundColors = [];

            for (const [method, count] of Object.entries(paymentMethodBreakdown)) {
                labels.push(methodLabels[method] || method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()));
                chartData.push(count);
                backgroundColors.push(colors[colorIndex % colors.length]);
                colorIndex++;
            }

            // If no data, show empty state
            if (labels.length === 0) {
                const emptyData = {
                    labels: ['No Data'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['rgb(108, 117, 125)']
                    }]
                };

                this.charts.paymentMethod = new Chart(ctx, {
                    type: 'doughnut',
                    data: emptyData,
                    options: this.getPaymentMethodChartOptions()
                });
                return;
            }

            const data = {
                labels: labels,
                datasets: [{
                    data: chartData,
                    backgroundColor: backgroundColors
                }]
            };

            this.charts.paymentMethod = new Chart(ctx, {
                type: 'doughnut',
                data: data,
                options: this.getPaymentMethodChartOptions()
            });

        } catch (error) {
            console.error('Error loading payment method chart:', error);
            // Fallback to empty chart
            this.loadEmptyPaymentMethodChart(ctx);
        }
    }

    getPaymentMethodChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        };
    }

    loadEmptyPaymentMethodChart(ctx) {
        const emptyData = {
            labels: ['No Data'],
            datasets: [{
                data: [1],
                backgroundColor: ['rgb(108, 117, 125)']
            }]
        };

        this.charts.paymentMethod = new Chart(ctx, {
            type: 'doughnut',
            data: emptyData,
            options: this.getPaymentMethodChartOptions()
        });
    }

    async loadTransactions() {
        console.log('=== LOADING TRANSACTIONS ===');
        try {
            // Get current filters
            const filters = this.getTransactionFilters();
            const queryParams = new URLSearchParams();

            // Add filters to query params
            Object.keys(filters).forEach(key => {
                if (filters[key] !== undefined && filters[key] !== '') {
                    queryParams.append(key, filters[key]);
                }
            });

            // Set default limit
            queryParams.append('limit', '50');

            const response = await this.apiCall(`/transactions?${queryParams.toString()}`);
            console.log('Transactions API response:', response);
            const transactions = response.data || [];
            console.log('Number of transactions:', transactions.length);

            const tbody = document.getElementById('transactions-tbody');
            if (transactions.length === 0) {
                console.log('No transactions found');
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No transactions found</td></tr>';
                return;
            }

            const html = transactions.map(tx => `
                <tr>
                    <td><code>${tx.transactionId}</code></td>
                    <td>${tx.merchant?.businessName || 'N/A'}</td>
                    <td>$${tx.amount}</td>
                    <td><span class="status-badge status-${tx.status}">${tx.status}</span></td>
                    <td>${tx.paymentMethod}</td>
                    <td><span class="risk-${this.getRiskLevel(tx.riskAssessment?.score)}">${tx.riskAssessment?.score?.toFixed(1) || 0}%</span></td>
                    <td>${this.formatDate(tx.createdAt)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary btn-action view-transaction-btn" data-transaction-id="${tx.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary btn-action refund-transaction-btn" data-transaction-id="${tx.id}">
                            <i class="fas fa-undo"></i>
                        </button>
                    </td>
                </tr>
            `).join('');

            tbody.innerHTML = html;

            // Add event listeners for the action buttons
            this.attachTransactionEventListeners();

            // Populate merchant filter dropdown
            this.populateMerchantFilter();

        } catch (error) {
            console.error('Error loading transactions:', error);
            document.getElementById('transactions-tbody').innerHTML =
                '<tr><td colspan="8" class="text-center text-danger">Error loading transactions</td></tr>';
        }
    }

    attachTransactionEventListeners() {
        console.log('=== ATTACHING TRANSACTION EVENT LISTENERS ===');

        // View transaction buttons
        const viewButtons = document.querySelectorAll('.view-transaction-btn');
        console.log('Found view buttons:', viewButtons.length);

        viewButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const transactionId = button.getAttribute('data-transaction-id');
                console.log('Eye button clicked for transaction:', transactionId);
                this.viewTransaction(transactionId);
            });
        });

        // Refund transaction buttons
        const refundButtons = document.querySelectorAll('.refund-transaction-btn');
        console.log('Found refund buttons:', refundButtons.length);

        refundButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const transactionId = button.getAttribute('data-transaction-id');
                console.log('Refund button clicked for transaction:', transactionId);
                this.refundTransaction(transactionId);
            });
        });
    }

    async apiCall(endpoint, options = {}) {
        const url = this.apiBase + endpoint;
        const headers = {
            'Content-Type': 'application/json',
            ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
            ...(this.tenant && { 'X-Tenant-ID': this.tenant.id }),
            ...(this.tenant && this.tenant.apiKey && { 'X-API-Key': this.tenant.apiKey })
        };

        const defaultOptions = {
            headers: {
                ...headers,
                ...(options.headers || {})
            }
        };

        console.log('API Call:', {
            url,
            method: options.method || 'GET',
            headers: defaultOptions.headers,
            hasToken: !!this.token,
            hasTenant: !!this.tenant,
            tenantId: this.tenant?.id,
            apiKey: this.tenant?.apiKey ? 'present' : 'missing'
        });

        const response = await fetch(url, { ...defaultOptions, ...options });

        if (response.status === 401) {
            // Token expired or invalid - redirect to login
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            localStorage.removeItem('tenant');
            window.location.href = '/ui/auth/login.html';
            return;
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `API call failed: ${response.status}`);
        }

        return await response.json();
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    getRiskLevel(score) {
        if (!score) return 'low';
        // Score is expected to be 0-100 (whole numbers)
        if (score <= 20) return 'low';
        if (score <= 50) return 'medium';
        return 'high';
    }

    showError(message) {
        // Simple error display - could be enhanced with toast notifications
        console.error(message);
    }

    refreshDashboard() {
        this.loadDashboardData();
    }

    startAutoRefresh() {
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadKPIs();
            this.loadRecentTransactions();
        }, 30000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }

    // Placeholder methods for future implementation
    loadMerchants() {
        console.log('Loading merchants...');
    }

    async loadAnalytics() {
        console.log('=== LOADING ANALYTICS ===');
        try {
            // Load comprehensive analytics data
            await Promise.all([
                this.loadAnalyticsKPIs(),
                this.loadTransactionTimeSeries(),
                this.loadTopMerchants(),
                this.loadRevenueMetrics()
            ]);
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }

    async loadAnalyticsKPIs() {
        try {
            // Get data from multiple sources to populate analytics KPIs
            const [kpisResponse, transactionStats] = await Promise.all([
                this.apiCall('/analytics/kpis'),
                this.apiCall('/transactions/stats')
            ]);

            const kpis = kpisResponse || [];
            const stats = transactionStats || {};

            // Find specific KPIs from the array
            const transactionVolumeKpi = kpis.find(kpi => kpi.name === 'Transaction Volume (24h)');
            const avgTicketKpi = kpis.find(kpi => kpi.name === 'Average Ticket Size');

            // Update analytics KPI cards with real data
            const elements = {
                'analytics-total-volume': '$' + (stats.totalAmount?.toLocaleString() || '0'),
                'analytics-transaction-count': stats.totalTransactions?.toLocaleString() || '0',
                'analytics-success-rate': (stats.successRate || 0).toFixed(1) + '%',
                'analytics-avg-transaction': '$' + (stats.averageAmount || 0).toFixed(2)
            };

            Object.keys(elements).forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = elements[id];
                }
            });

        } catch (error) {
            console.error('Error loading analytics KPIs:', error);
            // Set default values on error
            const defaultElements = {
                'analytics-total-volume': '$0',
                'analytics-transaction-count': '0',
                'analytics-success-rate': '0.0%',
                'analytics-avg-transaction': '$0.00'
            };

            Object.keys(defaultElements).forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = defaultElements[id];
                }
            });
        }
    }

    async loadTransactionTimeSeries() {
        try {
            const response = await this.apiCall('/analytics/transactions/timeseries?hours=24&interval=hour');
            const timeSeries = response || [];

            // Render the transaction trends chart
            this.renderTransactionTrendsChart(timeSeries);

        } catch (error) {
            console.error('Error loading transaction time series:', error);
            // Show error message in chart container
            const chartContainer = document.getElementById('transaction-chart');
            if (chartContainer) {
                chartContainer.innerHTML = '<div class="text-center text-danger"><i class="fas fa-exclamation-triangle"></i><p class="mt-2">Error loading transaction trends</p></div>';
            }
        }
    }

    renderTransactionTrendsChart(timeSeries) {
        const chartContainer = document.getElementById('transaction-chart');
        if (!chartContainer) return;

        // If no data, show empty state
        if (!timeSeries || timeSeries.length === 0) {
            chartContainer.innerHTML = '<div class="text-center text-muted"><i class="fas fa-chart-line"></i><p class="mt-2">No transaction data available for the last 24 hours</p></div>';
            return;
        }

        // Prepare chart data
        const labels = timeSeries.map(item => {
            const date = new Date(item.timestamp);
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        });

        const data = timeSeries.map(item => parseFloat(item.value) || 0);

        // Create canvas element for Chart.js
        chartContainer.innerHTML = '<canvas id="transaction-trends-canvas" style="height: 300px;"></canvas>';
        const canvas = document.getElementById('transaction-trends-canvas');

        // Initialize Chart.js
        if (typeof Chart !== 'undefined') {
            new Chart(canvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Transaction Volume ($)',
                        data: data,
                        borderColor: 'rgb(102, 126, 234)',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointRadius: 3,
                        pointHoverRadius: 5
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
                                    return '$' + value.toLocaleString();
                                }
                            }
                        },
                        x: {
                            ticks: {
                                maxTicksLimit: 12
                            }
                        }
                    }
                }
            });
        } else {
            // Fallback if Chart.js is not loaded
            chartContainer.innerHTML = '<div class="text-center text-muted"><i class="fas fa-chart-line"></i><p class="mt-2">Chart library not loaded</p></div>';
        }
    }

    async loadTopMerchants() {
        try {
            const response = await this.apiCall('/analytics/merchants/top?limit=5');
            const topMerchants = response || [];

            const container = document.getElementById('top-merchants-list');
            if (container && topMerchants.length > 0) {
                const html = topMerchants.map((merchant, index) => `
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div>
                            <span class="badge bg-primary me-2">${index + 1}</span>
                            <strong>${merchant.businessName}</strong>
                        </div>
                        <div class="text-end">
                            <div class="fw-bold">$${merchant.volume?.toLocaleString() || '0'}</div>
                            <small class="text-muted">${merchant.transactions || 0} transactions</small>
                        </div>
                    </div>
                `).join('');

                container.innerHTML = html;
            }

        } catch (error) {
            console.error('Error loading top merchants:', error);
        }
    }

    async loadRevenueMetrics() {
        try {
            const response = await this.apiCall('/analytics/revenue/metrics');
            const revenue = response || {};

            // Update revenue metrics if elements exist
            const elements = {
                'revenue-today': '$' + (revenue.totalRevenue || 0).toLocaleString(),
                'revenue-month': '$' + (revenue.grossRevenue || 0).toLocaleString(),
                'revenue-growth': (revenue.revenueGrowth || 0).toFixed(1) + '%'
            };

            Object.keys(elements).forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = elements[id];
                }
            });

        } catch (error) {
            console.error('Error loading revenue metrics:', error);
        }
    }

    async loadSecurityData() {
        console.log('=== LOADING SECURITY DATA ===');
        try {
            // Load security metrics
            await Promise.all([
                this.loadSecurityKPIs(),
                this.loadSecurityAlerts(),
                this.loadComplianceStatus(),
                this.loadFraudStats()
            ]);
        } catch (error) {
            console.error('Error loading security data:', error);
        }
    }

    async loadSecurityKPIs() {
        try {
            let data = {};
            try {
                const response = await this.apiCall('/security/overview');
                data = response || {};
            } catch (apiError) {
                console.log('Security overview API not available, using default values');
            }

            document.getElementById('security-score').textContent = data.securityScore || '85';
            document.getElementById('active-alerts').textContent = data.activeAlerts || '3';
            document.getElementById('blocked-transactions').textContent = data.blockedToday || '12';
            document.getElementById('compliance-status').textContent = data.pciCompliance || 'Level 1';

        } catch (error) {
            console.error('Error loading security KPIs:', error);
            // Set default values if API fails
            document.getElementById('security-score').textContent = '85';
            document.getElementById('active-alerts').textContent = '3';
            document.getElementById('blocked-transactions').textContent = '12';
            document.getElementById('compliance-status').textContent = 'Level 1';
        }
    }

    async loadSecurityAlerts() {
        try {
            // Try to get real security alerts, fall back to mock data
            let alerts;
            try {
                const response = await this.apiCall('/security/alerts?limit=10');
                alerts = response?.data || [];
            } catch (apiError) {
                console.log('Security alerts API not available, using mock data');
                alerts = this.getMockSecurityAlerts();
            }

            const container = document.getElementById('security-alerts-table');

            if (alerts.length === 0) {
                container.innerHTML = '<p class="text-muted text-center">No security alerts</p>';
                return;
            }

            const html = `
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Severity</th>
                                <th>Alert</th>
                                <th>Time</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${alerts.map(alert => `
                                <tr>
                                    <td>
                                        <span class="badge bg-${this.getAlertSeverityColor(alert.severity)}">
                                            ${alert.severity.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>${alert.message}</td>
                                    <td>${this.formatDate(alert.timestamp)}</td>
                                    <td>
                                        <span class="badge bg-${alert.status === 'resolved' ? 'success' : 'warning'}">
                                            ${alert.status}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            container.innerHTML = html;

        } catch (error) {
            console.error('Error loading security alerts:', error);
            document.getElementById('security-alerts-table').innerHTML =
                '<p class="text-danger">Error loading security alerts</p>';
        }
    }

    async loadComplianceStatus() {
        try {
            const response = await this.apiCall('/security/compliance');
            const compliance = response || this.getMockComplianceData();

            const container = document.getElementById('compliance-checklist');

            const html = `
                <div class="compliance-items">
                    ${compliance.items.map(item => `
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="small">${item.name}</span>
                            <i class="fas fa-${item.status === 'compliant' ? 'check-circle text-success' : 'exclamation-circle text-warning'}"></i>
                        </div>
                    `).join('')}
                </div>
                <div class="mt-3 text-center">
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar bg-success" style="width: ${compliance.overallScore}%"></div>
                    </div>
                    <small class="text-muted">${compliance.overallScore}% Compliant</small>
                </div>
            `;

            container.innerHTML = html;

        } catch (error) {
            console.error('Error loading compliance status:', error);
            document.getElementById('compliance-checklist').innerHTML =
                '<p class="text-danger">Error loading compliance data</p>';
        }
    }

    async loadFraudStats() {
        try {
            const response = await this.apiCall('/security/fraud-stats');
            const stats = response || this.getMockFraudStats();

            const container = document.getElementById('fraud-stats-content');

            const html = `
                <div class="row text-center">
                    <div class="col-md-3">
                        <div class="border-end">
                            <h4 class="text-success">${stats.transactionsProcessed}</h4>
                            <small class="text-muted">Transactions Processed</small>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="border-end">
                            <h4 class="text-warning">${stats.flaggedForReview}</h4>
                            <small class="text-muted">Flagged for Review</small>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="border-end">
                            <h4 class="text-danger">${stats.blocked}</h4>
                            <small class="text-muted">Blocked</small>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <h4 class="text-info">${stats.falsePositiveRate}%</h4>
                        <small class="text-muted">False Positive Rate</small>
                    </div>
                </div>
            `;

            container.innerHTML = html;

        } catch (error) {
            console.error('Error loading fraud stats:', error);
            document.getElementById('fraud-stats-content').innerHTML =
                '<p class="text-danger">Error loading fraud statistics</p>';
        }
    }

    refreshSecurityData() {
        console.log('Refreshing security data...');
        this.loadSecurityData();
    }

    async viewTransaction(id) {
        console.log('=== VIEW TRANSACTION CALLED ===');
        console.log('Transaction ID:', id);
        console.log('Modal element exists:', !!document.getElementById('transactionDetailsModal'));

        try {
            // Show the modal first
            const modalElement = document.getElementById('transactionDetailsModal');
            if (!modalElement) {
                console.error('Transaction details modal not found!');
                return;
            }

            const modal = new bootstrap.Modal(modalElement);
            modal.show();
            console.log('Modal shown');

            // Reset content to loading state
            const content = document.getElementById('transaction-details-content');
            if (!content) {
                console.error('Transaction details content element not found!');
                return;
            }

            content.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading transaction details...</p>
                </div>
            `;
            console.log('Loading state set');

            // Fetch transaction details
            console.log('Making API call to:', `/transactions/${id}`);
            const response = await this.apiCall(`/transactions/${id}`);
            console.log('API response received:', response);
            const transaction = response;

            // Update modal title with transaction ID
            const titleElement = document.getElementById('transactionDetailsModalLabel');
            if (titleElement) {
                titleElement.innerHTML = `
                    <i class="fas fa-eye me-2"></i>Transaction Details - ${transaction.transactionId || id}
                `;
            }

            // Render transaction details
            console.log('Rendering transaction details...');
            this.renderTransactionDetails(transaction);

            // Add event listener for risk explanation button
            const riskExplanationBtn = document.getElementById('risk-explanation-btn');
            if (riskExplanationBtn) {
                riskExplanationBtn.addEventListener('click', () => {
                    this.showRiskExplanation(transaction);
                });
            }

            // Show refund button if transaction can be refunded
            const refundBtn = document.getElementById('refund-transaction-btn');
            if (refundBtn) {
                if (transaction.status === 'completed' && transaction.type === 'payment') {
                    refundBtn.style.display = 'inline-block';
                    refundBtn.onclick = () => this.refundTransaction(transaction.id);
                } else {
                    refundBtn.style.display = 'none';
                }
            }

            console.log('Transaction details rendered successfully');

        } catch (error) {
            console.error('Error loading transaction details:', error);
            console.error('Error stack:', error.stack);
            const content = document.getElementById('transaction-details-content');
            if (content) {
                content.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        <strong>Error:</strong> Unable to load transaction details. ${error.message}
                        <br><small>Check console for more details.</small>
                    </div>
                `;
            }
        }
    }

    renderTransactionDetails(transaction) {
        console.log('=== RENDER TRANSACTION DETAILS ===');
        console.log('Transaction data:', transaction);

        const content = document.getElementById('transaction-details-content');
        if (!content) {
            console.error('Content element not found for rendering!');
            return;
        }

        const riskLevel = this.getRiskLevel(transaction.riskAssessment?.score);
        const riskScore = transaction.riskAssessment?.score ? transaction.riskAssessment.score.toFixed(1) : '0';

        console.log('Risk level:', riskLevel, 'Risk score:', riskScore);

        content.innerHTML = `
            <div class="row">
                <!-- Basic Information -->
                <div class="col-md-6">
                    <div class="card mb-3">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="fas fa-info-circle me-2"></i>Basic Information</h6>
                        </div>
                        <div class="card-body">
                            <div class="row mb-2">
                                <div class="col-sm-4"><strong>Transaction ID:</strong></div>
                                <div class="col-sm-8"><code>${transaction.transactionId}</code></div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-sm-4"><strong>Status:</strong></div>
                                <div class="col-sm-8">
                                    <span class="status-badge status-${transaction.status}">${transaction.status}</span>
                                </div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-sm-4"><strong>Type:</strong></div>
                                <div class="col-sm-8">${transaction.type || 'payment'}</div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-sm-4"><strong>Amount:</strong></div>
                                <div class="col-sm-8"><strong>$${transaction.amount} ${transaction.currency || 'USD'}</strong></div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-sm-4"><strong>Fee Amount:</strong></div>
                                <div class="col-sm-8">$${transaction.feeAmount || '0.00'}</div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-sm-4"><strong>Net Amount:</strong></div>
                                <div class="col-sm-8">$${transaction.netAmount || transaction.amount}</div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-sm-4"><strong>Payment Method:</strong></div>
                                <div class="col-sm-8">${transaction.paymentMethod}</div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-sm-4"><strong>Created:</strong></div>
                                <div class="col-sm-8">${this.formatDate(transaction.createdAt)}</div>
                            </div>
                            ${transaction.updatedAt ? `
                            <div class="row mb-2">
                                <div class="col-sm-4"><strong>Updated:</strong></div>
                                <div class="col-sm-8">${this.formatDate(transaction.updatedAt)}</div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Merchant & Customer Information -->
                <div class="col-md-6">
                    <div class="card mb-3">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="fas fa-store me-2"></i>Merchant Information</h6>
                        </div>
                        <div class="card-body">
                            <div class="row mb-2">
                                <div class="col-sm-4"><strong>Business Name:</strong></div>
                                <div class="col-sm-8">${transaction.merchant?.businessName || 'N/A'}</div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-sm-4"><strong>Merchant ID:</strong></div>
                                <div class="col-sm-8"><code>${transaction.merchantId}</code></div>
                            </div>
                            ${transaction.merchant?.contactEmail ? `
                            <div class="row mb-2">
                                <div class="col-sm-4"><strong>Contact Email:</strong></div>
                                <div class="col-sm-8">${transaction.merchant.contactEmail}</div>
                            </div>
                            ` : ''}
                        </div>
                    </div>

                    ${transaction.customerEmail || transaction.customerPhone || transaction.customerDetails ? `
                    <div class="card mb-3">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="fas fa-user me-2"></i>Customer Information</h6>
                        </div>
                        <div class="card-body">
                            ${transaction.customerEmail ? `
                            <div class="row mb-2">
                                <div class="col-sm-4"><strong>Email:</strong></div>
                                <div class="col-sm-8">${transaction.customerEmail}</div>
                            </div>
                            ` : ''}
                            ${transaction.customerPhone ? `
                            <div class="row mb-2">
                                <div class="col-sm-4"><strong>Phone:</strong></div>
                                <div class="col-sm-8">${transaction.customerPhone}</div>
                            </div>
                            ` : ''}
                            ${transaction.customerDetails?.name ? `
                            <div class="row mb-2">
                                <div class="col-sm-4"><strong>Name:</strong></div>
                                <div class="col-sm-8">${transaction.customerDetails.name}</div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>

            <div class="row">
                <!-- Risk Assessment -->
                <div class="col-md-6">
                    <div class="card mb-3">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="fas fa-shield-alt me-2"></i>Risk Assessment</h6>
                        </div>
                        <div class="card-body">
                            <div class="row mb-2">
                                <div class="col-sm-4"><strong>Risk Score:</strong></div>
                                <div class="col-sm-8">
                                    <span class="risk-${riskLevel}">${riskScore}%</span>
                                    <button class="btn btn-sm btn-outline-info ms-2" id="risk-explanation-btn" title="Explain Risk Score">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-sm-4"><strong>Risk Level:</strong></div>
                                <div class="col-sm-8">
                                    <span class="badge bg-${riskLevel === 'low' ? 'success' : riskLevel === 'medium' ? 'warning' : 'danger'}">
                                        ${transaction.riskAssessment?.level || riskLevel}
                                    </span>
                                </div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-sm-4"><strong>Recommendation:</strong></div>
                                <div class="col-sm-8">${transaction.riskAssessment?.recommendation || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Additional Details -->
                <div class="col-md-6">
                    <div class="card mb-3">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="fas fa-list me-2"></i>Additional Details</h6>
                        </div>
                        <div class="card-body">
                            ${transaction.description ? `
                            <div class="row mb-2">
                                <div class="col-sm-4"><strong>Description:</strong></div>
                                <div class="col-sm-8">${transaction.description}</div>
                            </div>
                            ` : ''}
                            ${transaction.orderId ? `
                            <div class="row mb-2">
                                <div class="col-sm-4"><strong>Order ID:</strong></div>
                                <div class="col-sm-8"><code>${transaction.orderId}</code></div>
                            </div>
                            ` : ''}
                            ${transaction.externalTransactionId ? `
                            <div class="row mb-2">
                                <div class="col-sm-4"><strong>External TX ID:</strong></div>
                                <div class="col-sm-8"><code>${transaction.externalTransactionId}</code></div>
                            </div>
                            ` : ''}
                            ${transaction.customerIp ? `
                            <div class="row mb-2">
                                <div class="col-sm-4"><strong>Customer IP:</strong></div>
                                <div class="col-sm-8">${transaction.customerIp}</div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>

            ${transaction.metadata && Object.keys(transaction.metadata).length > 0 ? `
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="fas fa-code me-2"></i>Metadata</h6>
                        </div>
                        <div class="card-body">
                            <pre class="bg-light p-3 rounded"><code>${JSON.stringify(transaction.metadata, null, 2)}</code></pre>
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}
        `;
    }

    showRiskExplanation(transaction) {
        console.log('Showing risk explanation for transaction:', transaction.id);

        const modal = new bootstrap.Modal(document.getElementById('riskExplanationModal'));
        const content = document.getElementById('risk-explanation-content');

        const riskAssessment = transaction.riskAssessment || {};
        const riskScore = riskAssessment.score || 0;
        const riskLevel = riskAssessment.level || this.getRiskLevel(riskScore);
        const factors = riskAssessment.factors || [];
        const fraudProbability = riskAssessment.fraudProbability || (riskScore / 100);

        content.innerHTML = `
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="card border-${riskLevel === 'low' ? 'success' : riskLevel === 'medium' ? 'warning' : 'danger'}">
                        <div class="card-header bg-${riskLevel === 'low' ? 'success' : riskLevel === 'medium' ? 'warning' : 'danger'} text-white">
                            <h6 class="mb-0">
                                <i class="fas fa-chart-line me-2"></i>Risk Assessment Summary
                            </h6>
                        </div>
                        <div class="card-body">
                            <div class="row mb-2">
                                <div class="col-6"><strong>Risk Score:</strong></div>
                                <div class="col-6"><span class="badge bg-${riskLevel === 'low' ? 'success' : riskLevel === 'medium' ? 'warning' : 'danger'}">${riskScore} points</span></div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-6"><strong>Risk Level:</strong></div>
                                <div class="col-6"><span class="text-${riskLevel === 'low' ? 'success' : riskLevel === 'medium' ? 'warning' : 'danger'} fw-bold">${riskLevel.toUpperCase()}</span></div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-6"><strong>Fraud Probability:</strong></div>
                                <div class="col-6">${(fraudProbability * 100).toFixed(1)}%</div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-6"><strong>Recommendation:</strong></div>
                                <div class="col-6">
                                    <span class="badge bg-${riskScore <= 20 ? 'success' : riskScore <= 50 ? 'warning' : 'danger'}">
                                        ${riskScore <= 20 ? 'APPROVE' : riskScore <= 50 ? 'REVIEW' : 'DECLINE'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0">
                                <i class="fas fa-exclamation-triangle me-2"></i>Risk Factors Detected
                            </h6>
                        </div>
                        <div class="card-body">
                            ${factors.length > 0 ? `
                                <ul class="list-unstyled mb-0">
                                    ${factors.map(factor => `
                                        <li class="mb-1">
                                            <i class="fas fa-dot-circle text-warning me-2"></i>
                                            ${this.formatRiskFactor(factor)}
                                        </li>
                                    `).join('')}
                                </ul>
                            ` : `
                                <p class="text-muted mb-0">
                                    <i class="fas fa-check-circle text-success me-2"></i>
                                    No specific risk factors detected
                                </p>
                            `}
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h6 class="mb-0">
                        <i class="fas fa-info-circle me-2"></i>How Risk Scoring Works
                    </h6>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <h6 class="text-primary">Risk Categories & Points:</h6>
                            <ul class="small">
                                <li><strong>Amount-Based Risk:</strong> 0-30 points
                                    <ul>
                                        <li>High Amount (>$10,000): +30 pts</li>
                                        <li>Medium Amount ($1,000-$10,000): +10 pts</li>
                                    </ul>
                                </li>
                                <li><strong>Velocity Checks:</strong> 0-45 points
                                    <ul>
                                        <li>High frequency transactions: +25 pts</li>
                                        <li>Daily transaction limits exceeded: +20 pts</li>
                                    </ul>
                                </li>
                                <li><strong>Payment Method:</strong> 2-20 points
                                    <ul>
                                        <li>Cryptocurrency: +20 pts</li>
                                        <li>Digital Wallet: +5 pts</li>
                                        <li>Bank Transfer: +2 pts</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                        <div class="col-md-6">
                            <h6 class="text-primary">Additional Factors:</h6>
                            <ul class="small">
                                <li><strong>Geographic Risk:</strong> 0-25 points
                                    <ul>
                                        <li>High-risk country: +15 pts</li>
                                        <li>VPN detected: +10 pts</li>
                                    </ul>
                                </li>
                                <li><strong>Customer History:</strong> 0-33 points
                                    <ul>
                                        <li>Chargeback history: +25 pts</li>
                                        <li>High failure rate: +15 pts</li>
                                        <li>New customer: +8 pts</li>
                                    </ul>
                                </li>
                                <li><strong>Time-Based:</strong> 0-8 points
                                    <ul>
                                        <li>Unusual hours: +5 pts</li>
                                        <li>Weekend transaction: +3 pts</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div class="mt-3 p-3 bg-light rounded">
                        <h6 class="text-primary mb-2">Risk Level Classification:</h6>
                        <div class="row text-center">
                            <div class="col-md-4">
                                <div class="p-2 bg-success text-white rounded mb-2">
                                    <strong>LOW RISK</strong><br>
                                    <small>0-20 points</small>
                                </div>
                                <small>Auto-approve transaction</small>
                            </div>
                            <div class="col-md-4">
                                <div class="p-2 bg-warning text-white rounded mb-2">
                                    <strong>MEDIUM RISK</strong><br>
                                    <small>21-50 points</small>
                                </div>
                                <small>Manual review required</small>
                            </div>
                            <div class="col-md-4">
                                <div class="p-2 bg-danger text-white rounded mb-2">
                                    <strong>HIGH RISK</strong><br>
                                    <small>51+ points</small>
                                </div>
                                <small>Decline transaction</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modal.show();
    }

    formatRiskFactor(factor) {
        const factorMap = {
            'HIGH_AMOUNT': 'High transaction amount (>$10,000)',
            'MEDIUM_AMOUNT': 'Medium transaction amount ($1,000-$10,000)',
            'HIGH_VELOCITY_HOUR': 'High transaction frequency (>5 in 1 hour)',
            'MEDIUM_VELOCITY_HOUR': 'Medium transaction frequency (>2 in 1 hour)',
            'HIGH_VELOCITY_DAY': 'High daily transaction count (>20 in 1 day)',
            'MEDIUM_VELOCITY_DAY': 'Medium daily transaction count (>10 in 1 day)',
            'HIGH_RISK_PAYMENT_METHOD': 'High-risk payment method (cryptocurrency)',
            'MEDIUM_RISK_PAYMENT_METHOD': 'Medium-risk payment method (digital wallet)',
            'LOW_RISK_PAYMENT_METHOD': 'Low-risk payment method (bank transfer)',
            'HIGH_RISK_COUNTRY': 'Transaction from high-risk country',
            'VPN_DETECTED': 'VPN or proxy detected',
            'HIGH_FAILURE_RATE': 'Customer has high transaction failure rate',
            'MEDIUM_FAILURE_RATE': 'Customer has medium transaction failure rate',
            'CHARGEBACK_HISTORY': 'Customer has chargeback history',
            'NEW_CUSTOMER': 'New customer (no transaction history)',
            'NO_CUSTOMER_EMAIL': 'No customer email provided',
            'UNUSUAL_HOUR': 'Transaction during unusual hours (before 6 AM or after 10 PM)',
            'WEEKEND_TRANSACTION': 'Weekend transaction'
        };

        return factorMap[factor] || factor.replace(/_/g, ' ').toLowerCase();
    }

    async refundTransaction(id) {
        console.log('Refunding transaction:', id);

        try {
            // First get transaction details to show refund form
            const transaction = await this.apiCall(`/transactions/${id}`);

            // Show refund modal
            this.showRefundModal(transaction);

        } catch (error) {
            console.error('Error loading transaction for refund:', error);
            alert('Error loading transaction details. Please try again.');
        }
    }

    showRefundModal(transaction) {
        const modal = new bootstrap.Modal(document.getElementById('refundModal'));

        // Populate modal with transaction info
        document.getElementById('refund-transaction-id').textContent = transaction.transactionId;
        document.getElementById('refund-original-amount').textContent = `$${transaction.amount}`;
        document.getElementById('refund-amount').value = transaction.amount;
        document.getElementById('refund-amount').max = transaction.amount;

        // Store transaction data for processing
        document.getElementById('refundModal').dataset.transactionId = transaction.id;
        document.getElementById('refundModal').dataset.transactionIdString = transaction.transactionId;

        modal.show();
    }

    async processRefund() {
        const modal = document.getElementById('refundModal');
        const transactionId = modal.dataset.transactionIdString;
        const amount = parseFloat(document.getElementById('refund-amount').value);
        const reason = document.getElementById('refund-reason').value;

        if (!amount || amount <= 0) {
            alert('Please enter a valid refund amount');
            document.getElementById('refund-amount').focus();
            return;
        }

        if (!reason || reason.trim() === '' || reason === 'Select a reason...') {
            alert('Please select a reason for the refund from the dropdown');
            document.getElementById('refund-reason').focus();
            return;
        }

        try {
            // Show loading state
            const submitBtn = document.getElementById('process-refund-btn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
            submitBtn.disabled = true;

            // Process refund via API
            const response = await this.apiCall(`/transactions/${transactionId}/refund`, {
                method: 'POST',
                body: JSON.stringify({
                    amount: amount,
                    reason: reason
                })
            });

            // Close modal
            const modalInstance = bootstrap.Modal.getInstance(modal);
            modalInstance.hide();

            // Show success message
            this.showSuccess('Refund processed successfully');

            // Refresh transactions list
            this.loadTransactions();

            // Reset form
            document.getElementById('refund-form').reset();

        } catch (error) {
            console.error('Error processing refund:', error);
            alert(`Error processing refund: ${error.message}`);
        } finally {
            // Reset button state
            const submitBtn = document.getElementById('process-refund-btn');
            submitBtn.innerHTML = '<i class="fas fa-undo me-2"></i>Process Refund';
            submitBtn.disabled = false;
        }
    }

    filterTransactions() {
        console.log('Filtering transactions (simple filters)...');
        this.loadTransactions();
    }

    applyTransactionFilters() {
        console.log('Applying transaction filters...');
        this.loadTransactions();
    }

    clearTransactionFilters() {
        console.log('Clearing transaction filters...');
        document.getElementById('transaction-filter-form').reset();
        this.loadTransactions();
    }

    getTransactionFilters() {
        const filters = {};

        // Advanced filters (from the collapsible section)
        const status = document.getElementById('filter-status')?.value;
        if (status) filters.status = status;

        const merchantId = document.getElementById('filter-merchant')?.value;
        if (merchantId) filters.merchantId = merchantId;

        const paymentMethod = document.getElementById('filter-payment-method')?.value;
        if (paymentMethod) filters.paymentMethod = paymentMethod;

        const customerEmail = document.getElementById('filter-customer-email')?.value;
        if (customerEmail) filters.customerEmail = customerEmail;

        const startDate = document.getElementById('filter-start-date')?.value;
        if (startDate) filters.startDate = startDate;

        const endDate = document.getElementById('filter-end-date')?.value;
        if (endDate) filters.endDate = endDate;

        const minAmount = document.getElementById('filter-min-amount')?.value;
        if (minAmount) filters.minAmount = parseFloat(minAmount);

        const maxAmount = document.getElementById('filter-max-amount')?.value;
        if (maxAmount) filters.maxAmount = parseFloat(maxAmount);

        // Simple filters (from the always-visible section)
        // Only use simple filters if advanced filters are not set
        if (!filters.status) {
            const simpleStatus = document.getElementById('transaction-status-filter')?.value;
            if (simpleStatus) filters.status = simpleStatus;
        }

        if (!filters.startDate && !filters.endDate) {
            const simpleDateFrom = document.getElementById('transaction-date-from')?.value;
            if (simpleDateFrom) filters.startDate = simpleDateFrom;

            const simpleDateTo = document.getElementById('transaction-date-to')?.value;
            if (simpleDateTo) filters.endDate = simpleDateTo;
        }

        return filters;
    }

    async exportTransactions() {
        try {
            const filters = this.getTransactionFilters();
            const queryParams = new URLSearchParams();

            // Add filters to query params
            Object.keys(filters).forEach(key => {
                if (filters[key] !== undefined && filters[key] !== '') {
                    queryParams.append(key, filters[key]);
                }
            });

            // Set a high limit for export
            queryParams.append('limit', '10000');

            const response = await this.apiCall(`/transactions?${queryParams.toString()}`);
            const transactions = response.data || [];

            if (transactions.length === 0) {
                alert('No transactions found to export');
                return;
            }

            // Convert to CSV
            const csv = this.convertTransactionsToCSV(transactions);

            // Download CSV file
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            this.showSuccess(`Exported ${transactions.length} transactions to CSV`);

        } catch (error) {
            console.error('Error exporting transactions:', error);
            alert(`Error exporting transactions: ${error.message}`);
        }
    }

    convertTransactionsToCSV(transactions) {
        const headers = [
            'Transaction ID',
            'Merchant',
            'Amount',
            'Currency',
            'Status',
            'Payment Method',
            'Customer Email',
            'Risk Score',
            'Created Date'
        ];

        const rows = transactions.map(tx => [
            tx.transactionId,
            tx.merchant?.businessName || 'N/A',
            tx.amount,
            tx.currency || 'USD',
            tx.status,
            tx.paymentMethod,
            tx.customerEmail || 'N/A',
            tx.riskAssessment?.score || 0,
            new Date(tx.createdAt).toLocaleString()
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        return csvContent;
    }

    async populateMerchantFilter() {
        try {
            const response = await this.apiCall('/merchants');
            const merchants = response || [];

            const filterSelect = document.getElementById('filter-merchant');
            if (!filterSelect) return;

            // Clear existing options (except "All Merchants")
            filterSelect.innerHTML = '<option value="">All Merchants</option>';

            // Add merchant options
            merchants.forEach(merchant => {
                const option = document.createElement('option');
                option.value = merchant.id;
                option.textContent = merchant.businessName;
                filterSelect.appendChild(option);
            });

        } catch (error) {
            console.error('Error loading merchants for filter:', error);
        }
    }

    async loadUsers() {
        console.log('=== LOADING USERS ===');
        try {
            const response = await this.apiCall('/users');
            const users = response || [];
            console.log('Number of users:', users.length);

            const tbody = document.getElementById('users-table-body');
            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No users found</td></tr>';
                return;
            }

            const html = users.map(user => `
                <tr>
                    <td>${user.firstName} ${user.lastName}</td>
                    <td>${user.email}</td>
                    <td>
                        <span class="badge bg-${this.getRoleBadgeColor(user.role)}">${this.formatRole(user.role)}</span>
                    </td>
                    <td>
                        <span class="badge bg-${this.getStatusBadgeColor(user.status)}">${this.formatStatus(user.status)}</span>
                    </td>
                    <td>${user.lastLoginAt ? this.formatDate(user.lastLoginAt) : 'Never'}</td>
                    <td>${this.formatDate(user.createdAt)}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-primary edit-user-btn" data-user-id="${user.id}" title="Edit User">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-${user.status === 'active' ? 'warning' : 'success'} toggle-user-status-btn"
                                    data-user-id="${user.id}" data-current-status="${user.status}"
                                    title="${user.status === 'active' ? 'Suspend User' : 'Activate User'}">
                                <i class="fas fa-${user.status === 'active' ? 'pause' : 'play'}"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            tbody.innerHTML = html;

            // Add event listeners for user action buttons
            this.attachUserEventListeners();

        } catch (error) {
            console.error('Error loading users:', error);
            document.getElementById('users-table-body').innerHTML =
                '<tr><td colspan="7" class="text-center text-danger">Error loading users</td></tr>';
        }
    }

    attachUserEventListeners() {
        console.log('=== ATTACHING USER EVENT LISTENERS ===');

        // Edit user buttons
        const editButtons = document.querySelectorAll('.edit-user-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const userId = button.getAttribute('data-user-id');
                this.editUser(userId);
            });
        });

        // Toggle user status buttons
        const toggleButtons = document.querySelectorAll('.toggle-user-status-btn');
        toggleButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const userId = button.getAttribute('data-user-id');
                const currentStatus = button.getAttribute('data-current-status');
                this.toggleUserStatus(userId, currentStatus);
            });
        });
    }

    getRoleBadgeColor(role) {
        const colors = {
            'tenant_admin': 'danger',
            'merchant_admin': 'warning',
            'merchant_user': 'info',
            'analyst': 'success',
            'support': 'secondary'
        };
        return colors[role] || 'secondary';
    }

    getStatusBadgeColor(status) {
        const colors = {
            'active': 'success',
            'inactive': 'secondary',
            'suspended': 'danger',
            'pending_verification': 'warning'
        };
        return colors[status] || 'secondary';
    }

    formatRole(role) {
        return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    formatStatus(status) {
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    async editUser(userId) {
        console.log('Editing user:', userId);
        // TODO: Implement user editing modal
        alert('User editing functionality will be implemented soon!');
    }

    async toggleUserStatus(userId, currentStatus) {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        const action = newStatus === 'active' ? 'activate' : 'suspend';

        if (!confirm(`Are you sure you want to ${action} this user?`)) {
            return;
        }

        try {
            await this.apiCall(`/users/${userId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus })
            });

            this.showSuccess(`User ${action}d successfully`);
            this.loadUsers(); // Refresh the users list

        } catch (error) {
            console.error(`Error ${action}ing user:`, error);
            alert(`Error ${action}ing user: ${error.message}`);
        }
    }

    async createUser() {
        const form = document.getElementById('create-user-form');
        const formData = new FormData(form);

        const userData = {
            firstName: document.getElementById('user-first-name').value,
            lastName: document.getElementById('user-last-name').value,
            email: document.getElementById('user-email').value,
            phoneNumber: document.getElementById('user-phone').value,
            role: document.getElementById('user-role').value,
            password: document.getElementById('user-password').value
        };

        // Validate required fields
        if (!userData.firstName || !userData.lastName || !userData.email || !userData.role || !userData.password) {
            alert('Please fill in all required fields');
            return;
        }

        // Remove empty fields
        Object.keys(userData).forEach(key => {
            if (userData[key] === undefined || userData[key] === '') {
                delete userData[key];
            }
        });

        const createBtn = document.getElementById('create-user-btn');
        const originalText = createBtn.innerHTML;

        try {
            createBtn.disabled = true;
            createBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating...';

            const response = await this.apiCall('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createUserModal'));
            modal.hide();

            // Reset form
            form.reset();

            // Show success message
            this.showSuccess('User created successfully');

            // Refresh users list
            this.loadUsers();

        } catch (error) {
            console.error('Error creating user:', error);
            alert(`Error creating user: ${error.message}`);
        } finally {
            createBtn.disabled = false;
            createBtn.innerHTML = originalText;
        }
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    showAlert(message, type = 'info') {
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Add to page
        document.body.appendChild(alertDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    async loadMerchants() {
        try {
            console.log('Loading merchants...');
            console.log('Token:', this.token);
            console.log('User:', this.user);
            console.log('Tenant:', this.tenant);

            const response = await this.apiCall('/merchants');
            console.log('Raw API response:', response);

            const merchants = Array.isArray(response) ? response : (response.data || []);
            console.log('Processed merchants:', merchants);

            const merchantSelect = document.getElementById('tx-merchant');
            if (merchantSelect) {
                merchantSelect.innerHTML = '<option value="">Select Merchant</option>';

                if (merchants.length === 0) {
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = 'No merchants available - Create one first';
                    option.disabled = true;
                    merchantSelect.appendChild(option);
                } else {
                    // Only show active merchants in the dropdown
                    const activeMerchants = merchants.filter(m => m.status === 'active');

                    if (activeMerchants.length === 0) {
                        const option = document.createElement('option');
                        option.value = '';
                        option.textContent = 'No active merchants - Activate a merchant first';
                        option.disabled = true;
                        merchantSelect.appendChild(option);
                    } else {
                        activeMerchants.forEach(merchant => {
                            const option = document.createElement('option');
                            option.value = merchant.id;
                            option.textContent = `${merchant.businessName} (${merchant.merchantId})`;
                            merchantSelect.appendChild(option);
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error loading merchants:', error);
            this.showAlert('danger', 'Failed to load merchants: ' + error.message);
        }
    }

    async createTransaction() {
        const form = document.getElementById('create-transaction-form');
        const formData = new FormData(form);

        // Validate form
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const transactionData = {
            merchantId: document.getElementById('tx-merchant').value,
            type: document.getElementById('tx-type').value,
            amount: parseFloat(document.getElementById('tx-amount').value),
            currency: document.getElementById('tx-currency').value,
            paymentMethod: document.getElementById('tx-payment-method').value,
            customerEmail: document.getElementById('tx-customer-email').value,
            description: document.getElementById('tx-description').value,
            customerPhone: document.getElementById('tx-customer-phone').value || undefined,
            orderId: document.getElementById('tx-order-id').value || undefined,
        };

        // Remove undefined values
        Object.keys(transactionData).forEach(key => {
            if (transactionData[key] === undefined) {
                delete transactionData[key];
            }
        });

        const createBtn = document.getElementById('create-transaction-btn');
        const originalText = createBtn.innerHTML;

        try {
            createBtn.disabled = true;
            createBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating...';

            const response = await this.apiCall('/transactions', {
                method: 'POST',
                body: JSON.stringify(transactionData)
            });

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createTransactionModal'));
            modal.hide();

            // Reset form
            form.reset();

            // Show success message
            this.showAlert('success', `Transaction created successfully! ID: ${response.transactionId}`);

            // Refresh data
            this.loadDashboardData();
            this.loadRecentTransactions();
            this.loadTransactions(); // Refresh the main transaction table

        } catch (error) {
            console.error('Error creating transaction:', error);
            this.showAlert('danger', error.message || 'Failed to create transaction');
        } finally {
            createBtn.disabled = false;
            createBtn.innerHTML = originalText;
        }
    }

    populateCountries() {
        // Use the global Countries utility to populate the country select
        if (typeof window.Countries !== 'undefined') {
            window.Countries.populateCountrySelect('merchant-country', null, true);
            console.log('Countries populated successfully');
        } else {
            console.error('Countries utility not loaded');
            // Fallback to basic countries if the utility is not available
            const select = document.getElementById('merchant-country');
            if (select && select.children.length <= 1) { // Only has the "Select Country" option
                const basicCountries = [
                    { code: 'US', name: 'United States' },
                    { code: 'CA', name: 'Canada' },
                    { code: 'GB', name: 'United Kingdom' },
                    { code: 'AU', name: 'Australia' },
                    { code: 'DE', name: 'Germany' },
                    { code: 'FR', name: 'France' },
                    { code: 'JP', name: 'Japan' },
                    { code: 'IN', name: 'India' },
                    { code: 'BR', name: 'Brazil' },
                    { code: 'CN', name: 'China' }
                ];

                basicCountries.forEach(country => {
                    const option = document.createElement('option');
                    option.value = country.code;
                    option.textContent = country.name;
                    select.appendChild(option);
                });
            }
        }
    }

    async createMerchant() {
        const form = document.getElementById('create-merchant-form');

        // Validate form
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const merchantData = {
            businessName: document.getElementById('merchant-business-name').value,
            legalName: document.getElementById('merchant-legal-name').value,
            email: document.getElementById('merchant-email').value,
            phoneNumber: document.getElementById('merchant-phone').value,
            type: document.getElementById('merchant-type').value,
            website: document.getElementById('merchant-website').value || undefined,
            description: document.getElementById('merchant-description').value || undefined,
            address: {
                street: document.getElementById('merchant-street').value,
                city: document.getElementById('merchant-city').value,
                state: document.getElementById('merchant-state').value,
                postalCode: document.getElementById('merchant-postal-code').value,
                country: document.getElementById('merchant-country').value,
            }
        };

        // Remove undefined values
        Object.keys(merchantData).forEach(key => {
            if (merchantData[key] === undefined) {
                delete merchantData[key];
            }
        });

        const createBtn = document.getElementById('create-merchant-btn');
        const originalText = createBtn.innerHTML;

        try {
            createBtn.disabled = true;
            createBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating...';

            const response = await this.apiCall('/merchants', {
                method: 'POST',
                body: JSON.stringify(merchantData)
            });

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createMerchantModal'));
            modal.hide();

            // Reset form
            form.reset();

            // Show success message
            this.showAlert('success', `Merchant created successfully! ID: ${response.merchantId}`);

            // Refresh merchants data
            this.loadMerchants();
            this.loadMerchantsTable();

        } catch (error) {
            console.error('Error creating merchant:', error);
            this.showAlert('danger', error.message || 'Failed to create merchant');
        } finally {
            createBtn.disabled = false;
            createBtn.innerHTML = originalText;
        }
    }

    shouldShowApproveButton(merchant) {
        const kycStatus = merchant.kycStatus;
        const shouldShow = kycStatus === 'pending_review' ||
                          kycStatus === 'in_progress' ||
                          kycStatus === 'pending' ||
                          kycStatus === 'PENDING_REVIEW' ||
                          kycStatus === 'IN_PROGRESS' ||
                          kycStatus === 'PENDING';

        console.log(`🔍 Merchant ${merchant.businessName}: kycStatus="${kycStatus}", status="${merchant.status}", shouldShow=${shouldShow}`);
        return shouldShow;
    }

    async loadMerchantsTable() {
        try {
            const response = await this.apiCall('/merchants');
            const merchants = Array.isArray(response) ? response : (response.data || []);

            const tableBody = document.getElementById('merchants-table-body');
            if (!tableBody) return;

            if (merchants.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-muted">
                            <i class="fas fa-store fa-2x mb-2"></i><br>
                            No merchants found. Create your first merchant to get started.
                        </td>
                    </tr>
                `;
                return;
            }

            // Debug: Log merchant data to see KYC status values (can be removed in production)
            console.log('Merchants data:', merchants.map(m => ({
                businessName: m.businessName,
                status: m.status,
                kycStatus: m.kycStatus
            })));

            const html = merchants.map(merchant => `
                <tr>
                    <td><code>${merchant.merchantId}</code></td>
                    <td>
                        <strong>${merchant.businessName}</strong>
                        ${merchant.legalName !== merchant.businessName ? `<br><small class="text-muted">${merchant.legalName}</small>` : ''}
                    </td>
                    <td>${merchant.contactEmail || merchant.email}</td>
                    <td>
                        <span class="badge bg-${this.getMerchantStatusColor(merchant.status)}">
                            <i class="fas fa-${this.getMerchantStatusIcon(merchant.status)} me-1"></i>
                            ${merchant.status.toUpperCase()}
                        </span>
                    </td>
                    <td>
                        <span class="badge bg-${merchant.kycStatus === 'approved' ? 'success' : merchant.kycStatus === 'pending' ? 'warning' : merchant.kycStatus === 'rejected' ? 'danger' : 'secondary'}">
                            <i class="fas fa-${merchant.kycStatus === 'approved' ? 'shield-check' : merchant.kycStatus === 'pending' ? 'hourglass-half' : merchant.kycStatus === 'rejected' ? 'times-circle' : 'exclamation-circle'} me-1"></i>
                            ${(merchant.kycStatus || 'not_started').replace('_', ' ').toUpperCase()}
                        </span>
                    </td>
                    <td>${new Date(merchant.createdAt).toLocaleDateString()}</td>
                    <td>
                        <div class="btn-group btn-group-sm" role="group">
                            ${this.shouldShowApproveButton(merchant) ?
                                `<button class="btn approve-kyc-btn" data-merchant-id="${merchant.id}" title="Approve KYC">
                                    <i class="fas fa-check"></i>
                                </button>
                                <button class="btn reject-kyc-btn" data-merchant-id="${merchant.id}" title="Reject KYC">
                                    <i class="fas fa-times"></i>
                                </button>` : ''
                            }
                            ${merchant.status === 'approved' && merchant.kycStatus === 'approved' ?
                                `<button class="btn activate-merchant-btn" data-merchant-id="${merchant.id}" title="Activate Merchant">
                                    <i class="fas fa-power-off"></i>
                                </button>` : ''
                            }
                            ${merchant.status === 'active' ?
                                `<button class="btn btn-outline-warning suspend-merchant-btn" data-merchant-id="${merchant.id}" title="Suspend Merchant">
                                    <i class="fas fa-pause"></i>
                                </button>` : ''
                            }
                            ${(merchant.kycStatus === 'not_started' || !merchant.kycStatus) ?
                                `<button class="btn start-kyc-btn" data-merchant-id="${merchant.id}" title="Start KYC Process">
                                    <i class="fas fa-id-card"></i>
                                </button>` : ''
                            }
                            <button class="btn btn-outline-primary view-merchant-btn" data-merchant-id="${merchant.id}" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-secondary edit-merchant-btn" data-merchant-id="${merchant.id}" title="Edit Merchant">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            tableBody.innerHTML = html;

            // Add event listeners for merchant action buttons
            this.attachMerchantEventListeners();

        } catch (error) {
            console.error('Error loading merchants table:', error);
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-danger">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            Error loading merchants: ${error.message}
                        </td>
                    </tr>
                `;
            }
        }
    }

    attachMerchantEventListeners() {
        console.log('=== ATTACHING MERCHANT EVENT LISTENERS ===');

        // Approve KYC buttons
        const approveKycButtons = document.querySelectorAll('.approve-kyc-btn');
        approveKycButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const merchantId = button.getAttribute('data-merchant-id');
                this.approveKyc(merchantId);
            });
        });

        // Reject KYC buttons
        const rejectKycButtons = document.querySelectorAll('.reject-kyc-btn');
        rejectKycButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const merchantId = button.getAttribute('data-merchant-id');
                this.rejectKyc(merchantId);
            });
        });

        // Activate merchant buttons
        const activateButtons = document.querySelectorAll('.activate-merchant-btn');
        activateButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const merchantId = button.getAttribute('data-merchant-id');
                this.activateMerchant(merchantId);
            });
        });

        // Suspend merchant buttons
        const suspendButtons = document.querySelectorAll('.suspend-merchant-btn');
        suspendButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const merchantId = button.getAttribute('data-merchant-id');
                this.suspendMerchant(merchantId);
            });
        });

        // Start KYC buttons
        const kycButtons = document.querySelectorAll('.start-kyc-btn');
        kycButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const merchantId = button.getAttribute('data-merchant-id');
                this.startKycProcess(merchantId);
            });
        });

        // View merchant buttons
        const viewButtons = document.querySelectorAll('.view-merchant-btn');
        viewButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const merchantId = button.getAttribute('data-merchant-id');
                this.viewMerchant(merchantId);
            });
        });

        // Edit merchant buttons
        const editButtons = document.querySelectorAll('.edit-merchant-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const merchantId = button.getAttribute('data-merchant-id');
                this.editMerchant(merchantId);
            });
        });
    }

    async activateMerchant(merchantId) {
        if (!confirm('Are you sure you want to activate this merchant?')) {
            return;
        }

        try {
            await this.apiCall(`/merchants/${merchantId}/activate`, {
                method: 'POST'
            });

            this.showSuccess('Merchant activated successfully!');
            this.loadMerchantsTable();
            this.loadMerchants(); // Refresh dropdown

        } catch (error) {
            console.error('Error activating merchant:', error);
            this.showError(`Failed to activate merchant: ${error.message}`);
        }
    }

    async suspendMerchant(merchantId) {
        const reason = prompt('Please provide a reason for suspending this merchant:');
        if (!reason || reason.trim() === '') {
            return;
        }

        try {
            await this.apiCall(`/merchants/${merchantId}/suspend`, {
                method: 'POST',
                body: JSON.stringify({ reason: reason.trim() })
            });

            this.showSuccess('Merchant suspended successfully!');
            this.loadMerchantsTable();
            this.loadMerchants(); // Refresh dropdown

        } catch (error) {
            console.error('Error suspending merchant:', error);
            this.showError(`Failed to suspend merchant: ${error.message}`);
        }
    }

    async approveKyc(merchantId) {
        if (!confirm('Are you sure you want to approve the KYC for this merchant? This will set their status to APPROVED.')) {
            return;
        }

        try {
            await this.apiCall(`/merchants/${merchantId}/kyc/approve`, {
                method: 'POST'
            });

            this.showSuccess('KYC approved successfully! Merchant can now be activated.');
            this.loadMerchantsTable();
            this.loadMerchants(); // Refresh dropdown
        } catch (error) {
            console.error('Error approving KYC:', error);
            this.showError(`Error approving KYC: ${error.message}`);
        }
    }

    async rejectKyc(merchantId) {
        const reason = prompt('Please provide a reason for rejecting the KYC:');
        if (!reason || reason.trim() === '') {
            return;
        }

        try {
            await this.apiCall(`/merchants/${merchantId}/kyc/reject`, {
                method: 'POST',
                body: JSON.stringify({ reason: reason.trim() })
            });

            this.showSuccess('KYC rejected successfully');
            this.loadMerchantsTable();
            this.loadMerchants(); // Refresh dropdown
        } catch (error) {
            console.error('Error rejecting KYC:', error);
            this.showError(`Error rejecting KYC: ${error.message}`);
        }
    }

    async startKycProcess(merchantId) {
        if (!confirm('Are you sure you want to start the KYC process for this merchant?')) {
            return;
        }

        try {
            await this.apiCall(`/merchants/${merchantId}/kyc/start`, {
                method: 'POST'
            });

            this.showSuccess('KYC process started successfully');
            this.loadMerchantsTable();
        } catch (error) {
            console.error('Error starting KYC process:', error);
            this.showError(`Error starting KYC process: ${error.message}`);
        }
    }

    async viewMerchant(merchantId) {
        console.log('Viewing merchant:', merchantId);

        try {
            const merchant = await this.apiCall(`/merchants/${merchantId}`);
            this.showMerchantDetailsModal(merchant);
        } catch (error) {
            console.error('Error loading merchant details:', error);
            this.showError(`Error loading merchant details: ${error.message}`);
        }
    }

    async editMerchant(merchantId) {
        console.log('Editing merchant:', merchantId);

        try {
            const merchant = await this.apiCall(`/merchants/${merchantId}`);
            this.showEditMerchantModal(merchant);
        } catch (error) {
            console.error('Error loading merchant for editing:', error);
            this.showError(`Error loading merchant: ${error.message}`);
        }
    }

    showMerchantDetailsModal(merchant) {
        // TODO: Implement merchant details modal
        alert(`Merchant Details:\n\nBusiness Name: ${merchant.businessName}\nEmail: ${merchant.contactEmail}\nStatus: ${merchant.status}\nKYC Status: ${merchant.kycStatus}`);
    }

    showEditMerchantModal(merchant) {
        // TODO: Implement merchant editing modal
        alert('Merchant editing modal will be implemented soon!');
    }

    async refreshTransactions() {
        console.log('Refreshing transactions data...');

        const refreshBtn = document.getElementById('refresh-transactions-btn');
        const originalHTML = refreshBtn ? refreshBtn.innerHTML : '';

        try {
            // Show loading state
            if (refreshBtn) {
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Refreshing...';
            }

            await this.loadTransactions();
            this.showAlert('success', 'Transactions data refreshed successfully');

        } catch (error) {
            console.error('Error refreshing transactions:', error);
            this.showAlert('danger', 'Failed to refresh transactions data');
        } finally {
            // Restore button state
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = originalHTML;
            }
        }
    }

    refreshMerchants() {
        console.log('Refreshing merchants data...');
        this.loadMerchants();
        this.loadMerchantsTable();
        this.showAlert('info', 'Merchants data refreshed');
    }

    startAuthCheck() {
        // Check authentication every 10 seconds (less frequent to avoid spam)
        setInterval(async () => {
            const authStatus = this.isAuthenticated();
            console.log('Periodic basic auth check:', authStatus);

            if (!authStatus) {
                console.log('Basic authentication lost, redirecting to login...');
                alert('Session expired. Redirecting to login...');
                this.redirectToLogin();
                return;
            }

            // SKIP SERVER VALIDATION FOR NOW
            // TODO: Re-enable server validation once endpoint is confirmed
        }, 10000);
    }

    showAlert(type, message) {
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Find container and insert alert
        const container = document.querySelector('.container-fluid') || document.body;
        container.insertBefore(alertDiv, container.firstChild);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    // Mock data methods for when API endpoints don't exist yet
    getMockSecurityAlerts() {
        return [
            {
                severity: 'high',
                message: 'Multiple failed login attempts detected',
                timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
                status: 'active'
            },
            {
                severity: 'medium',
                message: 'Unusual transaction pattern detected',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
                status: 'investigating'
            },
            {
                severity: 'low',
                message: 'SSL certificate expires in 30 days',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
                status: 'resolved'
            }
        ];
    }

    getMockComplianceData() {
        return {
            overallScore: 92,
            items: [
                { name: 'PCI DSS Compliance', status: 'compliant' },
                { name: 'Data Encryption', status: 'compliant' },
                { name: 'Access Controls', status: 'compliant' },
                { name: 'Audit Logging', status: 'compliant' },
                { name: 'Vulnerability Scanning', status: 'non_compliant' },
                { name: 'Security Training', status: 'compliant' }
            ]
        };
    }

    getMockFraudStats() {
        return {
            transactionsProcessed: '1,247',
            flaggedForReview: '23',
            blocked: '12',
            falsePositiveRate: '2.1'
        };
    }

    getAlertSeverityColor(severity) {
        const colors = {
            'low': 'success',
            'medium': 'warning',
            'high': 'danger',
            'critical': 'dark'
        };
        return colors[severity] || 'secondary';
    }

    getMerchantStatusColor(status) {
        const colors = {
            'pending': 'warning',
            'under_review': 'info',
            'approved': 'primary',
            'active': 'success',
            'rejected': 'danger',
            'suspended': 'danger'
        };
        return colors[status] || 'secondary';
    }

    getMerchantStatusIcon(status) {
        const icons = {
            'pending': 'clock',
            'under_review': 'search',
            'approved': 'check-circle',
            'active': 'power-off',
            'rejected': 'times-circle',
            'suspended': 'ban'
        };
        return icons[status] || 'question-circle';
    }

    getMockAnalyticsData() {
        return {
            transactionMetrics: {
                totalTransactions: 1247,
                totalVolume: 125430.50,
                totalFees: 3762.92,
                averageTransactionValue: 100.58,
                successRate: 94.2,
                failureRate: 5.8
            },
            merchantMetrics: {
                totalMerchants: 23,
                activeMerchants: 21,
                pendingMerchants: 2,
                suspendedMerchants: 0,
                kycApprovalRate: 91.3,
                averageOnboardingTime: 2.5
            },
            fraudMetrics: {
                averageRiskScore: 18.5,
                highRiskTransactions: 12,
                blockedTransactions: 8,
                falsePositiveRate: 2.1
            }
        };
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new AdminDashboard();
});

// Global functions for UI interactions
function showProfile() {
    alert('Profile management coming soon!');
}

// Test function to verify JS is working
function testLogout() {
    console.log('=== TEST LOGOUT CALLED ===');
    localStorage.clear();
    sessionStorage.clear();
    console.log('Storage cleared, redirecting...');
    window.location.href = '/ui/auth/login.html';
}

function logout() {
    console.log('=== LOGOUT CALLED ===');

    // Check what's in storage BEFORE clearing
    console.log('BEFORE CLEAR - Token:', !!localStorage.getItem('authToken'));
    console.log('BEFORE CLEAR - User:', !!localStorage.getItem('user'));
    console.log('BEFORE CLEAR - Tenant:', !!localStorage.getItem('tenant'));

    try {
        // Clear specific items first
        console.log('Removing specific items...');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('tenant');
        localStorage.removeItem('refreshToken');

        // Check after specific removal
        console.log('AFTER SPECIFIC REMOVAL - Token:', !!localStorage.getItem('authToken'));
        console.log('AFTER SPECIFIC REMOVAL - User:', !!localStorage.getItem('user'));
        console.log('AFTER SPECIFIC REMOVAL - Tenant:', !!localStorage.getItem('tenant'));

        // Clear all storage as backup
        console.log('Clearing all storage...');
        localStorage.clear();
        sessionStorage.clear();

        // Check after clear all
        console.log('AFTER CLEAR ALL - Token:', !!localStorage.getItem('authToken'));
        console.log('AFTER CLEAR ALL - User:', !!localStorage.getItem('user'));
        console.log('AFTER CLEAR ALL - Tenant:', !!localStorage.getItem('tenant'));
        console.log('AFTER CLEAR ALL - localStorage length:', localStorage.length);

        // Clear cookies
        document.cookie.split(";").forEach(function(c) {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });

        console.log('All data cleared, redirecting...');

        // Force immediate redirect - no popup needed
        window.location.replace('/ui/auth/login.html');

    } catch (error) {
        console.error('Logout error:', error);
        // Last resort - just reload the page
        window.location.reload();
    }
}

// Global function to handle simple filter button click
function filterTransactions() {
    if (window.dashboard) {
        window.dashboard.filterTransactions();
    } else {
        console.error('Dashboard instance not available');
    }
}


