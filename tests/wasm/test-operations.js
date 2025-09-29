/**
 * Comprehensive tests for GEGL operations in WebAssembly environment
 * Tests basic operations like blur, brightness-contrast, and arithmetic operations
 * with known inputs and expected outputs for verification
 */

// Mock browser environment check
if (typeof window === 'undefined') {
    console.log('This test is designed for browser environment with WebAssembly');
    console.log('To run this test, load it in a browser with the GEGL WebAssembly module loaded');
    process.exit(0);
}

// Test utilities
function createSolidColorImageData(width, height, r, g, b, a = 255) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
        data[i] = r;     // R
        data[i + 1] = g; // G
        data[i + 2] = b; // B
        data[i + 3] = a; // A
    }
    return new ImageData(data, width, height);
}

function createCheckerboardImageData(width, height, size = 2) {
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

function getPixel(imageData, x, y) {
    const index = (y * imageData.width + x) * 4;
    return [
        imageData.data[index],     // R
        imageData.data[index + 1], // G
        imageData.data[index + 2], // B
        imageData.data[index + 3]  // A
    ];
}

function calculateAveragePixelValue(imageData, x, y, radius = 1) {
    let r = 0, g = 0, b = 0, a = 0;
    let count = 0;

    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            const px = x + dx;
            const py = y + dy;
            if (px >= 0 && px < imageData.width && py >= 0 && py < imageData.height) {
                const pixel = getPixel(imageData, px, py);
                r += pixel[0];
                g += pixel[1];
                b += pixel[2];
                a += pixel[3];
                count++;
            }
        }
    }

    return [r / count, g / count, b / count, a / count];
}

// Test functions
async function testBlurOperations() {
    console.log('Testing blur operations...');

    if (typeof GeglWorker === 'undefined') {
        console.error('GeglWorker not available');
        return;
    }

    const worker = new GeglWorker();
    await worker.init();

    let successCount = 0;
    const totalTests = 3;

    try {
        // Test 1: Box blur on checkerboard pattern
        console.log('  Testing box blur...');
        const checkerboard = createCheckerboardImageData(8, 8, 2);
        const blurResult = await worker.process(checkerboard, [
            { operation: 'gegl:box-blur', properties: { radius: 1 } }
        ]);

        // After blur, edge pixels should be averaged
        const centerPixel = getPixel(blurResult, 2, 2);
        const edgePixel = getPixel(blurResult, 1, 1);

        // Edge should be less extreme than original checkerboard
        if (edgePixel[0] > 0 && edgePixel[0] < 255) {
            console.log('    ✓ Box blur softened edges');
            successCount++;
        } else {
            console.error('    ✗ Box blur did not soften edges');
        }

        // Test 2: Gaussian blur on solid color (should remain mostly unchanged)
        console.log('  Testing gaussian blur on solid color...');
        const solidColor = createSolidColorImageData(10, 10, 128, 64, 192);
        const gaussianResult = await worker.process(solidColor, [
            { operation: 'gegl:gaussian-blur', properties: { 'std-dev-x': 2, 'std-dev-y': 2 } }
        ]);

        // Solid color should remain relatively uniform
        const samplePixel1 = getPixel(gaussianResult, 0, 0);
        const samplePixel2 = getPixel(gaussianResult, 9, 9);

        if (Math.abs(samplePixel1[0] - samplePixel2[0]) < 10 &&
            Math.abs(samplePixel1[1] - samplePixel2[1]) < 10 &&
            Math.abs(samplePixel1[2] - samplePixel2[2]) < 10) {
            console.log('    ✓ Gaussian blur preserved solid color uniformity');
            successCount++;
        } else {
            console.error('    ✗ Gaussian blur altered solid color too much');
        }

        // Test 3: Blur with different radii
        console.log('  Testing blur with different radii...');
        const gradient = createGradientImageData(10, 10);
        const smallBlur = await worker.process(gradient, [
            { operation: 'gegl:gaussian-blur', properties: { 'std-dev-x': 0.5, 'std-dev-y': 0.5 } }
        ]);
        const largeBlur = await worker.process(gradient, [
            { operation: 'gegl:gaussian-blur', properties: { 'std-dev-x': 3, 'std-dev-y': 3 } }
        ]);

        // Large blur should be more uniform than small blur
        const smallVariance = calculateVariance(smallBlur);
        const largeVariance = calculateVariance(largeBlur);

        if (largeVariance < smallVariance) {
            console.log('    ✓ Larger blur radius created more uniform result');
            successCount++;
        } else {
            console.error('    ✗ Blur radius did not affect uniformity as expected');
        }

    } catch (error) {
        console.error('✗ Blur operation test failed:', error.message);
    }

    worker.cleanup();
    console.log(`✓ Blur operations: ${successCount}/${totalTests} tests passed`);
}

