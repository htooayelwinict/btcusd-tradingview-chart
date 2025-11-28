// TradingView Lightweight Charts implementation

class BTCUSDChart {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.chart = null;
        this.candlestickSeries = null;
        this.data = [];
        this.isInitialized = false;

        // Drawing overlay support
        this.drawingManager = null;
        this.drawingsEnabled = false;

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
                mode: LightweightCharts.CrosshairMode.Normal,
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
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
                vertTouchDrag: true,
                horzTouchDrag: true
            },
            handleScale: {
                mouseWheel: true,
                pinch: true,
                axisPressedMouseMove: {
                    time: true,
                    price: true
                }
            }
        };

        // Merge user options with defaults
        this.options = this.mergeOptions(this.defaultOptions, options);

        this.initializeChart();
        this.setupEventListeners();

        // Initialize drawing support if available
        this.initializeDrawingSupport();
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
     * Enable/disable drawing tools
     * @param {boolean} enabled - Whether to enable drawings
     */
    enableDrawings(enabled = true) {
        if (this.drawingManager) {
            if (enabled) {
                this.drawingManager.canvas.style.pointerEvents = 'auto';
                this.drawingManager.isActive = true;
            } else {
                this.drawingManager.canvas.style.pointerEvents = 'none';
                this.drawingManager.isActive = false;
                this.drawingManager.setActiveTool(null);
            }
        }
        this.drawingsEnabled = enabled && !!this.drawingManager;
    }

    /**
     * Get drawing manager instance
     * @returns {DrawingManager|null} Drawing manager instance
     */
    getDrawingManager() {
        return this.drawingManager;
    }

    /**
     * Check if drawings are enabled
     * @returns {boolean} True if drawings enabled
     */
    isDrawingsEnabled() {
        return this.drawingsEnabled;
    }

    /**
     * Set active drawing tool
     * @param {BaseTool|null} tool - Drawing tool to activate
     */
    setActiveDrawingTool(tool) {
        if (this.drawingManager) {
            this.drawingManager.setActiveTool(tool);
        }
    }

    /**
     * Clear all drawings
     */
    clearAllDrawings() {
        if (this.drawingManager) {
            this.drawingManager.clearAllDrawings();
        }
    }

    /**
     * Export drawings
     * @returns {Array} Array of drawing objects
     */
    exportDrawings() {
        if (this.drawingManager) {
            return this.drawingManager.exportDrawings();
        }
        return [];
    }

    /**
     * Import drawings
     * @param {Array} drawings - Array of drawing objects
     */
    importDrawings(drawings) {
        if (this.drawingManager) {
            this.drawingManager.importDrawings(drawings);
        }
    }

    /**
     * Destroy chart and clean up resources
     */
    destroy() {
        try {
            // Destroy drawing manager first
            if (this.drawingManager) {
                this.drawingManager.destroy();
                this.drawingManager = null;
            }

            if (this.chart) {
                this.chart.remove();
                this.chart = null;
                this.candlestickSeries = null;
                this.data = [];
                this.isInitialized = false;
                this.drawingsEnabled = false;
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

        // Handle crosshair move for free mouse movement and drawing tools
        if (this.chart) {
            this.chart.subscribeCrosshairMove((param) => {
                if (param.point) {
                    // Use raw screen coordinates for free movement
                    let price = null;
                    let time = null;

                    if (param.point.y !== undefined && this.candlestickSeries) {
                        // Convert screen coordinates to price for free movement
                        price = this.candlestickSeries.coordinateToPrice(param.point.y);
                    }

                    if (param.point.x !== undefined) {
                        // Convert screen coordinates to time for free movement
                        time = this.chart.timeScale().coordinateToTime(param.point.x);
                    }

                    // Emit event for drawing tools with free-moving coordinates
                    if (window.eventBus) {
                        window.eventBus.emit('chart-crosshair-move', {
                            time: time,
                            price: price,
                            screenX: param.point.x,
                            screenY: param.point.y,
                            // Also provide snapped data if needed
                            snappedPrice: param.seriesPrices ? Object.values(param.seriesPrices)[0] : null
                        });
                    }
                }
            });
        }
    }

    /**
     * Initialize drawing support
     */
    initializeDrawingSupport() {
        if (!this.isInitialized) {
            setTimeout(() => {
                this.initializeDrawingSupport();
            }, 100);
            return;
        }

        // Check if DrawingManager is available
        if (typeof DrawingManager !== 'undefined') {
            try {
                this.drawingManager = new DrawingManager(this, {
                    lineWidth: 2,
                    lineColor: '#FF6B6B',
                    snapToPrice: true,
                    enableUndo: true
                });
                this.drawingsEnabled = true;

                // Emit chart ready event
                if (window.eventBus) {
                    window.eventBus.emit('chart-drawing-ready', {
                        chart: this,
                        drawingManager: this.drawingManager
                    });
                }

                console.log('BTCUSDChart: Drawing support initialized');
            } catch (error) {
                console.warn('BTCUSDChart: Failed to initialize drawing support:', error);
                this.drawingsEnabled = false;
            }
        } else {
            console.warn('BTCUSDChart: DrawingManager not available');
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

    /**
     * Get price scale by ID
     * @param {string} scaleId - Scale ID ('right' or 'left')
     * @returns {object|null} Price scale object
     */
    getPriceScaleById(scaleId = 'right') {
        try {
            if (this.candlestickSeries) {
                // For Lightweight Charts, get price scale from the series
                return this.candlestickSeries.priceScale();
            }
            return null;
        } catch (error) {
            console.warn('BTCUSDChart: Failed to get price scale:', error);
            return null;
        }
    }

    /**
     * Get time scale
     * @returns {object|null} Time scale object
     */
    getTimeScale() {
        try {
            if (this.chart) {
                return this.chart.timeScale();
            }
            return null;
        } catch (error) {
            console.warn('BTCUSDChart: Failed to get time scale:', error);
            return null;
        }
    }

    /**
     * Convert screen X coordinate to time
     * @param {number} x - Screen X coordinate
     * @returns {number|null} Time value or null if conversion fails
     */
    screenToTime(x) {
        try {
            const timeScale = this.getTimeScale();
            if (timeScale) {
                // For Lightweight Charts, use coordinateToTime
                const time = timeScale.coordinateToTime(x);
                return time;
            }
            return null;
        } catch (error) {
            console.warn('BTCUSDChart: Failed to convert screen to time:', error);
            return null;
        }
    }

    /**
     * Convert screen Y coordinate to price
     * @param {number} y - Screen Y coordinate
     * @param {string} scaleId - Price scale ID
     * @returns {number|null} Price value or null if conversion fails
     */
    screenToPrice(y, scaleId = 'right') {
        try {
            if (!this.candlestickSeries) return null;
            // For Lightweight Charts, use series.coordinateToPrice
            const price = this.candlestickSeries.coordinateToPrice(y);
            return price;
        } catch (error) {
            console.warn('BTCUSDChart: Failed to convert screen to price:', error);
            return null;
        }
    }

    /**
     * Convert time to screen X coordinate
     * @param {number} time - Time value
     * @returns {number|null} Screen X coordinate or null if conversion fails
     */
    timeToScreen(time) {
        try {
            const timeScale = this.getTimeScale();
            if (timeScale) {
                // For Lightweight Charts, use timeToCoordinate
                const x = timeScale.timeToCoordinate(time);
                return x; // Returns pixel coordinate or undefined if outside visible range
            }
            return null;
        } catch (error) {
            console.warn('BTCUSDChart: Failed to convert time to screen:', error);
            return null;
        }
    }

    /**
     * Convert price to screen Y coordinate
     * @param {number} price - Price value
     * @param {string} scaleId - Price scale ID
     * @returns {number|null} Screen Y coordinate or null if conversion fails
     */
    priceToScreen(price, scaleId = 'right') {
        try {
            if (!this.candlestickSeries) return null;
            // For Lightweight Charts, use series.priceToCoordinate
            const y = this.candlestickSeries.priceToCoordinate(price);
            return y; // Returns pixel coordinate or undefined if outside visible range
        } catch (error) {
            console.warn('BTCUSDChart: Failed to convert price to screen:', error);
            return null;
        }
    }

    /**
     * Subscribe to chart changes (pan/zoom)
     * @param {function} callback - Callback function to call on chart changes
     * @returns {object|null} Subscription object or null if subscription fails
     */
    subscribeToChartChanges(callback) {
        try {
            const timeScale = this.getTimeScale();
            const priceScale = this.getPriceScaleById();

            const subscriptions = [];

            if (timeScale && timeScale.subscribeVisibleLogicalRangeChange) {
                const timeSub = {
                    unsubscribe: () => timeScale.unsubscribeVisibleLogicalRangeChange(callback)
                };
                timeScale.subscribeVisibleLogicalRangeChange(callback);
                subscriptions.push(timeSub);
            }

            if (priceScale && priceScale.subscribeVisibleLogicalRangeChange) {
                const priceSub = {
                    unsubscribe: () => priceScale.unsubscribeVisibleLogicalRangeChange(callback)
                };
                priceScale.subscribeVisibleLogicalRangeChange(callback);
                subscriptions.push(priceSub);
            }

            return {
                unsubscribe: () => {
                    subscriptions.forEach(sub => {
                        try {
                            sub.unsubscribe();
                        } catch (e) {
                            console.warn('Failed to unsubscribe from chart changes:', e);
                        }
                    });
                }
            };
        } catch (error) {
            console.warn('BTCUSDChart: Failed to subscribe to chart changes:', error);
            return null;
        }
    }

    /**
     * Unsubscribe from chart changes
     * @param {object} subscription - Subscription object returned from subscribeToChartChanges
     */
    unsubscribeFromChartChanges(subscription) {
        try {
            if (subscription && subscription.unsubscribe) {
                subscription.unsubscribe();
            }
        } catch (error) {
            console.warn('BTCUSDChart: Failed to unsubscribe from chart changes:', error);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BTCUSDChart;
}