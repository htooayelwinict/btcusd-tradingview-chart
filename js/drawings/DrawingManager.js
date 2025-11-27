/**
 * DrawingManager - Manages drawing tools and canvas overlay for TradingView charts
 * Handles user interactions, coordinate mapping, and drawing state management
 */

class DrawingManager {
    constructor(chartInstance, options = {}) {
        this.chart = chartInstance;
        this.container = chartInstance.container;
        this.canvas = null;
        this.ctx = null;
        this.isActive = false;
        this.currentTool = null;
        this.drawings = new Map();
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

        // Coordinate transformation helpers
        this.timeScale = null;
        this.priceScale = null;

        // Performance optimization
        this.needsRedraw = false;
        this.animationFrameId = null;

       // Tool registry for available drawing tools
        this.tools = new Map();

        this.initializeCanvas();
        this.initializeTools();
        this.bindEvents();
        this.setupEventBusListeners();
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
     * Initialize canvas overlay
     */
    initializeCanvas() {
        // Create canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '1000';
        this.canvas.className = 'drawing-canvas';

        // Get TradingView chart instance for coordinate mapping
        const tvChart = this.chart.getChart();
        if (tvChart) {
            this.timeScale = tvChart.timeScale();
            // Lightweight Charts doesn't have getPriceScale, use default price scale
            this.priceScale = null; // Will handle coordinate transformation differently
        }

        // Add canvas to chart container
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Set canvas size
        this.resizeCanvas();

        // Only enable pointer events when drawing tool is active
        this.canvas.style.pointerEvents = 'none';

        console.log('DrawingManager: Canvas overlay initialized');
    }

    /**
     * Resize canvas to match chart container
     */
    resizeCanvas() {
        const rect = this.container.getBoundingClientRect();
        const pixelRatio = window.devicePixelRatio || 1;

        this.canvas.width = rect.width * pixelRatio;
        this.canvas.height = rect.height * pixelRatio;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';

        this.ctx.scale(pixelRatio, pixelRatio);

        // Redraw all drawings after resize
        this.scheduleRedraw();
    }

    /**
     * Bind mouse/touch events for drawing
     */
    bindEvents() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));

        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));

        // Window resize
        const debouncedResize = Utils.debounce(() => {
            this.resizeCanvas();
        }, 250);
        window.addEventListener('resize', debouncedResize);

        console.log('DrawingManager: Event listeners bound');
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
     * Set active drawing tool
     * @param {Object} tool - Drawing tool instance
     */
    setActiveTool(tool) {
        if (this.currentTool) {
            this.currentTool.deactivate();
        }

        this.currentTool = tool;
        this.isActive = !!tool;

        if (tool) {
            tool.activate();
            this.canvas.style.cursor = tool.getCursor() || 'crosshair';
            this.canvas.style.pointerEvents = 'auto'; // Enable drawing when tool is active
            eventBus.emit('drawing-tool-activated', { tool: tool.getName() });
        } else {
            this.canvas.style.cursor = 'default';
            this.canvas.style.pointerEvents = 'none'; // Disable drawing when no tool active
            eventBus.emit('drawing-tool-deactivated');
        }
    }

    /**
     * Convert screen coordinates to chart coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {Object} Chart coordinates {time, price}
     */
    screenToChart(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = screenX - rect.left;
        const y = screenY - rect.top;

        // Use TradingView coordinate transformation
        if (this.timeScale && this.priceScale) {
            try {
                const time = this.timeScale.coordinateToTime(x);
                const price = this.priceScale.coordinateToPrice(y);

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

        // Fallback calculation
        return {
            time: null,
            price: null,
            screenX: x,
            screenY: y
        };
    }

    /**
     * Convert chart coordinates to screen coordinates
     * @param {number} time - Chart time
     * @param {number} price - Chart price
     * @returns {Object} Screen coordinates {x, y}
     */
    chartToScreen(time, price) {
        if (this.timeScale && this.priceScale) {
            try {
                const x = this.timeScale.timeToCoordinate(time);
                const y = this.priceScale.priceToCoordinate(price);

                return { x, y };
            } catch (error) {
                console.warn('DrawingManager: Chart to screen conversion failed', error);
                return { x: 0, y: 0 };
            }
        }

        return { x: 0, y: 0 };
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
            this.scheduleRedraw();
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
     * Handle mouse up event
     */
    handleMouseUp(event) {
        if (!this.isDrawing || !this.currentDrawing) return;

        event.preventDefault();
        const coords = this.screenToChart(event.clientX, event.clientY);

        this.currentTool.finishDrawing(this.currentDrawing, coords);

        // Add to drawings collection
        const drawingId = this.generateDrawingId();
        this.drawings.set(drawingId, {
            id: drawingId,
            tool: this.currentTool.getName(),
            data: this.currentDrawing,
            timestamp: Date.now()
        });

        this.isDrawing = false;
        this.currentDrawing = null;

        this.scheduleRedraw();

        eventBus.emit('drawing-completed', {
            tool: this.currentTool.getName(),
            coords,
            drawingId
        });
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
     * Schedule canvas redraw
     */
    scheduleRedraw() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        this.animationFrameId = requestAnimationFrame(() => {
            this.redraw();
            this.animationFrameId = null;
        });
    }

    /**
     * Redraw all drawings on canvas
     */
    redraw() {
        // Clear canvas
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.clearRect(0, 0, rect.width, rect.height);

        // Draw all completed drawings
        this.drawings.forEach((drawing) => {
            this.drawDrawing(drawing);
        });

        // Draw current drawing in progress
        if (this.isDrawing && this.currentDrawing) {
            this.drawDrawing({
                tool: this.currentTool.getName(),
                data: this.currentDrawing
            });
        }

        eventBus.emit('canvas-redrawn', { drawingCount: this.drawings.size });
    }

    /**
     * Draw a single drawing on canvas
     * @param {Object} drawing - Drawing object
     */
    drawDrawing(drawing) {
        if (!drawing || !drawing.data) return;

        try {
            const tool = this.getToolInstance(drawing.tool);
            if (tool) {
                tool.render(this.ctx, drawing.data, this.options);
            }
        } catch (error) {
            console.error(`DrawingManager: Error drawing ${drawing.tool}:`, error);
        }
    }

    /**
     * Get tool instance by name
     * @param {string} toolName - Name of tool
     * @returns {Object|null} Tool instance
     */
    getToolInstance(toolName) {
        if (!toolName) return null;

        // Try to get tool from registry
        const tool = this.tools.get(toolName);
        if (tool) {
            return tool;
        }

        // Fallback: create tool instance if class is available
        if (toolName === 'trendline' && typeof TrendLineTool !== 'undefined') {
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
     * Clear all drawings
     */
    clearAllDrawings() {
        this.drawings.clear();
        this.isDrawing = false;
        this.currentDrawing = null;
        this.scheduleRedraw();

        eventBus.emit('all-drawings-cleared');
    }

    /**
     * Remove specific drawing
     * @param {string} drawingId - Drawing ID to remove
     */
    removeDrawing(drawingId) {
        if (this.drawings.has(drawingId)) {
            this.drawings.delete(drawingId);
            this.scheduleRedraw();

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

        this.scheduleRedraw();
        eventBus.emit('drawings-imported', { count: drawingsData.length });
    }

    /**
     * Destroy drawing manager and clean up resources
     */
    destroy() {
        // Cancel any pending redraws
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        // Remove canvas
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }

        // Clear references
        this.drawings.clear();
        this.currentTool = null;
        this.currentDrawing = null;
        this.isActive = false;

        console.log('DrawingManager: Destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DrawingManager;
} else if (typeof window !== 'undefined') {
    window.DrawingManager = DrawingManager;
}