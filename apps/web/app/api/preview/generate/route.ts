import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ArtStyle, PreviewResult, Aspect } from '@/lib/types';
import { ImageOrientation } from '@/lib/types';
import { SimpleAIGenerator } from '@/lib/ai-services';

class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

const requestSchema = z.object({
  story: z.string().min(20).max(500),
  style: z.nativeEnum(ArtStyle),
  aspect: z.enum(["portrait", "landscape", "square"]),
  printSize: z.enum(["A4", "A3"]).optional().default("A3"),
});

// Initialize the preview generator and rate limiter
// let previewGenerator: PreviewGenerator | null = null;
// let rateLimiter: ReturnType<typeof createRateLimiter> | null = null;

// function getRateLimiter() {
//   if (!rateLimiter) {
//     rateLimiter = createRateLimiter('preview', process.env.REDIS_URL);
//   }
//   return rateLimiter;
// }

// Initialize AI generator
let aiGenerator: SimpleAIGenerator | null = null;

function getAIGenerator(): SimpleAIGenerator {
  if (!aiGenerator) {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    const useOpenAI = process.env.USE_OPENAI_PROMPTS !== 'false'; // Default to true, disable with 'false'
    
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    if (!replicateToken) {
      throw new Error('REPLICATE_API_TOKEN environment variable is required');
    }

    aiGenerator = new SimpleAIGenerator(openaiApiKey, replicateToken, useOpenAI);
  }

  return aiGenerator;
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = requestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: validation.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }
    
    const { story, style, aspect, printSize } = validation.data;
    
    // Get user identifier (IP address)
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Check if we have required API keys
    if (!process.env.OPENAI_API_KEY || !process.env.REPLICATE_API_TOKEN) {
      console.log('Missing API keys, using mock generation');
      // Fallback to mock if API keys not configured
      const mockPreview: PreviewResult = {
        id: `mock-preview-${Date.now()}`,
        imageUrl: `https://via.placeholder.com/800x600.png?text=Preview+${style}`,
        prompt: `A ${style.toLowerCase().replace('_', ' ')} artwork depicting: ${story.substring(0, 50)}...`,
        refinedPrompt: `A ${style.toLowerCase().replace('_', ' ')} artwork depicting: ${story.substring(0, 50)}...`,
        story: story, // Include original story
        aspect: aspect as Aspect,
        style: style as any,
        timestamp: Date.now(),
        isPreview: true,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          generationTime: 0,
          cost: 0,
          styleKeywords: [style],
          dimensions: { width: 800, height: 600 },
        },
      };
      
      return NextResponse.json({
        preview: mockPreview,
        remainingAttempts: 2,
        requiresEmail: false,
      });
    }

    // Check rate limit - temporarily disabled
    // const limiter = getRateLimiter();
    // const rateLimitResult = await limiter.check({ type: 'ip', value: ip });
    
    // if (!rateLimitResult.allowed) {
    //   throw new RateLimitError('Daily limit reached');
    // }
    const rateLimitResult = { remaining: 2 }; // Mock for now
    
    console.log(`Generating AI preview for story: "${story.substring(0, 50)}..." in ${style} style`);
    
    // Generate real AI preview
    const generator = getAIGenerator();
    const result = await generator.generatePreview({
      story,
      style,
      aspect,
      ipAddress: ip,
      // userId: undefined (no user auth in preview generation)
    });

    // Convert to API format
    const preview: PreviewResult = {
      id: result.id,
      imageUrl: result.imageUrl,
      prompt: result.prompt,
      refinedPrompt: result.refinedPrompt,
      story: story, // Include original story
      aspect: result.aspect,
      style: result.style as any,
      timestamp: result.timestamp,
      isPreview: result.isPreview,
      expiresAt: result.expiresAt,
      metadata: {
        ...result.metadata,
      },
    };
    
    console.log(`Preview generated successfully: ${preview.id}`);
    
    return NextResponse.json({
      preview,
      remainingAttempts: rateLimitResult.remaining,
      requiresEmail: rateLimitResult.remaining <= 0,
      metadata: {
        generationTime: preview.metadata?.generationTime || 0,
        cost: preview.metadata?.cost || 0,
        styleKeywords: preview.metadata?.styleKeywords || [],
      },
    });
    
  } catch (error) {
    console.error('Preview generation error:', error);
    
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: 'RATE_LIMITED', message: 'Daily limit reached' },
        { status: 429 }
      );
    }

    // Check if it's an API key or configuration error
    if (error instanceof Error && (
      error.message.includes('API key') || 
      error.message.includes('environment variable')
    )) {
      return NextResponse.json(
        { error: 'CONFIGURATION_ERROR', message: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'GENERATION_FAILED', 
        message: error instanceof Error ? error.message : 'Failed to generate preview'
      },
      { status: 500 }
    );
  }
}