'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { RealtimeClient } from '@/lib/openai-realtime';

interface VoiceControlProps {
  onImageGenerate: (prompt: string) => Promise<void>;
  onImageEdit: (instruction: string) => Promise<void>;
  currentImage: string | null;
}

export default function VoiceControl({ 
  onImageGenerate, 
  onImageEdit, 
  currentImage 
}: VoiceControlProps) {
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState('Click to start speaking');
  const clientRef = useRef<RealtimeClient | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const visualizeAudio = (stream: MediaStream) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgba(17, 24, 39, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;
        
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, 'rgb(99, 102, 241)');
        gradient.addColorStop(1, 'rgb(139, 92, 246)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();
  };

  const startListening = async () => {
    try {
      setIsConnecting(true);
      setStatus('Connecting...');

      // Get session token
      const response = await fetch('/api/session', { method: 'POST' });
      const { token } = await response.json();

      // Initialize realtime client
      const client = new RealtimeClient({
        voice: 'alloy',
        instructions: 'You are a creative assistant helping users generate and edit images through natural voice commands. Listen carefully and use the appropriate function to either generate new images or edit existing ones.',
        tools: [
          {
            type: 'function',
            name: 'generate_image',
            description: 'Generate a new image based on the user description',
            parameters: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Detailed description of the image to generate'
                },
                style: {
                  type: 'string',
                  description: 'Optional style hints (e.g., photorealistic, cartoon, oil painting)'
                }
              },
              required: ['prompt']
            }
          },
          {
            type: 'function',
            name: 'edit_image',
            description: 'Edit the current image based on user instructions',
            parameters: {
              type: 'object',
              properties: {
                instruction: {
                  type: 'string',
                  description: 'Instructions for how to edit the current image'
                }
              },
              required: ['instruction']
            }
          }
        ]
      });

      // Set up event handlers
      client.setOnMessage((event) => {
        if (event.transcript) {
          setTranscript(event.transcript);
        }
      });

      client.setOnFunctionCall(async (name, args) => {
        if (name === 'generate_image') {
          setStatus('Generating image...');
          await onImageGenerate(args.prompt);
          setStatus('Image generated!');
          return { success: true };
        } else if (name === 'edit_image' && currentImage) {
          setStatus('Editing image...');
          await onImageEdit(args.instruction);
          setStatus('Image edited!');
          return { success: true };
        }
        return { success: false, error: 'Function not available' };
      });

      await client.connect(token);
      clientRef.current = client;

      // Set up audio visualization
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      visualizeAudio(stream);

      setIsListening(true);
      setIsConnecting(false);
      setStatus('Listening... Speak your command');
    } catch (error) {
      console.error('Failed to start listening:', error);
      setStatus('Failed to connect. Please try again.');
      setIsConnecting(false);
    }
  };

  const stopListening = () => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsListening(false);
    setStatus('Click to start speaking');
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
      <div className="space-y-4">
        {/* Audio Visualizer */}
        <div className="relative h-32 bg-gray-50 rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            width={640}
            height={128}
            className="w-full h-full"
          />
          {!isListening && !isConnecting && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-500">Audio visualization will appear here</p>
            </div>
          )}
        </div>

        {/* Control Button */}
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={isConnecting}
          className={`w-full py-4 px-6 rounded-xl font-medium transition-all transform hover:scale-105 flex items-center justify-center gap-3 ${
            isListening
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : isConnecting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white'
          }`}
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Connecting...
            </>
          ) : isListening ? (
            <>
              <MicOff className="w-5 h-5" />
              Stop Speaking
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              Start Speaking
            </>
          )}
        </button>

        {/* Status Display */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">{status}</p>
          {transcript && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 italic">"{transcript}"</p>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm font-semibold text-blue-900 mb-2">Try saying:</p>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• "Generate a sunset over mountains"</li>
            <li>• "Create a cute robot in a garden"</li>
            {currentImage && (
              <>
                <li>• "Make the sky more purple"</li>
                <li>• "Add a rainbow to the image"</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}