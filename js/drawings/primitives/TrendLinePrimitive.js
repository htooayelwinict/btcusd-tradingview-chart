/**
 * TrendLinePrimitive - Official Lightweight Charts primitive for trend line drawing
 * Implements ISeriesPrimitive interface for proper integration with Lightweight Charts
 */

/**
 * Renderer for drawing trend lines on the chart pane
 */
class TrendLinePaneRenderer {
    constructor(primitive) {
        this._primitive = primitive;
    }

    draw(target) {
        if (this._primitive.isValid()) {
            this._primitive.drawTrendLine(target);
        }
    }
}

/**
 * Pane view for trend line primitive
 */
class TrendLinePaneView {
    constructor(primitive) {
        this._primitive = primitive;
        this._renderer = new TrendLinePaneRenderer(primitive);
    }

    renderer() {
        return this._primitive.isValid() ? this._renderer : null;
    }
}

class TrendLinePrimitive {
    constructor(series, chart, drawingData = null) {
        this.series = series;
        this.chart = chart;
        this.drawingData = drawingData;
        this.options = {
            lineColor: '#FF6B6B',
            lineWidth: 2,
            lineStyle: LightweightCharts.LineStyle.Solid,
            ...drawingData?.options
        };
        this._paneView = new TrendLinePaneView(this);
    }

    /**
     * Required method for ISeriesPrimitive interface
     * Returns array of pane view descriptors with proper renderer() method
     */
    paneViews() {
        return this.isValid() ? [this._paneView] : [];
    }

    /**
     * Draw the trend line using the official primitive rendering approach
     * @param {CanvasRenderingTarget2D} target - Lightweight Charts rendering target
     */
    drawTrendLine(target) {
        if (!this.drawingData || !this.drawingData.startPoint || !this.drawingData.endPoint) {
            return;
        }

        // Use media coordinate space for proper coordinate conversion
        target.useMediaCoordinateSpace((mediaScope) => {
            const { context: ctx, mediaSize } = mediaScope;

            // Convert drawing data time/price to screen coordinates
            const startX = this.chart.timeScale().timeToCoordinate(this.drawingData.startPoint.time);
            const startY = this.series.priceToCoordinate(this.drawingData.startPoint.price);
            const endX = this.chart.timeScale().timeToCoordinate(this.drawingData.endPoint.time);
            const endY = this.series.priceToCoordinate(this.drawingData.endPoint.price);

            // Skip if coordinates are invalid
            if (startX === null || startY === null || endX === null || endY === null) {
                return;
            }

            // Save canvas state
            ctx.save();

            try {
                // Set line style
                ctx.strokeStyle = this.options.lineColor;
                ctx.lineWidth = this.options.lineWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                // Apply line style
                if (this.options.lineStyle !== undefined) {
                    target.setLineStyle && target.setLineStyle(ctx, this.options.lineStyle);
                }

                // Draw the main trend line
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                // Draw endpoint circles for visibility
                this.drawEndpoint(ctx, startX, startY, this.options.lineColor, this.options.lineWidth);
                this.drawEndpoint(ctx, endX, endY, this.options.lineColor, this.options.lineWidth);

                // Draw label if line is long enough
                const dx = endX - startX;
                const dy = endY - startY;
                const lineLength = Math.sqrt(dx * dx + dy * dy);

                if (lineLength > 50 && this.drawingData.priceDifference) {
                    this.drawLabel(ctx, startX, startY, endX, endY);
                }

            } finally {
                // Restore canvas state
                ctx.restore();
            }
        });
    }

    /**
     * Draw endpoint circle
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} color - Circle color
     * @param {number} lineWidth - Line width
     */
    drawEndpoint(ctx, x, y, color, lineWidth) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, (lineWidth + 2) / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Draw trend line label with price information
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} startX - Start X coordinate
     * @param {number} startY - Start Y coordinate
     * @param {number} endX - End X coordinate
     * @param {number} endY - End Y coordinate
     */
    drawLabel(ctx, startX, startY, endX, endY) {
        if (!this.drawingData.priceDifference || !this.drawingData.startPoint) {
            return;
        }

        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;

        // Create label text
        const priceDiff = this.drawingData.priceDifference;
        const priceDiffText = priceDiff >= 0 ? `+${priceDiff.toFixed(2)}` : priceDiff.toFixed(2);
        const percentDiff = (priceDiff / this.drawingData.startPoint.price * 100).toFixed(2);
        const percentDiffText = percentDiff >= 0 ? `+${percentDiff}%` : `${percentDiff}%`;

        const text = `${priceDiffText} (${percentDiffText})`;

        // Set font
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        // Measure text for background
        const metrics = ctx.measureText(text);
        const padding = 4;
        const bgHeight = 18;

        // Draw background
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
     * Update the drawing data and trigger chart update
     * @param {Object} drawingData - New drawing data
     */
    updateDrawingData(drawingData) {
        this.drawingData = drawingData;
        this.options = {
            ...this.options,
            ...drawingData?.options
        };
    }

    /**
     * Get the current drawing data
     * @returns {Object} Current drawing data
     */
    getDrawingData() {
        return this.drawingData;
    }

    /**
     * Check if the primitive has valid drawing data
     * @returns {boolean} True if valid drawing data exists
     */
    isValid() {
        return !!(this.drawingData &&
                 this.drawingData.startPoint &&
                 this.drawingData.endPoint &&
                 this.drawingData.startPoint.time !== undefined &&
                 this.drawingData.startPoint.price !== undefined &&
                 this.drawingData.endPoint.time !== undefined &&
                 this.drawingData.endPoint.price !== undefined);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrendLinePrimitive;
} else if (typeof window !== 'undefined') {
    window.TrendLinePrimitive = TrendLinePrimitive;
}