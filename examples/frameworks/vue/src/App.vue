<template>
  <div class="app">
    <header class="app-header">
      <h1>GEGL.wasm Vue Example</h1>
    </header>

    <main class="app-main">
      <div class="file-input-section">
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          @change="handleFileSelect"
          style="display: none"
        />
        <button class="file-button" @click="selectFile">
          Select Image
        </button>
      </div>

      <div class="canvas-section">
        <canvas ref="canvas" class="image-canvas"></canvas>
      </div>

      <div class="controls-section">
        <button
          @click="applyBlur"
          :disabled="!imageData || isProcessing || !geglWorker"
          class="control-button"
        >
          {{ isProcessing ? 'Processing...' : 'Apply Blur' }}
        </button>
        <button
          @click="resetImage"
          :disabled="!imageData"
          class="control-button"
        >
          Reset
        </button>
      </div>

      <div class="status-section">
        <p>{{ status }}</p>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'

export default {
  name: 'App',
  setup() {
    const fileInput = ref(null)
    const canvas = ref(null)
    const imageData = ref(null)
    const isProcessing = ref(false)
    const status = ref('Ready')
    const geglWorker = ref(null)

    const initWorker = async () => {
      try {
        status.value = 'Initializing GEGL...'
        geglWorker.value = new window.GeglWorker('../../../build-wasm-prod/gegl.js')
        await geglWorker.value.init()
        status.value = 'GEGL initialized successfully'
      } catch (error) {
        console.error('Failed to initialize GEGL:', error)
        status.value = 'Failed to initialize GEGL'
      }
    }

    const selectFile = () => {
      fileInput.value.click()
    }

    const handleFileSelect = async (event) => {
      const file = event.target.files[0]
      if (!file) return

      try {
        status.value = 'Loading image...'

        const img = new Image()
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = URL.createObjectURL(file)
        })

        const ctx = canvas.value.getContext('2d')
        canvas.value.width = img.width
        canvas.value.height = img.height
        ctx.drawImage(img, 0, 0)

        const imgData = ctx.getImageData(0, 0, img.width, img.height)
        imageData.value = imgData
        status.value = 'Image loaded successfully'

        URL.revokeObjectURL(img.src)

      } catch (error) {
        console.error('Failed to load image:', error)
        status.value = 'Failed to load image'
      }
    }

    const applyBlur = async () => {
      if (!imageData.value || !geglWorker.value) return

      try {
        isProcessing.value = true
        status.value = 'Applying blur effect...'

        const operations = [{
          operation: 'gegl:blur-gaussian',
          properties: {
            std_dev_x: 5.0,
            std_dev_y: 5.0
          }
        }]

        const result = await geglWorker.value.process(imageData.value, operations)

        const ctx = canvas.value.getContext('2d')
        const processedImageData = new ImageData(
          new Uint8ClampedArray(result.data),
          result.width,
          result.height
        )
        ctx.putImageData(processedImageData, 0, 0)

        status.value = 'Blur effect applied successfully'

      } catch (error) {
        console.error('Failed to apply blur:', error)
        status.value = 'Failed to apply blur effect'
      } finally {
        isProcessing.value = false
      }
    }

    const resetImage = () => {
      if (imageData.value) {
        const ctx = canvas.value.getContext('2d')
        ctx.putImageData(imageData.value, 0, 0)
        status.value = 'Image reset to original'
      }
    }

    onMounted(async () => {
      if (window.GeglWorker) {
        await initWorker()
      } else {
        status.value = 'GEGL worker not loaded'
      }
    })

    onUnmounted(() => {
      if (geglWorker.value) {
        geglWorker.value.cleanup()
      }
    })

    return {
      fileInput,
      canvas,
      imageData,
      isProcessing,
      status,
      geglWorker,
      selectFile,
      handleFileSelect,
      applyBlur,
      resetImage
    }
  }
}
</script>

<style scoped>
.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
}

.app-header {
  text-align: center;
  margin-bottom: 30px;
}

.app-header h1 {
  color: #333;
  margin: 0;
}

.app-main {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  padding: 20px;
}

.file-input-section {
  text-align: center;
  margin-bottom: 20px;
}

.file-button {
  background-color: #4CAF50;
  border: none;
  color: white;
  padding: 12px 24px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.file-button:hover {
  background-color: #45a049;
}

.canvas-section {
  text-align: center;
  margin: 20px 0;
}

.image-canvas {
  max-width: 100%;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #f9f9f9;
}

.controls-section {
  text-align: center;
  margin: 20px 0;
}

.control-button {
  background-color: #2196F3;
  border: none;
  color: white;
  padding: 10px 20px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  margin: 0 10px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.control-button:hover:not(:disabled) {
  background-color: #1976D2;
}

.control-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.status-section {
  text-align: center;
  margin-top: 20px;
}

.status-section p {
  margin: 0;
  font-weight: bold;
  color: #666;
}
</style>