// Real-time Monitoring Dashboard JavaScript

class MonitoringDashboard {
    constructor() {
        this.apiBase = '/api/v1';
        this.chart = null;
        this.metrics = {
            transactions: [],
            volume: [],
            successRate: [],
            responseTime: []
        };
        this.maxDataPoints = 50;
        this.updateInterval = 5000; // 5 seconds
        this.activityBuffer = [];
        
        this.init();
    }

    init() {
        this.initChart();
        this.startRealTimeUpdates();
        this.simulateRealTimeData();
        this.loadInitialData();
    }

    async loadInitialData() {
        try {
            // Try to load real analytics data
            const response = await fetch(`${this.apiBase}/analytics/realtime`);
            if (response.ok) {
                const data = await response.json();
                this.updateMetricsFromAPI(data);
            }
        } catch (error) {
            console.log('Using simulated data for monitoring dashboard');
        }
    }

    updateMetricsFromAPI(data) {
        if (data.transactionVolume) {
            document.getElementById('live-transactions').textContent = 
                data.transactionVolume.count || 0;
            document.getElementById('live-volume').textContent = 
                '$' + (data.transactionVolume.total?.toLocaleString() || '0');
        }
        
        // Calculate success rate from data if available
        const successRate = data.successRate || 98.5;
        document.getElementById('success-rate').textContent = successRate.toFixed(1) + '%';
        
        // Update response time
        const avgResponse = data.averageResponseTime || Math.floor(Math.random() * 100) + 50;
        document.getElementById('avg-response').textContent = avgResponse + 'ms';
    }

