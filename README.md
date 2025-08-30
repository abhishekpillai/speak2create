# speak2create

Transform your voice into stunning images with AI-powered generation. Simply speak what you imagine and watch it come to life.

## Features

- 🎤 **Natural Voice Commands** - Just speak what you want to create
- 🎨 **AI Image Generation** - Powered by Google Gemini 2.5 Flash
- ✏️ **Voice-Controlled Editing** - Refine images with follow-up commands
- 🚀 **Real-time Processing** - WebRTC connection for instant voice streaming
- 💾 **Save & Download** - Export your creations with one click

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Voice Processing**: OpenAI Realtime API (WebRTC)
- **Image Generation**: Google Gemini 2.5 Flash Image Preview
- **Deployment**: Vercel-ready

## Prerequisites

You'll need API keys for:
- OpenAI (for Realtime voice API)
- Google Gemini (for image generation)

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/speak2create.git
cd speak2create
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API keys:
```
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Click "Start Creating" to begin
2. Describe the image you want to create
3. Watch as your voice transforms into an image
4. Continue speaking to edit and refine your creation
5. Save or download when you're happy with the result

### Example Voice Commands

**For Generation:**
- "Create a sunset over mountains with purple clouds"
- "Generate a cute robot playing in a garden"
- "Make a logo for a coffee shop called Bean Dreams"

**For Editing (after an image exists):**
- "Make the sky more vibrant"
- "Add a rainbow in the background"
- "Change the color to blue"
- "Remove the clouds"

## Architecture

```
speak2create/
├── app/
│   ├── api/
│   │   ├── session/     # OpenAI token management
│   │   ├── generate/    # Image generation endpoint
│   │   └── edit/        # Image editing endpoint
│   └── page.tsx         # Main application
├── components/
│   ├── VoiceControl.tsx # Voice input & WebRTC
│   └── ImageDisplay.tsx # Image viewer & controls
├── lib/
│   ├── openai-realtime.ts # WebRTC connection handler
│   └── gemini.ts          # Gemini API wrapper
└── public/
```

## API Costs

Estimated per 5-minute session:
- Voice input: ~$0.30
- Voice output: ~$1.20  
- Image generation: ~$0.12 (3 images)
- **Total**: ~$1.62 per session

## Deployment

The app is configured for easy deployment on Vercel:

```bash
vercel deploy
```

Make sure to add your environment variables in the Vercel dashboard.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

- OpenAI for the Realtime API
- Google for Gemini image generation
- The Next.js team for an amazing framework