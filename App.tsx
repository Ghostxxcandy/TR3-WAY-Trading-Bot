
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MarketChart } from './components/MarketChart';
import { geminiService } from './services/gemini';
import { useMarketData } from './hooks/useMarketData';
import { ASSETS, Icons } from './constants';
import { Position, TradingSignal, StrategyMode } from './types';

const App: React.FC = () => {
  const [selectedAsset, setSelectedAsset] = useState('BTC');
  const marketData = useMarketData(selectedAsset);
  
  // Coinbase Connection State
  const [isConnected, setIsConnected] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  
  // Bot State
  const [isBotActive, setIsBotActive] = useState(false);
  const [strategyMode, setStrategyMode] = useState<StrategyMode>(StrategyMode.BALANCED);
  const [balance, setBalance] = useState(10000.00);
  const [positions, setPositions] = useState<Position[]>([]);
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  const currentPrice = useMemo(() => {
    if (marketData.length === 0) return 0;
    return marketData[marketData.length - 1].price;
  }, [marketData]);

  useEffect(() => {
    if (!isBotActive || !isConnected) return;

    const runAnalysis = async () => {
      if (marketData.length < 5) return;
      setIsAnalyzing(true);
      const prices = marketData.map(d => d.price);
      const analysis = await geminiService.analyzeMarket(selectedAsset, prices);
      setAiAnalysis(analysis);
      setIsAnalyzing(false);

      if (analysis.sentiment === 'BULLISH' && analysis.score > 0.65) {
        generateSignal('BUY', analysis.recommendation);
      } else if (analysis.sentiment === 'BEARISH' && analysis.score < -0.65) {
        generateSignal('SELL', analysis.recommendation);
      }
    };

    const interval = setInterval(runAnalysis, 30000);
    runAnalysis();

    return () => clearInterval(interval);
  }, [isBotActive, isConnected, selectedAsset, marketData.length]);

  const generateSignal = useCallback((type: 'BUY' | 'SELL', reason: string) => {
    const newSignal: TradingSignal = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      asset: selectedAsset,
      type,
      strength: Math.floor(Math.random() * 40) + 60,
      reason,
      price: currentPrice
    };
    setSignals(prev => [newSignal, ...prev].slice(0, 10));
    addLog(`Neural Intelligence identified ${type} opportunity for ${selectedAsset}`);
    
    if (isBotActive && isConnected) {
      executeTrade(newSignal);
    }
  }, [selectedAsset, currentPrice, isBotActive, isConnected]);

  const executeTrade = (signal: TradingSignal) => {
    if (signal.type === 'BUY') {
      const riskAmount = balance * 0.1;
      const amount = riskAmount / currentPrice;
      setBalance(prev => prev - riskAmount);
      const newPos: Position = {
        asset: signal.asset,
        entryPrice: currentPrice,
        currentPrice: currentPrice,
        amount,
        pnl: 0,
        pnlPercent: 0
      };
      setPositions(prev => [...prev, newPos]);
      addLog(`CB-ADV: Executed LIMIT BUY for ${amount.toFixed(4)} ${signal.asset} @ $${currentPrice}`);
    } else {
      const posIdx = positions.findIndex(p => p.asset === signal.asset);
      if (posIdx > -1) {
        const pos = positions[posIdx];
        const saleValue = pos.amount * currentPrice;
        setBalance(prev => prev + saleValue);
        setPositions(prev => prev.filter((_, i) => i !== posIdx));
        addLog(`CB-ADV: Executed MARKET SELL. Closed ${pos.asset} position for $${saleValue.toFixed(2)}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#050607] flex flex-col font-sans text-slate-200">
      {/* Header */}
      <header className="border-b border-slate-800 bg-[#0a0b0d]/80 backdrop-blur-xl sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0052FF] rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Icons.Zap />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              AuraTrade <span className="text-[#0052FF] text-sm bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">COINBASE</span>
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Advanced Execution Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Account Balance</p>
            <p className="text-lg font-bold text-white mono">${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          
          <div className="flex gap-3">
            {!isConnected ? (
              <button 
                onClick={() => setShowConnectModal(true)}
                className="bg-[#0052FF] hover:bg-[#0045d9] text-white px-5 py-2 rounded-lg font-bold text-sm transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
              >
                Connect Coinbase
              </button>
            ) : (
              <button 
                onClick={() => {
                  setIsBotActive(!isBotActive);
                  addLog(`Autonomous Bot ${!isBotActive ? 'ARMED' : 'DISARMED'}`);
                }}
                className={`px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 border ${
                  isBotActive 
                    ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20' 
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                }`}
              >
                {isBotActive ? "Stop Autonomous Bot" : "Start Autonomous Bot"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Connection Modal (Simulated) */}
      {showConnectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full space-y-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-[#0052FF] rounded flex items-center justify-center">
                <Icons.Shield />
              </div>
              <h2 className="text-xl font-bold">Coinbase Advanced Trade</h2>
            </div>
            <p className="text-sm text-slate-400">Enter your API credentials to allow AuraTrade to execute autonomous orders on your behalf.</p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">API Key</label>
                <input type="password" value="••••••••••••••••" readOnly className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">API Secret</label>
                <input type="password" value="••••••••••••••••" readOnly className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConnectModal(false)} className="flex-1 py-3 text-sm font-bold text-slate-400 hover:text-white">Cancel</button>
              <button onClick={() => { setIsConnected(true); setShowConnectModal(false); addLog("Coinbase Advanced API Connected Successfully."); }} className="flex-1 bg-[#0052FF] py-3 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20">Connect API</button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-hidden max-w-[1600px] mx-auto w-full">
        {/* Market Analysis Column */}
        <div className="col-span-12 lg:col-span-8 space-y-6 flex flex-col h-full overflow-y-auto no-scrollbar">
          
          {/* Real-time Ticker */}
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Product</p>
                <select 
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className="bg-transparent text-2xl font-black text-white outline-none cursor-pointer focus:text-blue-500 transition-colors"
                >
                  {ASSETS.map(a => <option key={a} value={a} className="bg-slate-900">{a}-USD</option>)}
                </select>
              </div>
              <div className="h-10 w-px bg-slate-800 hidden md:block" />
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mark Price (Live)</p>
                <p className="text-2xl font-black text-white mono">
                  ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="h-10 w-px bg-slate-800 hidden md:block" />
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">24h Change</p>
                <p className="text-lg font-bold text-emerald-400">+1.42%</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded text-[10px] font-bold flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE COINBASE DATA
              </div>
            </div>
          </div>

          {/* Chart Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                {['1M', '15M', '1H', '1D', '1W'].map(tf => (
                  <button key={tf} className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${tf === '1M' ? 'bg-[#0052FF] text-white' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>
                    {tf}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold">
                <Icons.Activity />
                SOURCE: CB-PRO-WEBSOCKET
              </div>
            </div>
            <div className="flex-1 min-h-[400px]">
              <MarketChart data={marketData} color="#0052FF" />
            </div>
          </div>

          {/* Asset Positions */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Advanced Inventory</h3>
              <div className="flex items-center gap-4 text-[10px] font-bold">
                <span className="text-slate-600">UNREALIZED PNL</span>
                <span className="text-emerald-400">+$142.50</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-slate-500 uppercase tracking-widest border-b border-slate-800/50 bg-slate-950/30">
                    <th className="px-6 py-4">Instrument</th>
                    <th className="px-6 py-4">Size</th>
                    <th className="px-6 py-4">Avg Entry</th>
                    <th className="px-6 py-4">Oracle Price</th>
                    <th className="px-6 py-4">Position PnL</th>
                    <th className="px-6 py-4 text-right">Liquidation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {positions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-slate-600 font-bold uppercase text-xs tracking-widest">
                        Zero Exposure Detected
                      </td>
                    </tr>
                  ) : positions.map((pos, idx) => (
                    <tr key={idx} className="hover:bg-blue-500/5 transition-colors group">
                      <td className="px-6 py-4 font-black text-white">{pos.asset}-USD</td>
                      <td className="px-6 py-4 text-slate-400 mono font-bold">{pos.amount.toFixed(4)}</td>
                      <td className="px-6 py-4 text-slate-400 mono">${pos.entryPrice.toLocaleString()}</td>
                      <td className="px-6 py-4 text-slate-400 mono font-bold group-hover:text-blue-400 transition-colors">${currentPrice.toLocaleString()}</td>
                      <td className={`px-6 py-4 font-black mono ${currentPrice > pos.entryPrice ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {currentPrice > pos.entryPrice ? '+' : ''}${( (currentPrice - pos.entryPrice) * pos.amount ).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-[10px] font-black text-rose-500 uppercase border border-rose-500/20 px-2 py-1 rounded hover:bg-rose-500/10">Market Close</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Neural Engine Column */}
        <div className="col-span-12 lg:col-span-4 space-y-6 flex flex-col h-full overflow-hidden">
          
          {/* AI Reasoning Dashboard */}
          <div className="bg-[#0052FF] rounded-3xl p-6 text-white relative overflow-hidden shadow-xl shadow-blue-500/20">
            <div className="absolute -right-8 -bottom-8 opacity-20 transform rotate-12">
              <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
            </div>
            <h3 className="font-black uppercase tracking-widest text-[10px] mb-4 opacity-80">Gemini Neural Reasoning</h3>
            
            {!isConnected ? (
              <div className="space-y-2">
                <p className="text-xl font-bold">API Offline</p>
                <p className="text-xs opacity-70">Neural engine requires a secure handshake with Coinbase Advanced Trade to initiate analysis.</p>
              </div>
            ) : isAnalyzing ? (
              <div className="space-y-4">
                <div className="h-6 bg-white/20 rounded animate-pulse w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-white/10 rounded animate-pulse"></div>
                  <div className="h-4 bg-white/10 rounded animate-pulse w-5/6"></div>
                </div>
              </div>
            ) : aiAnalysis ? (
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="bg-white text-[#0052FF] px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest">
                    {aiAnalysis.sentiment}
                  </div>
                  <div className="text-[10px] font-black tracking-widest">CONF: {(Math.abs(aiAnalysis.score) * 100).toFixed(0)}%</div>
                </div>
                <p className="text-sm font-medium leading-relaxed">
                  {aiAnalysis.summary}
                </p>
                <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                  <p className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-60">Strategic Instruction</p>
                  <p className="text-xs font-bold italic">"{aiAnalysis.recommendation}"</p>
                </div>
              </div>
            ) : (
              <p className="text-xs opacity-60">Awaiting market signal synchronization...</p>
            )}
          </div>

          {/* Advanced Risk Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center justify-between">
              Order parameters
              <Icons.Shield />
            </h3>
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-2">
                {[StrategyMode.CONSERVATIVE, StrategyMode.BALANCED, StrategyMode.AGGRESSIVE].map(m => (
                  <button 
                    key={m}
                    onClick={() => setStrategyMode(m)}
                    className={`py-3 text-[9px] font-black uppercase rounded-xl border transition-all ${
                      strategyMode === m 
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                        : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Max Order Value</span>
                  <span className="text-xs font-bold text-white mono">10% Portfolio</span>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="w-[10%] h-full bg-blue-500" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Slippage Tolerance</span>
                  <span className="text-xs font-bold text-white mono">0.5%</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Post-Only Logic</span>
                  <div className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors cursor-pointer ${isConnected ? 'bg-blue-600' : 'bg-slate-700'}`}>
                    <div className="w-3 h-3 bg-white rounded-full shadow-sm ml-auto" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Telemetry Stream */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl flex-1 flex flex-col min-h-0">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2 bg-slate-950/20">
              <Icons.Activity />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Live Telemetry</h3>
            </div>
            <div className="flex-1 p-4 overflow-y-auto no-scrollbar font-mono text-[10px] leading-relaxed space-y-2 h-0">
              {logs.length === 0 ? (
                <div className="text-slate-700 font-bold uppercase tracking-widest">Establishing secure link...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="flex gap-3 border-l-2 border-slate-800 pl-3">
                    <span className="text-slate-600 font-bold opacity-50">{new Date().toLocaleTimeString([], { hour12: false })}</span>
                    <span className={log.includes('CB-ADV:') ? 'text-blue-400 font-bold' : log.includes('identified') ? 'text-amber-400' : 'text-slate-400'}>
                      {log}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Industrial Footer */}
      <footer className="border-t border-slate-800 bg-black/40 px-6 py-2 flex items-center justify-between text-[9px] font-black tracking-widest text-slate-600 uppercase">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-blue-500 animate-pulse' : 'bg-slate-700'}`} />
            <span>COINBASE EXCHANGE: {isConnected ? 'CONNECTED' : 'STANDBY'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>GEMINI NEURAL: ACTIVE</span>
          </div>
        </div>
        <div className="flex gap-6">
          <span>LATENCY: 12ms</span>
          <span>AUTH: JWT-256-SIGN</span>
          <span className="text-blue-500/50">SECURE TERMINAL / AURA_V4.2</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
