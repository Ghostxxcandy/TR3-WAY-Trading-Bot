
export interface PricePoint {
  time: string;
  price: number;
  volume: number;
}

export interface TradingSignal {
  id: string;
  timestamp: Date;
  asset: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  strength: number; // 0 to 100
  reason: string;
  price: number;
}

export interface Position {
  asset: string;
  entryPrice: number;
  currentPrice: number;
  amount: number;
  pnl: number;
  pnlPercent: number;
}

export interface MarketSentiment {
  score: number; // -1 to 1
  label: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  summary: string;
}

export enum StrategyMode {
  CONSERVATIVE = 'CONSERVATIVE',
  BALANCED = 'BALANCED',
  AGGRESSIVE = 'AGGRESSIVE',
  CUSTOM = 'CUSTOM'
}
