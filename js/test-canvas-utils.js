/**
 * Basic test/demo for canvas utilities
 * This demonstrates usage of the canvas-utils.js functions
 */

// Mock browser environment for testing (in Node.js this would need additional setup)
if (typeof window === 'undefined') {
    console.log('This test is designed for browser environment with HTML5 Canvas API');
    console.log('To run this test, load it in a browser with the GEGL WebAssembly module loaded');
    process.exit(0);
}

// Test functions
function testImageDataConversion() {
    console.log('Testing ImageData to GEGL buffer conversion...');

    try {
        // Create test ImageData (2x2 red square)
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 2;
        const ctx = canvas.getContext('2d');

        // Fill with red
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, 2, 2);

        const imageData = ctx.getImageData(0, 0, 2, 2);

        // Convert to GEGL buffer
        const buffer = CanvasUtils.imageDataToGeglBuffer(imageData);

        // Verify buffer was created
        const extent = buffer.getExtent();
        console.log(`✓ Created buffer with extent: ${extent.width}x${extent.height}`);

        // Convert back to ImageData
        const convertedImageData = CanvasUtils.geglBufferToImageData(buffer);

        // Verify conversion
        if (convertedImageData.width === 2 && convertedImageData.height === 2) {
            console.log('✓ Round-trip conversion successful');
        } else {
            console.error('✗ Round-trip conversion failed');
        }

    } catch (error) {
        console.error('✗ ImageData conversion test failed:', error.message);
    }
}

function testCanvasConversion() {
    console.log('Testing Canvas to GEGL buffer conversion...');

    try {
        // Create test canvas
        const canvas = document.createElement('canvas');
        canvas.width = 4;
        canvas.height = 4;
        const ctx = canvas.getContext('2d');

        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, 4, 4);
        gradient.addColorStop(0, 'blue');
        gradient.addColorStop(1, 'green');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 4, 4);

        // Convert to GEGL buffer
        const buffer = CanvasUtils.canvasToGeglBuffer(canvas);

        // Render back to a new canvas
        const newCanvas = document.createElement('canvas');
        CanvasUtils.geglBufferToCanvas(buffer, newCanvas);

        console.log('✓ Canvas conversion successful');

    } catch (error) {
        console.error('✗ Canvas conversion test failed:', error.message);
    }
}

function testBufferCopy() {
    console.log('Testing buffer copy functionality...');

    try {
        // Create a buffer
        const originalBuffer = new GeglBuffer({x: 0, y: 0, width: 3, height: 3}, 'RGBA u8');

        // Fill with some data (this would normally come from an image)
        const testData = new Uint8Array(3 * 3 * 4); // 3x3 RGBA
        for (let i = 0; i < testData.length; i++) {
            testData[i] = i % 255;
        }
        originalBuffer.setPixels({x: 0, y: 0, width: 3, height: 3}, 'RGBA u8', testData);

        // Copy the buffer
        const copiedBuffer = CanvasUtils.copyGeglBuffer(originalBuffer);

        // Verify copy
        const originalExtent = originalBuffer.getExtent();
        const copiedExtent = copiedBuffer.getExtent();

        if (originalExtent.width === copiedExtent.width &&
            originalExtent.height === copiedExtent.height) {
            console.log('✓ Buffer copy successful');
        } else {
            console.error('✗ Buffer copy failed - extents don\'t match');
        }

    } catch (error) {
        console.error('✗ Buffer copy test failed:', error.message);
    }
}

// Run tests when GEGL is loaded
function runTests() {
    if (typeof Gegl === 'undefined') {
        console.error('GEGL module not loaded. Make sure to load gegl-wrapper.js and the WebAssembly module first.');
        return;
    }

    console.log('Running Canvas Utils Tests...');
    console.log('==============================');

    testImageDataConversion();
    testCanvasConversion();
    testBufferCopy();

    console.log('==============================');
    console.log('Tests completed');
}

// Export for manual testing
if (typeof window !== 'undefined') {
    window.testCanvasUtils = runTests;
    console.log('Canvas utils test loaded. Call testCanvasUtils() to run tests.');
}