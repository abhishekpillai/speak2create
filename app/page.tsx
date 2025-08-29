'use client';

import { useState } from 'react';
import VoiceControl from '@/components/VoiceControl';
import ImageDisplay from '@/components/ImageDisplay';
import { Sparkles, Wand2 } from 'lucide-react';

export default function Home() {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  speak2create
                </h1>
                <p className="text-sm text-gray-600">Voice-powered image generation</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Wand2 className="w-4 h-4" />
              <span className="hidden sm:inline">Powered by AI</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Voice Control */}
          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Speak Your Vision
              </h2>
              <p className="text-gray-600">
                Just describe what you want to see, and watch it come to life
              </p>
            </div>
            
            <VoiceControl
              onImageGenerate={handleImageGenerate}
              onImageEdit={handleImageEdit}
              currentImage={currentImage}
            />
          </div>

          {/* Right Column - Image Display */}
          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Your Creation
              </h2>
              <p className="text-gray-600">
                {currentImage ? 'Edit with voice or save your masterpiece' : 'Your image will appear here'}
              </p>
            </div>
            
            <ImageDisplay
              imageUrl={currentImage}
              isLoading={isLoading}
              onClear={handleClear}
            />
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Natural Voice Commands</h3>
            <p className="text-sm text-gray-600">
              Simply speak what you imagine, no typing or complex tools needed
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Wand2 className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Iterative Editing</h3>
            <p className="text-sm text-gray-600">
              Refine your creations with follow-up voice commands
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Instant Results</h3>
            <p className="text-sm text-gray-600">
              Watch your ideas transform into images in seconds
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            speak2create - Transform voice into visual reality
          </p>
        </div>
      </footer>
    </div>
  );
}