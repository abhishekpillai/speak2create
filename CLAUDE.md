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

# Run test suite
npm run test

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
- `lib/memegen.ts`: Memegen.link API integration with template search and fuzzy matching
- `app/api/meme/route.ts`: Meme generation endpoint with rate limiting
- `ImageDisplay.tsx`: Image viewer with fullscreen, save/download, and clear actions

**AI Decision Logic:**
- OpenAI Realtime API decides between `generate_image`, `edit_image`, and `create_meme` function calls
- Recognizes meme requests through natural language (e.g., "Drake meme", "distracted boyfriend")
- Critical instructions differentiate generation ("create", "generate") vs editing ("make it", "add", "remove") vs meme creation
- Function calls bridge voice AI → Next.js API → Gemini/Memegen APIs

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

### Meme Generation System

**Template Recognition & Matching:**
- Natural language meme template search with fuzzy matching
- Support for 100+ popular meme formats from memegen.link
- Aliases for common meme names (e.g., "Drake pointing" → "drake")
- Voice commands like "Create a Drake meme about coffee"

**Integration Flow:**
1. Voice command recognized with "meme" keywords
2. OpenAI calls `create_meme` function with template and text
3. Template fuzzy search finds best match
4. Memegen.link API generates meme with proper text encoding
5. Image returned as base64 data URL for consistency
6. Meme becomes editable with existing image editing features

**Popular Templates:**
- Drake (Drakeposting)
- Distracted Boyfriend
- Woman Yelling at Cat
- Expanding Brain
- Two Buttons
- Success Kid
- Change My Mind

**Text Encoding:**
- Spaces converted to underscores
- Special characters properly escaped for URL
- Support for multi-panel memes with custom text arrays

## Testing Strategy

**Framework & Configuration:**
- **Vitest v1.6.0**: Modern testing framework with TypeScript support
- **Node environment**: Tests run in Node.js environment for API route testing
- **Global test utilities**: Vitest globals enabled for describe/it/expect
- **Path aliases**: `@` alias resolves to project root for clean imports

**Test Coverage:**
- **API Routes**: Comprehensive tests for `/api/generate` and `/api/edit` endpoints
- **Utility Functions**: Tests for Gemini client and rate limiting logic
- **Mocking Strategy**: Vi mocks for external dependencies (Redis, AI APIs)
- **Error Scenarios**: Rate limiting, API failures, and validation edge cases

**Test File Organization:**
- Co-located with source files using `*.test.ts` pattern
- API route tests in `app/api/*/route.test.ts`
- Utility tests in `lib/*.test.ts`
- Tests excluded from production builds via `tsconfig.build.json`

**Best Practices:**
- Mock external services to avoid API costs during testing
- Test both success and failure scenarios
- Use descriptive test names that explain the scenario
- Validate response status codes, headers, and body content

## AI Prompting Documentation

When updating AI prompts or system instructions, reference these comprehensive guides:

**Gemini 2.5 Flash Image Prompting:**
- `docs/gemini-flash-image-prompting-guide.md`: Official Google guide for optimal image generation prompts
- Key principles: Describe scenes narratively vs keywords, specify camera angles/lighting for photorealism, mention artistic styles/mediums
- Templates for photorealistic scenes, creative artwork, product shots, logos with text rendering
- Best practices for iterative editing and multi-image composition

**OpenAI Realtime API Prompting:**
- `docs/openai-realtime-prompting-guide.md`: Official OpenAI guide for voice-to-voice system prompts
- Voice-specific techniques: Response pacing, speech patterns, emotional tone control
- Tool calling in conversational context, function preambles, sample phrases
- State machine conversation flows, dynamic conversation management
- Audio quality handling (background noise, unclear speech, interruptions)

**Implementation Guidelines:**
- Always consult both guides before modifying prompts in `VoiceControl.tsx` or `lib/gemini.ts`
- Test prompt changes with diverse voice inputs and image generation scenarios
- Maintain consistency between Realtime API instructions and Gemini prompt enhancement
- Document any custom prompt patterns or successful optimizations in these guides

## Technology Stack

