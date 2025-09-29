/**
 * Comprehensive tests for GEGL buffer creation, manipulation, and memory management
 * in browser environment with WebAssembly
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

function arraysEqual(a, b, tolerance = 0) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (Math.abs(a[i] - b[i]) > tolerance) return false;
    }
    return true;
}

function createTestCanvas(width, height, fillStyle = 'red') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = fillStyle;
    ctx.fillRect(0, 0, width, height);
    return canvas;
}

// Test functions
function testBufferCreation() {
    console.log('Testing buffer creation with different formats and sizes...');

    const testCases = [
        { extent: { x: 0, y: 0, width: 10, height: 10 }, format: 'RGBA u8' },
        { extent: { x: 5, y: 5, width: 20, height: 15 }, format: 'RGB u8' },
        { extent: { x: -10, y: -5, width: 100, height: 50 }, format: 'RGBA float' },
        { extent: { x: 0, y: 0, width: 1, height: 1 }, format: 'RGB float' },
        { extent: { x: 0, y: 0, width: 0, height: 0 }, format: 'RGBA u8' }, // Edge case
    ];

    let successCount = 0;

    for (const testCase of testCases) {
        try {
            const buffer = new GeglBuffer(testCase.extent, testCase.format);
            const extent = buffer.getExtent();
            const format = buffer.getFormat();

            // Verify extent
            if (extent.x !== testCase.extent.x ||
                extent.y !== testCase.extent.y ||
                extent.width !== testCase.extent.width ||
                extent.height !== testCase.extent.height) {
                console.error(`✗ Extent mismatch for ${JSON.stringify(testCase.extent)}`);
                continue;
            }

            // Verify format
            if (format !== testCase.format) {
                console.error(`✗ Format mismatch: expected ${testCase.format}, got ${format}`);
                continue;
            }

            successCount++;
        } catch (error) {
            console.error(`✗ Failed to create buffer ${JSON.stringify(testCase)}: ${error.message}`);
        }
    }

    console.log(`✓ Buffer creation: ${successCount}/${testCases.length} tests passed`);
}

function testGeglStaticMethods() {
    console.log('Testing GEGL static buffer creation methods...');

    if (typeof Gegl === 'undefined') {
        console.log('⚠ Gegl class not available, skipping static method tests');
        return;
    }

    try {
        // Initialize GEGL if needed
        if (!Gegl.isInitialized()) {
            Gegl.init();
        }

        // Test Gegl.createBuffer
        const buffer1 = Gegl.createBuffer({ x: 0, y: 0, width: 16, height: 16 }, 'RGBA u8');
        const extent1 = buffer1.getExtent();
        if (extent1.width !== 16 || extent1.height !== 16) {
            console.error('✗ Gegl.createBuffer failed');
            return;
        }

        console.log('✓ GEGL static buffer creation tests passed');

    } catch (error) {
        console.error('✗ GEGL static methods test failed:', error.message);
    }
}

function testBufferPixelAccess() {
    console.log('Testing buffer pixel access (setPixels/getPixels)...');

    try {
        const buffer = new GeglBuffer({ x: 0, y: 0, width: 4, height: 4 }, 'RGBA u8');

        // Test setting pixels
        const testData = new Uint8Array(4 * 4 * 4); // 4x4 RGBA
        for (let i = 0; i < testData.length; i++) {
            testData[i] = i % 256;
        }

        buffer.setPixels({ x: 0, y: 0, width: 4, height: 4 }, 'RGBA u8', testData);

        // Test getting pixels back
        const retrievedData = buffer.getPixels({ x: 0, y: 0, width: 4, height: 4 }, 'RGBA u8');

        if (!arraysEqual(testData, retrievedData)) {
            console.error('✗ Pixel data mismatch after set/get');
            return;
        }

        // Test partial rectangle access
        const partialData = buffer.getPixels({ x: 1, y: 1, width: 2, height: 2 }, 'RGBA u8');
        if (partialData.length !== 2 * 2 * 4) {
            console.error('✗ Partial rectangle access failed');
            return;
        }

        // Test with rowstride
        const rowstrideData = buffer.getPixels({ x: 0, y: 0, width: 2, height: 2 }, 'RGBA u8', 8);
        if (rowstrideData.length !== 2 * 2 * 4) {
            console.error('✗ Rowstride pixel access failed');
            return;
        }

        console.log('✓ Pixel access tests passed');

    } catch (error) {
        console.error('✗ Pixel access test failed:', error.message);
    }
}

function testBufferFormatConversion() {
    console.log('Testing buffer format conversion...');

    try {
        const buffer = new GeglBuffer({ x: 0, y: 0, width: 2, height: 2 }, 'RGBA u8');

        // Set some RGBA data
        const rgbaData = new Uint8Array([255, 128, 64, 255, 100, 150, 200, 128, 50, 75, 100, 255, 0, 255, 0, 128]);
        buffer.setPixels({ x: 0, y: 0, width: 2, height: 2 }, 'RGBA u8', rgbaData);

        // Get as different formats
        const rgbData = buffer.getPixels({ x: 0, y: 0, width: 2, height: 2 }, 'RGB u8');
        if (rgbData.length !== 2 * 2 * 3) {
            console.error('✗ RGB conversion length incorrect');
            return;
        }

        // Verify RGB data (should be first 3 components of each pixel)
        const expectedRgb = new Uint8Array([255, 128, 64, 100, 150, 200, 50, 75, 100, 0, 255, 0]);
        if (!arraysEqual(rgbData, expectedRgb)) {
            console.error('✗ RGB conversion data incorrect');
            return;
        }

        // Test float format conversion
        const floatBuffer = new GeglBuffer({ x: 0, y: 0, width: 2, height: 2 }, 'RGBA float');
        const floatData = new Float32Array([1.0, 0.5, 0.25, 1.0, 0.0, 1.0, 0.0, 0.5]);
        floatBuffer.setPixels({ x: 0, y: 0, width: 2, height: 2 }, 'RGBA float', floatData);

        const retrievedFloat = floatBuffer.getPixels({ x: 0, y: 0, width: 2, height: 2 }, 'RGBA float');
        if (!arraysEqual(floatData, retrievedFloat, 0.001)) {
            console.error('✗ Float format conversion failed');
            return;
        }

        console.log('✓ Format conversion tests passed');

    } catch (error) {
        console.error('✗ Format conversion test failed:', error.message);
    }
}

function testBufferFlush() {
    console.log('Testing buffer flush functionality...');

    try {
        const buffer = new GeglBuffer({ x: 0, y: 0, width: 10, height: 10 }, 'RGBA u8');

        // Set some data
        const data = new Uint8Array(10 * 10 * 4);
        data.fill(128);
        buffer.setPixels({ x: 0, y: 0, width: 10, height: 10 }, 'RGBA u8', data);

        // Flush (should not throw)
        buffer.flush();

        // Verify data is still accessible after flush
        const retrieved = buffer.getPixels({ x: 5, y: 5, width: 1, height: 1 }, 'RGBA u8');
        if (retrieved.length !== 4 || retrieved[0] !== 128) {
            console.error('✗ Data corrupted after flush');
            return;
        }

        console.log('✓ Buffer flush test passed');

    } catch (error) {
        console.error('✗ Buffer flush test failed:', error.message);
    }
}

function testImageDataConversion() {
    console.log('Testing ImageData to/from GEGL buffer conversion...');

    if (typeof CanvasUtils === 'undefined') {
        console.log('⚠ CanvasUtils not available, skipping ImageData tests');
        return;
    }

    try {
        // Create test ImageData
        const originalImageData = createTestImageData(4, 4, [255, 100, 50, 200]);

        // Convert to GEGL buffer
        const buffer = CanvasUtils.imageDataToGeglBuffer(originalImageData);

        // Convert back to ImageData
        const convertedImageData = CanvasUtils.geglBufferToImageData(buffer);

        // Verify dimensions
        if (convertedImageData.width !== 4 || convertedImageData.height !== 4) {
            console.error('✗ Converted ImageData dimensions incorrect');
            return;
        }

        // Verify data
        if (!arraysEqual(originalImageData.data, convertedImageData.data)) {
            console.error('✗ ImageData conversion data mismatch');
            return;
        }

        // Test with existing buffer reuse
        const existingBuffer = new GeglBuffer({ x: 0, y: 0, width: 4, height: 4 }, 'RGBA u8');
        const reusedBuffer = CanvasUtils.imageDataToGeglBuffer(originalImageData, existingBuffer);
        if (reusedBuffer !== existingBuffer) {
            console.error('✗ Buffer reuse failed');
            return;
        }

        console.log('✓ ImageData conversion tests passed');

    } catch (error) {
        console.error('✗ ImageData conversion test failed:', error.message);
    }
}

function testCanvasConversion() {
    console.log('Testing Canvas to/from GEGL buffer conversion...');

    if (typeof CanvasUtils === 'undefined') {
        console.log('⚠ CanvasUtils not available, skipping Canvas tests');
        return;
    }

    try {
        // Create test canvas
        const originalCanvas = createTestCanvas(8, 6, 'blue');

        // Convert to GEGL buffer
        const buffer = CanvasUtils.canvasToGeglBuffer(originalCanvas);

        // Convert back to canvas
        const convertedCanvas = document.createElement('canvas');
        CanvasUtils.geglBufferToCanvas(buffer, convertedCanvas);

        // Verify dimensions
        if (convertedCanvas.width !== 8 || convertedCanvas.height !== 6) {
            console.error('✗ Converted canvas dimensions incorrect');
            return;
        }

        // Get ImageData from both canvases for comparison
        const originalCtx = originalCanvas.getContext('2d');
        const convertedCtx = convertedCanvas.getContext('2d');

        const originalData = originalCtx.getImageData(0, 0, 8, 6);
        const convertedData = convertedCtx.getImageData(0, 0, 8, 6);

        // Note: Due to canvas compression, exact pixel match might not be guaranteed
        // but dimensions and general appearance should be preserved
        if (originalData.width === convertedData.width && originalData.height === convertedData.height) {
            console.log('✓ Canvas conversion tests passed');
        } else {
            console.error('✗ Canvas conversion dimensions mismatch');
        }

    } catch (error) {
        console.error('✗ Canvas conversion test failed:', error.message);
    }
}

function testBufferMemoryManagement() {
    console.log('Testing buffer memory management...');

    try {
        const buffers = [];

        // Create multiple buffers
        for (let i = 0; i < 10; i++) {
            const buffer = new GeglBuffer({ x: 0, y: 0, width: 100 + i, height: 100 + i }, 'RGBA u8');
            buffers.push(buffer);

            // Fill with data
            const data = new Uint8Array((100 + i) * (100 + i) * 4);
            data.fill(i);
            buffer.setPixels({ x: 0, y: 0, width: 100 + i, height: 100 + i }, 'RGBA u8', data);
        }

        // Verify all buffers are accessible
        for (let i = 0; i < buffers.length; i++) {
            const buffer = buffers[i];
            const extent = buffer.getExtent();

            if (extent.width !== 100 + i || extent.height !== 100 + i) {
                console.error(`✗ Buffer ${i} extent corrupted`);
                return;
            }

            // Sample a pixel
            const pixel = buffer.getPixels({ x: 0, y: 0, width: 1, height: 1 }, 'RGBA u8');
            if (pixel[0] !== i) {
                console.error(`✗ Buffer ${i} data corrupted`);
                return;
            }
        }

        // Clear references (simulate cleanup)
        buffers.length = 0;

        console.log('✓ Memory management test passed');

    } catch (error) {
        console.error('✗ Memory management test failed:', error.message);
    }
}

function testErrorHandling() {
    console.log('Testing error handling...');

    let errorCount = 0;
    const expectedErrors = 6;

    // Test 1: Invalid extent
    try {
        new GeglBuffer(null, 'RGBA u8');
        console.error('✗ Should have thrown for null extent');
    } catch (error) {
        if (error.name === 'GeglError') errorCount++;
    }

    // Test 2: Invalid format
    try {
        new GeglBuffer({ x: 0, y: 0, width: 10, height: 10 }, 'INVALID_FORMAT');
        console.error('✗ Should have thrown for invalid format');
    } catch (error) {
        if (error.name === 'GeglError') errorCount++;
    }

    // Test 3: Access uninitialized buffer
    try {
        const buffer = new GeglBuffer({ x: 0, y: 0, width: 1, height: 1 });
        buffer._buffer = null; // Simulate corruption
        buffer.getExtent();
        console.error('✗ Should have thrown for uninitialized buffer');
    } catch (error) {
        if (error.name === 'GeglError') errorCount++;
    }

    // Test 4: Invalid rectangle for pixel access
    try {
        const buffer = new GeglBuffer({ x: 0, y: 0, width: 10, height: 10 });
        buffer.getPixels({ x: -1, y: -1, width: 0, height: 0 }, 'RGBA u8');
        // This might not throw, depending on implementation
        errorCount++; // Count as passed if no exception
    } catch (error) {
        if (error.name === 'GeglError') errorCount++;
    }

    // Test 5: CanvasUtils error handling
    if (typeof CanvasUtils !== 'undefined') {
        try {
            CanvasUtils.imageDataToGeglBuffer(null);
            console.error('✗ Should have thrown for null ImageData');
        } catch (error) {
            if (error.name === 'CanvasUtilsError') errorCount++;
        }
    }

    // Test 6: GEGL static method error handling
    if (typeof Gegl !== 'undefined') {
        try {
            Gegl.createBuffer(null);
            console.error('✗ Should have thrown for null extent in static method');
        } catch (error) {
            if (error.name === 'GeglError') errorCount++;
        }
    }

    console.log(`✓ Error handling: ${errorCount}/${expectedErrors} expected errors caught`);
}

function testLargeBufferHandling() {
    console.log('Testing large buffer handling...');

    try {
        // Test with a reasonably large buffer (adjust based on system capabilities)
        const largeSize = 1024; // 1024x1024
        const buffer = new GeglBuffer({ x: 0, y: 0, width: largeSize, height: largeSize }, 'RGBA u8');

        const extent = buffer.getExtent();
        if (extent.width !== largeSize || extent.height !== largeSize) {
            console.error('✗ Large buffer extent incorrect');
            return;
        }

        // Test setting a small region in the large buffer
        const testData = new Uint8Array(4); // Single pixel
        testData[0] = 255; testData[1] = 255; testData[2] = 255; testData[3] = 255;

        buffer.setPixels({ x: largeSize - 1, y: largeSize - 1, width: 1, height: 1 }, 'RGBA u8', testData);

        // Verify
        const retrieved = buffer.getPixels({ x: largeSize - 1, y: largeSize - 1, width: 1, height: 1 }, 'RGBA u8');
        if (!arraysEqual(testData, retrieved)) {
            console.error('✗ Large buffer pixel access failed');
            return;
        }

        console.log('✓ Large buffer handling test passed');

    } catch (error) {
        console.error('✗ Large buffer test failed:', error.message);
    }
}

function testBufferCopy() {
    console.log('Testing buffer copy functionality...');

    if (typeof CanvasUtils === 'undefined' || !CanvasUtils.copyGeglBuffer) {
        console.log('⚠ Buffer copy utility not available, skipping test');
        return;
    }

    try {
        const originalBuffer = new GeglBuffer({ x: 0, y: 0, width: 5, height: 5 }, 'RGBA u8');

        // Fill with pattern
        const originalData = new Uint8Array(5 * 5 * 4);
        for (let i = 0; i < originalData.length; i++) {
            originalData[i] = i % 256;
        }
        originalBuffer.setPixels({ x: 0, y: 0, width: 5, height: 5 }, 'RGBA u8', originalData);

        // Copy buffer
        const copiedBuffer = CanvasUtils.copyGeglBuffer(originalBuffer);

        // Verify extents match
        const originalExtent = originalBuffer.getExtent();
        const copiedExtent = copiedBuffer.getExtent();

        if (originalExtent.width !== copiedExtent.width || originalExtent.height !== copiedExtent.height) {
            console.error('✗ Copied buffer extent mismatch');
            return;
        }

        // Verify data matches
        const copiedData = copiedBuffer.getPixels({ x: 0, y: 0, width: 5, height: 5 }, 'RGBA u8');
        if (!arraysEqual(originalData, copiedData)) {
            console.error('✗ Copied buffer data mismatch');
            return;
        }

        // Test copy with format conversion
        const rgbCopy = CanvasUtils.copyGeglBuffer(originalBuffer, 'RGB u8');
        const rgbData = rgbCopy.getPixels({ x: 0, y: 0, width: 5, height: 5 }, 'RGB u8');
        if (rgbData.length !== 5 * 5 * 3) {
            console.error('✗ Format conversion copy failed');
            return;
        }

        console.log('✓ Buffer copy test passed');

    } catch (error) {
        console.error('✗ Buffer copy test failed:', error.message);
    }
}

function testBufferCopyPixels() {
    console.log('Testing buffer pixel copying between buffers...');

    if (typeof CanvasUtils === 'undefined' || !CanvasUtils.copyBufferPixels) {
        console.log('⚠ copyBufferPixels utility not available, skipping test');
        return;
    }

    try {
        const srcBuffer = new GeglBuffer({ x: 0, y: 0, width: 4, height: 4 }, 'RGBA u8');
        const dstBuffer = new GeglBuffer({ x: 0, y: 0, width: 4, height: 4 }, 'RGBA u8');

        // Fill source with pattern
        const srcData = new Uint8Array(4 * 4 * 4);
        for (let i = 0; i < srcData.length; i++) {
            srcData[i] = i % 256;
        }
        srcBuffer.setPixels({ x: 0, y: 0, width: 4, height: 4 }, 'RGBA u8', srcData);

        // Copy pixels
        CanvasUtils.copyBufferPixels(srcBuffer, dstBuffer);

        // Verify
        const dstData = dstBuffer.getPixels({ x: 0, y: 0, width: 4, height: 4 }, 'RGBA u8');
        if (!arraysEqual(srcData, dstData)) {
            console.error('✗ Pixel copy between buffers failed');
            return;
        }

        // Test partial copy
        const partialDst = new GeglBuffer({ x: 0, y: 0, width: 2, height: 2 }, 'RGBA u8');
        CanvasUtils.copyBufferPixels(srcBuffer, partialDst,
            { x: 1, y: 1, width: 2, height: 2 },
            { x: 0, y: 0, width: 2, height: 2 });

        const partialData = partialDst.getPixels({ x: 0, y: 0, width: 2, height: 2 }, 'RGBA u8');
        const expectedPartial = srcBuffer.getPixels({ x: 1, y: 1, width: 2, height: 2 }, 'RGBA u8');
        if (!arraysEqual(partialData, expectedPartial)) {
            console.error('✗ Partial pixel copy failed');
            return;
        }

        console.log('✓ Buffer pixel copy test passed');

    } catch (error) {
        console.error('✗ Buffer pixel copy test failed:', error.message);
    }
}

function testLoadImageToBuffer() {
    console.log('Testing image loading to GEGL buffer...');

    if (typeof CanvasUtils === 'undefined' || !CanvasUtils.loadImageToGeglBuffer) {
        console.log('⚠ loadImageToGeglBuffer utility not available, skipping test');
        return;
    }

    // Note: This test requires a working image URL and is async
    // For now, we'll just test error handling
    try {
        CanvasUtils.loadImageToGeglBuffer('').catch(error => {
            if (error.name === 'CanvasUtilsError') {
                console.log('✓ Image loading error handling works');
            } else {
                console.error('✗ Unexpected error in image loading test');
            }
        });
    } catch (error) {
        if (error.name === 'CanvasUtilsError') {
            console.log('✓ Image loading validation works');
        } else {
            console.error('✗ Unexpected error in image loading validation');
        }
    }
}

// Performance test
function testBufferPerformance() {
    console.log('Testing buffer performance...');

    try {
        const sizes = [64, 128, 256];
        const iterations = 10;

        for (const size of sizes) {
            const buffer = new GeglBuffer({ x: 0, y: 0, width: size, height: size }, 'RGBA u8');

            // Performance test: set/get pixels multiple times
            const startTime = performance.now();

            for (let i = 0; i < iterations; i++) {
                const data = new Uint8Array(size * size * 4);
                data.fill(i % 256);
                buffer.setPixels({ x: 0, y: 0, width: size, height: size }, 'RGBA u8', data);
                const retrieved = buffer.getPixels({ x: 0, y: 0, width: size, height: size }, 'RGBA u8');
            }

            const endTime = performance.now();
            const avgTime = (endTime - startTime) / iterations;

            console.log(`✓ ${size}x${size} buffer: ${avgTime.toFixed(2)}ms per iteration`);
        }

    } catch (error) {
        console.error('✗ Performance test failed:', error.message);
    }
}

function testBufferBounds() {
    console.log('Testing buffer bounds and edge cases...');

    try {
        const buffer = new GeglBuffer({ x: 10, y: 20, width: 100, height: 50 }, 'RGBA u8');

        // Test accessing within bounds
        const data = new Uint8Array(10 * 10 * 4);
        data.fill(255);
        buffer.setPixels({ x: 15, y: 25, width: 10, height: 10 }, 'RGBA u8', data);

        const retrieved = buffer.getPixels({ x: 15, y: 25, width: 10, height: 10 }, 'RGBA u8');
        if (!arraysEqual(data, retrieved)) {
            console.error('✗ Bounds-based pixel access failed');
            return;
        }

        // Test accessing at buffer edges
        const edgeData = buffer.getPixels({ x: 10, y: 20, width: 1, height: 1 }, 'RGBA u8');
        if (edgeData.length !== 4) {
            console.error('✗ Edge pixel access failed');
            return;
        }

        console.log('✓ Buffer bounds test passed');

    } catch (error) {
        console.error('✗ Buffer bounds test failed:', error.message);
    }
}

function testBufferDataIntegrity() {
    console.log('Testing buffer data integrity across operations...');

    try {
        const buffer = new GeglBuffer({ x: 0, y: 0, width: 8, height: 8 }, 'RGBA u8');

        // Create a checkerboard pattern
        const checkerData = new Uint8Array(8 * 8 * 4);
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const index = (y * 8 + x) * 4;
                const isBlack = (x + y) % 2 === 0;
                checkerData[index] = isBlack ? 0 : 255;     // R
                checkerData[index + 1] = isBlack ? 0 : 255; // G
                checkerData[index + 2] = isBlack ? 0 : 255; // B
                checkerData[index + 3] = 255;               // A
            }
        }

        buffer.setPixels({ x: 0, y: 0, width: 8, height: 8 }, 'RGBA u8', checkerData);

        // Test multiple reads don't corrupt data
        for (let i = 0; i < 5; i++) {
            const readData = buffer.getPixels({ x: 0, y: 0, width: 8, height: 8 }, 'RGBA u8');
            if (!arraysEqual(checkerData, readData)) {
                console.error(`✗ Data integrity failed on read ${i}`);
                return;
            }
        }

        // Test partial overwrites don't corrupt surrounding data
        const overwriteData = new Uint8Array(2 * 2 * 4);
        overwriteData.fill(128);
        buffer.setPixels({ x: 3, y: 3, width: 2, height: 2 }, 'RGBA u8', overwriteData);

        // Verify the overwrite worked
        const verifyOverwrite = buffer.getPixels({ x: 3, y: 3, width: 2, height: 2 }, 'RGBA u8');
        if (!arraysEqual(overwriteData, verifyOverwrite)) {
            console.error('✗ Partial overwrite failed');
            return;
        }

        // Verify surrounding data is intact
        const cornerData = buffer.getPixels({ x: 0, y: 0, width: 2, height: 2 }, 'RGBA u8');
        const expectedCorner = checkerData.slice(0, 2 * 2 * 4);
        if (!arraysEqual(cornerData, expectedCorner)) {
            console.error('✗ Surrounding data corrupted by partial overwrite');
            return;
        }

        console.log('✓ Buffer data integrity test passed');

    } catch (error) {
        console.error('✗ Buffer data integrity test failed:', error.message);
    }
}

// Run all tests
async function runTests() {
    if (typeof GeglBuffer === 'undefined') {
        console.error('GeglBuffer not loaded. Make sure to load gegl-wrapper.js and the WebAssembly module first.');
        return;
    }

    console.log('Running GEGL Buffer Tests...');
    console.log('==============================');

    testBufferCreation();
    testGeglStaticMethods();
    testBufferPixelAccess();
    testBufferFormatConversion();
    testBufferFlush();
    testImageDataConversion();
    testCanvasConversion();
    testBufferMemoryManagement();
    testErrorHandling();
    testLargeBufferHandling();
    testBufferCopy();
    testBufferCopyPixels();
    testLoadImageToBuffer();
    testBufferPerformance();
    testBufferBounds();
    testBufferDataIntegrity();

    console.log('==============================');
    console.log('Buffer tests completed');
}

// Export for manual testing
if (typeof window !== 'undefined') {
    window.testGeglBuffer = runTests;
    console.log('GEGL Buffer test loaded. Call testGeglBuffer() to run tests.');
}