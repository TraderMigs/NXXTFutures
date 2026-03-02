import { useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, Upload,
  Copy, Check, TrendingUp, TrendingDown, Zap, BarChart3,
  ChevronDown, Search, Download, X, Layers, BookOpen,
  Star, Shield, Target, DollarSign, HelpCircle, AlertOctagon, ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTier } from '../contexts/TierContext';
import { Lock } from 'lucide-react';
import { FUTURES_SYMBOLS, formatFuturesPrice, calcContracts, FUTURES_MAP, FUTURES_CATEGORIES } from '../lib/futuresSymbols';
import { AccountPanel } from '../components/AccountPanel';
import { AnalysisTheater } from '../components/AnalysisTheater';

const TIMEFRAMES = [
  { label: '15 Minutes', value: '15min' },
  { label: '30 Minutes', value: '30min' },
  { label: '1 Hour',     value: '1h'    },
  { label: '4 Hours',    value: '4h'    },
  { label: 'Daily',      value: '1day'  },
  { label: 'Weekly',     value: '1week' },
];

function CopyBtn({ value }: { value: string | number }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(String(value));
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  };
  return (
    <button onClick={copy} className={`ml-1 p-1 rounded transition-all ${done ? 'text-amber-400' : 'text-gray-700 hover:text-gray-400'}`}>
      {done ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

interface NewbieData {
  what_is_happening: string;
  direction_explained: string;
  big_picture: string;
  entry_explained: string;
  confirmation_explained: string;
  stop_loss_explained: string;
  targets_explained: string;
  smc_elements_plain: string[];
  what_to_do_step_by_step: string[];
  risk_reality_check: string;
  confidence_plain: string;
}

interface AnalysisResult {
  pair: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  is_counter_trend?: boolean;
  current_price: number;
  chart_high: number;
  chart_low: number;
  entry_zone_min: number;
  entry_zone_max: number;
  tp1: number; tp1_pips: number;
  tp2: number; tp2_pips: number;
  tp3: number; tp3_pips: number;
  stop_loss: number; sl_pips: number;
  risk_reward: string;
  reasoning: string[];
  setup_status?: 'PENDING' | 'AT_ENTRY' | 'MISSED';
  setup_status_note?: string;
  higher_tf_bias?: string;
  higher_tf_used?: string;
  lower_tf_used?: string;
  entry_validation?: {
    confirmation_signal?: string;
    entry_trigger?: string;
    invalidation_price?: number;
    invalidation_signal?: string;
    candles_to_wait?: number;
    key_warning?: string;
  };
  newbie?: NewbieData;
}

// ── Tab selector component ─────────────────────────────────────────────────────
function DetailTabs({ active, onChange }: { active: 'elite' | 'newbie'; onChange: (t: 'elite' | 'newbie') => void }) {
  return (
    <div className="flex gap-1 p-1 bg-[#0A0B0D] rounded-xl border border-[#1E2128] mb-4">
      <button
        onClick={() => onChange('elite')}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-display font-bold transition-all ${
          active === 'elite'
            ? 'bg-amber-500 text-black shadow-lg'
            : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <Star className="w-3.5 h-3.5" />
        Elite Details
      </button>
      <button
        onClick={() => onChange('newbie')}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-display font-bold transition-all ${
          active === 'newbie'
            ? 'bg-cyan-500 text-black shadow-lg'
            : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <BookOpen className="w-3.5 h-3.5" />
        Newbie Details
      </button>
    </div>
  );
}

// ── Chart overlay ──────────────────────────────────────────────────────────────
function drawOverlay(canvas: HTMLCanvasElement, img: HTMLImageElement, result: AnalysisResult) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.drawImage(img, 0, 0);

  const padTop    = Math.round(canvas.height * 0.07);
  const padBottom = Math.round(canvas.height * 0.07);
  const padRight  = Math.round(canvas.width  * 0.06);
  const chartTop    = padTop;
  const chartBottom = canvas.height - padBottom;
  const chartLeft   = 0;
  const chartRight  = canvas.width - padRight;
  const chartH = chartBottom - chartTop;

  const priceHigh  = result.chart_high || Math.max(result.tp3, result.entry_zone_max) * 1.005;
  const priceLow   = result.chart_low  || Math.min(result.stop_loss, result.entry_zone_min) * 0.995;
  const priceRange = priceHigh - priceLow;
  if (priceRange === 0) return;

  const priceToY = (price: number) => chartTop + ((priceHigh - price) / priceRange) * chartH;
  const lineWidth = Math.max(2, Math.round(canvas.width / 600));
  const fontSize  = Math.max(11, Math.round(canvas.width / 80));
  const labelPad  = 8;
  const labelX    = chartRight + labelPad;
  const isBuy     = result.direction === 'BUY';

  const drawBand = (p1: number, p2: number, color: string, alpha = 0.18) => {
    const y1 = priceToY(p1), y2 = priceToY(p2);
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
    ctx.fillRect(chartLeft, Math.min(y1, y2), chartRight - chartLeft, Math.abs(y2 - y1));
    ctx.restore();
  };

  const drawLine = (price: number, color: string, label: string, alpha = 0.9, dash: number[] = []) => {
    const y = priceToY(price);
    if (y < chartTop - 20 || y > chartBottom + 20) return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = lineWidth;
    if (dash.length) ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(chartLeft, y); ctx.lineTo(chartRight, y); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.92;
    ctx.font = `bold ${fontSize}px monospace`;
    const tw   = ctx.measureText(label).width;
    const pillW = tw + labelPad * 2, pillH = fontSize + labelPad;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(labelX, y - pillH / 2, pillW, pillH, 4); ctx.fill();
    ctx.fillStyle = '#000'; ctx.fillText(label, labelX + labelPad, y + fontSize * 0.35);
    ctx.restore();
  };

  const entryColor = '#00BFFF', slColor = '#FF4444', tp1Color = '#00FF88', tp2Color = '#00CC66', tp3Color = '#009944', curColor = '#FFD700';

  drawBand(result.entry_zone_max, result.entry_zone_min, entryColor, 0.18);
  if (isBuy) {
    drawBand(result.tp1, result.entry_zone_max, tp1Color, 0.05);
    drawBand(result.entry_zone_min, result.stop_loss, slColor, 0.08);
  } else {
    drawBand(result.entry_zone_min, result.tp1, tp1Color, 0.05);
    drawBand(result.stop_loss, result.entry_zone_max, slColor, 0.08);
  }
  drawLine(result.stop_loss, slColor, `SL ${formatFuturesPrice(result.stop_loss, result.pair)}`);
  drawLine(result.entry_zone_min, entryColor, `ENTRY ${formatFuturesPrice(result.entry_zone_min, result.pair)}`, 0.7, [6, 4]);
  drawLine(result.entry_zone_max, entryColor, `ENTRY ${formatFuturesPrice(result.entry_zone_max, result.pair)}`, 0.7, [6, 4]);
  drawLine(result.tp1, tp1Color, `TP1 ${formatFuturesPrice(result.tp1, result.pair)}`);
  drawLine(result.tp2, tp2Color, `TP2 ${formatFuturesPrice(result.tp2, result.pair)}`);
  drawLine(result.tp3, tp3Color, `TP3 ${formatFuturesPrice(result.tp3, result.pair)}`);
  drawLine(result.current_price, curColor, `NOW ${formatFuturesPrice(result.current_price, result.pair)}`, 1.0, [3, 3]);

  ctx.save();
  const bx = 16, by = 16, bw = 240, bh = 52;
  ctx.globalAlpha = 0.85; ctx.fillStyle = '#0A0B0D';
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill();
  ctx.globalAlpha = 1; ctx.font = `bold ${fontSize + 4}px monospace`;
  ctx.fillStyle = isBuy ? '#00FF88' : '#FF4444';
  ctx.fillText(`${isBuy ? '▲' : '▼'} ${result.direction}  ${result.confidence}%${result.is_counter_trend ? ' ⚠️ CT' : ''}`, bx + 12, by + 22);
  ctx.font = `${fontSize}px monospace`; ctx.fillStyle = '#888';
  ctx.fillText(`${result.pair} · ${result.timeframe} · R:R ${result.risk_reward}`, bx + 12, by + 40);
  ctx.restore();
}

// ── Newbie section components ──────────────────────────────────────────────────
function NewbieCard({ icon, title, children, color = 'amber' }: { icon: React.ReactNode; title: string; children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    amber: 'border-amber-500/20 bg-amber-500/5',
    cyan:  'border-cyan-500/20 bg-cyan-500/5',
    green: 'border-emerald-500/20 bg-emerald-500/5',
    red:   'border-red-500/20 bg-red-500/5',
    blue:  'border-blue-500/20 bg-blue-500/5',
    purple:'border-purple-500/20 bg-purple-500/5',
  };
  const titleColors: Record<string, string> = {
    amber: 'text-amber-400', cyan: 'text-cyan-400', green: 'text-emerald-400',
    red: 'text-red-400', blue: 'text-blue-400', purple: 'text-purple-400',
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[color] || colors.amber}`}>
      <div className={`flex items-center gap-2 mb-3 font-display font-bold text-sm ${titleColors[color] || titleColors.amber}`}>
        {icon}
        {title}
      </div>
      <div className="text-gray-300 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function NewbieStep({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-[#1E2128] last:border-0">
      <div className="w-7 h-7 flex-shrink-0 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mt-0.5">
        <span className="font-data font-bold text-xs text-cyan-400">{n}</span>
      </div>
      <span className="text-sm text-gray-300 leading-relaxed pt-0.5">{text}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function DataAnalysisTab() {
  const [selectedSymbol,    setSelectedSymbol]    = useState('ES');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState<string | null>(null);
  const [result,            setResult]            = useState<AnalysisResult | null>(null);
  const [savedAnalysisId,   setSavedAnalysisId]   = useState<string | null>(null);
  const { isElite, triggerUpgrade } = useTier();
  const [activeTab,         setActiveTab]         = useState<'elite' | 'newbie'>('elite');
  const [symbolDropdownOpen,setSymbolDropdownOpen] = useState(false);
  const [accountBalance,    setAccountBalance]    = useState(10000);
  const [riskPercent,       setRiskPercent]       = useState(1);
  const [overlayImage,     setOverlayImage]       = useState<string | null>(null);
  const [overlayReady,     setOverlayReady]       = useState(false);
  const [overlayRendered,  setOverlayRendered]    = useState(false);

  const resultRef   = useRef<HTMLDivElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleAnalyze = async () => {
    setLoading(true); setError(null); setResult(null);
    setOverlayImage(null); setOverlayReady(false); setOverlayRendered(false);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-chart', {
        body: { symbol: selectedSymbol, timeframe: selectedTimeframe },
      });
      if (fnError) throw new Error(fnError.message || 'Analysis failed.');
      if (!data?.analysis) throw new Error('No analysis returned.');
      const ai = data.analysis;
      setResult(ai);
      // Auto-save to data_analyses
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const entryMid = (ai.entry_zone_min + ai.entry_zone_max) / 2;
        const { data: saved } = await supabase.from('data_analyses').insert({
          user_id:           user.id,
          symbol:            ai.pair,
          timeframe:         ai.timeframe,
          direction:         ai.direction,
          confidence:        ai.confidence,
          current_price:     ai.current_price,
          entry_zone_min:    ai.entry_zone_min,
          entry_zone_max:    ai.entry_zone_max,
          stop_loss:         ai.stop_loss,
          sl_points:         ai.sl_pips,
          tp1:               ai.tp1,   tp1_points: ai.tp1_pips,
          tp2:               ai.tp2,   tp2_points: ai.tp2_pips,
          tp3:               ai.tp3,   tp3_points: ai.tp3_pips,
          risk_reward:       ai.risk_reward,
          higher_tf_bias:    ai.higher_tf_bias || null,
          setup_status:      ai.setup_status || null,
          setup_status_note: ai.setup_status_note || null,
          is_counter_trend:  ai.is_counter_trend || false,
          reasoning:         ai.reasoning,
          entry_validation:  ai.entry_validation || null,
          newbie:            ai.newbie || null,
          outcome:           'PENDING',
        }).select('id').single();
        if (saved) setSavedAnalysisId(saved.id);
      }
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    disabled: !result,
    onDrop: (files) => {
      if (files[0] && result) {
        setOverlayImage(URL.createObjectURL(files[0]));
        setOverlayReady(true);
        setOverlayRendered(false);
      }
    },
  });

  useEffect(() => {
    if (!overlayReady || !overlayImage || !result || !canvasRef.current) return;
    const img = new Image();
    img.onload = () => { if (canvasRef.current) { drawOverlay(canvasRef.current, img, result); setOverlayRendered(true); } };
    img.src = overlayImage;
  }, [overlayReady, overlayImage, result]);

  const handleDownload = () => {
    if (!canvasRef.current || !result) return;
    const link = document.createElement('a');
    link.download = `${result.pair}_${result.timeframe}_SMC.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const entryMid = result ? (result.entry_zone_min + result.entry_zone_max) / 2 : 0;
  const sizing   = result ? calcContracts(accountBalance, riskPercent, entryMid, result.stop_loss, result.pair) : null;
  const config   = result ? FUTURES_MAP[result.pair] : null;
  const unit     = config?.unit || 'points';
  const n        = result?.newbie;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">

        {/* ── Left panel ───────────────────────────────────────────── */}
        <div className="space-y-4">
          <AccountPanel onSettingsChange={(b, r) => { setAccountBalance(b); setRiskPercent(r); }} />

          <div className="bg-[#111318] border border-[#1E2128] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span className="font-display font-semibold text-sm text-white">Chart Analysis</span>
            </div>

            {/* Symbol selector */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block">Futures Symbol</label>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setSymbolDropdownOpen(o => !o)}
                  className="w-full flex items-center justify-between bg-[#0A0B0D] border border-[#1E2128] rounded-xl px-3 py-2.5 text-sm text-white hover:border-amber-500/30 transition-all"
                >
                  <span>
                    <span className="font-data font-medium text-amber-400">{selectedSymbol}</span>
                    <span className="text-gray-500 ml-2 text-xs">{FUTURES_MAP[selectedSymbol]?.fullName}</span>
                    {FUTURES_MAP[selectedSymbol]?.isMicro && <span className="ml-1.5 text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">MICRO</span>}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${symbolDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {symbolDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-[#111318] border border-[#1E2128] rounded-xl shadow-2xl max-h-72 overflow-y-auto">
                    {FUTURES_CATEGORIES.map(cat => {
                      const symbols = FUTURES_SYMBOLS.filter(s => s.category === cat);
                      if (!symbols.length) return null;
                      return (
                        <div key={cat}>
                          <div className="px-3 py-1.5 text-[10px] font-bold text-amber-500/70 uppercase tracking-wider bg-[#0A0B0D] sticky top-0">{cat}</div>
                          {symbols.map(s => (
                            <button key={s.symbol} onMouseDown={() => { setSelectedSymbol(s.symbol); setSymbolDropdownOpen(false); }}
                              className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${selectedSymbol === s.symbol ? 'bg-amber-500/10 text-amber-400' : 'text-gray-300 hover:bg-white/3'}`}>
                              <span className="flex items-center gap-2">
                                <span className="font-data font-medium w-10 text-left">{s.symbol}</span>
                                <span className="text-gray-600 text-xs">{s.fullName}</span>
                                {s.isMicro && <span className="text-[9px] bg-blue-500/15 text-blue-400 px-1 rounded">μ</span>}
                              </span>
                              <span className="text-[10px] text-gray-700">{s.exchange}</span>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Timeframe */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block">Timeframe</label>
              <select value={selectedTimeframe} onChange={e => setSelectedTimeframe(e.target.value)}
                className="w-full bg-[#0A0B0D] border border-[#1E2128] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/30 transition-all">
                {TIMEFRAMES.map(tf => <option key={tf.value} value={tf.value}>{tf.label}</option>)}
              </select>
            </div>

            <button onClick={isElite ? handleAnalyze : () => triggerUpgrade('Data Analysis')} disabled={loading && isElite}
              className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/30 disabled:cursor-not-allowed text-black font-display font-bold text-sm rounded-xl transition-all">
              {loading ? (<><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Analyzing {selectedSymbol}...</>) : (<><Search className="w-4 h-4" />Analyze {selectedSymbol}</>)}
            </button>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}
          </div>

          {/* Mark up chart */}
          {result && (
            <div className="bg-[#111318] border border-[#1E2128] rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="font-display font-semibold text-sm text-white">Mark Up Chart</span>
                <span className="text-[10px] text-gray-600 ml-auto">optional</span>
              </div>
              <p className="text-xs text-gray-600">Upload your TradingView screenshot and levels will be drawn on it.</p>
              {!overlayImage ? (
                <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${isDragActive ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-[#1E2128] hover:border-cyan-500/30'}`}>
                  <input {...getInputProps()} />
                  <Upload className={`w-6 h-6 mx-auto mb-1.5 ${isDragActive ? 'text-cyan-400' : 'text-gray-700'}`} />
                  <p className="text-xs text-gray-600">Drop chart or click to upload</p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => { setOverlayImage(null); setOverlayReady(false); setOverlayRendered(false); }}
                    className="flex items-center gap-1.5 px-2 py-1 bg-[#0A0B0D] border border-[#1E2128] rounded-lg text-xs text-gray-500 hover:text-gray-300 transition-all">
                    <X className="w-3 h-3" /> Remove
                  </button>
                  {overlayRendered && (
                    <button onClick={handleDownload}
                      className="flex items-center gap-1.5 px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-xs text-cyan-400 hover:bg-cyan-500/20 transition-all">
                      <Download className="w-3 h-3" /> Download
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right panel ──────────────────────────────────────────── */}
        <div>
          {!result && !loading && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-[#111318] border border-[#1E2128] rounded-2xl flex items-center justify-center mb-4">
                <BarChart3 className="w-7 h-7 text-gray-700" />
              </div>
              <h3 className="font-display font-semibold text-white mb-2">No analysis yet</h3>
              <p className="text-gray-600 text-sm max-w-xs">Select a symbol and timeframe, then hit Analyze to get your SMC setup.</p>
            </div>
          )}

          {loading && (
            <AnalysisTheater symbol={selectedSymbol} />
          )}

          {result && (
            <div ref={resultRef} className="space-y-4">

              {/* Annotated chart */}
              {overlayImage && (
                <div className="bg-[#111318] border border-[#1E2128] rounded-2xl overflow-hidden">
                  <canvas ref={canvasRef} className="w-full h-auto block" style={{ maxHeight: '480px', objectFit: 'contain' }} />
                  {!overlayRendered && <div className="p-3 text-center text-xs text-gray-600">Drawing levels...</div>}
                </div>
              )}

              {/* Counter-trend banner */}
              {result.is_counter_trend && (
                <div className="p-4 bg-orange-500/10 border-2 border-orange-500/40 rounded-2xl">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertOctagon className="w-5 h-5 text-orange-400" />
                    <span className="font-display font-bold text-orange-400">⚠️ COUNTER-TREND TRADE — REDUCED CONFIDENCE</span>
                  </div>
                  <p className="text-orange-300/70 text-xs ml-7">This trade goes AGAINST the higher timeframe trend. Short-term scalp only. Smaller size recommended.</p>
                </div>
              )}

              {/* Setup status */}
              {result.setup_status === 'AT_ENTRY' && (
                <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500/40 rounded-2xl">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-display font-bold text-emerald-400">🎯 PRICE IN ZONE — LOOK FOR CONFIRMATION</span>
                  </div>
                  {result.setup_status_note && <p className="text-emerald-300/70 text-xs ml-4">{result.setup_status_note}</p>}
                </div>
              )}
              {result.setup_status === 'PENDING' && (
                <div className="p-4 bg-yellow-500/10 border-2 border-yellow-500/30 rounded-2xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-yellow-400" />
                    <span className="font-display font-bold text-yellow-400">⏳ PENDING — WAITING FOR RETRACEMENT</span>
                  </div>
                  {result.setup_status_note && <p className="text-yellow-300/70 text-xs ml-6">{result.setup_status_note}</p>}
                </div>
              )}
              {result.setup_status === 'MISSED' && (
                <div className="p-4 bg-red-500/10 border-2 border-red-500/30 rounded-2xl">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="font-display font-bold text-red-400">❌ ENTRY MISSED — DO NOT CHASE</span>
                  </div>
                  {result.setup_status_note && <p className="text-red-300/70 text-xs ml-6">{result.setup_status_note}</p>}
                </div>
              )}

              {/* Header card */}
              <div className="bg-[#111318] border border-[#1E2128] rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-display font-bold text-2xl text-white">{result.pair}</span>
                      <span className="font-data text-xs text-gray-500">{result.timeframe}</span>
                      {config?.isMicro && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">MICRO</span>}
                      {result.is_counter_trend && <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">COUNTER-TREND</span>}
                    </div>
                    <div className="font-data text-xs text-gray-600">
                      {result.higher_tf_used && `HTF: ${result.higher_tf_used}`}
                      {result.lower_tf_used && ` · LTF: ${result.lower_tf_used}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`flex items-center gap-2 justify-end mb-1 font-display font-bold text-xl ${result.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {result.direction === 'BUY' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      {result.direction}
                    </div>
                    <div className={`font-data font-bold text-2xl ${result.confidence >= 85 ? 'text-emerald-400' : result.confidence >= 75 ? 'text-amber-400' : 'text-orange-400'}`}>{result.confidence}%</div>
                    <div className="font-data text-[10px] text-gray-600">CONFIDENCE</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full h-1.5 bg-[#1E2128] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full gauge-fill ${result.confidence >= 85 ? 'bg-emerald-400' : result.confidence >= 75 ? 'bg-amber-400' : 'bg-orange-400'}`}
                      style={{ '--gauge-width': `${result.confidence}%` } as React.CSSProperties} />
                  </div>
                </div>
                {result.higher_tf_bias && (
                  <div className="mt-3 px-3 py-2 bg-[#0A0B0D] border border-[#1E2128] rounded-xl">
                    <span className="text-[10px] text-gray-600 uppercase tracking-wider">HTF Bias · </span>
                    <span className="text-xs text-gray-300">{result.higher_tf_bias}</span>
                  </div>
                )}
              </div>

              {/* ── DUAL TAB SECTION ─────────────────────────────────── */}
              <DetailTabs active={activeTab} onChange={setActiveTab} />

              {/* ═══ ELITE DETAILS ═══════════════════════════════════════ */}
              {activeTab === 'elite' && (
                <div className="space-y-4">

                  {/* Trade levels */}
                  <div className="bg-[#111318] border border-[#1E2128] rounded-2xl p-5 space-y-2">
                    <div className="font-display font-semibold text-xs text-gray-400 uppercase tracking-wider mb-3">Trade Levels</div>
                    {[
                      { label: 'Current Price', value: formatFuturesPrice(result.current_price, result.pair), copyVal: formatFuturesPrice(result.current_price, result.pair), color: 'text-yellow-400' },
                      { label: 'Entry Zone',    value: `${formatFuturesPrice(result.entry_zone_min, result.pair)} – ${formatFuturesPrice(result.entry_zone_max, result.pair)}`, copyVal: formatFuturesPrice(entryMid, result.pair), color: 'text-cyan-400' },
                      { label: 'Stop Loss',     value: `${formatFuturesPrice(result.stop_loss, result.pair)} (${result.sl_pips} ${unit})`, copyVal: formatFuturesPrice(result.stop_loss, result.pair), color: 'text-red-400' },
                      { label: 'TP1 — Take 50%',      value: `${formatFuturesPrice(result.tp1, result.pair)} (+${result.tp1_pips} ${unit})`, copyVal: formatFuturesPrice(result.tp1, result.pair), color: 'text-emerald-400' },
                      { label: 'TP2 — Move SL to BE', value: `${formatFuturesPrice(result.tp2, result.pair)} (+${result.tp2_pips} ${unit})`, copyVal: formatFuturesPrice(result.tp2, result.pair), color: 'text-emerald-400' },
                      { label: 'TP3 — Trail Stop',    value: `${formatFuturesPrice(result.tp3, result.pair)} (+${result.tp3_pips} ${unit})`, copyVal: formatFuturesPrice(result.tp3, result.pair), color: 'text-emerald-400' },
                    ].map(({ label, value, copyVal, color }) => (
                      <div key={label} className="flex items-center justify-between px-3 py-2.5 bg-[#0A0B0D] rounded-xl border border-[#1E2128]">
                        <span className="text-xs text-gray-500">{label}</span>
                        <div className="flex items-center">
                          <span className={`font-data text-sm ${color}`}>{value}</span>
                          <CopyBtn value={copyVal} />
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-3 py-2 bg-[#0A0B0D] rounded-xl border border-[#1E2128]">
                      <span className="text-xs text-gray-500">Risk : Reward</span>
                      <span className="font-data font-semibold text-amber-400">{result.risk_reward}</span>
                    </div>
                  </div>

                  {/* Position sizing */}
                  {sizing && (
                    <div className={`bg-[#111318] rounded-2xl p-5 border ${sizing.overBudget ? 'border-red-500/20' : 'border-amber-500/15'}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 bg-amber-500/10 rounded-lg flex items-center justify-center">
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <span className="font-display font-semibold text-sm text-amber-400">Position Sizing</span>
                        <span className="font-data text-[10px] text-gray-600 ml-auto">{riskPercent}% risk · ${accountBalance.toLocaleString()}</span>
                      </div>
                      {sizing.overBudget && (
                        <div className="mb-4 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
                          <span className="text-red-400 text-base leading-none mt-0.5">⚠️</span>
                          <div>
                            <div className="text-sm font-bold text-red-400">Over Budget — 1 contract costs ${sizing.dollarRiskPerContract.toFixed(0)}</div>
                            <div className="text-xs text-red-400/70 mt-0.5">Your {riskPercent}% risk allows ${sizing.dollarRiskAllowed.toFixed(0)}. Consider the micro version of this contract to stay within budget.</div>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Contracts',       val: sizing.contracts,                              color: 'text-white',    copy: true  },
                          { label: 'Actual Risk',      val: `$${sizing.dollarRisk.toFixed(0)}`,            color: sizing.overBudget ? 'text-red-400' : 'text-amber-400', copy: true },
                          { label: 'Margin Est.',      val: `~$${sizing.marginEstimate.toLocaleString()}`, color: 'text-gray-400', copy: false },
                          { label: 'R:R',              val: result.risk_reward,                            color: 'text-amber-400', copy: false },
                        ].map(({ label, val, color, copy }) => (
                          <div key={label} className="bg-[#0A0B0D] rounded-xl p-3">
                            <div className="text-[10px] text-gray-600 mb-1">{label}</div>
                            <div className={`font-data font-bold text-lg ${color} flex items-center gap-1`}>
                              {val}{copy && <CopyBtn value={String(val).replace('$', '')} />}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex justify-between text-xs px-1">
                        <span className="text-gray-600">Risk per contract</span>
                        <span className="font-data text-gray-400">${sizing.dollarRiskPerContract.toFixed(0)}</span>
                      </div>
                    </div>
                  )}

                  {/* Key warning */}
                  {result.entry_validation?.key_warning && (
                    <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-orange-400" />
                        <span className="font-display font-semibold text-orange-400 text-sm">Key Warning</span>
                      </div>
                      <p className="text-gray-300 text-sm ml-6">{result.entry_validation.key_warning}</p>
                    </div>
                  )}

                  {/* SMC Analysis */}
                  <div className="bg-[#111318] border border-[#1E2128] rounded-2xl p-5">
                    <div className="font-display font-semibold text-xs text-amber-500/70 uppercase tracking-wider mb-3">SMC Analysis</div>
                    <div className="space-y-2">
                      {result.reasoning.map((r, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-500/60 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-300">{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Trade management */}
                  <div className="bg-[#111318] border border-[#1E2128] rounded-2xl p-5">
                    <div className="font-display font-semibold text-xs text-gray-400 uppercase tracking-wider mb-3">Trade Management</div>
                    <div className="space-y-2.5">
                      {[
                        `Wait for price to reach entry zone: ${formatFuturesPrice(result.entry_zone_min, result.pair)} – ${formatFuturesPrice(result.entry_zone_max, result.pair)}`,
                        result.entry_validation?.confirmation_signal || `Look for confirmation candle at the zone before entering`,
                        `Set stop loss at ${formatFuturesPrice(result.stop_loss, result.pair)} immediately on entry`,
                        `Take 50% off at TP1: ${formatFuturesPrice(result.tp1, result.pair)}. Move SL to breakeven.`,
                        `Let remaining position run to TP2 / TP3 with trailing stop`,
                      ].map((step, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="w-5 h-5 flex-shrink-0 bg-amber-500/10 rounded-full flex items-center justify-center mt-0.5">
                            <span className="font-data text-[10px] font-bold text-amber-500">{i + 1}</span>
                          </div>
                          <span className="text-sm text-gray-300">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ NEWBIE DETAILS ══════════════════════════════════════ */}
              {activeTab === 'newbie' && (
                <div className="space-y-4">

                  {!n ? (
                    <div className="p-6 bg-[#111318] border border-[#1E2128] rounded-2xl text-center text-gray-600 text-sm">
                      Newbie explanation not available for this analysis. Try analyzing again.
                    </div>
                  ) : (
                    <>
                      {/* What is happening */}
                      <NewbieCard icon={<HelpCircle className="w-4 h-4" />} title="📊 What Is Happening Right Now?" color="amber">
                        {n.what_is_happening}
                      </NewbieCard>

                      {/* Direction */}
                      <NewbieCard
                        icon={result.direction === 'BUY' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        title={result.direction === 'BUY' ? '📈 We Want to BUY — Here\'s What That Means' : '📉 We Want to SELL — Here\'s What That Means'}
                        color={result.direction === 'BUY' ? 'green' : 'red'}
                      >
                        {n.direction_explained}
                      </NewbieCard>

                      {/* Big picture */}
                      <NewbieCard icon={<BarChart3 className="w-4 h-4" />} title="🌍 The Big Picture (Higher Timeframe)" color="blue">
                        {n.big_picture}
                        {result.is_counter_trend && (
                          <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-300 text-xs">
                            ⚠️ <strong>Heads up:</strong> This trade goes AGAINST the big picture trend. That makes it riskier. Only trade this if you are experienced with counter-trend setups, and use smaller position sizes.
                          </div>
                        )}
                      </NewbieCard>

                      {/* Entry zone */}
                      <NewbieCard icon={<Target className="w-4 h-4" />} title="🎯 Where to Enter the Trade" color="cyan">
                        <p>{n.entry_explained}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 text-center">
                            <div className="text-[10px] text-cyan-400/70 mb-1">ENTRY ZONE LOW</div>
                            <div className="font-data font-bold text-cyan-400 text-lg">{formatFuturesPrice(result.entry_zone_min, result.pair)}</div>
                          </div>
                          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 text-center">
                            <div className="text-[10px] text-cyan-400/70 mb-1">ENTRY ZONE HIGH</div>
                            <div className="font-data font-bold text-cyan-400 text-lg">{formatFuturesPrice(result.entry_zone_max, result.pair)}</div>
                          </div>
                        </div>
                      </NewbieCard>

                      {/* Confirmation */}
                      <NewbieCard icon={<CheckCircle2 className="w-4 h-4" />} title="✅ How to Know When to Actually Pull the Trigger" color="green">
                        {n.confirmation_explained}
                      </NewbieCard>

                      {/* Stop loss */}
                      <NewbieCard icon={<Shield className="w-4 h-4" />} title="🛡️ Your Safety Net (Stop Loss)" color="red">
                        <p>{n.stop_loss_explained}</p>
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between">
                          <span className="text-xs text-red-400/70">Set Stop Loss At:</span>
                          <span className="font-data font-bold text-red-400 text-lg">{formatFuturesPrice(result.stop_loss, result.pair)}</span>
                        </div>
                      </NewbieCard>

                      {/* Targets */}
                      <NewbieCard icon={<DollarSign className="w-4 h-4" />} title="💰 Where to Take Your Profits" color="green">
                        <p className="mb-3">{n.targets_explained}</p>
                        <div className="space-y-2">
                          {[
                            { label: 'TP1 — Take 50% profit', price: result.tp1, desc: 'Close half here. Lock in gains.', color: 'emerald' },
                            { label: 'TP2 — Move SL to breakeven', price: result.tp2, desc: 'Move stop to entry. Free trade!', color: 'emerald' },
                            { label: 'TP3 — Trail stop & ride', price: result.tp3, desc: 'Let it run. Maximum profit zone.', color: 'emerald' },
                          ].map(({ label, price, desc }) => (
                            <div key={label} className="flex items-center justify-between px-3 py-2.5 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
                              <div>
                                <div className="text-xs text-emerald-400 font-semibold">{label}</div>
                                <div className="text-[10px] text-gray-600 mt-0.5">{desc}</div>
                              </div>
                              <span className="font-data font-bold text-emerald-400 text-base">{formatFuturesPrice(price, result.pair)}</span>
                            </div>
                          ))}
                        </div>
                      </NewbieCard>

                      {/* Why this setup exists */}
                      <NewbieCard icon={<BookOpen className="w-4 h-4" />} title="🧠 Why the AI Spotted This Setup" color="purple">
                        <div className="space-y-3">
                          {n.smc_elements_plain.map((el, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                              <ArrowRight className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-gray-300">{el}</span>
                            </div>
                          ))}
                        </div>
                      </NewbieCard>

                      {/* Step by step */}
                      <div className="bg-[#111318] border border-cyan-500/20 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <BookOpen className="w-4 h-4 text-cyan-400" />
                          <span className="font-display font-bold text-sm text-cyan-400">🪜 Your Step-By-Step Action Plan</span>
                        </div>
                        <div className="space-y-0">
                          {n.what_to_do_step_by_step.map((step, i) => (
                            <NewbieStep key={i} n={i + 1} text={step} />
                          ))}
                        </div>
                      </div>

                      {/* Confidence plain */}
                      <NewbieCard icon={<Star className="w-4 h-4" />} title="📊 What the Confidence Score Means" color="amber">
                        {n.confidence_plain}
                        <div className="mt-3">
                          <div className="w-full h-3 bg-[#1E2128] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${result.confidence >= 85 ? 'bg-emerald-400' : result.confidence >= 75 ? 'bg-amber-400' : 'bg-orange-400'}`}
                              style={{ width: `${result.confidence}%` }} />
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-[10px] text-gray-700">Weak signal</span>
                            <span className={`text-xs font-bold ${result.confidence >= 85 ? 'text-emerald-400' : result.confidence >= 75 ? 'text-amber-400' : 'text-orange-400'}`}>{result.confidence}%</span>
                            <span className="text-[10px] text-gray-700">Strong signal</span>
                          </div>
                        </div>
                      </NewbieCard>

                      {/* Risk reality check */}
                      <div className="p-4 bg-[#111318] border border-amber-500/20 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          <span className="font-display font-bold text-amber-400 text-sm">⚠️ Reality Check</span>
                        </div>
                        <p className="text-sm text-gray-300 ml-6">{n.risk_reality_check}</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
