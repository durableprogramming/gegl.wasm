/**
 * Compositing utilities for multi-layer image editing
 */

/**
 * Blend modes mapping to GEGL operations
 */
export const BLEND_MODES = {
    normal: 'gegl:over',
    multiply: 'gegl:multiply',
    screen: 'gegl:screen',
    overlay: 'gegl:overlay',
    darken: 'gegl:darken',
    lighten: 'gegl:lighten',
    difference: 'gegl:difference',
    exclusion: 'gegl:exclusion',
    softlight: 'gegl:soft-light',
    hardlight: 'gegl:hard-light'
};

/**
 * Composite multiple layers into a single image
 * @param {Array<Layer>} layers - Array of Layer objects
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @returns {Array} GEGL operations for compositing
 */
export function createCompositeOperations(layers, canvasWidth, canvasHeight) {
    const operations = [];

    // Start with a transparent background
    operations.push({
        operation: 'gegl:color',
        properties: {
            value: { r: 0, g: 0, b: 0, a: 0 } // Transparent
        }
    });

    // Composite each visible layer
    for (const layer of layers) {
        if (!layer.visible || !layer.hasContent()) {
            continue;
        }

        const processedData = layer.getProcessedImageData();
        if (!processedData) continue;

        // Create buffer source operation for this layer
        operations.push({
            operation: 'gegl:buffer-source',
            properties: {
                buffer: processedData // This would need to be handled specially
            }
        });

        // Apply opacity if not 1.0
        if (layer.opacity < 1.0) {
            operations.push({
                operation: 'gegl:opacity',
                properties: {
                    value: layer.opacity
                }
            });
        }

        // Apply blend mode
        const blendOp = BLEND_MODES[layer.blendMode] || 'gegl:over';
        operations.push({
            operation: blendOp
        });
    }

    return operations;
}

/**
 * Apply operations to a single layer
 * @param {Layer} layer - The layer to process
 * @returns {Array} GEGL operations for the layer
 */
export function createLayerOperations(layer) {
    const operations = [];

    // Start with the base image
    if (layer.hasContent()) {
        operations.push({
            operation: 'gegl:buffer-source',
            properties: {
                buffer: layer.getProcessedImageData()
            }
        });
    }

    // Apply layer operations
    for (const op of layer.operations) {
        operations.push(op);
    }

    return operations;
}

/**
 * Create a simple blur operation
 */
export function createBlurOperation(radius = 5.0) {
    return {
        operation: 'gegl:blur-gaussian',
        properties: {
            std_dev_x: radius,
            std_dev_y: radius
        }
    };
}

/**
 * Create a brightness/contrast operation
 */
export function createBrightnessContrastOperation(brightness = 0.0, contrast = 0.0) {
    return {
        operation: 'gegl:brightness-contrast',
        properties: {
            brightness: brightness,
            contrast: contrast
        }
    };
}

/**
 * Create a hue/saturation operation
 */
export function createHueSaturationOperation(hue = 0.0, saturation = 0.0, lightness = 0.0) {
    return {
        operation: 'gegl:hue-saturation',
        properties: {
            hue: hue,
            saturation: saturation,
            lightness: lightness
        }
    };
}

/**
 * Create a color balance operation
 */
export function createColorBalanceOperation(cyanRed = 0.0, magentaGreen = 0.0, yellowBlue = 0.0) {
    return {
        operation: 'gegl:color-balance',
        properties: {
            cyan_red: cyanRed,
            magenta_green: magentaGreen,
            yellow_blue: yellowBlue
        }
    };
}

/**
 * Create a levels operation
 */
export function createLevelsOperation(inLow = 0.0, inHigh = 1.0, outLow = 0.0, outHigh = 1.0) {
    return {
        operation: 'gegl:levels',
        properties: {
            in_low: inLow,
            in_high: inHigh,
            out_low: outLow,
            out_high: outHigh
        }
    };
}