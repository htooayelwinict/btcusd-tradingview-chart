// Utility functions for BTCUSD Chart Application

const Utils = {
    /**
     * Format number with locale-specific formatting
     * @param {number} num - Number to format
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted number
     */
    formatNumber: function(num, decimals = 2) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(num);
    },

    /**
     * Format date string for display
     * @param {string} dateString - Date string in YYYY-MM-DD HH:mm format
     * @returns {string} Formatted date string
     */
    formatDate: function(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    },

    /**
     * Debounce function to limit rapid function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Calculate price range from OHLC data
     * @param {Array} data - Array of OHLC data objects
     * @returns {Object} Object containing min and max prices
     */
    calculatePriceRange: function(data) {
        if (!data || data.length === 0) {
            return { min: 0, max: 0 };
        }

        let min = Infinity;
        let max = -Infinity;

        data.forEach(item => {
            if (item.low < min) min = item.low;
            if (item.high > max) max = item.high;
        });

        return { min, max };
    },

    /**
     * Validate OHLC data object
     * @param {Object} item - OHLC data object
     * @returns {boolean} True if valid, false otherwise
     */
    validateOHLC: function(item) {
        return (
            item &&
            typeof item.time === 'string' &&
            typeof item.open === 'number' &&
            typeof item.high === 'number' &&
            typeof item.low === 'number' &&
            typeof item.close === 'number' &&
            item.high >= item.low &&
            item.high >= item.open &&
            item.high >= item.close &&
            item.low <= item.open &&
            item.low <= item.close
        );
    },

    /**
     * Show error message to user
     * @param {string} message - Error message to display
     */
    showError: function(message) {
        const errorElement = document.getElementById('error-message');
        const loadingElement = document.getElementById('loading-indicator');

        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'inline';
        }

        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    },

    /**
     * Hide error message
     */
    hideError: function() {
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    },

    /**
     * Update loading indicator text
     * @param {string} message - Loading message to display
     */
    setLoading: function(message) {
        const loadingElement = document.getElementById('loading-indicator');
        if (loadingElement) {
            loadingElement.textContent = message;
            loadingElement.style.display = 'inline';
        }
    },

    /**
     * Hide loading indicator
     */
    hideLoading: function() {
        const loadingElement = document.getElementById('loading-indicator');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    },

    /**
     * Update chart information display
     * @param {Object} data - Chart data information
     */
    updateChartInfo: function(data) {
        const dataCount = document.getElementById('data-count');
        const dateRange = document.getElementById('date-range');
        const priceRange = document.getElementById('price-range');

        if (dataCount && data.count) {
            dataCount.textContent = data.count.toLocaleString();
        }

        if (dateRange && data.startDate && data.endDate) {
            dateRange.textContent = `${this.formatDate(data.startDate)} - ${this.formatDate(data.endDate)}`;
        }

        if (priceRange && data.priceMin !== undefined && data.priceMax !== undefined) {
            priceRange.textContent = `$${this.formatNumber(data.priceMin)} - $${this.formatNumber(data.priceMax)}`;
        }
    },

    /**
     * Check if browser supports required features
     * @returns {boolean} True if supported, false otherwise
     */
    checkBrowserSupport: function() {
        return (
            typeof fetch !== 'undefined' &&
            typeof Promise !== 'undefined' &&
            window.requestAnimationFrame &&
            window.Map &&
            window.Set
        );
    },

    /**
     * Get performance metrics for data loading
     * @param {number} startTime - Start time in milliseconds
     * @param {number} dataSize - Size of loaded data
     * @returns {Object} Performance metrics
     */
    getPerformanceMetrics: function(startTime, dataSize) {
        const loadTime = performance.now() - startTime;
        return {
            loadTime: Math.round(loadTime),
            dataPoints: dataSize,
            loadTimePerPoint: loadTime / dataSize,
            memoryUsage: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            } : null
        };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}