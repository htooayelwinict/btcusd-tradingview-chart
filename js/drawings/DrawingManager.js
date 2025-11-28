/**
 * DrawingManager - Manages drawing tools and canvas overlay for TradingView charts
 * Handles user interactions, coordinate mapping, and drawing state management
 */

class DrawingManager {
    constructor(chartInstance, options = {}) {
        this.chart = chartInstance;
        this.container = chartInstance.container;
        this.isActive = false;
        this.currentTool = null;
        this.drawings = new Map(); // Map of drawingId -> primitiveInstance
        this.currentDrawing = null;
        this.isDrawing = false;

        // Default options
        this.options = {
            lineWidth: 2,
            lineColor: '#FF6B6B',
            fillColor: 'rgba(255, 107, 107, 0.1)',
            snapToPrice: true,
            snapToTime: true,
            enableUndo: true,
            maxDrawings: 100,
            ...options
        };

        // Primitive-based drawing system
        this.primitives = new Map(); // Map of drawingId -> primitiveInstance

        // Navigation lock state
        this.originalNavigationOptions = null;
        this.navigationLocked = false;

       // Tool registry for available drawing tools
        this.tools = new Map();

        // Initialize coordinate mapper and tools
        this.initializeCoordinateMapper();
        this.initializeTools();
        this.bindEvents();
        this.setupEventBusListeners();

        // Cache original navigation defaults before any drawing operations
        this.cacheOriginalNavigationOptions();

        console.log('DrawingManager: Primitive-based drawing system initialized');
    }

    /**
     * Cache original navigation options before any drawing operations
     */
    cacheOriginalNavigationOptions() {
        try {
            // Use explicit defaults instead of reading current chart options
            // This ensures we cache the correct navigation defaults
            this.originalNavigationOptions = {
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
            console.log('DrawingManager: Original navigation options cached with explicit defaults');
        } catch (error) {
            console.warn('DrawingManager: Failed to cache navigation options:', error);
        }
    }

    /**
     * Initialize available drawing tools
     */
    initializeTools() {
        try {
            // Register TrendLine tool if available
            if (typeof TrendLineTool !== 'undefined') {
                this.tools.set('trendline', new TrendLineTool());
                console.log('DrawingManager: trendline tool registered');
            } else {
                console.warn('DrawingManager: TrendLineTool not available');
            }
        } catch (error) {
            console.warn('DrawingManager: Failed to initialize tools:', error);
        }
    }

    /**
     * Initialize coordinate mapper for primitive system
     */
    initializeCoordinateMapper() {
        this.coordinateMapper = {
            timeToScreen: (time) => {
                try {
                    const timeScale = this.chart.chart.timeScale();
                    const x = timeScale.timeToCoordinate(time);
                    return x;
                } catch (error) {
                    console.warn('DrawingManager: timeToScreen failed:', error);
                    return undefined;
                }
            },
            priceToScreen: (price) => {
                try {
                    if (!this.chart.candlestickSeries) return undefined;
                    const y = this.chart.candlestickSeries.priceToCoordinate(price);
                    return y;
                } catch (error) {
                    console.warn('DrawingManager: priceToScreen failed:', error);
                    return undefined;
                }
            },
            screenToTime: (x) => {
                try {
                    const timeScale = this.chart.chart.timeScale();
                    const time = timeScale.coordinateToTime(x);
                    return time;
                } catch (error) {
                    console.warn('DrawingManager: screenToTime failed:', error);
                    return undefined;
                }
            },
            screenToPrice: (y) => {
                try {
                    if (!this.chart.candlestickSeries) return undefined;
                    const price = this.chart.candlestickSeries.coordinateToPrice(y);
                    return price;
                } catch (error) {
                    console.warn('DrawingManager: screenToPrice failed:', error);
                    return undefined;
                }
            }
        };
    }

    
    /**
     * Bind mouse/touch events for drawing using chart's built-in event system
     */
    bindEvents() {
        // Use the chart container for mouse events when drawing is active
        this.chartContainer = this.container;

        // Bind mouse events to chart container
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);

        // Touch events for mobile
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);

        // Window resize
        const debouncedResize = Utils.debounce(() => {
            // Trigger chart update which will redraw primitives
            if (this.chart.chart) {
                this.chart.chart.applyOptions({});
            }
        }, 250);
        window.addEventListener('resize', debouncedResize);

