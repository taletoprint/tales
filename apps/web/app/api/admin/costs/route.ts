import { NextRequest, NextResponse } from 'next/server';
import { CostLimiter } from '@taletoprint/ai-pipeline';

export async function GET(request: NextRequest) {
  try {
    // Simple auth check - in production, use proper authentication
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const costLimiter = new CostLimiter();
    const dailyCosts = costLimiter.getDailyCosts();
    const remainingBudget = costLimiter.getRemainingBudget();

    return NextResponse.json({
      date: dailyCosts.date,
      costs: {
        openai_chat: `£${(dailyCosts.openai_chat / 100).toFixed(3)}`,
        openai_images: `£${(dailyCosts.openai_images / 100).toFixed(2)}`,
        stability_ai: `£${(dailyCosts.stability_ai / 100).toFixed(3)}`,
        total: `£${(dailyCosts.total / 100).toFixed(2)}`,
      },
      limits: {
        openai_chat: `£${(dailyCosts.limits.daily_openai_chat / 100).toFixed(2)}`,
        openai_images: `£${(dailyCosts.limits.daily_openai_images / 100).toFixed(2)}`,
        stability_ai: `£${(dailyCosts.limits.daily_stability_ai / 100).toFixed(2)}`,
        total: `£${(dailyCosts.limits.daily_total / 100).toFixed(2)}`,
      },
      remaining: {
        openai_chat: `£${(remainingBudget.openai_chat / 100).toFixed(3)}`,
        openai_images: `£${(remainingBudget.openai_images / 100).toFixed(2)}`,
        stability_ai: `£${(remainingBudget.stability_ai / 100).toFixed(3)}`,
        total: `£${(remainingBudget.total / 100).toFixed(2)}`,
      },
      utilization: {
        openai_chat: `${((dailyCosts.openai_chat / dailyCosts.limits.daily_openai_chat) * 100).toFixed(1)}%`,
        openai_images: `${((dailyCosts.openai_images / dailyCosts.limits.daily_openai_images) * 100).toFixed(1)}%`,
        stability_ai: `${((dailyCosts.stability_ai / dailyCosts.limits.daily_stability_ai) * 100).toFixed(1)}%`,
        total: `${((dailyCosts.total / dailyCosts.limits.daily_total) * 100).toFixed(1)}%`,
      }
    });

  } catch (error) {
    console.error('Cost monitoring error:', error);
    
    return NextResponse.json(
      { error: 'Failed to retrieve cost data' },
      { status: 500 }
    );
  }
}