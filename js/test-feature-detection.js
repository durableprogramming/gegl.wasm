/**
 * Test/demo for feature detection utilities
 * This demonstrates usage of the feature-detection.js functions
 */

// Test functions
async function testFeatureDetection() {
    console.log('Testing GEGL feature detection...');

    try {
        // Run comprehensive feature detection
        const support = await GeglFeatureDetection.detectFeatures();

        console.log('\n=== Feature Detection Results ===');
        console.log(`WebAssembly: ${support.webAssembly ? '✓' : '✗'}`);
        console.log(`WebAssembly SIMD: ${support.webAssemblySIMD ? '✓' : '✗'}`);
        console.log(`Web Workers: ${support.webWorkers ? '✓' : '✗'}`);
        console.log(`SharedArrayBuffer: ${support.sharedArrayBuffer ? '✓' : '✗'}`);
        console.log(`Atomics: ${support.atomics ? '✓' : '✗'}`);
        console.log(`Canvas 2D: ${support.canvas2d ? '✓' : '✗'}`);
        console.log(`Typed Arrays: ${support.typedArrays ? '✓' : '✗'}`);
        console.log(`WebGL: ${support.webGL ? '✓' : '✗'}`);
        console.log(`BigInt: ${support.bigInt ? '✓' : '✗'}`);
        console.log(`Async/Await: ${support.asyncAwait ? '✓' : '✗'}`);
        console.log(`Promises: ${support.promises ? '✓' : '✗'}`);

        console.log('\n=== Compatibility Assessment ===');
        console.log(`Fully Supported: ${support.isFullySupported() ? '✓' : '✗'}`);
        console.log(`Basic Support: ${support.hasBasicSupport() ? '✓' : '✗'}`);

        const missing = support.getMissingFeatures();
        if (missing.length > 0) {
            console.log(`Missing Features: ${missing.join(', ')}`);
        } else {
            console.log('All required features supported!');
        }

        console.log(`Fallback Strategy: ${support.getFallbackStrategy()}`);

        // Test compatibility check
        const isCompatible = await GeglFeatureDetection.isGeglCompatible();
        console.log(`\nGEGL Compatible: ${isCompatible ? '✓' : '✗'}`);

        if (!isCompatible) {
            const error = GeglFeatureDetection.getCompatibilityError(support);
            console.log(`Compatibility Error: ${error}`);
        }

    } catch (error) {
        console.error('✗ Feature detection test failed:', error.message);
    }
}

function testIndividualDetectors() {
    console.log('\n=== Testing Individual Detectors ===');

    const detectors = [
        { name: 'WebAssembly', func: GeglFeatureDetection.detectWebAssembly },
        { name: 'WebAssembly SIMD', func: GeglFeatureDetection.detectWebAssemblySIMD },
        { name: 'Web Workers', func: GeglFeatureDetection.detectWebWorkers },
        { name: 'SharedArrayBuffer', func: GeglFeatureDetection.detectSharedArrayBuffer },
        { name: 'Atomics', func: GeglFeatureDetection.detectAtomics },
        { name: 'Canvas 2D', func: GeglFeatureDetection.detectCanvas2D },
        { name: 'Typed Arrays', func: GeglFeatureDetection.detectTypedArrays },
        { name: 'WebGL', func: GeglFeatureDetection.detectWebGL },
        { name: 'BigInt', func: GeglFeatureDetection.detectBigInt },
        { name: 'Async/Await', func: GeglFeatureDetection.detectAsyncAwait },
        { name: 'Promises', func: GeglFeatureDetection.detectPromises }
    ];

    for (const detector of detectors) {
        try {
            const result = detector.func();
            console.log(`${detector.name}: ${result ? '✓' : '✗'}`);
        } catch (error) {
            console.log(`${detector.name}: ✗ (Error: ${error.message})`);
        }
    }
}

function testErrorHandling() {
    console.log('\n=== Testing Error Handling ===');

    try {
        // Test FeatureSupport methods
        const support = new GeglFeatureDetection.FeatureSupport();

        // Test with no features supported
        console.log('Testing with no features:');
        console.log(`Fully supported: ${support.isFullySupported()}`);
        console.log(`Basic support: ${support.hasBasicSupport()}`);
        console.log(`Missing features: ${support.getMissingFeatures().join(', ')}`);
        console.log(`Fallback strategy: ${support.getFallbackStrategy()}`);

        // Test error message generation
        const error = GeglFeatureDetection.getCompatibilityError(support);
        console.log(`Error message: ${error}`);

        console.log('✓ Error handling tests passed');

    } catch (error) {
        console.error('✗ Error handling test failed:', error.message);
    }
}

// Run tests when script loads
if (typeof window !== 'undefined') {
    // Browser environment
    window.addEventListener('load', async () => {
        await testFeatureDetection();
        testIndividualDetectors();
        testErrorHandling();
        console.log('\n=== Feature Detection Tests Complete ===');
    });
} else {
    // Node.js environment (limited testing)
    console.log('Running feature detection tests in Node.js environment...');
    console.log('Note: Some features may not be available in Node.js context');

    testIndividualDetectors();
    testErrorHandling();
    console.log('\n=== Feature Detection Tests Complete ===');
}