- **Next.js 15.5** with App Router and TypeScript
- **Tailwind CSS v4** (uses `@import "tailwindcss"` not @tailwind directives)
- **OpenAI Realtime API** with WebRTC for voice streaming
- **Google Gemini 2.5 Flash Image Preview** for image generation/editing
- **React 19** with modern hooks patterns
- **Vitest v1.6.0** for testing with TypeScript support
- **UUID v11.1.0** for session ID generation
- **ts-node v10.9.2** for TypeScript execution in test environments

## Environment Variables

Required configuration in `.env.local` (see `.env.example` for complete template):

```bash
# AI API Keys
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here

# Upstash Redis Configuration (Required for rate limiting)
KV_REST_API_URL=your_upstash_url_here
KV_REST_API_TOKEN=your_upstash_token_here

# Application Settings
NEXT_PUBLIC_APP_NAME=speak2create
NEXT_PUBLIC_API_URL=http://localhost:3000

# Rate Limit Overrides (optional - defaults are in lib/constants.ts)
# RATE_LIMIT_IP_GENERATIONS_PER_HOUR=5
# RATE_LIMIT_SESSION_IMAGES_LIMIT=3
# RATE_LIMIT_SESSION_WINDOW_MINUTES=30
```

## Build Process

**Production Build Configuration:**
- **tsconfig.build.json**: Extends main tsconfig.json with test file exclusions
- **Test File Exclusion**: All `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx` files excluded from production build
- **Vitest Config Exclusion**: `vitest.config.ts` excluded from build output
- **Turbopack Integration**: Both dev and build use `--turbopack` for faster compilation

**Build Optimization:**
- Separate build configuration prevents test files from increasing bundle size
- Test dependencies (Vitest, ts-node) only in devDependencies
- Clean separation between development/test code and production artifacts

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

**Meme Generation Not Working:**
- Verify memegen.link API is accessible (no API key required)
- Check template name matches available templates
- Ensure text doesn't contain problematic special characters
- Review rate limiting if getting 429 errors

## File Organization

```
app/
├── api/
│   ├── session/       # OpenAI ephemeral token creation
│   ├── generate/      # New image generation via Gemini
│   │   └── route.test.ts  # API route tests
│   ├── edit/          # Image modification via Gemini
│   │   └── route.test.ts  # API route tests
│   ├── meme/          # Meme generation via memegen.link
│   └── usage/         # Rate limit usage information
├── layout.tsx         # Root layout with Analytics integration
├── page.tsx           # Main app with voice/image state management
├── opengraph-image.tsx # Open Graph image generation
└── globals.css        # Tailwind v4 imports + custom animations

components/
├── VoiceControl.tsx   # WebRTC voice streaming + audio visualization
├── ImageDisplay.tsx   # Image viewer + fullscreen modal + save/download
└── UsageLimits.tsx    # Rate limit display (shown when limits reached)

lib/
├── openai-realtime.ts # Custom WebRTC client for OpenAI streaming
├── gemini.ts          # Google Gemini API wrapper with prompt enhancement
├── gemini.test.ts     # Gemini client tests
├── memegen.ts         # Memegen.link API client with template matching
├── rate-limit.ts      # Rate limiting logic with Upstash Redis
├── rate-limit.test.ts # Rate limiting tests
└── constants.ts       # Rate limits and configuration constants

middleware.ts          # Edge middleware for rate limiting and geo-filtering
vitest.config.ts       # Vitest testing configuration
tsconfig.build.json    # Production build TypeScript config (excludes tests)
.env.example          # Environment variable template
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
- Meme generation: $0.00 (free via memegen.link, rate limited for abuse prevention)

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

## Development Workflow

**Testing Best Practices:**
- Run tests before commits: `npm run test`
- Write tests for new API endpoints and utility functions
- Mock external services to avoid API costs during development
- Use descriptive test names that explain business scenarios

**Branch-Based Development:**
- Feature branches follow pattern: `codex/feature-description-hash`
- No automated CI/CD currently configured (manual testing required)
- Pull requests merge to main branch for deployment

**Code Quality:**
- TypeScript strict mode enabled for type safety
- Test files co-located with source code for maintainability
- Production builds automatically exclude test files
- Environment variables validated at runtime in API routes