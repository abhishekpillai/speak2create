import { GoogleGenAI } from '@google/genai';

export interface ImageGenerationRequest {
  prompt: string;
  sessionId?: string;
  styleHints?: string;
}

export interface ImageGenerationResponse {
  imageUrl: string;
  imageId: string;
  processedPrompt: string;
}

export interface ImageEditRequest {
  imageId: string;
  imageData: string;
  editInstruction: string;
  sessionId: string;
}

export interface ImageEditResponse {
  imageUrl: string;
  editHistory: string[];
}

export class GeminiClient {
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    // Enhance prompt for better image generation
    const enhancedPrompt = this.enhancePrompt(request.prompt, request.styleHints);

    try {
      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: enhancedPrompt
      });

      // Extract image data from response
      for (const candidate of response.candidates || []) {
        for (const part of candidate.content?.parts || []) {
          if (part.inlineData?.data) {
            const imageData = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || 'image/png';
            const imageUrl = `data:${mimeType};base64,${imageData}`;
            
            return {
              imageUrl,
              imageId: this.generateImageId(),
              processedPrompt: enhancedPrompt
            };
          }
        }
      }

      throw new Error('No image generated in response');
    } catch (error) {
      console.error('Image generation error:', error);
      throw error;
    }
  }

  async editImage(request: ImageEditRequest): Promise<ImageEditResponse> {
    try {
      // Prepare contents array with text and image
      const contents = [
        request.editInstruction,
        {
          inlineData: {
            mimeType: 'image/png',
            data: request.imageData.replace(/^data:image\/\w+;base64,/, '')
          }
        }
      ];

      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents
      });

      // Extract edited image
      for (const candidate of response.candidates || []) {
        for (const part of candidate.content?.parts || []) {
          if (part.inlineData?.data) {
            const imageData = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || 'image/png';
            const imageUrl = `data:${mimeType};base64,${imageData}`;
            
            return {
              imageUrl,
              editHistory: [request.editInstruction]
            };
          }
        }
      }

      throw new Error('No edited image generated');
    } catch (error) {
      console.error('Image editing error:', error);
      throw error;
    }
  }

  private enhancePrompt(prompt: string, styleHints?: string): string {
    let enhanced = prompt;

    // Add quality modifiers if not present
    if (!prompt.toLowerCase().includes('quality') && !prompt.toLowerCase().includes('resolution')) {
      enhanced = `High-quality, detailed ${enhanced}`;
    }

    // Add style hints if provided
    if (styleHints) {
      enhanced += `. Style: ${styleHints}`;
    }

    // Add technical details for better results
    if (!prompt.toLowerCase().includes('lighting')) {
      enhanced += ', professional lighting';
    }

    return enhanced;
  }

  private generateImageId(): string {
    return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}