        console.log('DrawingManager: Event listeners bound for primitive system');
    }

    /**
     * Setup EventBus listeners
     */
    setupEventBusListeners() {
        // Listen for chart updates
        eventBus.on('chart-visible-range-changed', () => {
            this.scheduleRedraw();
        });

        // Listen for tool selection
        eventBus.on('drawing-tool-selected', (toolNameOrObject) => {
            // If it's a string, get the tool instance from registry
            if (typeof toolNameOrObject === 'string') {
                const tool = this.getToolInstance(toolNameOrObject);
                this.setActiveTool(tool);
            } else {
                // If it's already an object, use it directly
                this.setActiveTool(toolNameOrObject);
            }
        });

        // Listen for tool deselection
        eventBus.on('drawing-tool-deselected', () => {
            this.setActiveTool(null);
        });

        // Listen for drawing clear
        eventBus.on('clear-all-drawings', () => {
            this.clearAllDrawings();
        });

        // Listen for undo/redo
        eventBus.on('undo-drawing', () => {
            this.undo();
        });

        eventBus.on('redo-drawing', () => {
            this.redo();
        });
    }

    /**
     * Disable chart panning and zooming interactions
     */
    disableNavigation() {
        if (!this.chart.chart || this.navigationLocked) return;

        // Apply disabled interaction options
        this.chart.chart.applyOptions({
            handleScroll: {
                mouseWheel: false,
                pressedMouseMove: false,
                vertTouchDrag: false,
                horzTouchDrag: false
            },
            handleScale: {
                mouseWheel: false,
                pinch: false,
                axisPressedMouseMove: false
            }
        });

        this.navigationLocked = true;
        console.log('DrawingManager: Chart navigation locked');
    }

    /**
     * Restore chart panning and zooming interactions
     */
    restoreNavigation() {
        if (!this.chart.chart || !this.navigationLocked) return;

        if (this.originalNavigationOptions) {
            // Restore original navigation defaults
            this.chart.chart.applyOptions({
                handleScroll: this.originalNavigationOptions.handleScroll,
                handleScale: this.originalNavigationOptions.handleScale
            });
            // Note: Keep originalNavigationOptions intact for future use
        }

        this.navigationLocked = false;
        console.log('DrawingManager: Chart navigation unlocked');
    }

    /**
     * Set active drawing tool
     * @param {Object} tool - Drawing tool instance
     */
    setActiveTool(tool) {
        if (this.currentTool) {
            this.currentTool.deactivate();
            // Remove event listeners when deactivating
            this.removeChartEventListeners();
            // Restore navigation when deactivating tool
            this.restoreNavigation();
        }

        this.currentTool = tool;
        this.isActive = !!tool;

        if (tool) {
            tool.activate();
            this.chartContainer.style.cursor = tool.getCursor() || 'crosshair';
            this.addChartEventListeners(); // Enable drawing when tool is active
            // Note: Navigation is NOT disabled here - only during actual drawing
            eventBus.emit('drawing-tool-activated', { tool: tool.getName() });
        } else {
            this.chartContainer.style.cursor = 'default';
            this.removeChartEventListeners(); // Disable drawing when no tool active
            eventBus.emit('drawing-tool-deactivated');
        }
    }

    /**
     * Add event listeners to chart container when tool is active
     */
    addChartEventListeners() {
        this.chartContainer.addEventListener('mousedown', this.handleMouseDown);
        this.chartContainer.addEventListener('mousemove', this.handleMouseMove);
        this.chartContainer.addEventListener('mouseup', this.handleMouseUp);
        this.chartContainer.addEventListener('mouseleave', this.handleMouseLeave);

        // Touch events for mobile
        this.chartContainer.addEventListener('touchstart', this.handleTouchStart);
        this.chartContainer.addEventListener('touchmove', this.handleTouchMove);
        this.chartContainer.addEventListener('touchend', this.handleTouchEnd);
    }

    /**
     * Remove event listeners from chart container when tool is inactive
     */
    removeChartEventListeners() {
        this.chartContainer.removeEventListener('mousedown', this.handleMouseDown);
        this.chartContainer.removeEventListener('mousemove', this.handleMouseMove);
        this.chartContainer.removeEventListener('mouseup', this.handleMouseUp);
        this.chartContainer.removeEventListener('mouseleave', this.handleMouseLeave);

        // Touch events for mobile
        this.chartContainer.removeEventListener('touchstart', this.handleTouchStart);
        this.chartContainer.removeEventListener('touchmove', this.handleTouchMove);
        this.chartContainer.removeEventListener('touchend', this.handleTouchEnd);
    }

    /**
     * Convert screen coordinates to chart coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {Object} Chart coordinates {time, price}
     */
    screenToChart(screenX, screenY) {
        const rect = this.chartContainer.getBoundingClientRect();
        const x = screenX - rect.left;
        const y = screenY - rect.top;

        try {
            const time = this.coordinateMapper.screenToTime(x);
            const price = this.coordinateMapper.screenToPrice(y);

            return {
                time: time,
                price: price,
                screenX: x,
                screenY: y
            };
        } catch (error) {
            console.warn('DrawingManager: Coordinate conversion failed', error);
            return { time: null, price: null, screenX: x, screenY: y };
        }
    }

    /**
     * Convert chart coordinates to screen coordinates
     * @param {number} time - Chart time
     * @param {number} price - Chart price
     * @returns {Object} Screen coordinates {x, y}
     */
    chartToScreen(time, price) {
        try {
            const x = this.coordinateMapper.timeToScreen(time);
            const y = this.coordinateMapper.priceToScreen(price);

            return { x, y };
        } catch (error) {
            console.warn('DrawingManager: Chart to screen conversion failed', error);
            return { x: 0, y: 0 };
        }
    }

    /**
     * Handle mouse down event
     */
    handleMouseDown(event) {
        if (!this.isActive || !this.currentTool) return;

        event.preventDefault();
        const coords = this.screenToChart(event.clientX, event.clientY);

        this.isDrawing = true;
        this.currentDrawing = this.currentTool.startDrawing(coords, this.options);

        // Disable navigation when starting to draw
        this.disableNavigation();

        eventBus.emit('drawing-started', {
            tool: this.currentTool.getName(),
            coords
        });
    }

    /**
     * Handle mouse move event
     */
    handleMouseMove(event) {
        if (!this.isActive || !this.currentTool) return;

        const coords = this.screenToChart(event.clientX, event.clientY);

        if (this.isDrawing && this.currentDrawing) {
            this.currentTool.updateDrawing(this.currentDrawing, coords);
            // Primitive system handles real-time updates differently
        } else {
            // Hover effect
            this.currentTool.onHover(coords);
        }

        eventBus.emit('drawing-mouse-move', {
            tool: this.currentTool.getName(),
            coords,
            isDrawing: this.isDrawing
        });
    }

    /**
     * Handle mouse up event - create and attach primitive
     */
    handleMouseUp(event) {
        if (!this.isDrawing || !this.currentDrawing) return;

        event.preventDefault();
        const coords = this.screenToChart(event.clientX, event.clientY);

        // Finalize the drawing data
        this.currentTool.finishDrawing(this.currentDrawing, coords);

        // Create primitive from drawing data
        let primitive = null;
        const toolName = this.currentTool.getName();

        if (toolName === 'TrendLine' || toolName === 'trendline') {
            primitive = this.createTrendLinePrimitive(this.currentDrawing);
        }

        if (primitive) {
            // Generate drawing ID and store primitive
            const drawingId = this.generateDrawingId();
            this.drawings.set(drawingId, {
                id: drawingId,
                tool: toolName,
                data: this.currentDrawing,
                primitive: primitive,
                timestamp: Date.now()
            });

            // Attach primitive to the series
            this.chart.candlestickSeries.attachPrimitive(primitive);

            // Trigger chart update to redraw primitive
            this.chart.chart.applyOptions({});

            console.log(`DrawingManager: Created and attached ${toolName} primitive`, drawingId);
        }

        this.isDrawing = false;
        this.currentDrawing = null;

        // Restore navigation when drawing is completed
        this.restoreNavigation();

        eventBus.emit('drawing-completed', {
            tool: toolName,
            coords,
            primitive: !!primitive
        });
    }

    /**
     * Create a TrendLinePrimitive from drawing data
     * @param {Object} drawingData - Drawing data from tool
     * @returns {TrendLinePrimitive|null} Created primitive or null
     */
    createTrendLinePrimitive(drawingData) {
        if (!drawingData || !drawingData.startPoint || !drawingData.endPoint) {
            console.warn('DrawingManager: Invalid drawing data for primitive creation');
            return null;
        }

        try {
            const primitive = new TrendLinePrimitive(this.chart.candlestickSeries, this.chart.chart, drawingData);
            return primitive;
        } catch (error) {
            console.error('DrawingManager: Failed to create TrendLine primitive:', error);
            return null;
        }
    }

    /**
     * Handle mouse leave event
     */
    handleMouseLeave(event) {
        if (this.isDrawing && this.currentDrawing) {
            // Cancel current drawing
            this.isDrawing = false;
            this.currentDrawing = null;
            this.scheduleRedraw();

            // Restore navigation when drawing is cancelled
            this.restoreNavigation();

            eventBus.emit('drawing-cancelled', {
                tool: this.currentTool ? this.currentTool.getName() : 'unknown'
            });
        }
    }

    /**
     * Touch event handlers (pass through to mouse handlers)
     */
    handleTouchStart(event) {
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.handleMouseDown({
                clientX: touch.clientX,
                clientY: touch.clientY,
                preventDefault: () => event.preventDefault()
            });
        }
    }

    handleTouchMove(event) {
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
        }
    }

    handleTouchEnd(event) {
        this.handleMouseUp({
            clientX: event.changedTouches[0].clientX,
            clientY: event.changedTouches[0].clientY,
            preventDefault: () => event.preventDefault()
        });
    }

    
    /**
     * Get tool instance by name
     * @param {string} toolName - Name of tool
     * @returns {Object|null} Tool instance
     */
    getToolInstance(toolName) {
        if (!toolName) return null;

        // Try to get tool from registry (case-insensitive)
        const tool = this.tools.get(toolName) || this.tools.get(toolName.toLowerCase());
        if (tool) {
            return tool;
        }

        // Fallback: create tool instance if class is available
        if ((toolName === 'trendline' || toolName === 'TrendLine') && typeof TrendLineTool !== 'undefined') {
            const trendLineTool = new TrendLineTool();
            this.tools.set('trendline', trendLineTool);
            return trendLineTool;
        }

        console.warn(`DrawingManager: Tool '${toolName}' not found in registry`);
        return null;
    }

    /**
     * Generate unique drawing ID
     * @returns {string} Unique ID
     */
    generateDrawingId() {
        return `drawing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clear all drawings by detaching primitives
     */
    clearAllDrawings() {
        // Detach all primitives from the series
        this.drawings.forEach((drawing) => {
            if (drawing.primitive) {
                this.chart.candlestickSeries.detachPrimitive(drawing.primitive);
            }
        });

        this.drawings.clear();
        this.isDrawing = false;
        this.currentDrawing = null;

        // Trigger chart update to reflect cleared drawings
        this.chart.chart.applyOptions({});

        eventBus.emit('all-drawings-cleared');
    }

    /**
     * Remove specific drawing by detaching its primitive
     * @param {string} drawingId - Drawing ID to remove
     */
    removeDrawing(drawingId) {
        if (this.drawings.has(drawingId)) {
            const drawing = this.drawings.get(drawingId);

            // Detach primitive if it exists
            if (drawing.primitive) {
                this.chart.candlestickSeries.detachPrimitive(drawing.primitive);
            }

            this.drawings.delete(drawingId);

            // Trigger chart update to reflect removal
            this.chart.chart.applyOptions({});

            eventBus.emit('drawing-removed', { drawingId });
        }
    }

    /**
     * Get all drawings as JSON for persistence
     * @returns {Array} Array of drawing objects
     */
    exportDrawings() {
        return Array.from(this.drawings.values()).map(drawing => ({
            tool: drawing.tool,
            data: drawing.data,
            timestamp: drawing.timestamp
        }));
    }

    /**
     * Import drawings from JSON
     * @param {Array} drawingsData - Array of drawing objects
     */
    importDrawings(drawingsData) {
        if (!Array.isArray(drawingsData)) return;

        drawingsData.forEach((drawingData) => {
            const drawingId = this.generateDrawingId();
            this.drawings.set(drawingId, {
                id: drawingId,
                ...drawingData
            });
        });

        // Trigger chart update to redraw primitives
        this.chart.chart.applyOptions({});
        eventBus.emit('drawings-imported', { count: drawingsData.length });
    }

    /**
     * Destroy drawing manager and clean up resources
     */
    destroy() {
        // Restore navigation before cleanup
        this.restoreNavigation();

        // Detach all primitives
        this.clearAllDrawings();

        // Remove event listeners
        this.removeChartEventListeners();

        // Clear references
        this.drawings.clear();
        this.currentTool = null;
        this.currentDrawing = null;
        this.isActive = false;
        this.originalNavigationOptions = null;
        this.navigationLocked = false;

        console.log('DrawingManager: Destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DrawingManager;
} else if (typeof window !== 'undefined') {
    window.DrawingManager = DrawingManager;
}