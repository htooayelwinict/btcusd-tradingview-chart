/**
 * BaseTool - Abstract base class for drawing tools
 * Provides common functionality and interface for all drawing tools
 */

class BaseTool {
    constructor(name, options = {}) {
        this.name = name;
        this.options = {
            lineWidth: 2,
            lineColor: '#FF6B6B',
            fillColor: 'rgba(255, 107, 107, 0.1)',
            ...options
        };
        this.isActive = false;
        this.cursor = 'crosshair';
    }

    /**
     * Get tool name
     * @returns {string} Tool name
     */
    getName() {
        return this.name;
    }

    /**
     * Get cursor style for this tool
     * @returns {string} CSS cursor value
     */
    getCursor() {
        return this.cursor;
    }

    /**
     * Activate the tool
     */
    activate() {
        this.isActive = true;
        this.onActivate();
    }

    /**
     * Deactivate the tool
     */
    deactivate() {
        this.isActive = false;
        this.onDeactivate();
    }

    /**
     * Called when tool is activated (override in subclasses)
     */
    onActivate() {
        // Override in subclasses
    }

    /**
     * Called when tool is deactivated (override in subclasses)
     */
    onDeactivate() {
        // Override in subclasses
    }

    /**
     * Start drawing - called on mouse/touch down
     * @param {Object} coords - Chart coordinates {time, price, screenX, screenY}
     * @param {Object} options - Drawing options
     * @returns {Object} Drawing data object
     */
    startDrawing(coords, options = {}) {
        if (!coords) {
            throw new Error('Invalid coordinates for drawing');
        }

        // Allow drawing with just screen coordinates for now
        // Chart coordinate conversion will be improved later
        const mergedOptions = { ...this.options, ...options };
        return this.createDrawing(coords, mergedOptions);
    }

    /**
     * Update drawing - called on mouse/touch move
     * @param {Object} drawing - Drawing data object
     * @param {Object} coords - Current coordinates
     */
    updateDrawing(drawing, coords) {
        if (!drawing || !coords) return;

        this.updateDrawingData(drawing, coords);
    }

    /**
     * Finish drawing - called on mouse/touch up
     * @param {Object} drawing - Drawing data object
     * @param {Object} coords - Final coordinates
     */
    finishDrawing(drawing, coords) {
        if (!drawing) return;

        this.finalizeDrawingData(drawing, coords);
    }

    /**
     * Handle hover event
     * @param {Object} coords - Current coordinates
     */
    onHover(coords) {
        // Override in subclasses for hover effects
    }

    /**
     * Render drawing on canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} drawing - Drawing data object
     * @param {Object} options - Render options
     */
    render(ctx, drawing, options = {}) {
        if (!ctx || !drawing) return;

        const mergedOptions = { ...this.options, ...options };
        this.draw(ctx, drawing, mergedOptions);
    }

    /**
     * Create initial drawing data (override in subclasses)
     * @param {Object} coords - Starting coordinates
     * @param {Object} options - Drawing options
     * @returns {Object} Drawing data object
     */
    createDrawing(coords, options) {
        throw new Error('createDrawing must be implemented in subclass');
    }

    /**
     * Update drawing data during drawing (override in subclasses)
     * @param {Object} drawing - Drawing data object
     * @param {Object} coords - Current coordinates
     */
    updateDrawingData(drawing, coords) {
        // Override in subclasses
    }

    /**
     * Finalize drawing data when complete (override in subclasses)
     * @param {Object} drawing - Drawing data object
     * @param {Object} coords - Final coordinates
     */
    finalizeDrawingData(drawing, coords) {
        // Override in subclasses
    }

    /**
     * Draw the tool on canvas (override in subclasses)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} drawing - Drawing data object
     * @param {Object} options - Drawing options
     * @param {Object} coordinateMapper - Coordinate mapping functions
     */
    draw(ctx, drawing, options, coordinateMapper = null) {
        throw new Error('draw must be implemented in subclass');
    }

    /**
     * Convert time/price coordinates to screen coordinates
     * @param {Object} coords - Coordinates with time/price
     * @param {Object} coordinateMapper - Coordinate mapping functions
     * @returns {Object} Screen coordinates {x, y} or null if conversion fails
     */
    convertToScreenCoords(coords, coordinateMapper) {
        if (!coordinateMapper || !coords) return null;

        try {
            const x = coordinateMapper.timeToScreen(coords.time);
            const y = coordinateMapper.priceToScreen(coords.price);

            // Validate coordinates are finite numbers
            if (x !== undefined && x !== null && y !== undefined && y !== null &&
                this.isFiniteNumber(x) && this.isFiniteNumber(y)) {
                return { x, y };
            }
            return null;
        } catch (error) {
            console.warn('BaseTool: Failed to convert coordinates:', error);
            return null;
        }
    }

    /**
     * Convert time/price coordinates to screen coordinates with fallback
     * @param {Object} coords - Coordinates with time/price
     * @param {Object} coordinateMapper - Coordinate mapping functions
     * @param {Object} fallbackCoords - Fallback screen coordinates
     * @returns {Object} Screen coordinates {x, y}
     */
    convertToScreenCoordsWithFallback(coords, coordinateMapper, fallbackCoords) {
        const screenCoords = this.convertToScreenCoords(coords, coordinateMapper);
        return screenCoords || fallbackCoords || { x: 0, y: 0 };
    }

    /**
     * Validate drawing data
     * @param {Object} drawing - Drawing data object
     * @returns {boolean} True if valid
     */
    isValidDrawing(drawing) {
        return drawing && typeof drawing === 'object' && drawing.type === this.name;
    }

    /**
     * Get bounding box for drawing
     * @param {Object} drawing - Drawing data object
     * @returns {Object} Bounding box {minX, minY, maxX, maxY}
     */
    getBoundingBox(drawing) {
        // Override in subclasses
        return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    /**
     * Check if point is inside drawing
     * @param {Object} drawing - Drawing data object
     * @param {Object} point - Point to check {x, y}
     * @param {number} tolerance - Tolerance in pixels
     * @returns {boolean} True if point is inside
     */
    isPointInside(drawing, point, tolerance = 5) {
        // Override in subclasses for hit testing
        return false;
    }

    /**
     * Convert drawing to JSON for serialization
     * @param {Object} drawing - Drawing data object
     * @returns {Object} Serializable object
     */
    toJSON(drawing) {
        return {
            type: drawing.type,
            points: drawing.points || [],
            options: drawing.options || {},
            timestamp: drawing.timestamp
        };
    }

    /**
     * Create drawing from JSON data
     * @param {Object} data - JSON data object
     * @returns {Object} Drawing data object
     */
    fromJSON(data) {
        return {
            type: data.type,
            points: data.points || [],
            options: { ...this.options, ...data.options },
            timestamp: data.timestamp || Date.now()
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseTool;
} else if (typeof window !== 'undefined') {
    window.BaseTool = BaseTool;
}