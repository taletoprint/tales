import { NextRequest, NextResponse } from 'next/server';
import { SimpleAIGenerator } from '@/lib/ai-services';

export async function POST(request: NextRequest) {
  try {
    const { previewData } = await request.json();
    
    if (!previewData) {
      return NextResponse.json({ error: 'Preview data required' }, { status: 400 });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    
    if (!openaiApiKey || !replicateToken) {
      return NextResponse.json({ error: 'Missing API keys' }, { status: 500 });
    }

    console.log('Testing HD upscale for preview:', previewData.id);
    
    const generator = new SimpleAIGenerator(openaiApiKey, replicateToken);
    const hdImageUrl = await generator.generateHDPrint(previewData);
    
    console.log('HD Image URL returned:', hdImageUrl);
    console.log('HD Image URL type:', typeof hdImageUrl);
    console.log('HD Image URL length:', hdImageUrl?.length);
    
    return NextResponse.json({
      success: true,
      previewId: previewData.id,
      hdImageUrl,
      pipeline: 'Pure Real-ESRGAN upscale',
      message: 'HD print generated successfully using pure upscale (zero drift)'
    });

  } catch (error) {
    console.error('HD upscale test failed:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    return NextResponse.json({
      error: 'HD upscale failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      pipeline: 'Pure Real-ESRGAN upscale'
    }, { status: 500 });
  }
}