/**
 * HorizontalLineTool - Interactive horizontal line drawing tool
 * Extends BaseTool to create horizontal support/resistance lines
 */

class HorizontalLineTool extends BaseTool {
    constructor(options = {}) {
        super('HorizontalLine', {
            lineWidth: 2,
            lineColor: '#4ECDC4',
            lineStyle: 'solid', // 'solid', 'dashed', 'dotted'
            extendLeft: true,
            extendRight: true,
            showPrice: true,
            snapToPrice: true,
            ...options
        });

        this.cursor = 'crosshair';
    }

    /**
     * Create initial horizontal line drawing data
     * @param {Object} coords - Starting coordinates
     * @param {Object} options - Drawing options
     * @returns {Object} Horizontal line drawing data
     */
    createDrawing(coords, options) {
        // Snap to price if enabled
        let price = coords.price;
        if (options.snapToPrice && price !== null) {
            price = Math.round(price * 100) / 100; // Round to 2 decimal places
        }

        return {
            type: 'HorizontalLine',
            price: price,
            options: { ...this.options, ...options },
            timestamp: Date.now()
        };
    }

    /**
     * Update horizontal line during drawing
     * @param {Object} drawing - Horizontal line drawing data
     * @param {Object} coords - Current coordinates
     */
    updateDrawingData(drawing, coords) {
        // Snap to price if enabled and we have valid price data
        if (drawing.options.snapToPrice && coords.price !== null) {
            drawing.price = Math.round(coords.price * 100) / 100;
        }
    }

    /**
     * Finalize horizontal line drawing
     * @param {Object} drawing - Horizontal line drawing data
     * @param {Object} coords - Final coordinates
     */
    finalizeDrawingData(drawing, coords) {
        this.updateDrawingData(drawing, coords);
        // Horizontal lines will extend across entire chart area during rendering
    }

    /**
     * Draw horizontal line on canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} drawing - Horizontal line drawing data
     * @param {Object} options - Drawing options
     * @param {Object} coordinateMapper - Coordinate mapping functions
     */
    draw(ctx, drawing, options, coordinateMapper = null) {
        if (drawing.price === null || drawing.price === undefined) return;

        const mergedOptions = { ...this.options, ...options };

        // Convert price to screen Y coordinate
        const screenY = coordinateMapper ?
            coordinateMapper.priceToScreen(drawing.price) :
            (drawing.screenY || 0);

        if (screenY === null || screenY === undefined) return;

        // Get canvas dimensions for full width line
        const canvas = ctx.canvas;
        const startX = 0;
        const endX = canvas.width;

        ctx.save();
        ctx.strokeStyle = mergedOptions.lineColor;
        ctx.lineWidth = mergedOptions.lineWidth;
        ctx.lineCap = 'round';

        // Set line style
        this.setLineStyle(ctx, mergedOptions.lineStyle);

        // Draw the horizontal line
        ctx.beginPath();
        ctx.moveTo(startX, screenY);
        ctx.lineTo(endX, screenY);
        ctx.stroke();

        // Draw price label if enabled
        if (mergedOptions.showPrice && drawing.price !== null) {
            this.drawPriceLabel(ctx, drawing, mergedOptions);
        }

        ctx.restore();
    }

    /**
     * Set line style (solid, dashed, dotted)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {string} lineStyle - Line style
     */
    setLineStyle(ctx, lineStyle) {
        switch (lineStyle) {
            case 'dashed':
                ctx.setLineDash([8, 4]);
                break;
            case 'dotted':
                ctx.setLineDash([2, 3]);
                break;
            case 'solid':
            default:
                ctx.setLineDash([]);
                break;
        }
    }

    /**
     * Draw price label for horizontal line
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} drawing - Horizontal line drawing data
     * @param {Object} options - Drawing options
     */
    drawPriceLabel(ctx, drawing, options) {
        const price = drawing.price;
        const y = drawing.screenY;
        const padding = 6;
        const margin = 10;

        // Create price text
        const priceText = `$${price.toFixed(2)}`;

        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const metrics = ctx.measureText(priceText);
        const textWidth = metrics.width;
        const textHeight = 16;

        // Position label on the right side of chart
        const labelX = drawing.endX - margin - textWidth - padding * 2;
        const labelY = y;

        // Draw background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(labelX - padding, labelY - textHeight / 2, textWidth + padding * 2, textHeight);

        // Draw text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(priceText, labelX, labelY);

        // Draw connection line
        ctx.strokeStyle = options.lineColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(labelX - padding - 5, labelY);
        ctx.lineTo(labelX - padding, labelY);
        ctx.stroke();
    }

