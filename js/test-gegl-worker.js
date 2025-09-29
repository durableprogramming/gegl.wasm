/**
 * Tests for GEGL Web Worker functionality
 * Demonstrates usage and verifies correct operation
 */

// Mock browser environment check
if (typeof window === 'undefined') {
    console.log('This test is designed for browser environment with Web Workers');
    console.log('To run this test, load it in a browser with the GEGL WebAssembly module loaded');
    process.exit(0);
}

// Test utilities
function createTestImageData(width, height) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.floor(Math.random() * 255);     // R
        data[i + 1] = Math.floor(Math.random() * 255); // G
        data[i + 2] = Math.floor(Math.random() * 255); // B
        data[i + 3] = 255;                             // A
    }
    return new ImageData(data, width, height);
}

function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

// Test functions
async function testWorkerInitialization() {
    console.log('Testing worker initialization...');

    try {
        const worker = new GeglWorker();

        await worker.init();
        console.log('✓ Worker initialized successfully');

        worker.cleanup();
        console.log('✓ Worker cleanup successful');

    } catch (error) {
        console.error('✗ Worker initialization test failed:', error.message);
    }
}

async function testBasicImageProcessing() {
    console.log('Testing basic image processing...');

    try {
        const worker = new GeglWorker();
        await worker.init();

        // Create test image
        const testImage = createTestImageData(10, 10);

        // Simple operation: invert colors
        const operations = [{
            operation: 'gegl:invert'
        }];

        const result = await worker.process(testImage, operations);

        // Verify result
        if (result.width === 10 && result.height === 10) {
            console.log('✓ Basic processing successful');
        } else {
            console.error('✗ Result dimensions incorrect');
        }

        worker.cleanup();

    } catch (error) {
        console.error('✗ Basic processing test failed:', error.message);
    }
}

async function testProgressReporting() {
    console.log('Testing progress reporting...');

    try {
        const worker = new GeglWorker();
        await worker.init();

        // Create larger test image for meaningful progress
        const testImage = createTestImageData(100, 100);

        // Complex operation chain
        const operations = [
            { operation: 'gegl:blur-gaussian', properties: { std_dev_x: 5, std_dev_y: 5 } },
            { operation: 'gegl:brightness-contrast', properties: { brightness: 0.1, contrast: 1.2 } },
            { operation: 'gegl:invert' }
        ];

        let progressUpdates = [];
        worker.setProgressCallback((progress) => {
            progressUpdates.push(progress);
        });

        const result = await worker.process(testImage, operations);

        if (progressUpdates.length > 0) {
            console.log(`✓ Progress reporting successful (${progressUpdates.length} updates)`);
        } else {
            console.log('⚠ No progress updates received (may be expected for fast operations)');
        }

        worker.cleanup();

    } catch (error) {
        console.error('✗ Progress reporting test failed:', error.message);
    }
}

async function testCancellation() {
    console.log('Testing cancellation...');

    try {
        const worker = new GeglWorker();
        await worker.init();

        // Create large test image
        const testImage = createTestImageData(200, 200);

        // Complex operations that take time
        const operations = [
            { operation: 'gegl:blur-gaussian', properties: { std_dev_x: 10, std_dev_y: 10 } },
            { operation: 'gegl:brightness-contrast', properties: { brightness: 0.2, contrast: 1.5 } },
            { operation: 'gegl:unsharp-mask', properties: { std_dev: 5, scale: 2 } }
        ];

        // Start processing
        const processPromise = worker.process(testImage, operations);

        // Cancel after a short delay
        setTimeout(() => {
            worker.cancel();
        }, 100);

        try {
            await processPromise;
            console.log('⚠ Processing completed before cancellation (may be expected for fast operations)');
        } catch (error) {
            if (error.code === 'CANCELLED') {
                console.log('✓ Cancellation successful');
            } else {
                console.error('✗ Unexpected error during cancellation:', error.message);
            }
        }

        worker.cleanup();

    } catch (error) {
        console.error('✗ Cancellation test failed:', error.message);
    }
}

async function testOperationChaining() {
    console.log('Testing operation chaining...');

    try {
        const worker = new GeglWorker();
        await worker.init();

        // Create test image with known pattern
        const testImage = createTestImageData(20, 20);

        // Chain multiple operations
        const operations = [
            { operation: 'gegl:brightness-contrast', properties: { brightness: -0.5, contrast: 2.0 } },
            { operation: 'gegl:saturation', properties: { scale: 0.5 } },
            { operation: 'gegl:blur-gaussian', properties: { std_dev_x: 2, std_dev_y: 2 } }
        ];

        const result = await worker.process(testImage, operations);

        // Verify result exists and has correct dimensions
        if (result && result.width === 20 && result.height === 20 && result.data.length === 20 * 20 * 4) {
            console.log('✓ Operation chaining successful');
        } else {
            console.error('✗ Operation chaining failed - invalid result');
        }

        worker.cleanup();

    } catch (error) {
        console.error('✗ Operation chaining test failed:', error.message);
    }
}

async function testErrorHandling() {
    console.log('Testing error handling...');

    try {
        const worker = new GeglWorker();
        await worker.init();

        // Test with invalid operations
        const testImage = createTestImageData(10, 10);
        const invalidOperations = [{
            operation: 'invalid:operation'
        }];

        try {
            await worker.process(testImage, invalidOperations);
            console.error('✗ Should have thrown error for invalid operation');
        } catch (error) {
            console.log('✓ Error handling successful for invalid operation');
        }

        worker.cleanup();

    } catch (error) {
        console.error('✗ Error handling test failed:', error.message);
    }
}

// Run all tests
async function runTests() {
    if (typeof GeglWorker === 'undefined') {
        console.error('GeglWorker not loaded. Make sure to load gegl-worker-wrapper.js first.');
        return;
    }

    console.log('Running GEGL Worker Tests...');
    console.log('==============================');

    await testWorkerInitialization();
    await testBasicImageProcessing();
    await testProgressReporting();
    await testCancellation();
    await testOperationChaining();
    await testErrorHandling();

    console.log('==============================');
    console.log('Tests completed');
}

// Export for manual testing
if (typeof window !== 'undefined') {
    window.testGeglWorker = runTests;
    console.log('GEGL Worker test loaded. Call testGeglWorker() to run tests.');
}