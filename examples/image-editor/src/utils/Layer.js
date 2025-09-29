/**
 * Layer class for managing individual image layers
 */
export class Layer {
    constructor(name, width, height, id = null) {
        this.id = id || `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.name = name;
        this.width = width;
        this.height = height;
        this.visible = true;
        this.opacity = 1.0;
        this.blendMode = 'normal'; // normal, multiply, screen, overlay, etc.

        // Image data for this layer
        this.imageData = null;

        // Operations applied to this layer
        this.operations = [];

        // Cached processed result
        this.cachedResult = null;
        this.needsUpdate = true;
    }

    /**
     * Set the base image data for this layer
     */
    setImageData(imageData) {
        if (imageData.width !== this.width || imageData.height !== this.height) {
            throw new Error('Image data dimensions must match layer dimensions');
        }
        this.imageData = imageData;
        this.needsUpdate = true;
    }

    /**
     * Add an operation to this layer
     */
    addOperation(operation) {
        this.operations.push(operation);
        this.needsUpdate = true;
    }

    /**
     * Remove an operation from this layer
     */
    removeOperation(index) {
        if (index >= 0 && index < this.operations.length) {
            this.operations.splice(index, 1);
            this.needsUpdate = true;
        }
    }

    /**
     * Update an operation
     */
    updateOperation(index, operation) {
        if (index >= 0 && index < this.operations.length) {
            this.operations[index] = operation;
            this.needsUpdate = true;
        }
    }

    /**
     * Get all operations for this layer
     */
    getOperations() {
        return [...this.operations];
    }

    /**
     * Clear all operations
     */
    clearOperations() {
        this.operations = [];
        this.needsUpdate = true;
    }

    /**
     * Set layer properties
     */
    setProperties({ visible, opacity, blendMode, name }) {
        let changed = false;
        if (visible !== undefined && visible !== this.visible) {
            this.visible = visible;
            changed = true;
        }
        if (opacity !== undefined && opacity !== this.opacity) {
            this.opacity = Math.max(0, Math.min(1, opacity));
            changed = true;
        }
        if (blendMode !== undefined && blendMode !== this.blendMode) {
            this.blendMode = blendMode;
            changed = true;
        }
        if (name !== undefined && name !== this.name) {
            this.name = name;
            changed = true;
        }
        if (changed) {
            this.needsUpdate = true;
        }
    }

    /**
     * Get layer properties
     */
    getProperties() {
        return {
            id: this.id,
            name: this.name,
            visible: this.visible,
            opacity: this.opacity,
            blendMode: this.blendMode,
            width: this.width,
            height: this.height
        };
    }

    /**
     * Check if layer has content
     */
    hasContent() {
        return this.imageData !== null;
    }

    /**
     * Get the processed image data for this layer
     * If no operations, returns the base image data
     */
    async getProcessedImageData(geglWorker = null) {
        if (!this.hasContent()) {
            return null;
        }

        if (!this.needsUpdate && this.cachedResult) {
            return this.cachedResult;
        }

        // If no operations, return base image data
        if (this.operations.length === 0) {
            this.cachedResult = this.imageData;
            this.needsUpdate = false;
            return this.cachedResult;
        }

        // If we have a GEGL worker, process operations
        if (geglWorker) {
            try {
                const result = await geglWorker.process(this.imageData, this.operations);
                this.cachedResult = result;
                this.needsUpdate = false;
                return this.cachedResult;
            } catch (error) {
                console.error('Failed to process layer operations:', error);
                // Fall back to base image data
                this.cachedResult = this.imageData;
                this.needsUpdate = false;
                return this.cachedResult;
            }
        }

        // No worker available, return base image data
        this.cachedResult = this.imageData;
        this.needsUpdate = false;
        return this.cachedResult;
    }

    /**
     * Create a thumbnail of the layer
     */
    async getThumbnail(maxSize = 40) {
        if (!this.hasContent()) {
            return null;
        }

        const processed = await this.getProcessedImageData();
        if (!processed) return null;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Calculate thumbnail size
        const aspectRatio = processed.width / processed.height;
        let thumbWidth, thumbHeight;

        if (aspectRatio > 1) {
            thumbWidth = maxSize;
            thumbHeight = maxSize / aspectRatio;
        } else {
            thumbHeight = maxSize;
            thumbWidth = maxSize * aspectRatio;
        }

        canvas.width = thumbWidth;
        canvas.height = thumbHeight;

        // Create temporary canvas for source
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = processed.width;
        tempCanvas.height = processed.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(processed, 0, 0);

        // Draw scaled image
        ctx.drawImage(tempCanvas, 0, 0, processed.width, processed.height, 0, 0, thumbWidth, thumbHeight);

        return canvas.toDataURL();
    }

    /**
     * Clone this layer
     */
    clone() {
        const cloned = new Layer(`${this.name} Copy`, this.width, this.height);
        cloned.visible = this.visible;
        cloned.opacity = this.opacity;
        cloned.blendMode = this.blendMode;
        cloned.imageData = this.imageData ? new ImageData(
            new Uint8ClampedArray(this.imageData.data),
            this.imageData.width,
            this.imageData.height
        ) : null;
        cloned.operations = JSON.parse(JSON.stringify(this.operations));
        return cloned;
    }

    /**
     * Draw a brush stroke on the layer
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} size - Brush size
     * @param {number} hardness - Brush hardness (0-1)
     * @param {number} opacity - Brush opacity (0-1)
     * @param {string} color - Brush color in hex format
     */
    drawBrush(x, y, size, hardness, opacity, color) {
        if (!this.hasContent()) {
            // Create transparent layer if none exists
            this.imageData = new ImageData(this.width, this.height);
        }

        const imageData = this.imageData;
        const data = imageData.data;

        // Parse color
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        // Calculate brush bounds
        const radius = size / 2;
        const startX = Math.max(0, Math.floor(x - radius));
        const endX = Math.min(imageData.width - 1, Math.ceil(x + radius));
        const startY = Math.max(0, Math.floor(y - radius));
        const endY = Math.min(imageData.height - 1, Math.ceil(y + radius));

        // Draw brush
        for (let py = startY; py <= endY; py++) {
            for (let px = startX; px <= endX; px++) {
                const dx = px - x;
                const dy = py - y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance <= radius) {
                    // Calculate brush falloff
                    let brushOpacity = 1.0;
                    if (hardness < 1.0 && distance > radius * hardness) {
                        const falloffDistance = distance - radius * hardness;
                        const falloffRadius = radius * (1.0 - hardness);
                        brushOpacity = Math.max(0, 1.0 - (falloffDistance / falloffRadius));
                    }

                    const index = (py * imageData.width + px) * 4;

                    // Blend with existing pixel
                    const existingR = data[index];
                    const existingG = data[index + 1];
                    const existingB = data[index + 2];
                    const existingA = data[index + 3] / 255;

                    const finalOpacity = brushOpacity * opacity;
                    const invOpacity = 1 - finalOpacity;

                    data[index] = existingR * invOpacity + r * finalOpacity;
                    data[index + 1] = existingG * invOpacity + g * finalOpacity;
                    data[index + 2] = existingB * invOpacity + b * finalOpacity;
                    data[index + 3] = Math.min(255, (existingA + finalOpacity) * 255);
                }
            }
        }

        this.needsUpdate = true;
    }

    /**
     * Export layer data for serialization
     */
    export() {
        return {
            id: this.id,
            name: this.name,
            width: this.width,
            height: this.height,
            visible: this.visible,
            opacity: this.opacity,
            blendMode: this.blendMode,
            operations: this.operations,
            imageData: this.imageData ? {
                data: Array.from(this.imageData.data),
                width: this.imageData.width,
                height: this.imageData.height
            } : null
        };
    }

    /**
     * Import layer data from serialized data
     */
    static import(data) {
        const layer = new Layer(data.name, data.width, data.height, data.id);
        layer.visible = data.visible;
        layer.opacity = data.opacity;
        layer.blendMode = data.blendMode;
        layer.operations = data.operations || [];

        if (data.imageData) {
            layer.imageData = new ImageData(
                new Uint8ClampedArray(data.imageData.data),
                data.imageData.width,
                data.imageData.height
            );
        }

        return layer;
    }
}