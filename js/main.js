// Main application entry point for BTCUSD Chart

class BTCUSDApp {
    constructor() {
        this.chart = null;
        this.data = [];
        this.isInitialized = false;
        this.dataFilePath = 'DATA/BTCUSD15.csv';

        // Initialize application
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('Initializing BTCUSD Chart Application...');

            // Check browser support
            if (!Utils.checkBrowserSupport()) {
                throw new Error('Your browser is not supported. Please use a modern browser.');
            }

            // Initialize chart
            this.initializeChart();

            // Load and display data
            await this.loadData();

            // Setup global error handling
            this.setupErrorHandling();

            this.isInitialized = true;
            console.log('BTCUSD Chart Application initialized successfully');

        } catch (error) {
            console.error('Failed to initialize application:', error);
            Utils.showError(`Application initialization failed: ${error.message}`);
        }
    }

    /**
     * Initialize the TradingView chart
     */
    initializeChart() {
        try {
            Utils.setLoading('Initializing chart...');

            // Create chart instance
            this.chart = new BTCUSDChart('chart-container', {
                // Custom chart options can be added here
                layout: {
                    background: { type: 'solid', color: '#000000' }
                },
                grid: {
                    vertLines: { color: 'rgba(42, 46, 57, 0.3)' },
                    horzLines: { color: 'rgba(42, 46, 57, 0.3)' }
                }
            });

            console.log('Chart initialized successfully');

        } catch (error) {
            console.error('Failed to initialize chart:', error);
            throw error;
        }
    }

    /**
     * Load BTCUSD data from CSV file
     */
    async loadData() {
        const startTime = performance.now();

        try {
            console.log('Loading BTCUSD data...');

            // Load data from CSV
            const rawData = await DataProcessor.loadCSVData(this.dataFilePath);

            // Validate data integrity
            const validation = DataProcessor.validateDataIntegrity(rawData);
            if (!validation.valid) {
                console.warn('Data validation warnings:', validation.errors);
                console.log(`${validation.validPoints} valid points, ${validation.invalidPoints} invalid points skipped`);
            }

            // Convert to TradingView format
            this.data = DataProcessor.convertToTradingViewFormat(rawData);

            // Set data to chart
            if (this.chart) {
                this.chart.setData(this.data);
            }

            // Update chart information display
            this.updateChartInfo();

            // Log performance metrics
            const loadTime = performance.now() - startTime;
            console.log(`Data loaded successfully in ${Math.round(loadTime)}ms`);
            console.log(`Total data points: ${this.data.length}`);

            // Hide loading indicator
            Utils.hideLoading();

        } catch (error) {
            console.error('Failed to load data:', error);
            Utils.hideLoading();
            throw error;
        }
    }

    /**
     * Update chart information display
     */
    updateChartInfo() {
        try {
            const statistics = DataProcessor.getDataStatistics(this.data);

            if (statistics) {
                Utils.updateChartInfo({
                    count: statistics.count,
                    startDate: statistics.startDate,
                    endDate: statistics.endDate,
                    priceMin: statistics.priceMin,
                    priceMax: statistics.priceMax
                });

                console.log('Chart information updated:', statistics);
            }

        } catch (error) {
            console.error('Failed to update chart info:', error);
        }
    }

    /**
     * Setup global error handling
     */
    setupErrorHandling() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            Utils.showError('An unexpected error occurred. Please refresh the page.');
        });

        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            console.error('Uncaught error:', event.error);
            Utils.showError('An unexpected error occurred. Please refresh the page.');
        });

        // Handle chart container errors
        const chartContainer = document.getElementById('chart-container');
        if (chartContainer) {
            chartContainer.addEventListener('error', (event) => {
                console.error('Chart container error:', event);
                Utils.showError('Chart display error. Please refresh the page.');
            });
        }
    }

    /**
     * Get application data
     * @returns {Array} Current chart data
     */
    getData() {
        return this.data;
    }

    /**
     * Get chart instance
     * @returns {BTCUSDChart} Chart instance
     */
    getChart() {
        return this.chart;
    }

    /**
     * Check if application is initialized
     * @returns {boolean} True if initialized
     */
    isReady() {
        return this.isInitialized;
    }

    /**
     * Refresh data from server
     */
    async refreshData() {
        try {
            Utils.setLoading('Refreshing data...');
            await this.loadData();
            console.log('Data refreshed successfully');
        } catch (error) {
            console.error('Failed to refresh data:', error);
            Utils.showError('Failed to refresh data. Please try again.');
        }
    }

    /**
     * Export chart as image
     */
    exportChart() {
        try {
            if (this.chart && this.chart.takeScreenshot) {
                const screenshot = this.chart.takeScreenshot();
                if (screenshot) {
                    // Create download link
                    const link = document.createElement('a');
                    link.download = `btcusd-chart-${new Date().toISOString().split('T')[0]}.png`;
                    link.href = screenshot;
                    link.click();
                }
            }
        } catch (error) {
            console.error('Failed to export chart:', error);
            Utils.showError('Failed to export chart image.');
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create global app instance
    window.BTCUSDApp = new BTCUSDApp();

    // Add keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        // F5 or Ctrl+R: Refresh data
        if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
            event.preventDefault();
            window.BTCUSDApp.refreshData();
        }

        // Ctrl+S: Export chart as image
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            window.BTCUSDApp.exportChart();
        }
    });

    // Add performance monitoring
    if (window.performance && window.performance.memory) {
        setInterval(() => {
            const memory = window.performance.memory;
            const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
            const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);

            if (usedMB > 100) { // Warn if memory usage is high
                console.warn(`High memory usage: ${usedMB}MB / ${totalMB}MB`);
            }
        }, 30000); // Check every 30 seconds
    }

    console.log('BTCUSD Chart Application loaded. Keyboard shortcuts:');
    console.log('- F5/Ctrl+R: Refresh data');
    console.log('- Ctrl+S: Export chart as image');
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Page hidden - pausing updates');
    } else {
        console.log('Page visible - resuming updates');
        // Could implement data refresh here if needed
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BTCUSDApp;
}