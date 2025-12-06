
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { fileToBase64 } from '../../utils/file-helpers';

@Component({
  selector: 'app-image-uploader',
  standalone: true,
  templateUrl: './image-uploader.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageUploaderComponent {
  title = input.required<string>();
  icon = input.required<string>();
  imageUploaded = output<File | undefined>();

  isDragging = signal(false);
  imagePreview = signal<string | null>(null);
  fileName = signal<string | null>(null);

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  private async handleFile(file: File) {
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      const base64 = await fileToBase64(file);
      this.imagePreview.set(base64);
      this.fileName.set(file.name);
      this.imageUploaded.emit(file);
    } else {
      console.error('Invalid file type. Please upload a JPG or PNG.');
      alert('Invalid file type. Please upload a JPG or PNG.');
    }
  }

  removeImage() {
    this.imagePreview.set(null);
    this.fileName.set(null);
    
    const fileInput = document.getElementById(this.title()) as HTMLInputElement;
    if (fileInput) {
        fileInput.value = '';
    }
    
    this.imageUploaded.emit(undefined);
  }
}
