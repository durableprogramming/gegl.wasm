/**
 * Feature detection utilities for GEGL WebAssembly
 * Detects browser capabilities required for GEGL operations with fallbacks
 */

class FeatureDetectionError extends Error {
    constructor(message, feature = null) {
        super(message);
        this.name = 'FeatureDetectionError';
        this.feature = feature;
    }
}

/**
 * Feature detection results
 */
class FeatureSupport {
    constructor() {
        this.webAssembly = false;
        this.webAssemblySIMD = false;
        this.webWorkers = false;
        this.sharedArrayBuffer = false;
        this.atomics = false;
        this.canvas2d = false;
        this.typedArrays = false;
        this.webGL = false;
        this.bigInt = false;
        this.asyncAwait = false;
        this.promises = false;

        // Fallback capabilities
        this.fallbacks = {
            webAssembly: null,
            webWorkers: null,
            sharedArrayBuffer: null
        };
    }

    /**
     * Check if all required features are supported
     * @returns {boolean}
     */
    isFullySupported() {
        return this.webAssembly &&
               this.webWorkers &&
               this.canvas2d &&
               this.typedArrays &&
               this.asyncAwait &&
               this.promises;
    }

    /**
     * Check if basic WebAssembly support is available
     * @returns {boolean}
     */
    hasBasicSupport() {
        return this.webAssembly &&
               this.typedArrays &&
               this.asyncAwait &&
               this.promises;
    }

    /**
     * Get list of missing features
     * @returns {Array<string>}
     */
    getMissingFeatures() {
        const missing = [];
        const required = ['webAssembly', 'webWorkers', 'canvas2d', 'typedArrays', 'asyncAwait', 'promises'];

        for (const feature of required) {
            if (!this[feature]) {
                missing.push(feature);
            }
        }

        return missing;
    }

    /**
     * Get recommended fallback strategy
     * @returns {string}
     */
    getFallbackStrategy() {
        if (!this.webAssembly) {
            return 'Use server-side processing or alternative image processing library';
        }
        if (!this.webWorkers) {
            return 'Use synchronous processing on main thread (may block UI)';
        }
        if (!this.canvas2d) {
            return 'Use alternative rendering method or server-side processing';
        }
        return 'All features supported - no fallback needed';
    }
}

/**
 * Detect WebAssembly support
 * @returns {boolean}
 */
function detectWebAssembly() {
    try {
        if (typeof WebAssembly !== 'object' || typeof WebAssembly.instantiate !== 'function') {
            return false;
        }

        // Test basic instantiation
        const module = new WebAssembly.Module(new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]));
        if (!(module instanceof WebAssembly.Module)) {
            return false;
        }

        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Detect WebAssembly SIMD support
 * @returns {boolean}
 */
function detectWebAssemblySIMD() {
    try {
        // Check for SIMD support via WebAssembly features
        if (typeof WebAssembly !== 'object') {
            return false;
        }

        // Try to create a SIMD module (this will fail in browsers without SIMD)
        const simdModule = new Uint8Array([
            0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b, 0x03,
            0x02, 0x01, 0x00, 0x07, 0x08, 0x01, 0x04, 0x74, 0x65, 0x73, 0x74, 0x00, 0x00, 0x0a, 0x0a, 0x01,
            0x08, 0x00, 0xfd, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x0b
        ]);

        return WebAssembly.validate(simdModule);
    } catch (e) {
        return false;
    }
}

/**
 * Detect Web Workers support
 * @returns {boolean}
 */
function detectWebWorkers() {
    return typeof Worker === 'function' &&
           typeof window !== 'undefined' &&
           typeof window.Worker === 'function';
}

/**
 * Detect SharedArrayBuffer support
 * @returns {boolean}
 */
function detectSharedArrayBuffer() {
    try {
        return typeof SharedArrayBuffer === 'function';
    } catch (e) {
        return false;
    }
}

/**
 * Detect Atomics API support
 * @returns {boolean}
 */
function detectAtomics() {
    try {
        return typeof Atomics === 'object' &&
               typeof Atomics.load === 'function' &&
               typeof Atomics.store === 'function';
    } catch (e) {
        return false;
    }
}

/**
 * Detect Canvas 2D context support
 * @returns {boolean}
 */
function detectCanvas2D() {
    try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext && canvas.getContext('2d'));
    } catch (e) {
        return false;
    }
}

/**
 * Detect Typed Arrays support
 * @returns {boolean}
 */
function detectTypedArrays() {
    try {
        return typeof ArrayBuffer === 'function' &&
               typeof Uint8Array === 'function' &&
               typeof Uint32Array === 'function' &&
               typeof Float32Array === 'function';
    } catch (e) {
        return false;
    }
}