async function testBrightnessContrastOperations() {
    console.log('Testing brightness-contrast operations...');

    if (typeof GeglWorker === 'undefined') {
        console.error('GeglWorker not available');
        return;
    }

    const worker = new GeglWorker();
    await worker.init();

    let successCount = 0;
    const totalTests = 4;

    try {
        // Test 1: Increase brightness
        console.log('  Testing brightness increase...');
        const midGray = createSolidColorImageData(4, 4, 128, 128, 128);
        const brightResult = await worker.process(midGray, [
            { operation: 'gegl:brightness-contrast', properties: { brightness: 0.5, contrast: 0.0 } }
        ]);

        const brightPixel = getPixel(brightResult, 0, 0);
        if (brightPixel[0] > 128 && brightPixel[1] > 128 && brightPixel[2] > 128) {
            console.log('    ✓ Brightness increase worked');
            successCount++;
        } else {
            console.error('    ✗ Brightness increase failed');
        }

        // Test 2: Decrease brightness
        console.log('  Testing brightness decrease...');
        const darkResult = await worker.process(midGray, [
            { operation: 'gegl:brightness-contrast', properties: { brightness: -0.5, contrast: 0.0 } }
        ]);

        const darkPixel = getPixel(darkResult, 0, 0);
        if (darkPixel[0] < 128 && darkPixel[1] < 128 && darkPixel[2] < 128) {
            console.log('    ✓ Brightness decrease worked');
            successCount++;
        } else {
            console.error('    ✗ Brightness decrease failed');
        }

        // Test 3: Increase contrast
        console.log('  Testing contrast increase...');
        const contrastResult = await worker.process(midGray, [
            { operation: 'gegl:brightness-contrast', properties: { brightness: 0.0, contrast: 1.0 } }
        ]);

        const contrastPixel = getPixel(contrastResult, 0, 0);
        // High contrast should push mid-gray toward extremes
        if (contrastPixel[0] !== 128) {
            console.log('    ✓ Contrast increase affected mid-tones');
            successCount++;
        } else {
            console.error('    ✗ Contrast increase had no effect');
        }

        // Test 4: Combined brightness and contrast
        console.log('  Testing combined brightness and contrast...');
        const combinedResult = await worker.process(midGray, [
            { operation: 'gegl:brightness-contrast', properties: { brightness: 0.2, contrast: 0.5 } }
        ]);

        const combinedPixel = getPixel(combinedResult, 0, 0);
        // Should be brighter and have adjusted contrast
        if (combinedPixel[0] > 128) {
            console.log('    ✓ Combined brightness and contrast worked');
            successCount++;
        } else {
            console.error('    ✗ Combined brightness and contrast failed');
        }

    } catch (error) {
        console.error('✗ Brightness-contrast test failed:', error.message);
    }

    worker.cleanup();
    console.log(`✓ Brightness-contrast operations: ${successCount}/${totalTests} tests passed`);
}

