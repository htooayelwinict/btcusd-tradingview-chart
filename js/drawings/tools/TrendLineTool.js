/**
 * TrendLineTool - Interactive trend line drawing tool
 * Extends BaseTool to create trend lines between two points
 */

class TrendLineTool extends BaseTool {
    constructor(options = {}) {
        super('TrendLine', {
            lineWidth: 2,
            lineColor: '#FF6B6B',
            extendLeft: false,
            extendRight: false,
            snapToPrice: true,
            ...options
        });

        this.cursor = 'crosshair';
    }

    /**
     * Create initial trend line drawing data
     * @param {Object} coords - Starting coordinates
     * @param {Object} options - Drawing options
     * @returns {Object} Trend line drawing data
     */
    createDrawing(coords, options) {
        return {
            type: 'TrendLine',
            startPoint: {
                time: coords.time,
                price: coords.price,
                screenX: coords.screenX,
                screenY: coords.screenY
            },
            endPoint: {
                time: coords.time,
                price: coords.price,
                screenX: coords.screenX,
                screenY: coords.screenY
            },
            options: { ...this.options, ...options },
            timestamp: Date.now()
        };
    }

    /**
     * Update trend line during drawing
     * @param {Object} drawing - Trend line drawing data
     * @param {Object} coords - Current coordinates
     */
    updateDrawingData(drawing, coords) {
        if (!drawing.endPoint) return;

        // Apply snapping if enabled
        let finalCoords = coords;
        if (drawing.options.snapToPrice && coords.price !== null) {
            // Round price to reasonable precision
            finalCoords = {
                ...coords,
                price: Math.round(coords.price * 100) / 100
            };
        }

        drawing.endPoint = {
            time: finalCoords.time,
            price: finalCoords.price,
            screenX: finalCoords.screenX,
            screenY: finalCoords.screenY
        };
    }

    /**
     * Finalize trend line drawing
     * @param {Object} drawing - Trend line drawing data
     * @param {Object} coords - Final coordinates
     */
    finalizeDrawingData(drawing, coords) {
        this.updateDrawingData(drawing, coords);

        // Calculate line properties for hit testing
        const dx = drawing.endPoint.screenX - drawing.startPoint.screenX;
        const dy = drawing.endPoint.screenY - drawing.startPoint.screenY;

        drawing.lineLength = Math.sqrt(dx * dx + dy * dy);
        drawing.angle = Math.atan2(dy, dx);
        drawing.slope = dy / dx || 0;

        // Store price difference
        drawing.priceDifference = drawing.endPoint.price - drawing.startPoint.price;
        drawing.timeDifference = drawing.endPoint.time - drawing.startPoint.time;
    }

    /**
     * Draw trend line on canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} drawing - Trend line drawing data
     * @param {Object} options - Drawing options
     */
    draw(ctx, drawing, options) {
        if (!drawing.startPoint || !drawing.endPoint) return;

        const mergedOptions = { ...this.options, ...options };

        ctx.save();
        ctx.strokeStyle = mergedOptions.lineColor;
        ctx.lineWidth = mergedOptions.lineWidth;
        ctx.lineCap = 'round';

        // Draw the main line
        ctx.beginPath();

        let startX = drawing.startPoint.screenX;
        let startY = drawing.startPoint.screenY;
        let endX = drawing.endPoint.screenX;
        let endY = drawing.endPoint.screenY;

        // Extend line if requested
        if (mergedOptions.extendLeft || mergedOptions.extendRight) {
            const dx = endX - startX;
            const dy = endY - startY;
            const extension = 1000; // Extension in pixels

            if (mergedOptions.extendLeft) {
                startX -= dx / Math.abs(dx) * extension;
                startY -= dy / Math.abs(dx || 1) * extension;
            }

            if (mergedOptions.extendRight) {
                endX += dx / Math.abs(dx) * extension;
                endY += dy / Math.abs(dx || 1) * extension;
            }
        }

        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Draw endpoints
        this.drawEndpoint(ctx, drawing.startPoint, mergedOptions.lineColor, mergedOptions.lineWidth);
        this.drawEndpoint(ctx, drawing.endPoint, mergedOptions.lineColor, mergedOptions.lineWidth);

        // Draw label if line is long enough
        if (drawing.lineLength && drawing.lineLength > 50) {
            this.drawLabel(ctx, drawing, mergedOptions);
        }

        ctx.restore();
    }

