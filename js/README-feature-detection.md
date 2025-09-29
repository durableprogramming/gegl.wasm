# Feature Detection for GEGL WebAssembly

This module provides comprehensive browser feature detection for GEGL WebAssembly, ensuring compatibility and providing appropriate fallbacks for unsupported environments.

## Features

- **WebAssembly detection** with basic and SIMD support checking
- **Browser API detection** for Web Workers, SharedArrayBuffer, Atomics
- **Canvas and graphics API detection** for 2D and WebGL contexts
- **JavaScript language feature detection** for modern syntax support
- **Compatibility assessment** with detailed fallback strategies
- **Error handling** with descriptive messages for missing features

## Functions

### Core Detection Functions

#### `detectFeatures()`
Runs comprehensive feature detection and returns a `FeatureSupport` object.

```javascript
const support = await GeglFeatureDetection.detectFeatures();
console.log('WebAssembly supported:', support.webAssembly);
console.log('All features supported:', support.isFullySupported());
```

#### `isGeglCompatible(options?)`
Checks if the current environment can run GEGL WebAssembly.

```javascript
const compatible = await GeglFeatureDetection.isGeglCompatible({
    requireSIMD: false,
    requireWebWorkers: true,
    requireSharedArrayBuffer: false
});
```

#### `getCompatibilityError(support)`
Generates user-friendly error messages for missing features.

```javascript
if (!support.isFullySupported()) {
    const error = GeglFeatureDetection.getCompatibilityError(support);
    console.error(error);
}
```

### Individual Feature Detectors

#### `detectWebAssembly()`
Detects basic WebAssembly support.

#### `detectWebAssemblySIMD()`
Detects WebAssembly SIMD instruction support.

#### `detectWebWorkers()`
Detects Web Workers API support.

#### `detectSharedArrayBuffer()`
Detects SharedArrayBuffer support (requires cross-origin isolation).

#### `detectAtomics()`
Detects Atomics API for shared memory synchronization.

#### `detectCanvas2D()`
Detects HTML5 Canvas 2D context support.

#### `detectTypedArrays()`
Detects TypedArray support (ArrayBuffer, Uint8Array, etc.).

#### `detectWebGL()`
Detects WebGL context support.

#### `detectBigInt()`
Detects BigInt support.

#### `detectAsyncAwait()`
Detects async/await syntax support.

#### `detectPromises()`
Detects Promise API support.

## FeatureSupport Class

The `FeatureSupport` class provides methods to assess compatibility:

### Properties
- `webAssembly`: Basic WebAssembly support
- `webAssemblySIMD`: SIMD instruction support
- `webWorkers`: Web Workers API
- `sharedArrayBuffer`: SharedArrayBuffer support
- `atomics`: Atomics API
- `canvas2d`: Canvas 2D context
- `typedArrays`: TypedArray support
- `webGL`: WebGL context
- `bigInt`: BigInt support
- `asyncAwait`: Async/await syntax
- `promises`: Promise API
- `fallbacks`: Object with fallback strategies

### Methods

#### `isFullySupported()`
Returns true if all required features are supported.

#### `hasBasicSupport()`
Returns true if basic WebAssembly functionality is available.

#### `getMissingFeatures()`
Returns array of missing required features.

#### `getFallbackStrategy()`
Returns recommended fallback approach.

## Usage Examples

### Basic Compatibility Check

```html
<!DOCTYPE html>
<html>
<head>
    <title>GEGL Compatibility Check</title>
</head>
<body>
    <div id="status"></div>
    <script src="feature-detection.js"></script>
    <script>
        async function checkCompatibility() {
            const status = document.getElementById('status');

            try {
                const support = await GeglFeatureDetection.detectFeatures();

                if (support.isFullySupported()) {
                    status.textContent = '✓ Your browser fully supports GEGL WebAssembly!';
                    // Load GEGL module
                    loadGegl();
                } else {
                    const error = GeglFeatureDetection.getCompatibilityError(support);
                    status.textContent = `✗ ${error}`;
                    showFallbackOptions(support);
                }
            } catch (error) {
                status.textContent = `✗ Feature detection failed: ${error.message}`;
            }
        }

        function loadGegl() {
            // Load gegl-wrapper.js and initialize
            const script = document.createElement('script');
            script.src = 'gegl-wrapper.js';
            document.head.appendChild(script);
        }

        function showFallbackOptions(support) {
            const missing = support.getMissingFeatures();
            console.log('Missing features:', missing);
            console.log('Fallback strategy:', support.getFallbackStrategy());
        }

        checkCompatibility();
    </script>
</body>
</html>
```