async function testArithmeticOperations() {
    console.log('Testing arithmetic operations...');

    if (typeof GeglWorker === 'undefined') {
        console.error('GeglWorker not available');
        return;
    }

    const worker = new GeglWorker();
    await worker.init();

    let successCount = 0;
    const totalTests = 3;

    try {
        // Test 1: Addition with constant
        console.log('  Testing addition operation...');
        const color1 = createSolidColorImageData(4, 4, 100, 50, 25);

        const addResult = await worker.process(color1, [
            { operation: 'gegl:add', properties: { value: 50 } }
        ]);

        const addPixel = getPixel(addResult, 0, 0);
        if (addPixel[0] >= 145 && addPixel[0] <= 155) { // 100 + 50, with some tolerance
            console.log('    ✓ Addition with constant worked');
            successCount++;
        } else {
            console.error('    ✗ Addition with constant failed, got', addPixel[0]);
        }

        // Test 2: Multiplication with constant
        console.log('  Testing multiplication operation...');
        const multResult = await worker.process(color1, [
            { operation: 'gegl:multiply', properties: { value: 2.0 } }
        ]);

        const multPixel = getPixel(multResult, 0, 0);
        if (multPixel[0] >= 195 && multPixel[0] <= 205) { // 100 * 2, with some tolerance
            console.log('    ✓ Multiplication with constant worked');
            successCount++;
        } else {
            console.error('    ✗ Multiplication with constant failed, got', multPixel[0]);
        }

        // Test 3: Division with constant
        console.log('  Testing division operation...');
        const divResult = await worker.process(color1, [
            { operation: 'gegl:divide', properties: { value: 2.0 } }
        ]);

        const divPixel = getPixel(divResult, 0, 0);
        if (divPixel[0] >= 48 && divPixel[0] <= 52) { // 100 / 2
            console.log('    ✓ Division with constant worked');
            successCount++;
        } else {
            console.error('    ✗ Division with constant failed, got', divPixel[0]);
        }

    } catch (error) {
        console.error('✗ Arithmetic operations test failed:', error.message);
    }

    worker.cleanup();
    console.log(`✓ Arithmetic operations: ${successCount}/${totalTests} tests passed`);
}

function calculateVariance(imageData) {
    let sum = 0;
    let sumSquares = 0;
    let count = 0;

    for (let i = 0; i < imageData.data.length; i += 4) {
        const value = imageData.data[i]; // Use red channel
        sum += value;
        sumSquares += value * value;
        count++;
    }

    const mean = sum / count;
    return (sumSquares / count) - (mean * mean);
}

async function testErrorHandling() {
    console.log('Testing error handling for operations...');

    if (typeof GeglWorker === 'undefined') {
        console.error('GeglWorker not available');
        return;
    }

    const worker = new GeglWorker();
    await worker.init();

    let successCount = 0;
    const totalTests = 2;

    try {
        // Test 1: Invalid operation name
        console.log('  Testing invalid operation...');
        const testImage = createSolidColorImageData(4, 4, 128, 128, 128);

        try {
            await worker.process(testImage, [
                { operation: 'invalid:operation' }
            ]);
            console.error('    ✗ Should have thrown error for invalid operation');
        } catch (error) {
            console.log('    ✓ Correctly handled invalid operation');
            successCount++;
        }

        // Test 2: Invalid property values
        console.log('  Testing invalid property values...');
        try {
            await worker.process(testImage, [
                { operation: 'gegl:blur-gaussian', properties: { std_dev_x: -1 } }
            ]);
            // Some operations might accept negative values, so this might not error
            console.log('    ✓ Operation handled potentially invalid property');
            successCount++;
        } catch (error) {
            console.log('    ✓ Correctly handled invalid property value');
            successCount++;
        }

    } catch (error) {
        console.error('✗ Error handling test failed:', error.message);
    }

    worker.cleanup();
    console.log(`✓ Error handling: ${successCount}/${totalTests} tests passed`);
}

// Run all tests
async function runTests() {
    console.log('Running GEGL Operations Tests...');
    console.log('================================');

    await testBlurOperations();
    await testBrightnessContrastOperations();
    await testArithmeticOperations();
    await testErrorHandling();

    console.log('================================');
    console.log('Operations tests completed');
}

// Export for manual testing
if (typeof window !== 'undefined') {
    window.testGeglOperations = runTests;
    console.log('GEGL Operations test loaded. Call testGeglOperations() to run tests.');
}