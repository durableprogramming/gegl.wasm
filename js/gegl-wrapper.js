/**
 * High-level JavaScript API for GEGL WebAssembly
 * Provides classes for Buffer, Node, and Graph management with error handling
 */

class GeglError extends Error {
    constructor(message, code = null) {
        super(message);
        this.name = 'GeglError';
        this.code = code;
    }
}

// Error codes
const ERROR_CODES = {
    INVALID_ARGUMENT: 'INVALID_ARGUMENT',
    NOT_INITIALIZED: 'NOT_INITIALIZED',
    INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
    BUFFER_OPERATION_FAILED: 'BUFFER_OPERATION_FAILED',
    NODE_OPERATION_FAILED: 'NODE_OPERATION_FAILED',
    GRAPH_OPERATION_FAILED: 'GRAPH_OPERATION_FAILED',
    FILE_OPERATION_FAILED: 'FILE_OPERATION_FAILED'
};

class GeglBuffer {
    /**
     * Create a new buffer
     * @param {Object} extent - Rectangle {x, y, width, height}
     * @param {string} format - Pixel format (e.g., 'RGBA u8', 'RGB u8')
     */
    constructor(extent, format = 'RGBA u8') {
        if (!extent || typeof extent !== 'object' || !('width' in extent) || !('height' in extent)) {
            throw new GeglError('Extent must be an object with width and height properties', ERROR_CODES.INVALID_ARGUMENT);
        }

        try {
            const rect = new Module.GeglRectangle(extent.x || 0, extent.y || 0, extent.width, extent.height);
            this._buffer = new Module.GeglBuffer(rect, format);
        } catch (error) {
            throw new GeglError(`Failed to create buffer: ${error.message}`, ERROR_CODES.BUFFER_OPERATION_FAILED);
        }
    }

    /**
     * Create buffer from file
     * @param {string} path - File path
     * @returns {GeglBuffer}
     */
    static fromFile(path) {
        if (!path || typeof path !== 'string') {
            throw new GeglError('Path must be a non-empty string');
        }

        try {
            const buffer = Object.create(GeglBuffer.prototype);
            buffer._buffer = new Module.GeglBuffer(path);
            return buffer;
        } catch (error) {
            throw new GeglError(`Failed to load buffer from file: ${error.message}`);
        }
    }

    /**
     * Set pixel data in the buffer
     * @param {Object} rect - Rectangle to set
     * @param {string} format - Pixel format
     * @param {Uint8Array} data - Pixel data
     * @param {number} rowstride - Row stride (optional)
     */
    setPixels(rect, format, data, rowstride = 0) {
        if (!this._buffer) {
            throw new GeglError('Buffer not initialized', ERROR_CODES.NOT_INITIALIZED);
        }

        if (!rect || typeof rect !== 'object' || !('width' in rect) || !('height' in rect)) {
            throw new GeglError('Rect must be an object with width and height properties', ERROR_CODES.INVALID_ARGUMENT);
        }

        try {
            const geglRect = new Module.GeglRectangle(rect.x, rect.y, rect.width, rect.height);
            this._buffer.set(geglRect, format, data, rowstride);
        } catch (error) {
            throw new GeglError(`Failed to set pixels: ${error.message}`, ERROR_CODES.BUFFER_OPERATION_FAILED);
        }
    }

    /**
     * Get pixel data from the buffer
     * @param {Object} rect - Rectangle to get
     * @param {string} format - Pixel format
     * @param {number} rowstride - Row stride (optional)
     * @returns {Uint8Array} Pixel data
     */
    getPixels(rect, format, rowstride = 0) {
        if (!this._buffer) {
            throw new GeglError('Buffer not initialized');
        }

        try {
            const geglRect = new Module.GeglRectangle(rect.x, rect.y, rect.width, rect.height);
            return this._buffer.get(geglRect, format, rowstride);
        } catch (error) {
            throw new GeglError(`Failed to get pixels: ${error.message}`);
        }
    }

    /**
     * Get buffer extent
     * @returns {Object} Rectangle {x, y, width, height}
     */
    getExtent() {
        if (!this._buffer) {
            throw new GeglError('Buffer not initialized');
        }

        try {
            const rect = this._buffer.getExtent();
            return {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            };
        } catch (error) {
            throw new GeglError(`Failed to get extent: ${error.message}`);
        }
    }

    /**
     * Get buffer format
     * @returns {string} Format name
     */
    getFormat() {
        if (!this._buffer) {
            throw new GeglError('Buffer not initialized');
        }

        try {
            return this._buffer.getFormat();
        } catch (error) {
            throw new GeglError(`Failed to get format: ${error.message}`);
        }
    }

