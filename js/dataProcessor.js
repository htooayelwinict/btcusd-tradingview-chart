// Data processing utilities for BTCUSD Chart Application

const DataProcessor = {
    /**
     * Load CSV data from file
     * @param {string} filePath - Path to CSV file
     * @returns {Promise<Array>} Promise resolving to parsed data
     */
    loadCSVData: async function(filePath) {
        const startTime = performance.now();

        try {
            Utils.setLoading('Fetching data file...');

            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to fetch data file: ${response.status} ${response.statusText}`);
            }

            Utils.setLoading('Reading CSV data...');
            const csvText = await response.text();

            if (!csvText || csvText.trim().length === 0) {
                throw new Error('CSV file is empty or could not be read');
            }

            Utils.setLoading('Parsing and transforming data...');
            const parsedData = this.parseCSV(csvText);

            const metrics = Utils.getPerformanceMetrics(startTime, parsedData.length);
            console.log('Data loading metrics:', metrics);

            return parsedData;

        } catch (error) {
            console.error('Error loading CSV data:', error);
            Utils.showError(`Failed to load data: ${error.message}`);
            throw error;
        }
    },

    /**
     * Parse CSV text into array of objects
     * @param {string} csvText - Raw CSV text
     * @returns {Array} Parsed data array
     */
    parseCSV: function(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim().length > 0);
        const data = [];

        for (let i = 0; i < lines.length; i++) {
            try {
                const line = lines[i].trim();
                if (!line) continue;

                // Parse tab-separated values
                const columns = line.split('\t');

                if (columns.length < 5) {
                    console.warn(`Skipping malformed line ${i + 1}: insufficient columns`);
                    continue;
                }

                // Extract values: datetime, open, high, low, close, volume
                const datetime = columns[0].trim();
                const open = parseFloat(columns[1]);
                const high = parseFloat(columns[2]);
                const low = parseFloat(columns[3]);
                const close = parseFloat(columns[4]);
                const volume = columns[5] ? parseInt(columns[5]) : 0;

                // Validate parsed values
                if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
                    console.warn(`Skipping line ${i + 1}: invalid numeric values`);
                    continue;
                }

                // Validate OHLC relationships
                if (high < low || high < open || high < close || low > open || low > close) {
                    console.warn(`Skipping line ${i + 1}: invalid OHLC relationships`);
                    continue;
                }

                const dataPoint = {
                    time: this.formatDateTimeForTradingView(datetime),
                    open: open,
                    high: high,
                    low: low,
                    close: close,
                    volume: volume
                };

                // Validate the complete data point
                if (Utils.validateOHLC(dataPoint)) {
                    data.push(dataPoint);
                } else {
                    console.warn(`Skipping invalid data point at line ${i + 1}:`, dataPoint);
                }

            } catch (error) {
                console.error(`Error parsing line ${i + 1}:`, error);
                continue;
            }
        }

        console.log(`Parsed ${data.length} valid data points from ${lines.length} lines`);

        if (data.length === 0) {
            throw new Error('No valid data points found in CSV file');
        }

        return data;
    },

    /**
     * Format datetime string for TradingView
     * @param {string} datetime - Original datetime string
     * @returns {string} Formatted datetime string
     */
    formatDateTimeForTradingView: function(datetime) {
        try {
            // Input format: "2019-12-03 06:15"
            // TradingView Lightweight Charts expects Unix timestamp in seconds
            const date = new Date(datetime);
            return Math.floor(date.getTime() / 1000);
        } catch (error) {
            console.error('Error formatting datetime:', error, 'for datetime:', datetime);
            return null; // Return null if formatting fails
        }
    },

    /**
     * Convert parsed data to TradingView format (if needed)
     * @param {Array} data - Parsed data array
     * @returns {Array} TradingView formatted data
     */
    convertToTradingViewFormat: function(data) {
        // Data is already in correct format from parsing
        // This method exists for future extensibility
        return data.map(item => ({
            time: item.time,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close
        }));
    },

    /**
     * Get data statistics
     * @param {Array} data - Data array
     * @returns {Object} Statistics object
     */
    getDataStatistics: function(data) {
        if (!data || data.length === 0) {
            return null;
        }

        const priceRange = Utils.calculatePriceRange(data);

        return {
            count: data.length,
            startDate: data[0].time,
            endDate: data[data.length - 1].time,
            priceMin: priceRange.min,
            priceMax: priceRange.max,
            averagePrice: this.calculateAveragePrice(data)
        };
    },

    /**
     * Calculate average price from data
     * @param {Array} data - Data array
     * @returns {number} Average closing price
     */
    calculateAveragePrice: function(data) {
        if (!data || data.length === 0) return 0;

        const totalClose = data.reduce((sum, item) => sum + item.close, 0);
        return totalClose / data.length;
    },

    /**
     * Sample data for performance testing (optional)
     * @param {Array} data - Original data array
     * @param {number} sampleRate - Sample rate (1 in N)
     * @returns {Array} Sampled data array
     */
    sampleData: function(data, sampleRate = 10) {
        if (!data || data.length === 0) return [];

        return data.filter((_, index) => index % sampleRate === 0);
    },

    /**
     * Validate data integrity
     * @param {Array} data - Data array to validate
     * @returns {Object} Validation results
     */
    validateDataIntegrity: function(data) {
        if (!data || data.length === 0) {
            return { valid: false, errors: ['No data to validate'] };
        }

        const errors = [];
        let invalidPoints = 0;

        data.forEach((item, index) => {
            if (!Utils.validateOHLC(item)) {
                invalidPoints++;
                if (invalidPoints <= 5) { // Only log first 5 errors
                    errors.push(`Invalid data point at index ${index}: ${JSON.stringify(item)}`);
                }
            }

            // Check for chronological order
            if (index > 0) {
                const current = new Date(item.time);
                const previous = new Date(data[index - 1].time);

                if (current <= previous) {
                    errors.push(`Data not in chronological order at index ${index}`);
                }
            }
        });

        return {
            valid: errors.length === 0,
            errors: errors,
            invalidPoints: invalidPoints,
            validPoints: data.length - invalidPoints
        };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataProcessor;
}