    /**
     * Draw endpoint circle
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} point - Point coordinates
     * @param {string} color - Line color
     * @param {number} lineWidth - Line width
     */
    drawEndpoint(ctx, point, color, lineWidth) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(point.screenX, point.screenY, lineWidth + 2, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Draw trend line label
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} drawing - Trend line drawing data
     * @param {Object} options - Drawing options
     */
    drawLabel(ctx, drawing, options) {
        if (!drawing.priceDifference) return;

        const midX = (drawing.startPoint.screenX + drawing.endPoint.screenX) / 2;
        const midY = (drawing.startPoint.screenY + drawing.endPoint.screenY) / 2;

        // Create label text
        const priceDiff = drawing.priceDifference;
        const priceDiffText = priceDiff >= 0 ? `+${priceDiff.toFixed(2)}` : priceDiff.toFixed(2);
        const percentDiff = (priceDiff / drawing.startPoint.price * 100).toFixed(2);
        const percentDiffText = percentDiff >= 0 ? `+${percentDiff}%` : `${percentDiff}%`;

        ctx.fillStyle = options.lineColor;
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        // Draw background
        const text = `${priceDiffText} (${percentDiffText})`;
        const metrics = ctx.measureText(text);
        const padding = 4;
        const bgHeight = 18;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(
            midX - metrics.width / 2 - padding,
            midY - bgHeight - padding,
            metrics.width + padding * 2,
            bgHeight
        );

        // Draw text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, midX, midY - padding);
    }

    /**
     * Get bounding box for trend line
     * @param {Object} drawing - Trend line drawing data
     * @returns {Object} Bounding box
     */
    getBoundingBox(drawing) {
        if (!drawing.startPoint || !drawing.endPoint) {
            return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        }

        const minX = Math.min(drawing.startPoint.screenX, drawing.endPoint.screenX);
        const maxX = Math.max(drawing.startPoint.screenX, drawing.endPoint.screenX);
        const minY = Math.min(drawing.startPoint.screenY, drawing.endPoint.screenY);
        const maxY = Math.max(drawing.startPoint.screenY, drawing.endPoint.screenY);

        return { minX, minY, maxX, maxY };
    }

    /**
     * Check if point is near trend line
     * @param {Object} drawing - Trend line drawing data
     * @param {Object} point - Point to check {x, y}
     * @param {number} tolerance - Distance tolerance in pixels
     * @returns {boolean} True if point is near line
     */
    isPointInside(drawing, point, tolerance = 5) {
        if (!drawing.startPoint || !drawing.endPoint) return false;

        // Calculate distance from point to line segment
        const x1 = drawing.startPoint.screenX;
        const y1 = drawing.startPoint.screenY;
        const x2 = drawing.endPoint.screenX;
        const y2 = drawing.endPoint.screenY;

        const distance = this.pointToLineDistance(point.x, point.y, x1, y1, x2, y2);

        // Also check if point is near endpoints
        const startDist = Math.sqrt(Math.pow(point.x - x1, 2) + Math.pow(point.y - y1, 2));
        const endDist = Math.sqrt(Math.pow(point.x - x2, 2) + Math.pow(point.y - y2, 2));

        return distance <= tolerance || startDist <= tolerance + 5 || endDist <= tolerance + 5;
    }

    /**
     * Calculate distance from point to line segment
     * @param {number} px - Point X
     * @param {number} py - Point Y
     * @param {number} x1 - Line start X
     * @param {number} y1 - Line start Y
     * @param {number} x2 - Line end X
     * @param {number} y2 - Line end Y
     * @returns {number} Distance
     */
    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;

        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Convert trend line to JSON
     * @param {Object} drawing - Trend line drawing data
     * @returns {Object} Serializable object
     */
    toJSON(drawing) {
        return {
            type: drawing.type,
            startPoint: {
                time: drawing.startPoint.time,
                price: drawing.startPoint.price
            },
            endPoint: {
                time: drawing.endPoint.time,
                price: drawing.endPoint.price
            },
            options: drawing.options,
            timestamp: drawing.timestamp
        };
    }

    /**
     * Create trend line from JSON data
     * @param {Object} data - JSON data object
     * @param {Function} coordinateMapper - Function to convert chart coordinates to screen coordinates
     * @returns {Object} Trend line drawing data
     */
    fromJSON(data, coordinateMapper) {
        const screenStart = coordinateMapper(data.startPoint.time, data.startPoint.price);
        const screenEnd = coordinateMapper(data.endPoint.time, data.endPoint.price);

        return {
            type: data.type,
            startPoint: {
                time: data.startPoint.time,
                price: data.startPoint.price,
                screenX: screenStart.x,
                screenY: screenStart.y
            },
            endPoint: {
                time: data.endPoint.time,
                price: data.endPoint.price,
                screenX: screenEnd.x,
                screenY: screenEnd.y
            },
            options: { ...this.options, ...data.options },
            timestamp: data.timestamp || Date.now()
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrendLineTool;
} else if (typeof window !== 'undefined') {
    window.TrendLineTool = TrendLineTool;
}