    /**
     * Save buffer to file
     * @param {string} path - File path
     * @param {Object} roi - Region of interest (optional)
     */
    save(path, roi = null) {
        if (!this._buffer) {
            throw new GeglError('Buffer not initialized');
        }

        if (!path || typeof path !== 'string') {
            throw new GeglError('Path must be a non-empty string');
        }

        try {
            const extent = this.getExtent();
            const saveRect = roi ?
                new Module.GeglRectangle(roi.x, roi.y, roi.width, roi.height) :
                new Module.GeglRectangle(extent.x, extent.y, extent.width, extent.height);

            this._buffer.save(path, saveRect);
        } catch (error) {
            throw new GeglError(`Failed to save buffer: ${error.message}`);
        }
    }

    /**
     * Flush buffer changes
     */
    flush() {
        if (!this._buffer) {
            throw new GeglError('Buffer not initialized');
        }

        try {
            this._buffer.flush();
        } catch (error) {
            throw new GeglError(`Failed to flush buffer: ${error.message}`);
        }
    }

    /**
     * Get internal GeglBuffer reference
     * @returns {Object} Internal buffer
     */
    getInternal() {
        return this._buffer;
    }
}

class GeglNode {
    /**
     * Create a new node
     * @param {GeglNode} parent - Parent node (null for root)
     * @param {string} operation - Operation name (e.g., 'gegl:over', 'gegl:blur')
     */
    constructor(parent, operation) {
        if (!operation || typeof operation !== 'string') {
            throw new GeglError('Operation must be a non-empty string', ERROR_CODES.INVALID_ARGUMENT);
        }

        try {
            this._node = new Module.GeglNode(parent ? parent.getInternal() : null, operation);
            this._operation = operation;
        } catch (error) {
            throw new GeglError(`Failed to create node: ${error.message}`, ERROR_CODES.NODE_OPERATION_FAILED);
        }
    }

    /**
     * Set a string property
     * @param {string} name - Property name
     * @param {string} value - Property value
     */
    setProperty(name, value) {
        if (!this._node) {
            throw new GeglError('Node not initialized');
        }

        try {
            this._node.setProperty(name, value);
        } catch (error) {
            throw new GeglError(`Failed to set property ${name}: ${error.message}`);
        }
    }

    /**
     * Set a numeric property
     * @param {string} name - Property name
     * @param {number} value - Property value
     */
    setNumberProperty(name, value) {
        if (!this._node) {
            throw new GeglError('Node not initialized');
        }

        if (typeof value !== 'number') {
            throw new GeglError('Value must be a number');
        }

        try {
            this._node.setProperty(name, value);
        } catch (error) {
            throw new GeglError(`Failed to set property ${name}: ${error.message}`);
        }
    }

    /**
     * Set a color property
     * @param {string} name - Property name
     * @param {Object} color - Color object with r, g, b, a properties or color string
     */
    setColorProperty(name, color) {
        if (!this._node) {
            throw new GeglError('Node not initialized');
        }

        try {
            let geglColor;
            if (typeof color === 'string') {
                geglColor = new Module.GeglColor(color);
            } else if (typeof color === 'object' && 'r' in color) {
                geglColor = new Module.GeglColor();
                geglColor.setRgba(color.r, color.g, color.b, color.a || 1.0);
            } else {
                throw new GeglError('Color must be a string or object with r, g, b properties');
            }

            this._node.setProperty(name, geglColor);
        } catch (error) {
            throw new GeglError(`Failed to set color property ${name}: ${error.message}`);
        }
    }

    /**
     * Connect this node to another node
     * @param {GeglNode} sink - Target node
     * @param {string} inputPad - Input pad name (default: 'input')
     * @param {string} outputPad - Output pad name (default: 'output')
     */
    connectTo(sink, inputPad = 'input', outputPad = 'output') {
        if (!this._node || !sink || !sink._node) {
            throw new GeglError('Both source and sink nodes must be initialized');
        }

        try {
            this._node.connectTo(sink._node, inputPad, outputPad);
        } catch (error) {
            throw new GeglError(`Failed to connect nodes: ${error.message}`);
        }
    }

    /**
     * Link this node to another node (automatic connection)
     * @param {GeglNode} sink - Target node
     */
    link(sink) {
        if (!this._node || !sink || !sink._node) {
            throw new GeglError('Both source and sink nodes must be initialized');
        }

        try {
            this._node.link(sink._node);
        } catch (error) {
            throw new GeglError(`Failed to link nodes: ${error.message}`);
        }
    }

    /**
     * Process this node
     */
    process() {
        if (!this._node) {
            throw new GeglError('Node not initialized');
        }

        try {
            this._node.process();
        } catch (error) {
            throw new GeglError(`Failed to process node: ${error.message}`);
        }
    }

    /**
     * Get bounding box of this node
     * @returns {Object} Rectangle {x, y, width, height}
     */
    getBoundingBox() {
        if (!this._node) {
            throw new GeglError('Node not initialized');
        }

        try {
            const bbox = this._node.getBoundingBox();
            return {
                x: bbox.x,
                y: bbox.y,
                width: bbox.width,
                height: bbox.height
            };
        } catch (error) {
            throw new GeglError(`Failed to get bounding box: ${error.message}`);
        }
    }

