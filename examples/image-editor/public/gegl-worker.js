/**
 * GEGL Web Worker for off-main-thread image processing
 * Provides progress reporting and cancellation support
 */

// Worker state
let isInitialized = false;
let currentProcessor = null;
let isCancelled = false;
let geglModule = null;

// Message types
const MESSAGE_TYPES = {
    INIT: 'init',
    PROCESS: 'process',
    CANCEL: 'cancel',
    CLEANUP: 'cleanup'
};

// Response types
const RESPONSE_TYPES = {
    READY: 'ready',
    PROGRESS: 'progress',
    RESULT: 'result',
    ERROR: 'error',
    CANCELLED: 'cancelled'
};

/**
 * Send message to main thread
 */
function sendMessage(type, data = {}) {
    self.postMessage({ type, ...data });
}

/**
 * Handle initialization message
 */
async function handleInit(message) {
    try {
        if (isInitialized) {
            sendMessage(RESPONSE_TYPES.READY);
            return;
        }

        // Import GEGL wrapper and WebAssembly module
        importScripts(message.wasmUrl || 'gegl.js');

        // Wait for Module to be ready
        await new Promise((resolve, reject) => {
            if (typeof Module !== 'undefined' && Module.onRuntimeInitialized) {
                Module.onRuntimeInitialized = resolve;
            } else {
                // Fallback: wait for Module to be defined
                let attempts = 0;
                const checkModule = () => {
                    if (typeof Module !== 'undefined') {
                        resolve();
                    } else if (attempts < 100) {
                        attempts++;
                        setTimeout(checkModule, 10);
                    } else {
                        reject(new Error('Module not loaded'));
                    }
                };
                checkModule();
            }
        });

        geglModule = Module;

        // Initialize GEGL
        Module.initializeGegl();

        isInitialized = true;
        sendMessage(RESPONSE_TYPES.READY);

    } catch (error) {
        sendMessage(RESPONSE_TYPES.ERROR, {
            message: `Initialization failed: ${error.message}`
        });
    }
}

/**
 * Handle image processing message
 */
function handleProcess(message) {
    if (!isInitialized) {
        sendMessage(RESPONSE_TYPES.ERROR, {
            message: 'Worker not initialized'
        });
        return;
    }

    try {
        isCancelled = false;

        const { imageData, operations, format = 'RGBA u8' } = message;

        // Create buffer from image data
        const extent = new Module.GeglRectangle(0, 0, imageData.width, imageData.height);
        const buffer = new Module.GeglBuffer(extent, format);

        // Set pixel data
        buffer.set(extent, format, new Uint8Array(imageData.data));

        // Create processing graph
        const root = Module.gegl_node_new();
        let currentNode = null;

        // Build operation chain
        for (const op of operations) {
            const node = new Module.GeglNode(root, op.operation);

            // Set properties
            if (op.properties) {
                for (const [key, value] of Object.entries(op.properties)) {
                    if (typeof value === 'string') {
                        node.setProperty(key, value);
                    } else if (typeof value === 'number') {
                        node.setProperty(key, value);
                    } else if (typeof value === 'object' && value.r !== undefined) {
                        // Color object
                        const color = new Module.GeglColor();
                        color.setRgba(value.r, value.g, value.b, value.a || 1.0);
                        node.setProperty(key, color);
                    }
                }
            }

            if (currentNode) {
                currentNode.connectTo(node, 'input', 'output');
            }

            currentNode = node;
        }

        if (!currentNode) {
            throw new Error('No operations specified');
        }

        // Create processor for progress reporting
        const processRect = new Module.GeglRectangle(0, 0, imageData.width, imageData.height);
        currentProcessor = new Module.GeglProcessor(currentNode, processRect);

        // Process with progress reporting
        let progress = 0;
        while (!isCancelled && currentProcessor.work([progress])) {
            sendMessage(RESPONSE_TYPES.PROGRESS, { progress });

            // Small delay to prevent flooding the main thread
            // In a real implementation, you might want to throttle this
        }

        if (isCancelled) {
            sendMessage(RESPONSE_TYPES.CANCELLED);
            return;
        }

        // Get result buffer
        const resultBuffer = currentProcessor.getBuffer();

        // Extract result data
        const resultData = resultBuffer.get(extent, format);

        // Convert to transferable object
        const resultArray = new Uint8Array(resultData);

        sendMessage(RESPONSE_TYPES.RESULT, {
            imageData: {
                data: resultArray.buffer,
                width: imageData.width,
                height: imageData.height
            },
            format
        }, [resultArray.buffer]); // Transfer the buffer

        // Cleanup
        currentProcessor = null;

    } catch (error) {
        sendMessage(RESPONSE_TYPES.ERROR, {
            message: `Processing failed: ${error.message}`
        });
    }
}

/**
 * Handle cancellation message
 */
function handleCancel() {
    isCancelled = true;
    if (currentProcessor) {
        // Note: GeglProcessor doesn't have a direct cancel method,
        // but setting the flag will stop the processing loop
    }
}

/**
 * Handle cleanup message
 */
function handleCleanup() {
    try {
        if (isInitialized) {
            Module.cleanupGegl();
            isInitialized = false;
        }
        isCancelled = false;
        currentProcessor = null;
        geglModule = null;
    } catch (error) {
        // Ignore cleanup errors
    }
}

/**
 * Main message handler
 */
self.onmessage = function(event) {
    const message = event.data;

    switch (message.type) {
        case MESSAGE_TYPES.INIT:
            handleInit(message);
            break;
        case MESSAGE_TYPES.PROCESS:
            handleProcess(message);
            break;
        case MESSAGE_TYPES.CANCEL:
            handleCancel();
            break;
        case MESSAGE_TYPES.CLEANUP:
            handleCleanup();
            break;
        default:
            sendMessage(RESPONSE_TYPES.ERROR, {
                message: `Unknown message type: ${message.type}`
            });
    }
};

// Export message types for use in main thread
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MESSAGE_TYPES, RESPONSE_TYPES };
}