    /**
     * Get bounding box for horizontal line
     * @param {Object} drawing - Horizontal line drawing data
     * @returns {Object} Bounding box
     */
    getBoundingBox(drawing) {
        const minX = Math.min(drawing.startX, drawing.endX);
        const maxX = Math.max(drawing.startX, drawing.endX);
        const minY = drawing.screenY - 10; // Include some padding
        const maxY = drawing.screenY + 10;

        return { minX, minY, maxX, maxY };
    }

    /**
     * Check if point is near horizontal line
     * @param {Object} drawing - Horizontal line drawing data
     * @param {Object} point - Point to check {x, y}
     * @param {number} tolerance - Distance tolerance in pixels
     * @returns {boolean} True if point is near line
     */
    isPointInside(drawing, point, tolerance = 5) {
        // Check if point is horizontally within line bounds
        if (point.x < Math.min(drawing.startX, drawing.endX) - tolerance ||
            point.x > Math.max(drawing.startX, drawing.endX) + tolerance) {
            return false;
        }

        // Check vertical distance to line
        const verticalDistance = Math.abs(point.y - drawing.screenY);
        return verticalDistance <= tolerance;
    }

    /**
     * Update line position for chart resize/scroll
     * @param {Object} drawing - Horizontal line drawing data
     * @param {Object} chartBounds - New chart bounds
     */
    updateForChartBounds(drawing, chartBounds) {
        if (!chartBounds) return;

        drawing.startX = chartBounds.left || 0;
        drawing.endX = chartBounds.right || chartBounds.width;
        drawing.canvasRect = chartBounds;
    }

    /**
     * Handle hover effect
     * @param {Object} coords - Current coordinates
     */
    onHover(coords) {
        if (!coords) return;

        // Check if hovering near existing horizontal lines
        // This could be used to show price tooltip or highlight the line
        const nearLine = Math.abs(coords.price - this.getLastPrice()) < 0.01;

        if (nearLine) {
            this.cursor = 'pointer';
        } else {
            this.cursor = 'crosshair';
        }
    }

    /**
     * Get last drawn price (for hover detection)
     * @returns {number|null} Last price drawn
     */
    getLastPrice() {
        // This would be managed by the DrawingManager
        // For now, return null
        return null;
    }

    /**
     * Convert horizontal line to JSON
     * @param {Object} drawing - Horizontal line drawing data
     * @returns {Object} Serializable object
     */
    toJSON(drawing) {
        return {
            type: drawing.type,
            price: drawing.price,
            options: drawing.options,
            timestamp: drawing.timestamp
        };
    }

    /**
     * Create horizontal line from JSON data
     * @param {Object} data - JSON data object
     * @param {Function} coordinateMapper - Function to convert chart coordinates to screen coordinates
     * @param {Object} chartBounds - Current chart bounds
     * @returns {Object} Horizontal line drawing data
     */
    fromJSON(data, coordinateMapper, chartBounds) {
        const screenX = coordinateMapper.timeToScreen(Date.now() / 1000); // Use current time for coordinate mapping
        const screenY = coordinateMapper.priceToScreen(data.price);
        const screenCoords = { x: screenX, y: screenY };

        return {
            type: data.type,
            price: data.price,
            screenY: screenCoords.y,
            startX: chartBounds ? chartBounds.left : 0,
            endX: chartBounds ? chartBounds.right : 800,
            options: { ...this.options, ...data.options },
            timestamp: data.timestamp || Date.now(),
            canvasRect: chartBounds
        };
    }

    /**
     * Get price at screen Y coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {number|null} Price value
     */
    getPriceAtScreenY(screenY) {
        // This would need access to the chart's price scale
        // For now, return the stored price if screenY matches
        return this.drawing && this.drawing.screenY === screenY ? this.drawing.price : null;
    }

    /**
     * Validate horizontal line drawing data
     * @param {Object} drawing - Drawing data object
     * @returns {boolean} True if valid
     */
    isValidDrawing(drawing) {
        if (!super.isValidDrawing(drawing)) return false;

        return drawing.price !== null &&
               drawing.price !== undefined &&
               typeof drawing.price === 'number' &&
               !isNaN(drawing.price);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HorizontalLineTool;
} else if (typeof window !== 'undefined') {
    window.HorizontalLineTool = HorizontalLineTool;
}