    initChart() {
        const ctx = document.getElementById('realtime-chart');
        if (!ctx) return;

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Transactions/min',
                        data: [],
                        borderColor: '#4facfe',
                        backgroundColor: 'rgba(79, 172, 254, 0.1)',
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Volume ($)',
                        data: [],
                        borderColor: '#48bb78',
                        backgroundColor: 'rgba(72, 187, 120, 0.1)',
                        tension: 0.4,
                        fill: false,
                        yAxisID: 'y1'
                    },
                    {
                        label: 'Success Rate (%)',
                        data: [],
                        borderColor: '#ed8936',
                        backgroundColor: 'rgba(237, 137, 54, 0.1)',
                        tension: 0.4,
                        fill: false,
                        yAxisID: 'y2'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#a0aec0'
                        },
                        grid: {
                            color: '#4a5568'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        ticks: {
                            color: '#4facfe'
                        },
                        grid: {
                            color: '#4a5568'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        ticks: {
                            color: '#48bb78',
                            callback: function(value) {
                                return '$' + value;
                            }
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    },
                    y2: {
                        type: 'linear',
                        display: false,
                        min: 0,
                        max: 100
                    }
                },
                animation: {
                    duration: 750
                }
            }
        });
    }

    simulateRealTimeData() {
        setInterval(() => {
            const now = new Date();
            const timeLabel = now.toLocaleTimeString();
            
            // Generate realistic metrics
            const transactions = Math.floor(Math.random() * 50) + 20;
            const volume = Math.floor(Math.random() * 5000) + 1000;
            const successRate = 95 + Math.random() * 4; // 95-99%
            const responseTime = Math.floor(Math.random() * 100) + 50;
            
            // Update metrics display
            this.updateMetricDisplay('live-transactions', transactions);
            this.updateMetricDisplay('live-volume', '$' + volume.toLocaleString());
            this.updateMetricDisplay('success-rate', successRate.toFixed(1) + '%');
            this.updateMetricDisplay('avg-response', responseTime + 'ms');
            
            // Update chart
            this.addDataPoint(timeLabel, transactions, volume, successRate);
            
            // Generate activity
            this.generateActivity(transactions, volume, successRate);
            
            // Update system health
            this.updateSystemHealth();
            
        }, this.updateInterval);
    }

    updateMetricDisplay(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            const oldValue = element.textContent;
            element.textContent = value;
            
            // Add visual feedback for changes
            element.style.transform = 'scale(1.05)';
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 200);
        }
    }

    addDataPoint(label, transactions, volume, successRate) {
        if (!this.chart) return;

        // Add new data
        this.chart.data.labels.push(label);
        this.chart.data.datasets[0].data.push(transactions);
        this.chart.data.datasets[1].data.push(volume);
        this.chart.data.datasets[2].data.push(successRate);

        // Remove old data if we have too many points
        if (this.chart.data.labels.length > this.maxDataPoints) {
            this.chart.data.labels.shift();
            this.chart.data.datasets.forEach(dataset => {
                dataset.data.shift();
            });
        }

        this.chart.update('none');
    }

    generateActivity(transactions, volume, successRate) {
        const activities = [
            `${transactions} transactions processed`,
            `$${volume.toLocaleString()} in transaction volume`,
            `Success rate: ${successRate.toFixed(1)}%`,
            'New merchant registration pending',
            'High-risk transaction flagged for review',
            'Payment gateway connection established',
            'Fraud detection model updated',
            'Database backup completed',
            'API rate limit adjusted',
            'Security scan completed'
        ];

        // Randomly select activities
        if (Math.random() < 0.3) { // 30% chance of new activity
            const activity = activities[Math.floor(Math.random() * activities.length)];
            this.addActivity(activity);
        }
    }

    addActivity(message) {
        const activityList = document.getElementById('activity-list');
        if (!activityList) return;

        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.style.opacity = '0';
        activityItem.innerHTML = `
            <div class="d-flex justify-content-between">
                <span>${message}</span>
                <span class="activity-time">Just now</span>
            </div>
        `;

        activityList.insertBefore(activityItem, activityList.firstChild);

        // Animate in
        setTimeout(() => {
            activityItem.style.opacity = '1';
            activityItem.style.transition = 'opacity 0.3s ease';
        }, 100);

        // Remove old activities
        const activities = activityList.children;
        if (activities.length > 20) {
            activityList.removeChild(activities[activities.length - 1]);
        }

        // Update timestamps
        this.updateActivityTimestamps();
    }

    updateActivityTimestamps() {
        const activities = document.querySelectorAll('.activity-item .activity-time');
        activities.forEach((timeElement, index) => {
            if (index === 0) {
                timeElement.textContent = 'Just now';
            } else {
                const minutes = index;
                timeElement.textContent = `${minutes} min ago`;
            }
        });
    }

    updateSystemHealth() {
        // Simulate system health metrics
        const memoryUsage = 80 + Math.random() * 15; // 80-95%
        const cpuUsage = 30 + Math.random() * 40; // 30-70%
        const connections = Math.floor(Math.random() * 50) + 100; // 100-150

        document.getElementById('memory-usage').textContent = memoryUsage.toFixed(1) + '%';
        document.getElementById('cpu-usage').textContent = cpuUsage.toFixed(1) + '%';
        document.getElementById('connections').textContent = connections;

        // Update health indicators
        this.updateHealthIndicator('memory-usage', memoryUsage, 85, 95);
        this.updateHealthIndicator('cpu-usage', cpuUsage, 70, 85);
    }

    updateHealthIndicator(elementId, value, warningThreshold, criticalThreshold) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const parentItem = element.closest('.health-item');
        const indicator = parentItem.querySelector('.status-indicator');

        // Remove existing classes
        element.classList.remove('text-success', 'text-warning', 'text-danger');
        indicator.classList.remove('status-healthy', 'status-warning', 'status-critical');

        if (value >= criticalThreshold) {
            element.classList.add('text-danger');
            indicator.classList.add('status-critical');
        } else if (value >= warningThreshold) {
            element.classList.add('text-warning');
            indicator.classList.add('status-warning');
        } else {
            element.classList.add('text-success');
            indicator.classList.add('status-healthy');
        }
    }

    startRealTimeUpdates() {
        // Update activity timestamps every minute
        setInterval(() => {
            this.updateActivityTimestamps();
        }, 60000);

        // Try to fetch real data periodically
        setInterval(async () => {
            try {
                const response = await fetch(`${this.apiBase}/analytics/realtime`);
                if (response.ok) {
                    const data = await response.json();
                    this.updateMetricsFromAPI(data);
                }
            } catch (error) {
                // Continue with simulated data
            }
        }, 30000); // Every 30 seconds
    }

    // Method to add real transaction data from external sources
    addRealTransaction(transaction) {
        const message = `New transaction: $${transaction.amount} (${transaction.paymentMethod})`;
        this.addActivity(message);
        
        // Update metrics if needed
        this.loadInitialData();
    }
}

// Initialize monitoring dashboard
document.addEventListener('DOMContentLoaded', () => {
    window.monitoring = new MonitoringDashboard();
    
    // Listen for demo transactions from other windows
    window.addEventListener('storage', (e) => {
        if (e.key === 'demoTransactions') {
            const transactions = JSON.parse(e.newValue || '[]');
            if (transactions.length > 0) {
                const latestTransaction = transactions[0];
                window.monitoring.addRealTransaction(latestTransaction);
            }
        }
    });
    
    console.log('Real-time monitoring dashboard initialized');
});
