// Web Worker for batch image processing
let geglInitialized = false;

self.onmessage = async function(event) {
    const { type, imageData, operations } = event.data;

    if (type === 'process') {
        try {
            // Initialize GEGL if not already done
            if (!geglInitialized) {
                // Import GEGL WASM
                importScripts('../dist/gegl-wasm.umd.min.js');

                // Wait for GEGL to initialize
                await GeglWasm.Gegl.init();
                geglInitialized = true;
            }

            // Create buffer from image data
            const inputBuffer = GeglWasm.CanvasUtils.imageDataToGeglBuffer(imageData);

            // Create graph and apply operations
            const graph = GeglWasm.Gegl.createGraph();
            const sourceNode = graph.createNode('gegl:buffer-source');
            sourceNode._node.setProperty('buffer', inputBuffer._buffer);

            const blurNode = graph.createNode('gegl:blur-gaussian');
            blurNode.setNumberProperty('std_dev_x', 5.0);
            blurNode.setNumberProperty('std_dev_y', 5.0);

            sourceNode.connectTo(blurNode);

            const outputBuffer = GeglWasm.Gegl.createBuffer(inputBuffer.getExtent(), 'RGBA u8');
            blurNode.process();
            blurNode.blitToBuffer(outputBuffer._buffer, inputBuffer.getExtent());

            const processedData = GeglWasm.CanvasUtils.geglBufferToImageData(outputBuffer);

            self.postMessage({
                type: 'result',
                processedData: processedData
            });

        } catch (error) {
            self.postMessage({
                type: 'error',
                error: error.message
            });
        }
    }
};