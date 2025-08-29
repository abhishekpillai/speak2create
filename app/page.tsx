'use client';

import { useState } from 'react';
import VoiceControl from '@/components/VoiceControl';
import ImageDisplay from '@/components/ImageDisplay';
import { Sparkles } from 'lucide-react';

export default function Home() {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sessionId] = useState(`session_${Date.now()}`);

  const handleImageGenerate = async (prompt: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          session_id: sessionId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const data = await response.json();
      setCurrentImage(data.imageUrl);
    } catch (error) {
      console.error('Image generation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageEdit = async (instruction: string) => {
    if (!currentImage) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_data: currentImage,
          edit_instruction: instruction,
          session_id: sessionId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to edit image');
      }

      const data = await response.json();
      setCurrentImage(data.imageUrl);
    } catch (error) {
      console.error('Image editing error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setCurrentImage(null);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-purple-50 via-white to-indigo-50 overflow-hidden">
      {/* Compact Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-purple-100 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              speak2create
            </h1>
          </div>
          <p className="text-xs text-gray-600 hidden sm:block">Voice-powered image generation</p>
        </div>
      </header>

      {/* Main Content - Centered Stack */}
      <main className="flex-1 flex items-center justify-center p-4 min-h-0">
        <div className="w-full max-w-6xl flex gap-8 items-center">
          {/* Left Side - Try Saying Tips */}
          <div className="hidden lg:block w-48 flex-shrink-0">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Try saying:</p>
              <div className="space-y-2">
                <div className="text-sm text-purple-600 bg-purple-50 rounded-lg p-2">
                  "Generate a sunset over mountains"
                </div>
                <div className="text-sm text-purple-600 bg-purple-50 rounded-lg p-2">
                  "Create a cute robot in a garden"
                </div>
                {currentImage && (
                  <div className="text-sm text-indigo-600 bg-indigo-50 rounded-lg p-2">
                    "Make the sky more vibrant"
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center - Main Content */}
          <div className="flex-1 flex flex-col items-center max-w-3xl mx-auto">
            {/* Title */}
            <div className="text-center mb-4">
              <h2 className="text-3xl font-bold text-gray-900 mb-1">
                {currentImage ? 'Your Creation' : 'Speak Your Vision'}
              </h2>
              <p className="text-sm text-gray-600">
                {currentImage ? 'Edit with voice or save your masterpiece' : 'Just describe what you want to see'}
              </p>
            </div>

            {/* Image Display - Smaller, Centered */}
            <div className="w-full max-w-xl mb-6">
              <ImageDisplay
                imageUrl={currentImage}
                isLoading={isLoading}
                onClear={handleClear}
                centered={true}
              />
            </div>

            {/* Voice Control - Compact, Centered */}
            <div className="w-full max-w-md">
              <VoiceControl
                onImageGenerate={handleImageGenerate}
                onImageEdit={handleImageEdit}
                currentImage={currentImage}
                onListeningChange={setIsListening}
                ultraCompact={true}
              />
            </div>

            {/* Mobile Tips - Show below on small screens */}
            <div className="lg:hidden mt-6 flex flex-wrap justify-center gap-2">
              <span className="text-xs text-gray-500">Try:</span>
              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                "Generate a sunset"
              </span>
              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                "Create a robot"
              </span>
            </div>
          </div>

          {/* Right Side - Additional Tips */}
          <div className="hidden lg:block w-48 flex-shrink-0">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick tips:</p>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  <span>Be descriptive for better results</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  <span>You can edit any generated image</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-500">•</span>
                  <span>Click image to view fullscreen</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}