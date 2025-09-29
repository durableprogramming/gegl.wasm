import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';

declare var GeglWorker: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'GEGL Angular Example';

  @ViewChild('fileInput', { static: true }) fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  imageData: ImageData | null = null;
  isProcessing = false;
  status = 'Ready';
  geglWorker: any = null;

  async ngOnInit() {
    if ((window as any).GeglWorker) {
      try {
        this.status = 'Initializing GEGL...';
        this.geglWorker = new (window as any).GeglWorker('../../../build-wasm-prod/gegl.js');
        await this.geglWorker.init();
        this.status = 'GEGL initialized successfully';
      } catch (error) {
        console.error('Failed to initialize GEGL:', error);
        this.status = 'Failed to initialize GEGL';
      }
    } else {
      this.status = 'GEGL worker not loaded';
    }
  }

  ngOnDestroy() {
    if (this.geglWorker) {
      this.geglWorker.cleanup();
    }
  }

  selectFile() {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      this.status = 'Loading image...';

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });

      const ctx = this.canvas.nativeElement.getContext('2d')!;
      this.canvas.nativeElement.width = img.width;
      this.canvas.nativeElement.height = img.height;
      ctx.drawImage(img, 0, 0);

      this.imageData = ctx.getImageData(0, 0, img.width, img.height);
      this.status = 'Image loaded successfully';

      URL.revokeObjectURL(img.src);

    } catch (error) {
      console.error('Failed to load image:', error);
      this.status = 'Failed to load image';
    }
  }

  async applyBlur() {
    if (!this.imageData || !this.geglWorker) return;

    try {
      this.isProcessing = true;
      this.status = 'Applying blur effect...';

      const operations = [{
        operation: 'gegl:blur-gaussian',
        properties: {
          std_dev_x: 5.0,
          std_dev_y: 5.0
        }
      }];

      const result = await this.geglWorker.process(this.imageData, operations);

      const ctx = this.canvas.nativeElement.getContext('2d')!;
      const processedImageData = new ImageData(
        new Uint8ClampedArray(result.data),
        result.width,
        result.height
      );
      ctx.putImageData(processedImageData, 0, 0);

      this.status = 'Blur effect applied successfully';

    } catch (error) {
      console.error('Failed to apply blur:', error);
      this.status = 'Failed to apply blur effect';
    } finally {
      this.isProcessing = false;
    }
  }

  resetImage() {
    if (this.imageData) {
      const ctx = this.canvas.nativeElement.getContext('2d')!;
      ctx.putImageData(this.imageData, 0, 0);
      this.status = 'Image reset to original';
    }
  }
}