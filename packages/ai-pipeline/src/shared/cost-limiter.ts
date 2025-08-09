interface DailyCosts {
  openai_chat: number;    // GPT-4o-mini costs
  openai_images: number;  // DALL-E 3 costs  
  stability_ai: number;   // SDXL preview costs
  total: number;
}

interface CostLimits {
  daily_openai_chat: number;    // £5 per day
  daily_openai_images: number;  // £30 per day  
  daily_stability_ai: number;   // £10 per day
  daily_total: number;          // £40 per day
}

export class CostLimiter {
  private limits: CostLimits = {
    daily_openai_chat: 500,     // £5.00 in pence
    daily_openai_images: 3000,  // £30.00 in pence
    daily_stability_ai: 1000,   // £10.00 in pence
    daily_total: 4000,          // £40.00 in pence
  };

  private costs: DailyCosts = {
    openai_chat: 0,
    openai_images: 0,
    stability_ai: 0,
    total: 0,
  };

  private lastReset: string = this.getTodayKey();

  constructor(private storage?: any) {
    // Load today's costs from storage if available
    this.loadTodayCosts();
  }

  async checkCanGenerate(service: 'openai_chat' | 'openai_images' | 'stability_ai'): Promise<boolean> {
    this.resetIfNewDay();
    
    const serviceCost = this.costs[service];
    const serviceLimit = this.limits[`daily_${service}`];
    
    if (serviceCost >= serviceLimit) {
      console.warn(`Daily limit reached for ${service}: £${serviceCost/100} / £${serviceLimit/100}`);
      return false;
    }

    if (this.costs.total >= this.limits.daily_total) {
      console.warn(`Daily total limit reached: £${this.costs.total/100} / £${this.limits.daily_total/100}`);
      return false;
    }

    return true;
  }

  async recordCost(service: 'openai_chat' | 'openai_images' | 'stability_ai', costInPence: number): Promise<void> {
    this.resetIfNewDay();
    
    this.costs[service] += costInPence;
    this.costs.total += costInPence;
    
    // Save to storage
    await this.saveTodayCosts();
    
    console.log(`Cost recorded - ${service}: +£${costInPence/100} (total today: £${this.costs.total/100})`);
  }

  getDailyCosts(): DailyCosts & { limits: CostLimits; date: string } {
    this.resetIfNewDay();
    return {
      ...this.costs,
      limits: this.limits,
      date: this.getTodayKey(),
    };
  }

  getRemainingBudget(): DailyCosts {
    this.resetIfNewDay();
    return {
      openai_chat: Math.max(0, this.limits.daily_openai_chat - this.costs.openai_chat),
      openai_images: Math.max(0, this.limits.daily_openai_images - this.costs.openai_images),
      stability_ai: Math.max(0, this.limits.daily_stability_ai - this.costs.stability_ai),
      total: Math.max(0, this.limits.daily_total - this.costs.total),
    };
  }

  private resetIfNewDay(): void {
    const today = this.getTodayKey();
    if (this.lastReset !== today) {
      console.log(`New day detected, resetting costs. Previous: ${this.lastReset}, Current: ${today}`);
      this.costs = {
        openai_chat: 0,
        openai_images: 0,
        stability_ai: 0,
        total: 0,
      };
      this.lastReset = today;
      this.saveTodayCosts();
    }
  }

  private getTodayKey(): string {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private async loadTodayCosts(): Promise<void> {
    if (!this.storage) return;
    
    try {
      const today = this.getTodayKey();
      const stored = await this.storage.get(`costs:${today}`);
      if (stored) {
        const data = JSON.parse(stored);
        this.costs = data.costs || this.costs;
        this.lastReset = data.date || today;
      }
    } catch (error) {
      console.warn('Failed to load daily costs:', error);
    }
  }

  private async saveTodayCosts(): Promise<void> {
    if (!this.storage) return;
    
    try {
      const today = this.getTodayKey();
      const data = {
        costs: this.costs,
        date: today,
        updated: new Date().toISOString(),
      };
      await this.storage.set(`costs:${today}`, JSON.stringify(data), 86400); // 24 hour TTL
    } catch (error) {
      console.warn('Failed to save daily costs:', error);
    }
  }
}

// Cost constants (in pence)
export const COSTS = {
  GPT_4O_MINI_PER_1K_TOKENS: 0.015,  // £0.000015 per token
  DALLE_3_HD_1024: 4,                // £0.04 per HD image
  SDXL_512: 0.2,                     // £0.002 per SDXL image
};

export class CostCalculator {
  static estimatePromptCost(prompt: string, response: string = ''): number {
    // Rough token estimation: 1 token ≈ 4 characters
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(response.length / 4);
    const totalTokens = inputTokens + outputTokens;
    
    // GPT-4o-mini: £0.015 per 1K tokens
    return Math.ceil((totalTokens / 1000) * COSTS.GPT_4O_MINI_PER_1K_TOKENS * 100); // Convert to pence
  }
}