#!/usr/bin/env node

/**
 * Test progressive image processing functionality
 */

const { Gegl, GeglRectangle, GeglBuffer, GeglNode, GeglWasmProgressive } = require('../../dist/gegl-wasm.cjs');

async function testProgressiveProcessing() {
  console.log('Testing progressive image processing...');

  try {
    // Initialize GEGL
    Gegl.initializeGegl();

    // Create a simple graph
    const graph = Gegl.gegl_node_new();
    const load = new GeglNode(graph, 'gegl:load');
    load.setProperty('path', 'data/gradient.png'); // Use a test image

    const blur = new GeglNode(graph, 'gegl:gaussian-blur');
    blur.setProperty('std-dev-x', 5.0);
    blur.setProperty('std-dev-y', 5.0);

    load.connectTo(blur, 'output', 'input');

    // Create progressive processor
    const rect = new GeglRectangle(0, 0, 256, 256);
    const progressive = new GeglWasmProgressive(graph, rect);

    // Set yield interval for testing
    progressive.setYieldInterval(10);

    let iterations = 0;
    const maxIterations = 1000; // Safety limit

    // Process progressively
    while (iterations < maxIterations) {
      const progress = { value: 0 };
      const hasMoreWork = progressive.work(progress);

      iterations++;
      console.log(`Iteration ${iterations}: progress = ${progress.value.toFixed(3)}`);

      if (!hasMoreWork) {
        console.log(`Processing completed in ${iterations} iterations`);
        break;
      }

      // Simulate yielding to browser event loop
      await new Promise(resolve => setImmediate(resolve));
    }

    if (iterations >= maxIterations) {
      console.error('Processing did not complete within iteration limit');
      return false;
    }

    // Get the result buffer
    const resultBuffer = progressive.getBuffer();
    console.log('Successfully obtained result buffer');

    // Cleanup
    resultBuffer.flush();

    console.log('Progressive processing test passed!');
    return true;

  } catch (error) {
    console.error('Progressive processing test failed:', error);
    return false;
  } finally {
    Gegl.cleanupGegl();
  }
}

// Run the test
if (require.main === module) {
  testProgressiveProcessing().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testProgressiveProcessing };