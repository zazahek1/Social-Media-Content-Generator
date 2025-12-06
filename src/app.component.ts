
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { GeminiService, ImagePart, AspectRatio } from './services/gemini.service';
import { ImageUploaderComponent } from './components/image-uploader/image-uploader.component';
import { fileToBase64 } from './utils/file-helpers';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ImageUploaderComponent],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  // Branding constants
  readonly APP_NAME = 'Social Media Content Generator';
  readonly LOGO_URL = 'https://lh3.googleusercontent.com/d/1NC8CXQHxetuogNglJ0enX5NI077MEl1o';
  readonly COPYRIGHT_TEXT = 'Huỳnh Tấn Phát - PK04415 - phathtpk04415@gmail.com';

  // Image generation state
  personFile = signal<File | undefined>(undefined);
  outfitFile = signal<File | undefined>(undefined);
  productFile = signal<File | undefined>(undefined);
  aspectRatio = signal<AspectRatio>('1:1');
  generatedImage = signal<string | null>(null);
  generatedImageBytes = signal<string | null>(null);
  isLoading = signal(false);
  loadingMessage = signal('');
  error = signal<string | null>(null);

  // Video generation state
  videoPrompt = signal('');
  isVideoLoading = signal(false);
  videoLoadingMessage = signal('');
  generatedVideoUrl = signal<string | null>(null);
  videoError = signal<string | null>(null);

  // Icons
  personIconPath = 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z';
  outfitIconPath = 'M9 2L4 7v13h16V7l-5-5H9zM18 20H6V8.414l2-2h8l2 2V20z';
  productIconPath = 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM12 22.31l-7-4V8.41l7 4v9.9zM19 12l-7 4-7-4 7-4 7 4z';

  constructor(private geminiService: GeminiService) {}

  onPersonImageUpload(file: File | undefined) {
    this.personFile.set(file);
    this.clearResult();
  }

  onOutfitImageUpload(file: File | undefined) {
    this.outfitFile.set(file);
    this.clearResult();
  }
  
  onProductImageUpload(file: File | undefined) {
    this.productFile.set(file);
    this.clearResult();
  }

  setAspectRatio(ratio: AspectRatio) {
    this.aspectRatio.set(ratio);
  }

  private clearResult() {
      this.generatedImage.set(null);
      this.generatedImageBytes.set(null);
      this.error.set(null);
      this.generatedVideoUrl.set(null);
      this.videoError.set(null);
      this.videoPrompt.set('');
  }

  async generate() {
    if (!this.personFile() || !this.outfitFile()) {
      this.error.set('Please upload at least a model and a garment image.');
      return;
    }

    this.isLoading.set(true);
    this.clearResult(); // Clear everything before generating a new image

    try {
      const personImg = this.personFile()!;
      const outfitImg = this.outfitFile()!;
      const productImg = this.productFile();

      this.loadingMessage.set('Analyzing model image...');
      const personPart = await this.createImagePart(personImg);
      const personDescription = await this.geminiService.describeImage(personPart, 'Describe this person in a photorealistic style, including gender, ethnicity, hair style, pose, and background. Be concise and direct.');

      this.loadingMessage.set('Analyzing garment image...');
      const outfitPart = await this.createImagePart(outfitImg);
      const outfitDescription = await this.geminiService.describeImage(outfitPart, 'Describe this piece of clothing in a detailed manner. Be concise and direct.');
      
      let finalPrompt = `Generate a photorealistic image of the person (${personDescription}), wearing the garment (${outfitDescription}).`;
      
      if (productImg) {
        this.loadingMessage.set('Analyzing product image...');
        const productPart = await this.createImagePart(productImg);
        const productDescription = await this.geminiService.describeImage(productPart, 'Describe this product in a concise and direct manner.');
        finalPrompt += ` The person is holding the product (${productDescription}) naturally in their hand.`;
      }
      
      this.loadingMessage.set('Crafting the perfect prompt...');
      finalPrompt += ' Ensure the lighting is cohesive and professional. The background should be simple and not distracting.';
      
      this.loadingMessage.set('Generating your new content...');
      const imageBytes = await this.geminiService.generateImageFromPrompt(finalPrompt, this.aspectRatio());
      this.generatedImageBytes.set(imageBytes);
      this.generatedImage.set(`data:image/png;base64,${imageBytes}`);

    } catch (e: any) {
      this.error.set(e.message || 'An unknown error occurred.');
    } finally {
      this.isLoading.set(false);
      this.loadingMessage.set('');
    }
  }

  async generateVideo() {
    if (!this.generatedImageBytes() || !this.videoPrompt()) {
      this.videoError.set('An image must be generated and a prompt must be provided.');
      return;
    }

    this.isVideoLoading.set(true);
    this.videoError.set(null);
    this.generatedVideoUrl.set(null);
    
    try {
        const videoUrl = await this.geminiService.generateVideoFromImageAndPrompt(
            this.generatedImageBytes()!,
            this.videoPrompt(),
            (message: string) => this.videoLoadingMessage.set(message)
        );
        this.generatedVideoUrl.set(videoUrl);

    } catch(e: any) {
        this.videoError.set(e.message || 'An unknown error occurred during video generation.');
    } finally {
        this.isVideoLoading.set(false);
        this.videoLoadingMessage.set('');
    }
  }

  private async createImagePart(file: File): Promise<ImagePart> {
    const base64 = await fileToBase64(file);
    const base64Data = base64.split(',')[1]; 
    return {
      inlineData: {
        data: base64Data,
        mimeType: file.type,
      },
    };
  }
}
