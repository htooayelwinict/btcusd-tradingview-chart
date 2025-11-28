/**
 * FibRetracementTool - Interactive Fibonacci retracement drawing tool
 * Extends BaseTool to create Fibonacci level lines between two points
 */

class FibRetracementTool extends BaseTool {
    constructor(options = {}) {
        super('FibRetracement', {
            lineWidth: 1,
            lineColor: '#9B59B6',
            fillColor: 'rgba(155, 89, 182, 0.1)',
            extendHorizontal: true,
            showLabels: true,
            showPercentage: true,
            levels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1], // Standard Fibonacci levels
            levelColors: {
                0: '#FF6B6B',      // Red
                0.236: '#4ECDC4',  // Teal
                0.382: '#45B7D1',  // Blue
                0.5: '#96CEB4',    // Green
                0.618: '#FFEAA7',  // Yellow
                0.786: '#DDA0DD',  // Plum
                1: '#FF6B6B'       // Red
            },
            snapToPrice: true,
            ...options
        });

        this.cursor = 'crosshair';
    }

    /**
     * Create initial Fibonacci retracement drawing data
     * @param {Object} coords - Starting coordinates
     * @param {Object} options - Drawing options
     * @returns {Object} Fibonacci retracement drawing data
     */
    createDrawing(coords, options) {
        const drawingOptions = { ...this.options, ...options };
        const startPoint = {
            time: coords.time,
            price: coords.price
        };
        const endPoint = {
            time: coords.time,
            price: coords.price
        };

        return {
            type: 'FibRetracement',
            startPoint,
            endPoint,
            levels: this.calculateFibLevels(startPoint, endPoint, drawingOptions),
            options: drawingOptions,
            timestamp: Date.now()
        };
    }

    /**
     * Override render so we can pass coordinate mapping into draw()
     */
    render(ctx, drawing, options = {}, coordinateMapper = null) {
        if (!ctx || !drawing) return;

        this.draw(ctx, drawing, options, coordinateMapper);
    }

    /**
     * Update Fibonacci retracement during drawing
     * @param {Object} drawing - Fibonacci drawing data
     * @param {Object} coords - Current coordinates
     */
    updateDrawingData(drawing, coords) {
        if (!drawing.endPoint) return;

        // Apply snapping if enabled
        let finalCoords = coords;
        if (drawing.options.snapToPrice && coords.price !== null) {
            finalCoords = {
                ...coords,
                price: Math.round(coords.price * 100) / 100
            };
        }

        drawing.endPoint = {
            time: finalCoords.time,
            price: finalCoords.price
        };

        // Recalculate Fibonacci levels
        drawing.levels = this.calculateFibLevels(drawing.startPoint, drawing.endPoint, drawing.options);
    }

    /**
     * Finalize Fibonacci retracement drawing
     * @param {Object} drawing - Fibonacci drawing data
     * @param {Object} coords - Final coordinates
     */
    finalizeDrawingData(drawing, coords) {
        this.updateDrawingData(drawing, coords);

        // Calculate additional properties for hit testing
        drawing.priceRange = Math.abs(drawing.endPoint.price - drawing.startPoint.price);
        drawing.priceDifference = drawing.endPoint.price - drawing.startPoint.price;
        drawing.timeDifference = drawing.endPoint.time - drawing.startPoint.time;
    }

    /**
     * Calculate Fibonacci level positions
     * @param {Object} startPoint - Starting point
     * @param {Object} endPoint - Ending point
     * @param {Object} options - Drawing options
     * @returns {Array} Array of level objects
     */
    calculateFibLevels(startPoint, endPoint, options = this.options) {
        if (!startPoint || !endPoint) return [];

        const priceDiff = (endPoint.price ?? startPoint.price) - startPoint.price;
        const levelOptions = options.levels || this.options.levels || [];

        return levelOptions.map(level => {
            const price = startPoint.price + (priceDiff * level);

            return {
                level,
                percentage: (level * 100).toFixed(1),
                price,
                color: (options.levelColors && options.levelColors[level]) || this.options.lineColor
            };
        });
    }

    /**
     * Draw Fibonacci retracement on canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} drawing - Fibonacci drawing data
     * @param {Object} options - Drawing options
     * @param {Object} coordinateMapper - Coordinate mapping functions
     */
    draw(ctx, drawing, options, coordinateMapper = null) {
        if (!drawing.startPoint || !drawing.endPoint || !drawing.levels) return;

        const mergedOptions = { ...this.options, ...options };
        const startScreen = this.getScreenPoint(drawing.startPoint, coordinateMapper);
        const endScreen = this.getScreenPoint(drawing.endPoint, coordinateMapper);

        if (!startScreen || !endScreen) return;

        const screenLevels = drawing.levels.map(level => {
            const fallbackY = startScreen.y + (endScreen.y - startScreen.y) * level.level;
            return {
                ...level,
                screenY: this.getPriceScreenY(level.price, coordinateMapper, fallbackY)
            };
        }).filter(level => this.isFiniteNumber(level.screenY));

        if (!screenLevels.length) return;

        const renderData = {
            ...drawing,
            startPoint: { ...drawing.startPoint, screenX: startScreen.x, screenY: startScreen.y },
            endPoint: { ...drawing.endPoint, screenX: endScreen.x, screenY: endScreen.y },
            levels: screenLevels
        };

        drawing._screenCache = {
            startPoint: renderData.startPoint,
            endPoint: renderData.endPoint,
            levels: screenLevels
        };

        ctx.save();
        this.drawTrendLine(ctx, renderData, mergedOptions);
        this.drawFibLevels(ctx, renderData, mergedOptions);

        if (mergedOptions.showLabels) {
            this.drawLabels(ctx, renderData, mergedOptions);
        }

        ctx.restore();
    }

    /**
     * Map a time/price point to screen coordinates with fallbacks
     */
    getScreenPoint(point, coordinateMapper) {
        if (!point) return null;

        if (coordinateMapper) {
            try {
                if (typeof coordinateMapper.timeToScreen === 'function' &&
                    typeof coordinateMapper.priceToScreen === 'function') {
                    const x = coordinateMapper.timeToScreen(point.time);
                    const y = coordinateMapper.priceToScreen(point.price);
                    if (this.isFiniteNumber(x) && this.isFiniteNumber(y)) {
                        return { x, y };
                    }
                }
            } catch (error) {
                console.warn('FibRetracementTool: Failed to convert point to screen coordinates', error);
            }
        }

        if (this.isFiniteNumber(point.screenX) && this.isFiniteNumber(point.screenY)) {
            return { x: point.screenX, y: point.screenY };
        }

        return null;
    }

    /**
     * Map a price to a screen Y coordinate with optional fallback
     */
    getPriceScreenY(price, coordinateMapper, fallbackY = null) {
        if (coordinateMapper && typeof coordinateMapper.priceToScreen === 'function') {
            const y = coordinateMapper.priceToScreen(price);
            if (this.isFiniteNumber(y)) {
                return y;
            }
        }

        return fallbackY;
    }

    isFiniteNumber(value) {
        return typeof value === 'number' && Number.isFinite(value);
    }

    /**
     * Draw the main trend line
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} drawing - Fibonacci drawing data
     * @param {Object} options - Drawing options
     */
    drawTrendLine(ctx, drawing, options) {
        ctx.strokeStyle = options.lineColor;
        ctx.lineWidth = options.lineWidth;
        ctx.setLineDash([5, 3]); // Dashed line for main trend

        ctx.beginPath();
        ctx.moveTo(drawing.startPoint.screenX, drawing.startPoint.screenY);
        ctx.lineTo(drawing.endPoint.screenX, drawing.endPoint.screenY);
        ctx.stroke();

        // Draw endpoints
        this.drawEndpoint(ctx, drawing.startPoint, options.lineColor);
        this.drawEndpoint(ctx, drawing.endPoint, options.lineColor);
    }

    /**
     * Draw Fibonacci level lines
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} drawing - Fibonacci drawing data
     * @param {Object} options - Drawing options
     */
    drawFibLevels(ctx, drawing, options) {
        const minX = Math.min(drawing.startPoint.screenX, drawing.endPoint.screenX);
        const maxX = Math.max(drawing.startPoint.screenX, drawing.endPoint.screenX);
        const padding = 50;

        drawing.levels.forEach(level => {
            // Draw horizontal line for this level
            ctx.strokeStyle = level.color;
            ctx.lineWidth = options.lineWidth;
            ctx.setLineDash([]);

            ctx.beginPath();
            ctx.moveTo(minX - padding, level.screenY);
            ctx.lineTo(maxX + padding, level.screenY);
            ctx.stroke();

            // Draw fill area between levels (optional)
            if (options.fillColor && level.level > 0 && level.level < 1) {
                ctx.fillStyle = options.fillColor;
                ctx.globalAlpha = 0.1;
                ctx.fillRect(minX - padding, level.screenY, maxX + padding * 2, 1);
                ctx.globalAlpha = 1;
            }
        });
    }

    /**
     * Draw labels for Fibonacci levels
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} drawing - Fibonacci drawing data
     * @param {Object} options - Drawing options
     */
    drawLabels(ctx, drawing, options) {
        const labelX = Math.max(drawing.startPoint.screenX, drawing.endPoint.screenX) + 20;
        const padding = 4;
        const lineHeight = 18;

        ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        drawing.levels.forEach((level, index) => {
            let labelText = '';
            if (options.showPercentage) {
                labelText += `${level.percentage}%`;
            }
            if (options.showPercentage && level.price !== null) {
                labelText += ' - ';
            }
            if (level.price !== null) {
                labelText += `$${level.price.toFixed(2)}`;
            }

            // Calculate background position
            const bgY = level.screenY - lineHeight / 2;

            // Draw background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(labelX - padding, bgY, ctx.measureText(labelText).width + padding * 2, lineHeight);

            // Draw text
            ctx.fillStyle = '#ffffff';
            ctx.fillText(labelText, labelX, level.screenY);

            // Draw connection dot
            ctx.fillStyle = level.color;
            ctx.beginPath();
            ctx.arc(labelX - padding - 5, level.screenY, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /**
     * Draw endpoint circle
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} point - Point coordinates
     * @param {string} color - Line color
     */
    drawEndpoint(ctx, point, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(point.screenX, point.screenY, 4, 0, Math.PI * 2);
        ctx.fill();

        // White center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(point.screenX, point.screenY, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Get bounding box for Fibonacci retracement
     * @param {Object} drawing - Fibonacci drawing data
     * @returns {Object} Bounding box
     */
    getBoundingBox(drawing) {
        if (!drawing.startPoint || !drawing.endPoint || !drawing.levels) {
            return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        }

        const minX = Math.min(drawing.startPoint.screenX, drawing.endPoint.screenX);
        const maxX = Math.max(drawing.startPoint.screenX, drawing.endPoint.screenX);

        // Find min and max Y from levels
        const levelYs = drawing.levels.map(level => level.screenY);
        const minY = Math.min(...levelYs);
        const maxY = Math.max(...levelYs);

        return { minX, minY, maxX, maxY };
    }

    /**
     * Check if point is near Fibonacci retracement
     * @param {Object} drawing - Fibonacci drawing data
     * @param {Object} point - Point to check {x, y}
     * @param {number} tolerance - Distance tolerance in pixels
     * @returns {boolean} True if point is near
     */
    isPointInside(drawing, point, tolerance = 5) {
        // Check main trend line
        const trendLineDist = this.pointToLineDistance(
            point.x, point.y,
            drawing.startPoint.screenX, drawing.startPoint.screenY,
            drawing.endPoint.screenX, drawing.endPoint.screenY
        );

        if (trendLineDist <= tolerance) return true;

        // Check Fibonacci levels
        const minX = Math.min(drawing.startPoint.screenX, drawing.endPoint.screenX) - 50;
        const maxX = Math.max(drawing.startPoint.screenX, drawing.endPoint.screenX) + 50;

        if (point.x < minX || point.x > maxX) return false;

        for (const level of drawing.levels) {
            const levelDist = Math.abs(point.y - level.screenY);
            if (levelDist <= tolerance) return true;
        }

        return false;
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
     * Convert Fibonacci retracement to JSON
     * @param {Object} drawing - Fibonacci drawing data
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
            levels: drawing.options.levels,
            options: drawing.options,
            timestamp: drawing.timestamp
        };
    }

    /**
     * Create Fibonacci retracement from JSON data
     * @param {Object} data - JSON data object
     * @param {Function} coordinateMapper - Function to convert chart coordinates to screen coordinates
     * @returns {Object} Fibonacci drawing data
     */
    fromJSON(data, coordinateMapper) {
        const screenStart = coordinateMapper(data.startPoint.time, data.startPoint.price);
        const screenEnd = coordinateMapper(data.endPoint.time, data.endPoint.price);

        const drawing = {
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

        // Recalculate levels
        drawing.levels = this.calculateFibLevels(drawing.startPoint, drawing.endPoint);

        return drawing;
    }

    /**
     * Validate Fibonacci retracement drawing data
     * @param {Object} drawing - Drawing data object
     * @returns {boolean} True if valid
     */
    isValidDrawing(drawing) {
        if (!super.isValidDrawing(drawing)) return false;

        return drawing.startPoint && drawing.endPoint &&
               drawing.startPoint.price !== null && drawing.endPoint.price !== null &&
               drawing.levels && Array.isArray(drawing.levels) &&
               drawing.levels.length > 0;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FibRetracementTool;
} else if (typeof window !== 'undefined') {
    window.FibRetracementTool = FibRetracementTool;
}