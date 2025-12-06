
import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';

export interface ImagePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

export type AspectRatio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16';

// Interface for the long-running video operation
export interface GenerateVideosOperation {
  name: string;
  done: boolean;
  response?: {
    generatedVideos?: {
      video: {
        uri: string;
      };
    }[];
  };
}

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private genAI: GoogleGenAI;
  private readonly MODEL_TEXT = 'gemini-2.5-flash';
  private readonly MODEL_IMAGE = 'imagen-4.0-generate-001';
  private readonly MODEL_VIDEO = 'veo-2.0-generate-001';

  constructor() {
    const apiKey = (window as any).process?.env?.API_KEY ?? '';
    if (!apiKey) {
        console.error("API Key not found. Please ensure the API_KEY environment variable is set.");
    }
    this.genAI = new GoogleGenAI({ apiKey });
  }

  async describeImage(imagePart: ImagePart, contextPrompt: string): Promise<string> {
    try {
      const response = await this.genAI.models.generateContent({
        model: this.MODEL_TEXT,
        contents: { parts: [{ text: contextPrompt }, imagePart] },
      });
      return response.text;
    } catch (error) {
      console.error('Error describing image:', error);
      throw new Error('Could not analyze the image. It might violate safety policies.');
    }
  }

  async generateImageFromPrompt(prompt: string, aspectRatio: AspectRatio): Promise<string> {
    try {
        const response = await this.genAI.models.generateImages({
            model: this.MODEL_IMAGE,
            prompt: prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/png',
              aspectRatio: aspectRatio,
            },
        });

      if (response.generatedImages && response.generatedImages.length > 0) {
        return response.generatedImages[0].image.imageBytes;
      } else {
        throw new Error('No image was generated.');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      throw new Error('Could not generate the image. The prompt may have been blocked for safety reasons.');
    }
  }

  async generateVideoFromImageAndPrompt(
    imageBase64: string,
    prompt: string,
    updateLoadingMessage: (message: string) => void
  ): Promise<string> { // returns blob URL
    try {
      updateLoadingMessage('Initiating video generation...');

      let operation: GenerateVideosOperation = await this.genAI.models.generateVideos({
        model: this.MODEL_VIDEO,
        prompt: prompt,
        image: {
          imageBytes: imageBase64,
          mimeType: 'image/png',
        },
        config: {
          numberOfVideos: 1,
        }
      });

      updateLoadingMessage('Processing video frames (this may take a few minutes)...');

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
        operation = await this.genAI.operations.getVideosOperation({ operation: operation });
      }

      updateLoadingMessage('Finalizing video...');
      
      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) {
        throw new Error('Video generation completed, but no download link was found.');
      }

      const apiKey = (window as any).process?.env?.API_KEY ?? '';
      const response = await fetch(`${downloadLink}&key=${apiKey}`);
      if (!response.ok) {
        throw new Error(`Failed to download video file. Status: ${response.status}`);
      }
      const videoBlob = await response.blob();
      return URL.createObjectURL(videoBlob);

    } catch (error) {
      console.error('Error generating video:', error);
      throw new Error('Could not generate the video. The prompt or image may have been blocked for safety reasons.');
    }
  }
}
