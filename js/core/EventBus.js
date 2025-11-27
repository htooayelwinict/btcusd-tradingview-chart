/**
 * EventBus - Central event management system for decoupled module communication
 * Provides publish-subscribe pattern for technical analysis framework modules
 */

class EventBus {
    constructor() {
        this.events = new Map();
        this.maxListeners = 50;
        this.debugMode = false;
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - Event name to listen for
     * @param {Function} callback - Callback function when event is emitted
     * @param {Object} options - Subscription options
     * @returns {Function} Unsubscribe function
     */
    on(eventName, callback, options = {}) {
        if (typeof eventName !== 'string' || typeof callback !== 'function') {
            throw new Error('Event name must be string and callback must be function');
        }

        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }

        const listeners = this.events.get(eventName);
        if (listeners.length >= this.maxListeners) {
            console.warn(`EventBus: Maximum listeners (${this.maxListeners}) reached for event: ${eventName}`);
        }

        const listener = {
            callback,
            once: options.once || false,
            priority: options.priority || 0,
            context: options.context || null
        };

        listeners.push(listener);

        // Sort by priority (higher priority first)
        listeners.sort((a, b) => b.priority - a.priority);

        if (this.debugMode) {
            console.log(`EventBus: Subscribed to '${eventName}' (total: ${listeners.length})`);
        }

        // Return unsubscribe function
        return () => this.off(eventName, callback);
    }

    /**
     * Subscribe to event only once
     * @param {string} eventName - Event name to listen for
     * @param {Function} callback - Callback function
     * @param {Object} options - Subscription options
     * @returns {Function} Unsubscribe function
     */
    once(eventName, callback, options = {}) {
        return this.on(eventName, callback, { ...options, once: true });
    }

    /**
     * Unsubscribe from an event
     * @param {string} eventName - Event name to unsubscribe from
     * @param {Function} callback - Callback function to remove
     * @returns {boolean} True if listener was removed
     */
    off(eventName, callback) {
        if (!this.events.has(eventName)) {
            return false;
        }

        const listeners = this.events.get(eventName);
        const index = listeners.findIndex(listener => listener.callback === callback);

        if (index !== -1) {
            listeners.splice(index, 1);

            if (listeners.length === 0) {
                this.events.delete(eventName);
            }

            if (this.debugMode) {
                console.log(`EventBus: Unsubscribed from '${eventName}'`);
            }

            return true;
        }

        return false;
    }

    /**
     * Emit an event to all subscribers
     * @param {string} eventName - Event name to emit
     * @param {*} data - Data to pass to subscribers
     * @param {Object} options - Emission options
     * @returns {number} Number of listeners notified
     */
    emit(eventName, data, options = {}) {
        if (!this.events.has(eventName)) {
            if (this.debugMode) {
                console.log(`EventBus: No listeners for '${eventName}'`);
            }
            return 0;
        }

        const listeners = [...this.events.get(eventName)]; // Copy to avoid modification during iteration
        const async = options.async || false;
        let notifiedCount = 0;

        if (this.debugMode) {
            console.log(`EventBus: Emitting '${eventName}' to ${listeners.length} listeners`, data);
        }

        const executeListener = (listener) => {
            try {
                if (listener.context) {
                    listener.callback.call(listener.context, data, eventName);
                } else {
                    listener.callback(data, eventName);
                }
                notifiedCount++;

                // Remove once listeners
                if (listener.once) {
                    this.off(eventName, listener.callback);
                }
            } catch (error) {
                console.error(`EventBus: Error in listener for '${eventName}':`, error);
            }
        };

        if (async) {
            // Execute asynchronously
            setTimeout(() => {
                listeners.forEach(executeListener);
            }, 0);
        } else {
            // Execute synchronously
            listeners.forEach(executeListener);
        }

        return notifiedCount;
    }

    /**
     * Remove all listeners for an event or all events
     * @param {string} eventName - Event name (optional, removes all if not provided)
     */
    clear(eventName = null) {
        if (eventName) {
            if (this.events.has(eventName)) {
                this.events.delete(eventName);
                if (this.debugMode) {
                    console.log(`EventBus: Cleared all listeners for '${eventName}'`);
                }
            }
        } else {
            this.events.clear();
            if (this.debugMode) {
                console.log('EventBus: Cleared all listeners');
            }
        }
    }

    /**
     * Get list of all registered event names
     * @returns {Array<string>} Array of event names
     */
    getEventNames() {
        return Array.from(this.events.keys());
    }

    /**
     * Get number of listeners for an event
     * @param {string} eventName - Event name
     * @returns {number} Number of listeners
     */
    getListenerCount(eventName) {
        return this.events.has(eventName) ? this.events.get(eventName).length : 0;
    }

    /**
     * Enable/disable debug mode
     * @param {boolean} enabled - Whether to enable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = !!enabled;
    }

    /**
     * Set maximum number of listeners per event
     * @param {number} max - Maximum listeners
     */
    setMaxListeners(max) {
        if (typeof max === 'number' && max > 0) {
            this.maxListeners = max;
        }
    }

    /**
     * Create a namespaced event bus
     * @param {string} namespace - Namespace prefix
     * @returns {Object} Namespaced event bus interface
     */
    namespace(namespace) {
        if (typeof namespace !== 'string') {
            throw new Error('Namespace must be a string');
        }

        return {
            on: (eventName, callback, options) =>
                this.on(`${namespace}:${eventName}`, callback, options),
            once: (eventName, callback, options) =>
                this.once(`${namespace}:${eventName}`, callback, options),
            off: (eventName, callback) =>
                this.off(`${namespace}:${eventName}`, callback),
            emit: (eventName, data, options) =>
                this.emit(`${namespace}:${eventName}`, data, options),
            clear: (eventName) =>
                this.clear(eventName ? `${namespace}:${eventName}` : null)
        };
    }
}

// Create singleton instance
const eventBus = new EventBus();

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventBus, eventBus };
} else if (typeof window !== 'undefined') {
    window.EventBus = EventBus;
    window.eventBus = eventBus;
}