/**
 * Memory leak detection test for GEGL WebAssembly
 * Processes many images and monitors for memory growth indicating leaks
 */

// Mock browser environment check
if (typeof window === 'undefined') {
    console.log('This test is designed for browser environment with WebAssembly');
    console.log('To run this test, load it in a browser with the GEGL WebAssembly module loaded');
    process.exit(0);
}

// Test utilities
function createTestImageData(width, height, fillColor = [255, 0, 0, 255]) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
        data[i] = fillColor[0];     // R
        data[i + 1] = fillColor[1]; // G
        data[i + 2] = fillColor[2]; // B
        data[i + 3] = fillColor[3]; // A
    }
    return new ImageData(data, width, height);
}

function createGradientImageData(width, height) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            data[index] = Math.floor((x / width) * 255);     // R gradient
            data[index + 1] = Math.floor((y / height) * 255); // G gradient
            data[index + 2] = 128;                            // B constant
            data[index + 3] = 255;                            // A
        }
    }
    return new ImageData(data, width, height);
}

function createCheckerboardImageData(width, height, size = 4) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            const isBlack = ((x / size) % 2) ^ ((y / size) % 2);
            data[index] = isBlack ? 0 : 255;     // R
            data[index + 1] = isBlack ? 0 : 255; // G
            data[index + 2] = isBlack ? 0 : 255; // B
            data[index + 3] = 255;               // A
        }
    }
    return new ImageData(data, width, height);
}

// Memory leak test functions
async function testMemoryLeakDetection() {
    console.log('Testing memory leak detection...');

    if (typeof GeglWorker === 'undefined') {
        console.error('GeglWorker not available');
        return false;
    }

    if (typeof memoryProfiler === 'undefined') {
        console.error('MemoryProfiler not available');
        return false;
    }

    const worker = new GeglWorker();
    await worker.init();

    let successCount = 0;
    const totalTests = 3;

    try {
        // Test 1: Process many images with memory monitoring
        console.log('  Testing image processing with memory monitoring...');
        const result1 = await testImageProcessingMemoryLeak(worker, 50, 'basic');
        if (result1) successCount++;

        // Test 2: Process images with complex operations
        console.log('  Testing complex operations with memory monitoring...');
        const result2 = await testImageProcessingMemoryLeak(worker, 30, 'complex');
        if (result2) successCount++;

        // Test 3: Buffer creation and cleanup test
        console.log('  Testing buffer lifecycle memory management...');
        const result3 = await testBufferMemoryLeak();
        if (result3) successCount++;

    } catch (error) {
        console.error('✗ Memory leak test failed:', error.message);
    }

    worker.cleanup();
    console.log(`✓ Memory leak detection: ${successCount}/${totalTests} tests passed`);
    return successCount === totalTests;
}

