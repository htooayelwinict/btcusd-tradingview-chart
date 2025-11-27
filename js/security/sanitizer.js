/**
 * DOM-safe sanitization helpers for UI rendering.
 * The module is dependency-free and works in both browsers and Node (for SSR/tests).
 */
const Sanitizer = (() => {
    const ESCAPE_LOOKUP = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '`': '&#96;'
    };
    const ESCAPE_REGEX = /[&<>"'`]/g;
    const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:', 'sms:']);
    const SAFE_RELATIVE_URL = /^\/(?!\/)/;
    const DATA_URL_PATTERN = /^data:image\/(png|gif|jpeg|webp);base64,[a-z0-9+/=]+$/i;
    const COLOR_ALLOWLIST = new Set([
        'black', 'white', 'gray', 'silver', 'lightgray', 'darkgray',
        'red', 'maroon', 'orange', 'yellow', 'olive', 'lime', 'green',
        'cyan', 'teal', 'aqua', 'blue', 'navy', 'purple', 'fuchsia',
        'pink', 'magenta', 'brown', 'gold', 'transparent', 'currentcolor'
    ]);
    const HEX_COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
    const RGB_COLOR_PATTERN = /^rgba?\(\s*(?:\d{1,3}\s*,\s*){2}\d{1,3}(?:\s*,\s*(?:0?\.\d+|1(?:\.0)?))?\s*\)$/i;
    const HSL_COLOR_PATTERN = /^hsla?\(\s*\d{1,3}\s*,\s*(?:\d{1,3}%\s*,\s*)\d{1,3}%(?:\s*,\s*(?:0?\.\d+|1(?:\.0)?))?\s*\)$/i;
    const SAFE_ATTRIBUTES = new Set([
        'id', 'class', 'title', 'alt', 'name', 'value', 'type', 'role', 'tabindex',
        'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-hidden', 'aria-live',
        'aria-atomic', 'aria-current', 'aria-valuenow', 'aria-valuemin', 'aria-valuemax',
        'aria-pressed', 'aria-expanded', 'aria-selected', 'dir', 'lang',
        'href', 'src', 'srcset', 'sizes', 'target', 'rel', 'download',
        'width', 'height', 'min', 'max', 'step',
        'data-state', 'data-id', 'data-role', 'data-index', 'data-value',
        'placeholder', 'maxlength', 'rows', 'cols', 'wrap', 'checked',
        'selected', 'readonly', 'disabled', 'required'
    ]);
    const URL_ATTRIBUTES = new Set(['href', 'src', 'srcset', 'action', 'formaction', 'poster', 'xlink:href']);
    const COLOR_ATTRIBUTES = new Set(['color', 'background', 'background-color', 'fill', 'stroke', 'border-color', 'stop-color']);
    const NUMBER_ATTRIBUTES = new Set(['width', 'height', 'tabindex', 'aria-valuenow', 'aria-valuemin', 'aria-valuemax']);
    const DANGEROUS_ATTR_REGEX = [/^on/i, /^style$/i, /^srcdoc$/i];
    const BLOCKED_TAGS = new Set([
        'script', 'style', 'iframe', 'object', 'embed', 'template',
        'link', 'meta', 'base', 'form', 'input', 'textarea', 'button'
    ]);
    const XSS_PATTERNS = [
        /javascript:/i,
        /vbscript:/i,
        /data:text\/html/i,
        /expression\s*\(/i,
        /url\(\s*['"]?\s*javascript:/i,
        /<\s*\/?\s*(?:script|style|iframe|object|embed|form|link|meta)/i
    ];
    const DEFAULT_HTML_OPTIONS = {
        allowedTags: null,           // optional Set<string>
        removeUnknownTags: true
    };

    const normalizeInput = (value) => (value == null ? '' : String(value));

    const escapeHTML = (value) => normalizeInput(value).replace(ESCAPE_REGEX, (char) => ESCAPE_LOOKUP[char]);

    const hasXSSPayload = (value) => {
        const input = normalizeInput(value);
        if (!input) return false;
        return XSS_PATTERNS.some((pattern) => pattern.test(input));
    };

    const isSafeURL = (value) => {
        const candidate = normalizeInput(value).trim();
        if (!candidate) return false;
        if (candidate.startsWith('#')) return true;
        if (SAFE_RELATIVE_URL.test(candidate)) return true;
        if (DATA_URL_PATTERN.test(candidate)) return true;
        try {
            const origin = typeof window !== 'undefined' && window.location ? window.location.origin : 'https://example.com';
            const parsed = new URL(candidate, origin);
            return SAFE_PROTOCOLS.has(parsed.protocol);
        } catch {
            return false;
        }
    };

    const sanitizeURL = (value) => (isSafeURL(value) ? value.trim() : '');

    const isSafeColor = (value) => {
        const input = normalizeInput(value).trim().toLowerCase();
        if (!input) return false;
        return (
            COLOR_ALLOWLIST.has(input) ||
            HEX_COLOR_PATTERN.test(input) ||
            RGB_COLOR_PATTERN.test(input) ||
            HSL_COLOR_PATTERN.test(input)
        );
    };

    const sanitizeColor = (value, fallback = '') => (isSafeColor(value) ? value.trim() : fallback);

    const sanitizeAttributeValue = (value) => normalizeInput(value).replace(/[\u0000-\u001f\u007f]/g, '');

    const isSafeAttribute = (name, value) => {
        const attrName = normalizeInput(name).toLowerCase();
        if (!attrName) return false;
        if (DANGEROUS_ATTR_REGEX.some((regex) => regex.test(attrName))) return false;
        if (
            !SAFE_ATTRIBUTES.has(attrName) &&
            !/^data-[a-z0-9\-]+$/.test(attrName) &&
            !/^aria-[a-z]+$/.test(attrName)
        ) {
            return false;
        }
        if (hasXSSPayload(value)) return false;
        if (URL_ATTRIBUTES.has(attrName)) return isSafeURL(value);
        if (COLOR_ATTRIBUTES.has(attrName)) return isSafeColor(value);
        if (NUMBER_ATTRIBUTES.has(attrName)) return !Number.isNaN(Number(value));
        return true;
    };

    const filterAttributes = (attributes = {}) =>
        Object.entries(attributes).reduce((acc, [name, value]) => {
            if (!isSafeAttribute(name, value)) {
                return acc;
            }
            const key = name.toLowerCase();
            if (URL_ATTRIBUTES.has(key)) {
                const sanitized = sanitizeURL(value);
                if (sanitized) acc[name] = sanitized;
                return acc;
            }
            if (COLOR_ATTRIBUTES.has(key)) {
                const sanitized = sanitizeColor(value);
                if (sanitized) acc[name] = sanitized;
                return acc;
            }
            acc[name] = sanitizeAttributeValue(value);
            return acc;
        }, {});

    const sanitizeElementAttributes = (element) => {
        Array.from(element.attributes).forEach((attr) => {
            if (!isSafeAttribute(attr.name, attr.value)) {
                element.removeAttribute(attr.name);
                return;
            }
            const key = attr.name.toLowerCase();
            if (URL_ATTRIBUTES.has(key)) {
                const safeValue = sanitizeURL(attr.value);
                if (!safeValue) {
                    element.removeAttribute(attr.name);
                } else {
                    element.setAttribute(attr.name, safeValue);
                    if (key === 'target' && safeValue === '_blank') {
                        const rel = element.getAttribute('rel') || '';
                        if (!/noopener/i.test(rel) || !/noreferrer/i.test(rel)) {
                            element.setAttribute('rel', 'noopener noreferrer');
                        }
                    }
                }
                return;
            }
            if (COLOR_ATTRIBUTES.has(key)) {
                const safeColor = sanitizeColor(attr.value);
                if (!safeColor) {
                    element.removeAttribute(attr.name);
                } else {
                    element.setAttribute(attr.name, safeColor);
                }
                return;
            }
            element.setAttribute(attr.name, sanitizeAttributeValue(attr.value));
        });
    };

    const cleanNode = (node, options) => {
        Array.from(node.childNodes).forEach((child) => {
            switch (child.nodeType) {
                case Node.ELEMENT_NODE: {
                    const tag = child.tagName.toLowerCase();
                    if (BLOCKED_TAGS.has(tag)) {
                        child.remove();
                        return;
                    }
                    if (
                        options.allowedTags &&
                        !options.allowedTags.has(tag) &&
                        options.removeUnknownTags
                    ) {
                        const fragment = document.createDocumentFragment();
                        while (child.firstChild) {
                            fragment.appendChild(child.firstChild);
                        }
                        child.replaceWith(fragment);
                        return;
                    }
                    sanitizeElementAttributes(child);
                    cleanNode(child, options);
                    break;
                }
                case Node.COMMENT_NODE:
                    child.remove();
                    break;
                case Node.TEXT_NODE:
                    if (hasXSSPayload(child.textContent)) {
                        child.textContent = normalizeInput(child.textContent);
                    }
                    break;
                default:
                    child.remove();
            }
        });
    };

    const sanitizeHTML = (input, options = {}) => {
        const html = normalizeInput(input);
        if (!html) return '';
        if (typeof document === 'undefined') {
            return escapeHTML(html);
        }
        const settings = { ...DEFAULT_HTML_OPTIONS, ...options };
        const template = document.createElement('template');
        template.innerHTML = html;
        cleanNode(template.content, settings);
        return template.innerHTML;
    };

    const setSafeText = (element, value) => {
        if (!element) return;
        element.textContent = normalizeInput(value);
    };

    return {
        escapeHTML,
        sanitizeText: escapeHTML,
        sanitizeHTML,
        isSafeAttribute,
        filterAttributes,
        sanitizeURL,
        isSafeColor,
        sanitizeColor,
        hasXSSPayload,
        setSafeText,
        COLOR_ALLOWLIST: new Set(COLOR_ALLOWLIST),
        XSS_PATTERNS: XSS_PATTERNS.slice()
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Sanitizer;
}
if (typeof window !== 'undefined') {
    window.Sanitizer = Sanitizer;
}