/**
 * Main-thread wrapper for GEGL Web Worker
 * Provides Promise-based API for off-main-thread image processing
 */

class GeglWorkerError extends Error {
    constructor(message, code = null) {
        super(message);
        this.name = 'GeglWorkerError';
        this.code = code;
    }
}

class GeglWorker {
    /**
     * Create a new GEGL worker
     * @param {string} [wasmUrl] - URL to the WebAssembly module (defaults to 'gegl.js')
     */
    constructor(wasmUrl = 'gegl.js') {
        this.worker = new Worker('gegl-worker.js');
        this.wasmUrl = wasmUrl;
        this.isInitialized = false;
        this.isProcessing = false;
        this.currentTask = null;

        this.worker.onmessage = this.handleMessage.bind(this);
        this.worker.onerror = this.handleError.bind(this);

        // Promise resolvers
        this.initResolver = null;
        this.processResolver = null;
        this.processRejecter = null;
    }

    /**
     * Initialize the worker
     * @returns {Promise<void>}
     */
    async init() {
        if (this.isInitialized) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            this.initResolver = resolve;

            this.worker.postMessage({
                type: 'init',
                wasmUrl: this.wasmUrl
            });

            // Timeout after 30 seconds
            setTimeout(() => {
                if (!this.isInitialized) {
                    reject(new GeglWorkerError('Worker initialization timeout'));
                }
            }, 30000);
        });
    }

    /**
     * Process an image with GEGL operations
     * @param {ImageData|Object} imageData - Image data with width, height, and data properties
     * @param {Array} operations - Array of operation objects
     * @param {Object} [options] - Processing options
     * @returns {Promise<Object>} Promise resolving to processed image data
     */
    async process(imageData, operations, options = {}) {
        if (!this.isInitialized) {
            await this.init();
        }

        if (this.isProcessing) {
            throw new GeglWorkerError('Worker is already processing');
        }

        return new Promise((resolve, reject) => {
            this.isProcessing = true;
            this.processResolver = resolve;
            this.processRejecter = reject;

            // Convert ImageData to transferable format if needed
            let transferableData = imageData;
            if (imageData instanceof ImageData) {
                transferableData = {
                    data: imageData.data.buffer.slice(), // Copy buffer
                    width: imageData.width,
                    height: imageData.height
                };
            }

            this.worker.postMessage({
                type: 'process',
                imageData: transferableData,
                operations,
                format: options.format || 'RGBA u8'
            }, [transferableData.data]); // Transfer the buffer
        });
    }

    /**
     * Cancel current processing
     */
    cancel() {
        if (this.isProcessing) {
            this.worker.postMessage({ type: 'cancel' });
        }
    }

    /**
     * Clean up worker resources
     */
    cleanup() {
        this.worker.postMessage({ type: 'cleanup' });
        this.worker.terminate();
        this.isInitialized = false;
        this.isProcessing = false;
    }

    /**
     * Handle messages from worker
     */
    handleMessage(event) {
        const { type, ...data } = event.data;

        switch (type) {
            case 'ready':
                this.isInitialized = true;
                if (this.initResolver) {
                    this.initResolver();
                    this.initResolver = null;
                }
                break;

            case 'progress':
                // Emit progress event if callback provided
                if (this.onProgress) {
                    this.onProgress(data.progress);
                }
                break;

            case 'result':
                this.isProcessing = false;
                if (this.processResolver) {
                    // Reconstruct ImageData from transferred buffer
                    const result = {
                        ...data.imageData,
                        data: new Uint8ClampedArray(data.imageData.data)
                    };
                    this.processResolver(result);
                    this.processResolver = null;
                    this.processRejecter = null;
                }
                break;

            case 'error':
                this.isProcessing = false;
                if (this.processRejecter) {
                    this.processRejecter(new GeglWorkerError(data.message));
                    this.processResolver = null;
                    this.processRejecter = null;
                } else if (this.initResolver) {
                    this.initResolver(new GeglWorkerError(data.message));
                    this.initResolver = null;
                }
                break;

            case 'cancelled':
                this.isProcessing = false;
                if (this.processRejecter) {
                    this.processRejecter(new GeglWorkerError('Processing cancelled', 'CANCELLED'));
                    this.processResolver = null;
                    this.processRejecter = null;
                }
                break;
        }
    }

    /**
     * Handle worker errors
     */
    handleError(error) {
        this.isProcessing = false;
        const workerError = new GeglWorkerError(`Worker error: ${error.message}`);

        if (this.processRejecter) {
            this.processRejecter(workerError);
            this.processResolver = null;
            this.processRejecter = null;
        } else if (this.initResolver) {
            this.initResolver(workerError);
            this.initResolver = null;
        }
    }

    /**
     * Set progress callback
     * @param {Function} callback - Function called with progress (0-1)
     */
    setProgressCallback(callback) {
        this.onProgress = callback;
    }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GeglWorker, GeglWorkerError };
} else if (typeof window !== 'undefined') {
    window.GeglWorker = GeglWorker;
    window.GeglWorkerError = GeglWorkerError;
}