### Advanced Feature Checking

```javascript
async function advancedCheck() {
    const support = await GeglFeatureDetection.detectFeatures();

    console.log('=== Feature Support Report ===');
    console.log(`WebAssembly: ${support.webAssembly}`);
    console.log(`SIMD Support: ${support.webAssemblySIMD}`);
    console.log(`Web Workers: ${support.webWorkers}`);
    console.log(`Shared Memory: ${support.sharedArrayBuffer}`);

    // Check for specific GEGL requirements
    const geglCompatible = await GeglFeatureDetection.isGeglCompatible({
        requireSIMD: false,  // SIMD is optional for basic operations
        requireWebWorkers: true,  // Workers needed for off-main-thread processing
        requireSharedArrayBuffer: false  // Optional for performance
    });

    if (geglCompatible) {
        console.log('✓ Ready for GEGL WebAssembly');
    } else {
        console.log('✗ GEGL WebAssembly not supported');
        console.log('Fallback:', support.getFallbackStrategy());
    }
}
```

### Progressive Enhancement

```javascript
async function loadGeglWithFallback() {
    const support = await GeglFeatureDetection.detectFeatures();

    if (support.hasBasicSupport()) {
        // Load WebAssembly version
        await loadWebAssemblyGegl();
    } else if (support.canvas2d && support.typedArrays) {
        // Fallback to JavaScript-only canvas processing
        await loadCanvasFallback();
    } else {
        // Ultimate fallback: server-side processing
        showServerProcessingMessage();
    }
}
```

## Error Handling

All functions throw `FeatureDetectionError` for detection failures:

```javascript
try {
    const support = await GeglFeatureDetection.detectFeatures();
} catch (error) {
    if (error instanceof GeglFeatureDetection.FeatureDetectionError) {
        console.error('Feature detection failed:', error.message);
        // Provide manual fallback
    }
}
```

## Browser Support Matrix

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| WebAssembly | 57+ | 52+ | 11+ | 16+ |
| SIMD | 91+ | 89+ | 16.4+ | 91+ |
| Web Workers | 4+ | 3.5+ | 4+ | 12+ |
| SharedArrayBuffer* | 68+ | 79+ | 16.4+ | 79+ |
| Atomics | 68+ | 57+ | 10.1+ | 12+ |
| Canvas 2D | 4+ | 3.5+ | 3.1+ | 12+ |
| Typed Arrays | 7+ | 4+ | 5.1+ | 12+ |
| WebGL | 9+ | 4+ | 5.1+ | 12+ |
| BigInt | 67+ | 68+ | 14+ | 79+ |
| Async/Await | 55+ | 52+ | 11+ | 79+ |
| Promises | 33+ | 29+ | 8+ | 12+ |

*SharedArrayBuffer requires cross-origin isolation headers.

## Performance Considerations

- Feature detection is cached after first run
- Individual detectors are lightweight and fast
- WebAssembly SIMD detection may have small performance impact
- Canvas and WebGL detection create temporary elements

## Dependencies

- Modern JavaScript environment (ES6+)
- Browser environment (not supported in Node.js for all features)

## Testing

Run the test suite in a browser:

```javascript
// Load in browser console after loading feature-detection.js
// The test will run automatically on page load
```

See `test-feature-detection.js` for comprehensive tests and examples.

## Integration with GEGL

This module is designed to be used before loading GEGL WebAssembly:

```javascript
// Check compatibility first
const compatible = await GeglFeatureDetection.isGeglCompatible();
if (!compatible) {
    // Show user-friendly error or fallback
    return;
}

// Safe to load GEGL
import { Gegl } from './gegl-wrapper.js';
await Gegl.init();
```