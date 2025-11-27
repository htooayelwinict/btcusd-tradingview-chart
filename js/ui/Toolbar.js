/**
 * Drawing Tools Toolbar - Secure DOM Implementation
 * Provides UI for drawing tools with XSS protection
 */
class Toolbar {
    constructor(eventBus, drawingManager) {
        this.eventBus = eventBus;
        this.drawingManager = drawingManager;
        this.container = null;
        this.currentTool = null;
        this.isVisible = true;

        // Tool configurations with safe defaults
        this.tools = [
            {
                id: 'trendline',
                name: 'Trend Line',
                icon: '📈',
                shortcut: 'T',
                color: '#FF6B6B'
            },
            {
                id: 'horizontal',
                name: 'Horizontal',
                icon: '➖',
                shortcut: 'H',
                color: '#4ECDC4'
            },
            {
                id: 'fibonacci',
                name: 'Fibonacci',
                icon: '📊',
                shortcut: 'F',
                color: '#9B59B6'
            }
        ];

        this.init();
    }

    init() {
        this.createToolbar();
        this.bindEvents();
        this.bindKeyboardShortcuts();
    }

    createToolbar() {
        // Create main container with safe DOM methods
        this.container = document.createElement('div');
        this.container.className = 'chart-toolbar position-top-left';

        // Set safe attributes
        const safeAttrs = Sanitizer.filterAttributes({
            'aria-label': 'Drawing tools toolbar',
            'role': 'toolbar'
        });

        Object.entries(safeAttrs).forEach(([key, value]) => {
            this.container.setAttribute(key, value);
        });

        // Create header
        this.createHeader();

        // Create content area
        this.createContent();

        // Add to document
        document.body.appendChild(this.container);
    }

    createHeader() {
        const header = document.createElement('div');
        header.className = 'toolbar-header';

        // Title
        const title = document.createElement('div');
        title.className = 'toolbar-title';
        Sanitizer.setSafeText(title, 'Drawing Tools');

        // Toggle button
        const toggle = document.createElement('button');
        toggle.className = 'toolbar-toggle';
        Sanitizer.setSafeText(toggle, '−');
        toggle.setAttribute('title', 'Toggle toolbar');
        toggle.setAttribute('aria-label', 'Toggle toolbar visibility');

        toggle.addEventListener('click', () => this.toggle());

        header.appendChild(title);
        header.appendChild(toggle);
        this.container.appendChild(header);
    }

    createContent() {
        const content = document.createElement('div');
        content.className = 'toolbar-content';

        // Tools section
        this.createToolSection(content);

        // Actions section
        this.createActionSection(content);

        this.container.appendChild(content);
    }

    createToolSection(container) {
        const toolGroup = document.createElement('div');
        toolGroup.className = 'tool-group';

        // Group title
        const groupTitle = document.createElement('div');
        groupTitle.className = 'tool-group-title';
        Sanitizer.setSafeText(groupTitle, 'Tools');
        toolGroup.appendChild(groupTitle);

        // Tool buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'tool-buttons';

        this.tools.forEach(tool => {
            const button = this.createToolButton(tool);
            buttonsContainer.appendChild(button);
        });

        toolGroup.appendChild(buttonsContainer);
        container.appendChild(toolGroup);
    }

    createToolButton(tool) {
        const button = document.createElement('button');
        button.className = 'tool-btn';
        button.setAttribute('data-tool', tool.id);
        button.setAttribute('data-shortcut', tool.shortcut);

        // Set safe attributes with color
        const safeAttrs = Sanitizer.filterAttributes({
            'title': `${tool.name} (${tool.shortcut})`,
            'aria-label': tool.name,
            'aria-pressed': 'false',
            'style': `--tool-color: ${Sanitizer.sanitizeColor(tool.color, '#3b82f6')};`
        });

        Object.entries(safeAttrs).forEach(([key, value]) => {
            button.setAttribute(key, value);
        });

        // Icon
        const icon = document.createElement('div');
        icon.className = 'tool-icon';
        Sanitizer.setSafeText(icon, tool.icon);

        // Label
        const label = document.createElement('div');
        label.className = 'tool-label';
        Sanitizer.setSafeText(label, tool.name);

        button.appendChild(icon);
        button.appendChild(label);

        // Click handler
        button.addEventListener('click', () => this.selectTool(tool.id));

        return button;
    }

    createActionSection(container) {
        const actionGroup = document.createElement('div');
        actionGroup.className = 'tool-group';

        // Group title
        const groupTitle = document.createElement('div');
        groupTitle.className = 'tool-group-title';
        Sanitizer.setSafeText(groupTitle, 'Actions');
        actionGroup.appendChild(groupTitle);

        // Action buttons
        const actions = [
            { id: 'clear', name: 'Clear All', icon: '🗑️', shortcut: 'C' },
            { id: 'undo', name: 'Undo', icon: '↶', shortcut: 'Z' },
            { id: 'redo', name: 'Redo', icon: '↷', shortcut: 'Y' },
            { id: 'export', name: 'Export', icon: '💾', shortcut: 'E' }
        ];

        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'action-buttons';

        actions.forEach(action => {
            const button = this.createActionButton(action);
            buttonsContainer.appendChild(button);
        });

        actionGroup.appendChild(buttonsContainer);
        container.appendChild(actionGroup);
    }

