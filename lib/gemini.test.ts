import { describe, it, expect, vi } from 'vitest';
import { GeminiClient } from './gemini';

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent }
  }))
}));

describe('GeminiClient', () => {
  const client = new GeminiClient('fake-key');

  it('enhancePrompt adds quality, style, and lighting hints', () => {
    const result = (client as any).enhancePrompt('A cat on the beach', 'impressionist');
    expect(result).toBe(
      'High-quality, detailed A cat on the beach. Style: impressionist, professional lighting'
    );
  });

  it('enhancePrompt avoids duplicate hints when already present', () => {
    const result = (client as any).enhancePrompt('High-quality portrait with moody lighting');
    expect(result).toBe('High-quality portrait with moody lighting');
  });

  it('editImage strips data URI header and returns edited image', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      candidates: [
        {
          content: {
            parts: [
              { inlineData: { data: 'editeddata', mimeType: 'image/png' } }
            ]
          }
        }
      ]
    });

    const response = await client.editImage({
      imageId: '1',
      imageData: 'data:image/png;base64,ABC123',
      editInstruction: 'make it blue',
      sessionId: 's1'
    });

    expect(mockGenerateContent).toHaveBeenCalledWith({
      model: 'gemini-2.5-flash-image-preview',
      contents: [
        'make it blue',
        {
          inlineData: {
            mimeType: 'image/png',
            data: 'ABC123'
          }
        }
      ]
    });

    expect(response).toEqual({
      imageUrl: 'data:image/png;base64,editeddata',
      editHistory: ['make it blue']
    });
  });
});
