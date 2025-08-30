# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production with Turbopack
npm run build

# Start production server
npm start

# Clear Next.js cache and restart dev (useful for troubleshooting)
rm -rf .next && npm run dev
```

## Architecture Overview

**speak2create** is a voice-controlled AI image generation app using real-time streaming voice input and dual AI system integration.

### Core System Components

**Voice Processing Pipeline:**
- `VoiceControl.tsx`: Manages WebRTC connection to OpenAI Realtime API
- `lib/openai-realtime.ts`: Custom WebRTC client for streaming audio and function calls
- `app/api/session/route.ts`: Creates ephemeral tokens for secure OpenAI connections
- Audio visualization with emerald gradient, spacebar shortcuts

**Image Generation System:**
- `lib/gemini.ts`: Google Gemini 2.5 Flash Image API wrapper with prompt enhancement
- `app/api/generate/route.ts`: New image generation endpoint
- `app/api/edit/route.ts`: Image editing endpoint for modifications
- `ImageDisplay.tsx`: Image viewer with fullscreen, save/download, and clear actions

**AI Decision Logic:**
- OpenAI Realtime API decides between `generate_image` vs `edit_image` function calls
- Critical instructions differentiate generation ("create", "generate") vs editing ("make it", "add", "remove")
- Function calls bridge voice AI → Next.js API → Gemini API

### Key Integration Patterns

**Stale Closure Management:**
This codebase has complex nested callback patterns that require careful state management:
- Use `useRef` to maintain current state in callbacks (especially `currentImageRef`)
- Use `useCallback` with proper dependencies for functions passed to children
- The `startListening` function in VoiceControl recreates with current state to avoid stale closures

**Session Management:**
- Ephemeral tokens (60s expiry) for OpenAI connections
- Session IDs track image generation/edit history
- WebRTC data channel handles bidirectional communication

**Error Handling:**
- Comprehensive console logging at each pipeline stage
- API key validation in all endpoints
- Graceful fallbacks for unsupported browsers (File System Access API)

## Technology Stack

- **Next.js 15.5** with App Router and TypeScript
- **Tailwind CSS v4** (uses `@import "tailwindcss"` not @tailwind directives)
- **OpenAI Realtime API** with WebRTC for voice streaming
- **Google Gemini 2.5 Flash Image Preview** for image generation/editing
- **React 19** with modern hooks patterns

## Environment Variables

Required configuration in `.env.local`:
```bash
# AI API Keys
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here

# Upstash Redis Configuration (Required for rate limiting)
KV_REST_API_URL=your_upstash_url_here
KV_REST_API_TOKEN=your_upstash_token_here
```

## Common Issues & Solutions

**Voice Edit Not Working:**
- Check for stale closures in VoiceControl component
- Verify `currentImageRef.current` has latest state
- Ensure `handleImageEdit` has proper dependencies in useCallback

**Tailwind Not Loading:**
- Verify `globals.css` uses `@import "tailwindcss"` for v4
- Never use `@tailwind` directives with Tailwind CSS v4

**WebRTC Connection Issues:**
- Clear `.next` cache and restart dev server
- Check console for token expiry (60s limit)
- Verify microphone permissions granted

## File Organization

```
app/
├── api/
│   ├── session/     # OpenAI ephemeral token creation
│   ├── generate/    # New image generation via Gemini
│   ├── edit/        # Image modification via Gemini
│   └── usage/       # Rate limit usage information
├── layout.tsx       # Root layout with Analytics integration
├── page.tsx         # Main app with voice/image state management
└── globals.css      # Tailwind v4 imports + custom animations

components/
├── VoiceControl.tsx # WebRTC voice streaming + audio visualization
├── ImageDisplay.tsx # Image viewer + fullscreen modal + save/download
└── UsageLimits.tsx  # Rate limit display (shown when limits reached)

lib/
├── openai-realtime.ts # Custom WebRTC client for OpenAI streaming
├── gemini.ts          # Google Gemini API wrapper with prompt enhancement
├── rate-limit.ts      # Rate limiting logic with Upstash Redis
└── constants.ts       # Rate limits and configuration constants

middleware.ts          # Edge middleware for rate limiting and geo-filtering
```

## State Management Patterns

The app uses React state with careful closure management:
- `currentImage` state flows: Page → VoiceControl → OpenAI function calls
- `isLoading` prevents duplicate requests during generation/editing
- Session IDs maintain context across voice interactions
- Image data passes as base64 data URLs for editing operations

## Cost Optimization Notes

Current per-session costs (~$1.62 for 5 minutes):
- Voice input: ~$0.30
- Voice output: ~$1.20  
- Image generation: ~$0.12 (3 images)

**Cost Protection Implemented:**
- Rate limiting prevents runaway usage (10 generations/hour per IP, 5 per session)
- Geographic filtering blocks abuse-prone regions
- Session-based caps limit individual user consumption
- Fail-safe middleware ensures availability while controlling costs

## Rate Limiting & Security

**Rate Limiting Implementation:**
- IP-based: 10 generations per hour per IP address
- Session-based: 5 images per 20-minute session
- API requests: 20 per minute per IP
- Uses Upstash Redis for distributed rate limiting

**Geographic Filtering:**
- 33 allowed countries including US, Canada, EU, UK, Japan, Singapore, Korea, and major Latin American markets
- Blocks regions commonly associated with abuse/bot traffic
- Returns 403 with user-friendly message for blocked regions

**Middleware Protection:**
- `middleware.ts` handles both rate limiting and geographic filtering
- Runs at edge before reaching API routes
- Fail-open strategy maintains availability if rate limiting fails

**Configuration Files:**
- `lib/rate-limit.ts`: Core rate limiting logic with Upstash integration
- `lib/constants.ts`: Rate limit values and error messages
- `components/UsageLimits.tsx`: User-facing usage display (only shows when limits reached)

## Analytics

**Vercel Analytics Integration:**
- Automatic page view tracking and Core Web Vitals monitoring
- User analytics (geographic, device, browser data)
- Performance insights available in Vercel Dashboard post-deployment
- Zero-configuration setup with `@vercel/analytics/next`