    createActionButton(action) {
        const button = document.createElement('button');
        button.className = 'action-btn';
        button.setAttribute('data-action', action.id);

        // Set safe attributes
        const safeAttrs = Sanitizer.filterAttributes({
            'title': `${action.name} (${action.shortcut})`,
            'aria-label': action.name
        });

        Object.entries(safeAttrs).forEach(([key, value]) => {
            button.setAttribute(key, value);
        });

        // Icon
        const icon = document.createElement('div');
        icon.className = 'action-icon';
        Sanitizer.setSafeText(icon, action.icon);

        // Label
        const label = document.createElement('div');
        label.className = 'action-label';
        Sanitizer.setSafeText(label, action.name);

        button.appendChild(icon);
        button.appendChild(label);

        // Click handler
        button.addEventListener('click', () => this.handleAction(action.id));

        return button;
    }

    bindEvents() {
        // FIX: Use consistent event names
        this.eventBus.on('drawing-tool-selected', (toolId) => {
            this.updateActiveTool(toolId);
        });

        this.eventBus.on('drawing:started', () => {
            this.container.classList.add('state-drawing');
        });

        this.eventBus.on('drawing:finished', () => {
            this.container.classList.remove('state-drawing');
        });

        // Handle visibility changes
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        });
    }

    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only trigger shortcuts when not focused on input elements
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            const key = e.key.toUpperCase();

            // Tool shortcuts
            const tool = this.tools.find(t => t.shortcut === key);
            if (tool) {
                e.preventDefault();
                this.selectTool(tool.id);
                return;
            }

            // Action shortcuts
            switch (key) {
                case 'C':
                    e.preventDefault();
                    this.handleAction('clear');
                    break;
                case 'Z':
                    e.preventDefault();
                    this.handleAction('undo');
                    break;
                case 'Y':
                    e.preventDefault();
                    this.handleAction('redo');
                    break;
                case 'E':
                    e.preventDefault();
                    this.handleAction('export');
                    break;
            }
        });
    }

    selectTool(toolId) {
        if (this.currentTool === toolId) {
            // Deselect if clicking the same tool
            this.deselectAllTools();
            // FIX: Use consistent event name
            this.eventBus.emit('drawing-tool-deselected');
            this.currentTool = null;
            return;
        }

        this.currentTool = toolId;
        this.updateActiveTool(toolId);
        // FIX: Use consistent event name
        this.eventBus.emit('drawing-tool-selected', toolId);
    }

    updateActiveTool(toolId) {
        // Remove active class from all tool buttons
        const toolButtons = this.container.querySelectorAll('.tool-btn');
        toolButtons.forEach(button => {
            button.classList.remove('active');
            button.setAttribute('aria-pressed', 'false');
        });

        // Add active class to selected tool
        if (toolId) {
            const activeButton = this.container.querySelector(`[data-tool="${toolId}"]`);
            if (activeButton) {
                activeButton.classList.add('active');
                activeButton.setAttribute('aria-pressed', 'true');
            }
        }
    }

    deselectAllTools() {
        this.updateActiveTool(null);
    }

    handleAction(actionId) {
        switch (actionId) {
            case 'clear':
                this.clearAllDrawings();
                break;
            case 'undo':
                this.undo();
                break;
            case 'redo':
                this.redo();
                break;
            case 'export':
                this.exportDrawings();
                break;
        }
    }

    clearAllDrawings() {
        if (confirm('Clear all drawings? This cannot be undone.')) {
            this.drawingManager.clearAll();
            this.eventBus.emit('toolbar:cleared');
        }
    }

    undo() {
        this.eventBus.emit('toolbar:undo');
    }

    redo() {
        this.eventBus.emit('toolbar:redo');
    }

    exportDrawings() {
        try {
            const drawings = this.drawingManager.exportDrawings();
            const dataStr = JSON.stringify(drawings, null, 2);

            // Create safe download
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            const safeUrl = Sanitizer.sanitizeURL(url);
            link.href = safeUrl;
            link.download = `btcusd-drawings-${Date.now()}.json`;
            link.click();

            // Cleanup
            setTimeout(() => URL.revokeObjectURL(url), 100);

            this.eventBus.emit('toolbar:exported', drawings);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
        }
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    show() {
        this.isVisible = true;
        const content = this.container.querySelector('.toolbar-content');
        if (content) {
            content.classList.remove('hidden');
        }

        const toggle = this.container.querySelector('.toolbar-toggle');
        if (toggle) {
            Sanitizer.setSafeText(toggle, '−');
        }

        this.eventBus.emit('toolbar:shown');
    }

    hide() {
        this.isVisible = false;
        const content = this.container.querySelector('.toolbar-content');
        if (content) {
            content.classList.add('hidden');
        }

        const toggle = this.container.querySelector('.toolbar-toggle');
        if (toggle) {
            Sanitizer.setSafeText(toggle, '+');
        }

        this.eventBus.emit('toolbar:hidden');
    }

    setPosition(position) {
        // Remove existing position classes
        this.container.classList.remove('position-top-left', 'position-top-right', 'position-bottom-left', 'position-bottom-right');

        // Add new position class if valid
        const validPositions = ['position-top-left', 'position-top-right', 'position-bottom-left', 'position-bottom-right'];
        if (validPositions.includes(position)) {
            this.container.classList.add(position);
        }
    }

    setTheme(theme) {
        // Remove existing theme classes
        this.container.classList.remove('theme-light', 'theme-dark');

        // Add new theme class if valid
        if (theme === 'light' || theme === 'dark') {
            this.container.classList.add(`theme-${theme}`);
        }
    }

    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.eventBus.off('tool:changed');
        this.eventBus.off('drawing:started');
        this.eventBus.off('drawing:finished');
    }
}

// Export for use with module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Toolbar;
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.Toolbar = Toolbar;
}