async function testImageProcessingMemoryLeak(worker, imageCount, complexity) {
    try {
        // Start memory profiling
        memoryProfiler.clear();
        memoryProfiler.start({ sampleInterval: 500, trackObjects: true });

        const operations = complexity === 'complex' ? [
            { operation: 'gegl:brightness-contrast', properties: { brightness: 0.2, contrast: 0.5 } },
            { operation: 'gegl:gaussian-blur', properties: { 'std-dev-x': 2.0, 'std-dev-y': 2.0 } },
            { operation: 'gegl:add', properties: { value: 10 } },
            { operation: 'gegl:multiply', properties: { value: 1.1 } }
        ] : [
            { operation: 'gegl:brightness-contrast', properties: { brightness: 0.1, contrast: 0.2 } },
            { operation: 'gegl:box-blur', properties: { radius: 1 } }
        ];

        console.log(`    Processing ${imageCount} images with ${complexity} operations...`);

        // Process images
        for (let i = 0; i < imageCount; i++) {
            let inputImage;
            if (i % 3 === 0) {
                inputImage = createGradientImageData(64, 64);
            } else if (i % 3 === 1) {
                inputImage = createCheckerboardImageData(64, 64);
            } else {
                inputImage = createTestImageData(64, 64, [i * 5 % 256, i * 10 % 256, i * 15 % 256, 255]);
            }

            const result = await worker.process(inputImage, operations);

            if (!result || result.width !== 64 || result.height !== 64) {
                console.error(`    ✗ Failed to process image ${i}`);
                return false;
            }

            // Small delay to allow memory monitoring
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Stop profiling and analyze
        memoryProfiler.stop();
        const report = memoryProfiler.getReport();

        console.log(`    ✓ Processed ${imageCount} images successfully`);

        // Analyze memory usage
        const analysis = analyzeMemoryReport(report, imageCount);
        if (analysis.hasLeak) {
            console.error(`    ✗ Memory leak detected: ${analysis.message}`);
            return false;
        } else {
            console.log(`    ✓ No memory leaks detected: ${analysis.message}`);
            return true;
        }

    } catch (error) {
        console.error('✗ Image processing memory leak test failed:', error.message);
        return false;
    }
}

async function testBufferMemoryLeak() {
    try {
        if (typeof CanvasUtils === 'undefined') {
            console.log('    ⚠ CanvasUtils not available, skipping buffer test');
            return true;
        }

        memoryProfiler.clear();
        memoryProfiler.start({ sampleInterval: 200, trackObjects: true });

        const buffers = [];
        const iterations = 100;

        console.log(`    Creating and destroying ${iterations} buffers...`);

        // Create many buffers
        for (let i = 0; i < iterations; i++) {
            const imageData = createTestImageData(32, 32, [i % 256, (i * 2) % 256, (i * 3) % 256, 255]);
            const buffer = CanvasUtils.imageDataToGeglBuffer(imageData);

            buffers.push(buffer);

            // Small delay
            await new Promise(resolve => setTimeout(resolve, 5));
        }

        // Clear references (simulate cleanup)
        buffers.length = 0;

        // Force garbage collection if available
        if (window.gc) {
            window.gc();
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        memoryProfiler.stop();
        const report = memoryProfiler.getReport();

        console.log('    ✓ Buffer lifecycle test completed');

        // Analyze memory usage
        const analysis = analyzeMemoryReport(report, iterations);
        if (analysis.hasLeak) {
            console.error(`    ✗ Buffer memory leak detected: ${analysis.message}`);
            return false;
        } else {
            console.log(`    ✓ Buffer memory management OK: ${analysis.message}`);
            return true;
        }

    } catch (error) {
        console.error('✗ Buffer memory leak test failed:', error.message);
        return false;
    }
}

function analyzeMemoryReport(report, operationCount) {
    const analysis = {
        hasLeak: false,
        message: '',
        details: {}
    };

    if (report.history.length < 3) {
        analysis.message = 'Insufficient data for analysis';
        return analysis;
    }

    const first = report.history[0];
    const last = report.history[report.history.length - 1];

    // Check JavaScript heap growth
    const jsHeapGrowth = last.jsMemory.usedJSHeapSize - first.jsMemory.usedJSHeapSize;
    const jsGrowthRate = jsHeapGrowth / operationCount;

    // Check WebAssembly heap growth
    const wasmHeapGrowth = last.wasmMemory.heapSize - first.wasmMemory.heapSize;
    const wasmGrowthRate = wasmHeapGrowth / operationCount;

    // Check object counts
    const objectGrowth = {
        buffers: last.objectCounts.buffers - first.objectCounts.buffers,
        nodes: last.objectCounts.nodes - first.objectCounts.nodes,
        processors: last.objectCounts.processors - first.objectCounts.processors,
        colors: last.objectCounts.colors - first.objectCounts.colors
    };

    analysis.details = {
        jsHeapGrowth,
        jsGrowthRate,
        wasmHeapGrowth,
        wasmGrowthRate,
        objectGrowth,
        operationCount
    };

    // Define leak thresholds (adjust based on expected behavior)
    const jsLeakThreshold = 1024 * 1024; // 1MB total growth
    const wasmLeakThreshold = 512 * 1024; // 512KB total growth
    const objectLeakThreshold = 10; // 10 objects remaining

    if (jsHeapGrowth > jsLeakThreshold) {
        analysis.hasLeak = true;
        analysis.message = `JS heap grew by ${(jsHeapGrowth / 1024 / 1024).toFixed(2)}MB (${(jsGrowthRate / 1024).toFixed(2)}KB per operation)`;
    } else if (wasmHeapGrowth > wasmLeakThreshold) {
        analysis.hasLeak = true;
        analysis.message = `WASM heap grew by ${(wasmHeapGrowth / 1024).toFixed(2)}KB (${(wasmGrowthRate / 1024).toFixed(2)}KB per operation)`;
    } else if (objectGrowth.buffers > objectLeakThreshold || objectGrowth.nodes > objectLeakThreshold) {
        analysis.hasLeak = true;
        analysis.message = `Objects not cleaned up: ${objectGrowth.buffers} buffers, ${objectGrowth.nodes} nodes remaining`;
    } else {
        analysis.message = `Memory usage stable: JS ${(jsGrowthRate / 1024).toFixed(2)}KB/op, WASM ${(wasmGrowthRate / 1024).toFixed(2)}KB/op`;
    }

    return analysis;
}

async function testMemoryLeakWithCleanup() {
    console.log('Testing memory leak detection with explicit cleanup...');

    if (typeof GeglWorker === 'undefined' || typeof memoryProfiler === 'undefined') {
        console.log('⚠ Required modules not available, skipping cleanup test');
        return true;
    }

    try {
        memoryProfiler.clear();
        memoryProfiler.start({ sampleInterval: 1000, trackObjects: true });

        const worker = new GeglWorker();
        await worker.init();

        // Process images with explicit cleanup
        for (let i = 0; i < 20; i++) {
            const inputImage = createGradientImageData(128, 128);
            const operations = [
                { operation: 'gegl:gaussian-blur', properties: { 'std-dev-x': 3, 'std-dev-y': 3 } },
                { operation: 'gegl:brightness-contrast', properties: { brightness: 0.1, contrast: 0.2 } }
            ];

            const result = await worker.process(inputImage, operations);

            if (!result) {
                console.error('✗ Failed to process image in cleanup test');
                return false;
            }

            // Force cleanup between operations
            if (window.gc) {
                window.gc();
            }
        }

        worker.cleanup();
        memoryProfiler.stop();

        const report = memoryProfiler.getReport();
        const analysis = analyzeMemoryReport(report, 20);

        if (analysis.hasLeak) {
            console.error(`✗ Memory leak with cleanup: ${analysis.message}`);
            return false;
        } else {
            console.log(`✓ Memory management with cleanup OK: ${analysis.message}`);
            return true;
        }

    } catch (error) {
        console.error('✗ Memory leak cleanup test failed:', error.message);
        return false;
    }
}

// Performance baseline test
async function testMemoryBaseline() {
    console.log('Testing memory baseline (no operations)...');

    if (typeof memoryProfiler === 'undefined') {
        console.log('⚠ MemoryProfiler not available, skipping baseline test');
        return true;
    }

    try {
        memoryProfiler.clear();
        memoryProfiler.start({ sampleInterval: 500, trackObjects: true });

        // Wait for baseline measurement
        await new Promise(resolve => setTimeout(resolve, 3000));

        memoryProfiler.stop();
        const report = memoryProfiler.getReport();

        if (report.history.length > 0) {
            const last = report.history[report.history.length - 1];
            console.log(`✓ Baseline memory: JS ${(last.jsMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB, WASM ${(last.wasmMemory.heapSize / 1024).toFixed(2)}KB`);
            return true;
        } else {
            console.error('✗ No baseline data collected');
            return false;
        }

    } catch (error) {
        console.error('✗ Memory baseline test failed:', error.message);
        return false;
    }
}

// Run all memory leak tests
async function runTests() {
    if (typeof GeglBuffer === 'undefined') {
        console.error('GeglBuffer not loaded. Make sure to load gegl-wrapper.js and the WebAssembly module first.');
        return;
    }

    console.log('Running GEGL WebAssembly Memory Leak Tests...');
    console.log('================================================');

    let overallSuccess = true;

    // Run baseline test first
    const baselineResult = await testMemoryBaseline();
    overallSuccess = overallSuccess && baselineResult;

    // Run main memory leak tests
    const leakResult = await testMemoryLeakDetection();
    overallSuccess = overallSuccess && leakResult;

    // Run cleanup test
    const cleanupResult = await testMemoryLeakWithCleanup();
    overallSuccess = overallSuccess && cleanupResult;

    console.log('================================================');
    if (overallSuccess) {
        console.log('✓ All memory leak tests passed');
    } else {
        console.log('✗ Some memory leak tests failed');
    }
}

// Export for manual testing
if (typeof window !== 'undefined') {
    window.testMemoryLeaks = runTests;
    console.log('GEGL Memory Leak test loaded. Call testMemoryLeaks() to run tests.');
}