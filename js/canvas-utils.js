/**
 * Canvas utilities for GEGL WebAssembly
 * Provides efficient conversion between Canvas ImageData and GEGL buffers
 */

/**
 * Error class for canvas utilities
 */
class CanvasUtilsError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CanvasUtilsError';
    }
}

/**
 * Convert Canvas ImageData to GEGL buffer
 * @param {ImageData} imageData - Canvas ImageData object
 * @param {GeglBuffer} [buffer] - Optional existing buffer to reuse (must match dimensions)
 * @returns {GeglBuffer} GEGL buffer containing the image data
 */
function imageDataToGeglBuffer(imageData, buffer = null) {
    if (!imageData || !imageData.data) {
        throw new CanvasUtilsError('Invalid ImageData provided');
    }

    const width = imageData.width;
    const height = imageData.height;

    // Create new buffer if none provided or dimensions don't match
    if (!buffer) {
        buffer = new GeglBuffer({x: 0, y: 0, width, height}, 'RGBA u8');
    } else {
        const extent = buffer.getExtent();
        if (extent.width !== width || extent.height !== height) {
            throw new CanvasUtilsError(`Buffer dimensions (${extent.width}x${extent.height}) don't match ImageData (${width}x${height})`);
        }
    }

    // ImageData.data is Uint8ClampedArray with RGBA format
    // Convert to regular Uint8Array for GEGL
    const pixelData = new Uint8Array(imageData.data);

    // Set pixels in the buffer (no rowstride needed for packed RGBA)
    buffer.setPixels({x: 0, y: 0, width, height}, 'RGBA u8', pixelData);

    return buffer;
}

/**
 * Convert GEGL buffer to Canvas ImageData
 * @param {GeglBuffer} buffer - GEGL buffer to convert
 * @param {Object} [rect] - Optional rectangle to extract {x, y, width, height}
 * @returns {ImageData} Canvas ImageData object
 */
function geglBufferToImageData(buffer, rect = null) {
    if (!buffer) {
        throw new CanvasUtilsError('Invalid buffer provided');
    }

    // Use full extent if no rectangle specified
    if (!rect) {
        rect = buffer.getExtent();
    }

    // Get pixel data as RGBA u8
    const pixelData = buffer.getPixels(rect, 'RGBA u8');

    // Create ImageData from the pixel data
    // pixelData is Uint8Array, ImageData constructor expects Uint8ClampedArray
    const clampedData = new Uint8ClampedArray(pixelData);

    return new ImageData(clampedData, rect.width, rect.height);
}

/**
 * Convert HTML Canvas element to GEGL buffer
 * @param {HTMLCanvasElement} canvas - Canvas element to convert
 * @param {GeglBuffer} [buffer] - Optional existing buffer to reuse
 * @returns {GeglBuffer} GEGL buffer containing the canvas data
 */
function canvasToGeglBuffer(canvas, buffer = null) {
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        throw new CanvasUtilsError('Invalid canvas element provided');
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new CanvasUtilsError('Failed to get 2D context from canvas');
    }

    // Get ImageData from canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    return imageDataToGeglBuffer(imageData, buffer);
}

/**
 * Render GEGL buffer to HTML Canvas element
 * @param {GeglBuffer} buffer - GEGL buffer to render
 * @param {HTMLCanvasElement} canvas - Target canvas element
 * @param {Object} [rect] - Optional rectangle to render {x, y, width, height}
 */
function geglBufferToCanvas(buffer, canvas, rect = null) {
    if (!buffer) {
        throw new CanvasUtilsError('Invalid buffer provided');
    }

    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        throw new CanvasUtilsError('Invalid canvas element provided');
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new CanvasUtilsError('Failed to get 2D context from canvas');
    }

    // Convert buffer to ImageData
    const imageData = geglBufferToImageData(buffer, rect);

    // Resize canvas if needed
    if (canvas.width !== imageData.width || canvas.height !== imageData.height) {
        canvas.width = imageData.width;
        canvas.height = imageData.height;
    }

    // Put ImageData to canvas
    ctx.putImageData(imageData, 0, 0);
}

/**
 * Create GEGL buffer from image URL (async)
 * @param {string} url - Image URL to load
 * @returns {Promise<GeglBuffer>} Promise resolving to GEGL buffer
 */
async function loadImageToGeglBuffer(url) {
    if (!url || typeof url !== 'string') {
        throw new CanvasUtilsError('Invalid URL provided');
    }

    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            try {
                // Create temporary canvas to extract ImageData
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, img.width, img.height);
                const buffer = imageDataToGeglBuffer(imageData);

                resolve(buffer);
            } catch (error) {
                reject(new CanvasUtilsError(`Failed to convert image to buffer: ${error.message}`));
            }
        };

        img.onerror = () => {
            reject(new CanvasUtilsError(`Failed to load image from URL: ${url}`));
        };

        // Enable CORS for cross-origin images
        img.crossOrigin = 'anonymous';
        img.src = url;
    });
}

/**
 * Efficient pixel data transfer utilities
 */

/**
 * Copy pixels between GEGL buffers with format conversion
 * @param {GeglBuffer} srcBuffer - Source buffer
 * @param {GeglBuffer} dstBuffer - Destination buffer
 * @param {Object} [srcRect] - Source rectangle {x, y, width, height}
 * @param {Object} [dstRect] - Destination rectangle {x, y, width, height}
 * @param {string} [format] - Pixel format for transfer (defaults to source format)
 */
function copyBufferPixels(srcBuffer, dstBuffer, srcRect = null, dstRect = null, format = null) {
    if (!srcBuffer || !dstBuffer) {
        throw new CanvasUtilsError('Invalid source or destination buffer');
    }

    if (!srcRect) {
        srcRect = srcBuffer.getExtent();
    }

    if (!dstRect) {
        dstRect = dstBuffer.getExtent();
    }

    if (srcRect.width !== dstRect.width || srcRect.height !== dstRect.height) {
        throw new CanvasUtilsError('Source and destination rectangles must have same dimensions');
    }

    if (!format) {
        format = srcBuffer.getFormat();
    }

    // Get pixels from source
    const pixelData = srcBuffer.getPixels(srcRect, format);

    // Set pixels in destination
    dstBuffer.setPixels(dstRect, format, pixelData);
}

/**
 * Create a copy of a GEGL buffer
 * @param {GeglBuffer} buffer - Buffer to copy
 * @param {string} [format] - Optional format for the copy (defaults to source format)
 * @returns {GeglBuffer} New buffer with copied data
 */
function copyGeglBuffer(buffer, format = null) {
    if (!buffer) {
        throw new CanvasUtilsError('Invalid buffer provided');
    }

    const extent = buffer.getExtent();
    const copyFormat = format || buffer.getFormat();

    const newBuffer = new GeglBuffer(extent, copyFormat);
    copyBufferPixels(buffer, newBuffer, extent, extent, copyFormat);

    return newBuffer;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CanvasUtilsError,
        imageDataToGeglBuffer,
        geglBufferToImageData,
        canvasToGeglBuffer,
        geglBufferToCanvas,
        loadImageToGeglBuffer,
        copyBufferPixels,
        copyGeglBuffer
    };
} else if (typeof window !== 'undefined') {
    window.CanvasUtils = {
        CanvasUtilsError,
        imageDataToGeglBuffer,
        geglBufferToImageData,
        canvasToGeglBuffer,
        geglBufferToCanvas,
        loadImageToGeglBuffer,
        copyBufferPixels,
        copyGeglBuffer
    };
}