    /**
     * Blit node output to a buffer
     * @param {GeglBuffer} buffer - Target buffer
     * @param {Object} roi - Region of interest
     * @param {number} level - Mipmap level
     */
    blitToBuffer(buffer, roi, level = 0) {
        if (!this._node || !buffer || !buffer._buffer) {
            throw new GeglError('Node and buffer must be initialized');
        }

        try {
            const geglRect = new Module.GeglRectangle(roi.x, roi.y, roi.width, roi.height);
            this._node.blitBuffer(buffer._buffer, geglRect, level);
        } catch (error) {
            throw new GeglError(`Failed to blit to buffer: ${error.message}`);
        }
    }

    /**
     * Get operation name
     * @returns {string} Operation name
     */
    getOperation() {
        return this._operation;
    }

    /**
     * Get internal GeglNode reference
     * @returns {Object} Internal node
     */
    getInternal() {
        return this._node;
    }
}

class GeglGraph {
    /**
     * Create a new graph
     */
    constructor() {
        try {
            this._root = Module.gegl_node_new();
            this._nodes = [];
        } catch (error) {
            throw new GeglError(`Failed to create graph: ${error.message}`);
        }
    }

    /**
     * Create a new node in this graph
     * @param {string} operation - Operation name
     * @returns {GeglNode} New node
     */
    createNode(operation) {
        const node = new GeglNode(this._root, operation);
        this._nodes.push(node);
        return node;
    }

    /**
     * Get all nodes in the graph
     * @returns {Array<GeglNode>} Array of nodes
     */
    getNodes() {
        return [...this._nodes];
    }

    /**
     * Process the entire graph
     * @param {GeglNode} outputNode - Node to process (optional, processes all if not specified)
     */
    process(outputNode = null) {
        if (outputNode) {
            if (!this._nodes.includes(outputNode)) {
                throw new GeglError('Output node is not part of this graph');
            }
            outputNode.process();
        } else if (this._nodes.length > 0) {
            // Process the last node in the chain (assuming linear pipeline)
            // In GEGL, processing a node automatically processes its dependencies
            try {
                this._nodes[this._nodes.length - 1].process();
            } catch (error) {
                throw new GeglError(`Failed to process graph: ${error.message}`);
            }
        }
    }

    /**
     * Get root node
     * @returns {Object} Root node
     */
    getRoot() {
        return this._root;
    }

    /**
     * Clean up the graph
     */
    destroy() {
        try {
            // Nodes will be cleaned up automatically when root is destroyed
            if (this._root) {
                // Note: In the Emscripten binding, we don't have direct access to unref
                // The wrapper classes handle cleanup
                this._root = null;
            }
            this._nodes = [];
        } catch (error) {
            throw new GeglError(`Failed to destroy graph: ${error.message}`);
        }
    }
}

// Global GEGL management
class Gegl {
    static _initialized = false;

    /**
     * Initialize GEGL
     */
    static init() {
        if (!this._initialized) {
            try {
                Module.initializeGegl();
                this._initialized = true;
            } catch (error) {
                throw new GeglError(`Failed to initialize GEGL: ${error.message}`, ERROR_CODES.INITIALIZATION_FAILED);
            }
        }
    }

    /**
     * Clean up GEGL
     */
    static exit() {
        if (this._initialized) {
            try {
                Module.cleanupGegl();
                this._initialized = false;
            } catch (error) {
                throw new GeglError(`Failed to cleanup GEGL: ${error.message}`);
            }
        }
    }

    /**
     * Check if GEGL is initialized
     * @returns {boolean}
     */
    static isInitialized() {
        return this._initialized;
    }

    /**
     * Create a new graph
     * @returns {GeglGraph}
     */
    static createGraph() {
        if (!this._initialized) {
            throw new GeglError('GEGL must be initialized before creating graphs');
        }
        return new GeglGraph();
    }

    /**
     * Create a new buffer
     * @param {Object} extent - Rectangle {x, y, width, height}
     * @param {string} format - Pixel format
     * @returns {GeglBuffer}
     */
    static createBuffer(extent, format = 'RGBA u8') {
        if (!this._initialized) {
            throw new GeglError('GEGL must be initialized before creating buffers');
        }
        return new GeglBuffer(extent, format);
    }

    /**
     * Load buffer from file
     * @param {string} path - File path
     * @returns {GeglBuffer}
     */
    static loadBuffer(path) {
        if (!this._initialized) {
            throw new GeglError('GEGL must be initialized before loading buffers');
        }
        return GeglBuffer.fromFile(path);
    }
}

// Export classes
export { Gegl, GeglGraph, GeglNode, GeglBuffer, GeglError };

// For backward compatibility with CommonJS and browser globals
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Gegl, GeglGraph, GeglNode, GeglBuffer, GeglError };
}
if (typeof window !== 'undefined') {
    window.Gegl = Gegl;
    window.GeglGraph = GeglGraph;
    window.GeglNode = GeglNode;
    window.GeglBuffer = GeglBuffer;
    window.GeglError = GeglError;
}