/**
 * Detect WebGL support
 * @returns {boolean}
 */
function detectWebGL() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!gl;
    } catch (e) {
        return false;
    }
}

/**
 * Detect BigInt support
 * @returns {boolean}
 */
function detectBigInt() {
    try {
        return typeof BigInt === 'function';
    } catch (e) {
        return false;
    }
}

/**
 * Detect async/await support
 * @returns {boolean}
 */
function detectAsyncAwait() {
    try {
        // Test async function syntax
        new Function('return (async function() { return await Promise.resolve(true); })()')();
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Detect Promises support
 * @returns {boolean}
 */
function detectPromises() {
    try {
        return typeof Promise === 'function' &&
               typeof Promise.resolve === 'function' &&
               typeof Promise.reject === 'function' &&
               typeof Promise.all === 'function';
    } catch (e) {
        return false;
    }
}

/**
 * Run comprehensive feature detection
 * @returns {Promise<FeatureSupport>} Feature support results
 */
async function detectFeatures() {
    const support = new FeatureSupport();

    // Detect basic features
    support.webAssembly = detectWebAssembly();
    support.webAssemblySIMD = detectWebAssemblySIMD();
    support.webWorkers = detectWebWorkers();
    support.sharedArrayBuffer = detectSharedArrayBuffer();
    support.atomics = detectAtomics();
    support.canvas2d = detectCanvas2D();
    support.typedArrays = detectTypedArrays();
    support.webGL = detectWebGL();
    support.bigInt = detectBigInt();
    support.asyncAwait = detectAsyncAwait();
    support.promises = detectPromises();

    // Set fallback strategies
    if (!support.webAssembly) {
        support.fallbacks.webAssembly = 'Server-side processing required';
    }

    if (!support.webWorkers) {
        support.fallbacks.webWorkers = 'Synchronous main-thread processing';
    }

    if (!support.sharedArrayBuffer) {
        support.fallbacks.sharedArrayBuffer = 'Copy-based data transfer (slower)';
    }

    return support;
}

/**
 * Check if the current environment can run GEGL WebAssembly
 * @param {Object} [options] - Detection options
 * @param {boolean} [options.requireSIMD=false] - Require SIMD support
 * @param {boolean} [options.requireWebWorkers=true] - Require Web Workers
 * @param {boolean} [options.requireSharedArrayBuffer=false] - Require SharedArrayBuffer
 * @returns {Promise<boolean>} True if compatible
 */
async function isGeglCompatible(options = {}) {
    const {
        requireSIMD = false,
        requireWebWorkers = true,
        requireSharedArrayBuffer = false
    } = options;

    const support = await detectFeatures();

    return support.webAssembly &&
           support.typedArrays &&
           support.asyncAwait &&
           support.promises &&
           support.canvas2d &&
           (!requireSIMD || support.webAssemblySIMD) &&
           (!requireWebWorkers || support.webWorkers) &&
           (!requireSharedArrayBuffer || support.sharedArrayBuffer);
}

/**
 * Get user-friendly error message for missing features
 * @param {FeatureSupport} support - Feature support results
 * @returns {string} Error message
 */
function getCompatibilityError(support) {
    const missing = support.getMissingFeatures();

    if (missing.length === 0) {
        return null;
    }

    const featureNames = {
        webAssembly: 'WebAssembly',
        webWorkers: 'Web Workers',
        canvas2d: 'Canvas 2D API',
        typedArrays: 'Typed Arrays',
        asyncAwait: 'Async/Await',
        promises: 'Promises'
    };

    const missingNames = missing.map(feature => featureNames[feature] || feature);

    return `Your browser is missing required features: ${missingNames.join(', ')}. ${support.getFallbackStrategy()}`;
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FeatureDetectionError,
        FeatureSupport,
        detectFeatures,
        isGeglCompatible,
        getCompatibilityError,
        // Individual detectors for testing
        detectWebAssembly,
        detectWebAssemblySIMD,
        detectWebWorkers,
        detectSharedArrayBuffer,
        detectAtomics,
        detectCanvas2D,
        detectTypedArrays,
        detectWebGL,
        detectBigInt,
        detectAsyncAwait,
        detectPromises
    };
} else if (typeof window !== 'undefined') {
    window.GeglFeatureDetection = {
        FeatureDetectionError,
        FeatureSupport,
        detectFeatures,
        isGeglCompatible,
        getCompatibilityError,
        // Individual detectors for testing
        detectWebAssembly,
        detectWebAssemblySIMD,
        detectWebWorkers,
        detectSharedArrayBuffer,
        detectAtomics,
        detectCanvas2D,
        detectTypedArrays,
        detectWebGL,
        detectBigInt,
        detectAsyncAwait,
        detectPromises
    };
}