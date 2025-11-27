// TradingView Lightweight Charts implementation

class BTCUSDChart {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.chart = null;
        this.candlestickSeries = null;
        this.data = [];
        this.isInitialized = false;

        // Default chart options
        this.defaultOptions = {
            layout: {
                textColor: '#d1d4dc',
                background: {
                    type: 'solid',
                    color: '#000000'
                },
                fontSize: 12,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif'
            },
            grid: {
                vertLines: {
                    color: 'rgba(42, 46, 57, 0.5)',
                    style: 0
                },
                horzLines: {
                    color: 'rgba(42, 46, 57, 0.5)',
                    style: 0
                }
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: 'rgba(42, 46, 57, 0.5)',
                tickMarkFormatter: this.formatTickMark.bind(this)
            },
            rightPriceScale: {
                borderColor: 'rgba(42, 46, 57, 0.5)',
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1
                }
            },
            crosshair: {
                mode: 1,
                vertLine: {
                    width: 1,
                    color: 'rgba(224, 227, 235, 0.5)',
                    style: 0
                },
                horzLine: {
                    width: 1,
                    color: 'rgba(224, 227, 235, 0.5)',
                    style: 0
                }
            },
            watermark: {
                visible: false
            },
            localization: {
                priceFormatter: this.formatPrice.bind(this),
                timeFormatter: this.formatTime.bind(this)
            }
        };

        // Merge user options with defaults
        this.options = this.mergeOptions(this.defaultOptions, options);

        this.initializeChart();
        this.setupEventListeners();
    }

    /**
     * Initialize the TradingView chart
     */
    initializeChart() {
        try {
            if (!this.container) {
                throw new Error(`Container element with id '${this.containerId}' not found`);
            }

            // Create the chart using TradingView Lightweight Charts
            const { createChart, CandlestickSeries } = window.LightweightCharts;
            this.chart = createChart(this.container, this.options);

            // Add candlestick series
            this.candlestickSeries = this.chart.addSeries(CandlestickSeries, {
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderVisible: false,
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
                priceScaleId: 'right'
            });

            this.isInitialized = true;
            console.log('BTCUSD Chart initialized successfully');

        } catch (error) {
            console.error('Failed to initialize chart:', error);
            Utils.showError(`Chart initialization failed: ${error.message}`);
        }
    }

    /**
     * Set data for the chart
     * @param {Array} data - OHLC data array
     */
    setData(data) {
        try {
            if (!this.isInitialized) {
                throw new Error('Chart not initialized');
            }

            if (!data || !Array.isArray(data) || data.length === 0) {
                throw new Error('Invalid data provided');
            }

            this.data = data;

            // Set data to the candlestick series
            this.candlestickSeries.setData(data);

            // Fit content to show all data
            this.chart.timeScale().fitContent();

            console.log(`Chart loaded with ${data.length} data points`);

        } catch (error) {
            console.error('Failed to set chart data:', error);
            Utils.showError(`Failed to load chart data: ${error.message}`);
        }
    }

    /**
     * Update chart with new data point
     * @param {Object} dataPoint - New OHLC data point
     */
    updateData(dataPoint) {
        try {
            if (!this.isInitialized || !this.candlestickSeries) {
                throw new Error('Chart not initialized');
            }

            if (!Utils.validateOHLC(dataPoint)) {
                throw new Error('Invalid data point provided');
            }

            this.candlestickSeries.update(dataPoint);

        } catch (error) {
            console.error('Failed to update chart data:', error);
        }
    }

    /**
     * Resize chart to fit container
     */
    resize() {
        try {
            if (this.chart && this.chart.applyOptions) {
                this.chart.applyOptions({
                    width: this.container.clientWidth,
                    height: this.container.clientHeight
                });
            }
        } catch (error) {
            console.error('Failed to resize chart:', error);
        }
    }

    /**
     * Get current chart data
     * @returns {Array} Current chart data
     */
    getData() {
        return this.data;
    }

    /**
     * Get chart instance for advanced operations
     * @returns {Object} TradingView chart instance
     */
    getChart() {
        return this.chart;
    }

    /**
     * Get candlestick series instance
     * @returns {Object} Candlestick series instance
     */
    getCandlestickSeries() {
        return this.candlestickSeries;
    }

    /**
     * Set chart visibility
     * @param {boolean} visible - Whether chart should be visible
     */
    setVisibility(visible) {
        if (this.container) {
            this.container.style.display = visible ? 'block' : 'none';
        }
    }

    /**
     * Destroy chart and clean up resources
     */
    destroy() {
        try {
            if (this.chart) {
                this.chart.remove();
                this.chart = null;
                this.candlestickSeries = null;
                this.data = [];
                this.isInitialized = false;
            }
        } catch (error) {
            console.error('Failed to destroy chart:', error);
        }
    }

    /**
     * Format price for display
     * @param {number} price - Price value
     * @returns {string} Formatted price
     */
    formatPrice(price) {
        return '$' + Utils.formatNumber(price, 2);
    }

    /**
     * Format time for display
     * @param {Date|string} time - Time value
     * @returns {string} Formatted time
     */
    formatTime(time) {
        try {
            const date = new Date(time);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return '';
        }
    }

    /**
     * Format tick marks on time scale
     * @param {Date|string} time - Time value
     * @param {string} type - Tick mark type
     * @returns {string} Formatted tick mark
     */
    formatTickMark(time, type) {
        try {
            const date = new Date(time);

            switch (type) {
                case 'year':
                    return date.getFullYear().toString();
                case 'month':
                    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                case 'day':
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                case 'hour':
                    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                case 'minute':
                    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                default:
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
        } catch (error) {
            return '';
        }
    }

    /**
     * Merge chart options
     * @param {Object} defaultOptions - Default options
     * @param {Object} userOptions - User provided options
     * @returns {Object} Merged options
     */
    mergeOptions(defaultOptions, userOptions) {
        const merged = JSON.parse(JSON.stringify(defaultOptions));

        function deepMerge(target, source) {
            for (const key in source) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    target[key] = target[key] || {};
                    deepMerge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        }

        deepMerge(merged, userOptions);
        return merged;
    }

    /**
     * Setup event listeners for chart interactions
     */
    setupEventListeners() {
        // Handle window resize
        const debouncedResize = Utils.debounce(() => this.resize(), 250);
        window.addEventListener('resize', debouncedResize);

        // Handle crosshair move for potential price display
        if (this.chart) {
            this.chart.subscribeCrosshairMove((param) => {
                if (param.time) {
                    // Could be used for detailed price display
                    // console.log('Crosshair at:', param.time, param.seriesPrices);
                }
            });
        }
    }

    /**
     * Take screenshot of chart
     * @returns {string} Base64 encoded image
     */
    takeScreenshot() {
        try {
            if (this.chart && this.chart.takeScreenshot) {
                return this.chart.takeScreenshot();
            }
            return null;
        } catch (error) {
            console.error('Failed to take screenshot:', error);
            return null;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BTCUSDChart;
}