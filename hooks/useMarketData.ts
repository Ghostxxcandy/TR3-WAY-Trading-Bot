
import { useState, useEffect, useRef } from 'react';
import { PricePoint } from '../types';

export function useMarketData(asset: string) {
  const [data, setData] = useState<PricePoint[]>([]);
  const lastPriceRef = useRef<number>(0);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Map common assets to Coinbase pair (assumes USD base)
        const product = asset.includes('/') ? asset.replace('/', '-') : `${asset}-USD`;
        
        // Fetch last 60 minutes of data (granularity 60 = 1 minute)
        const response = await fetch(`https://api.exchange.coinbase.com/products/${product}/candles?granularity=60`);
        const candles = await response.json();
        
        if (Array.isArray(candles)) {
          // Coinbase returns [time, low, high, open, close, volume]
          const formattedData: PricePoint[] = candles.reverse().slice(-30).map((c: any) => ({
            time: new Date(c[0] * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            price: c[4], // close price
            volume: c[5]
          }));
          
          setData(formattedData);
          if (formattedData.length > 0) {
            lastPriceRef.current = formattedData[formattedData.length - 1].price;
          }
        }
      } catch (error) {
        console.error("Coinbase API Error:", error);
      }
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [asset]);

  return data;
}
