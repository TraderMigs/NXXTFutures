import { useState, useRef, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, Upload,
  Copy, Check, TrendingUp, TrendingDown, Zap, BarChart3,
  ChevronDown, Search, Download, X, Layers
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FUTURES_SYMBOLS, formatFuturesPrice, calcContracts, FUTURES_MAP, FUTURES_CATEGORIES } from '../lib/futuresSymbols';
import { AccountPanel } from '../components/AccountPanel';

const TIMEFRAMES = [
  { label: '15 Minutes', value: '15min' },
  { label: '30 Minutes', value: '30min' },
  { label: '1 Hour',     value: '1h'    },
  { label: '4 Hours',    value: '4h'    },
  { label: 'Daily',      value: '1day'  },
  { label: 'Weekly',     value: '1week' },
];

// ── Copy button ────────────────────────────────────────────────────────────────
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

// ── Types ──────────────────────────────────────────────────────────────────────
interface AnalysisResult {
  pair: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
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
}

// ── Chart overlay drawing ──────────────────────────────────────────────────────
function drawOverlay(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  result: AnalysisResult
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;

  // Draw the original chart image
  ctx.drawImage(img, 0, 0);

  // ── Estimate chart area within the screenshot ──────────────────────────────
  // TradingView typical chrome: top toolbar ~50px, bottom axis ~40px, right price axis ~70px
  const padTop    = Math.round(canvas.height * 0.07);
  const padBottom = Math.round(canvas.height * 0.07);
  const padRight  = Math.round(canvas.width  * 0.06);
  const chartTop    = padTop;
  const chartBottom = canvas.height - padBottom;
  const chartLeft   = 0;
  const chartRight  = canvas.width - padRight;
  const chartH = chartBottom - chartTop;

  // Use AI-provided chart_high/chart_low if available, else estimate from levels
  const priceHigh = result.chart_high || Math.max(result.tp3, result.entry_zone_max) * 1.005;
  const priceLow  = result.chart_low  || Math.min(result.stop_loss, result.entry_zone_min) * 0.995;
  const priceRange = priceHigh - priceLow;
  if (priceRange === 0) return;

  // Map price → y pixel
  const priceToY = (price: number) =>
    chartTop + ((priceHigh - price) / priceRange) * chartH;

  const lineWidth = Math.max(2, Math.round(canvas.width / 600));
  const fontSize  = Math.max(11, Math.round(canvas.width / 80));
  const labelPad  = 8;
  const labelX    = chartRight + labelPad;

  // ── Helper: draw horizontal line with label ────────────────────────────────
  const drawLine = (price: number, color: string, label: string, alpha = 0.85, dash: number[] = []) => {
    const y = priceToY(price);
    if (y < chartTop - 20 || y > chartBottom + 20) return; // off-screen, skip
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    if (dash.length) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(chartLeft, y);
    ctx.lineTo(chartRight, y);
    ctx.stroke();
    ctx.restore();

    // Label pill on right edge
    ctx.save();
    ctx.globalAlpha = 0.92;
    const labelText = label;
    ctx.font = `bold ${fontSize}px monospace`;
    const tw = ctx.measureText(labelText).width;
    const pillW = tw + labelPad * 2;
    const pillH = fontSize + labelPad;
    const pillX = labelX;
    const pillY = y - pillH / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 4);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.fillText(labelText, pillX + labelPad, y + fontSize * 0.35);
    ctx.restore();
  };

  // ── Helper: draw filled band ───────────────────────────────────────────────
  const drawBand = (priceTop: number, priceBot: number, color: string, alpha = 0.18) => {
    const y1 = priceToY(priceTop);
    const y2 = priceToY(priceBot);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(chartLeft, Math.min(y1, y2), chartRight - chartLeft, Math.abs(y2 - y1));
    ctx.restore();
  };

  const isBuy = result.direction === 'BUY';
  const entryColor = '#00BFFF'; // cyan
  const slColor    = '#FF4444'; // red
  const tp1Color   = '#00FF88'; // green
  const tp2Color   = '#00CC66';
  const tp3Color   = '#009944';
  const curColor   = '#FFD700'; // gold

  // Draw in order: bands first, then lines on top
  // Entry zone band
  drawBand(result.entry_zone_max, result.entry_zone_min, entryColor, 0.18);
  // TP bands (very subtle)
  if (isBuy) {
    drawBand(result.tp1, result.entry_zone_max, tp1Color, 0.05);
    drawBand(result.tp2, result.tp1, tp2Color, 0.05);
    drawBand(result.tp3, result.tp2, tp3Color, 0.05);
    drawBand(result.entry_zone_min, result.stop_loss, slColor, 0.08);
  } else {
    drawBand(result.entry_zone_min, result.tp1, tp1Color, 0.05);
    drawBand(result.tp1, result.tp2, tp2Color, 0.05);
    drawBand(result.tp2, result.tp3, tp3Color, 0.05);
    drawBand(result.stop_loss, result.entry_zone_max, slColor, 0.08);
  }

  // Draw lines
  drawLine(result.stop_loss,       slColor,   `SL ${formatFuturesPrice(result.stop_loss, result.pair)}`);
  drawLine(result.entry_zone_min,  entryColor, `ENTRY ${formatFuturesPrice(result.entry_zone_min, result.pair)}`, 0.7, [6, 4]);
  drawLine(result.entry_zone_max,  entryColor, `ENTRY ${formatFuturesPrice(result.entry_zone_max, result.pair)}`, 0.7, [6, 4]);
  drawLine(result.tp1,             tp1Color,  `TP1 ${formatFuturesPrice(result.tp1, result.pair)}`);
  drawLine(result.tp2,             tp2Color,  `TP2 ${formatFuturesPrice(result.tp2, result.pair)}`);
  drawLine(result.tp3,             tp3Color,  `TP3 ${formatFuturesPrice(result.tp3, result.pair)}`);
  drawLine(result.current_price,   curColor,  `NOW ${formatFuturesPrice(result.current_price, result.pair)}`, 1.0, [3, 3]);

  // ── Direction + Confidence badge (top-left) ────────────────────────────────
  ctx.save();
  const badgeX = 16, badgeY = 16;
  const badgeW = 220, badgeH = 52;
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#0A0B0D';
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 8);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.font = `bold ${fontSize + 4}px monospace`;
  ctx.fillStyle = isBuy ? '#00FF88' : '#FF4444';
  ctx.fillText(`${isBuy ? '▲' : '▼'} ${result.direction}  ${result.confidence}%`, badgeX + 12, badgeY + 22);
  ctx.font = `${fontSize}px monospace`;
  ctx.fillStyle = '#888';
  ctx.fillText(`${result.pair} · ${result.timeframe} · R:R ${result.risk_reward}`, badgeX + 12, badgeY + 40);
  ctx.restore();
}

// ── Main component ─────────────────────────────────────────────────────────────
export function DataAnalysisTab() {
  const [selectedSymbol,    setSelectedSymbol]    = useState('ES');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState<string | null>(null);
  const [result,            setResult]            = useState<AnalysisResult | null>(null);
  const [symbolDropdownOpen,setSymbolDropdownOpen] = useState(false);
  const [accountBalance,    setAccountBalance]    = useState(10000);
  const [riskPercent,       setRiskPercent]       = useState(1);

  // Overlay state
  const [overlayImage,     setOverlayImage]     = useState<string | null>(null);
  const [overlayReady,     setOverlayReady]     = useState(false);
  const [overlayRendered,  setOverlayRendered]  = useState(false);

  const resultRef    = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const dropdownRef  = useRef<HTMLDivElement>(null);

  // ── Analyze ────────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setOverlayImage(null);
    setOverlayReady(false);
    setOverlayRendered(false);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-chart', {
        body: { symbol: selectedSymbol, timeframe: selectedTimeframe },
      });

      if (fnError) throw new Error(fnError.message || 'Analysis failed.');
      if (!data?.analysis) throw new Error('No analysis returned.');

      setResult(data.analysis);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // ── Chart overlay drop ─────────────────────────────────────────────────────
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    disabled: !result,
    onDrop: (files) => {
      if (files[0] && result) {
        const url = URL.createObjectURL(files[0]);
        setOverlayImage(url);
        setOverlayReady(true);
        setOverlayRendered(false);
      }
    },
  });

  // ── Draw overlay when image is ready ──────────────────────────────────────
  useEffect(() => {
    if (!overlayReady || !overlayImage || !result || !canvasRef.current) return;

    const img = new Image();
    img.onload = () => {
      if (canvasRef.current) {
        drawOverlay(canvasRef.current, img, result);
        setOverlayRendered(true);
      }
    };
    img.src = overlayImage;
  }, [overlayReady, overlayImage, result]);

  // ── Download annotated chart ───────────────────────────────────────────────
  const handleDownload = () => {
    if (!canvasRef.current || !result) return;
    const link = document.createElement('a');
    link.download = `${result.pair}_${result.timeframe}_SMC.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const entryMid = result ? (result.entry_zone_min + result.entry_zone_max) / 2 : 0;
  const sizing   = result ? calcContracts(accountBalance, riskPercent, entryMid, result.stop_loss, result.pair) : null;
  const config   = result ? FUTURES_MAP[result.pair] : null;
  const unit     = config?.unit || 'points';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">

        {/* ── Left: Controls ─────────────────────────────────────────── */}
        <div className="space-y-4">
          <AccountPanel onSettingsChange={(b, r) => { setAccountBalance(b); setRiskPercent(r); }} />

          <div className="bg-[#111318] border border-[#1E2128] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
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
                    {FUTURES_MAP[selectedSymbol]?.isMicro && (
                      <span className="ml-1.5 text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">MICRO</span>
                    )}
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
                          <div className="px-3 py-1.5 text-[10px] font-bold text-amber-500/70 uppercase tracking-wider bg-[#0A0B0D] sticky top-0">
                            {cat}
                          </div>
                          {symbols.map(s => (
                            <button
                              key={s.symbol}
                              onMouseDown={() => { setSelectedSymbol(s.symbol); setSymbolDropdownOpen(false); }}
                              className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                                selectedSymbol === s.symbol
                                  ? 'bg-amber-500/10 text-amber-400'
                                  : 'text-gray-300 hover:bg-white/3'
                              }`}
                            >
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
              <select
                value={selectedTimeframe}
                onChange={e => setSelectedTimeframe(e.target.value)}
                className="w-full bg-[#0A0B0D] border border-[#1E2128] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/30 transition-all"
              >
                {TIMEFRAMES.map(tf => (
                  <option key={tf.value} value={tf.value}>{tf.label}</option>
                ))}
              </select>
            </div>

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/30 disabled:cursor-not-allowed text-black font-display font-bold text-sm rounded-xl transition-all"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Analyzing {selectedSymbol}...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Analyze {selectedSymbol}
                </>
              )}
            </button>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}
          </div>

          {/* Chart overlay upload — shows AFTER analysis */}
          {result && (
            <div className="bg-[#111318] border border-[#1E2128] rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="font-display font-semibold text-sm text-white">Mark Up Chart</span>
                <span className="text-[10px] text-gray-600 ml-auto">optional</span>
              </div>
              <p className="text-xs text-gray-600">Upload your TradingView screenshot and levels will be drawn on it.</p>

              {!overlayImage ? (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                    isDragActive
                      ? 'border-cyan-500/50 bg-cyan-500/5'
                      : 'border-[#1E2128] hover:border-cyan-500/30 hover:bg-cyan-500/3'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className={`w-6 h-6 mx-auto mb-1.5 ${isDragActive ? 'text-cyan-400' : 'text-gray-700'}`} />
                  <p className="text-xs text-gray-600">Drop chart or click to upload</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setOverlayImage(null); setOverlayReady(false); setOverlayRendered(false); }}
                      className="flex items-center gap-1.5 px-2 py-1 bg-[#0A0B0D] border border-[#1E2128] rounded-lg text-xs text-gray-500 hover:text-gray-300 transition-all"
                    >
                      <X className="w-3 h-3" /> Remove
                    </button>
                    {overlayRendered && (
                      <button
                        onClick={handleDownload}
                        className="flex items-center gap-1.5 px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-xs text-cyan-400 hover:bg-cyan-500/20 transition-all"
                      >
                        <Download className="w-3 h-3" /> Download
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Results ─────────────────────────────────────────── */}
        <div>
          {!result && !loading && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-[#111318] border border-[#1E2128] rounded-2xl flex items-center justify-center mb-4">
                <BarChart3 className="w-7 h-7 text-gray-700" />
              </div>
              <h3 className="font-display font-semibold text-white mb-2">No analysis yet</h3>
              <p className="text-gray-600 text-sm max-w-xs">
                Select a symbol and timeframe, then hit Analyze to get your SMC setup.
              </p>
            </div>
          )}

          {loading && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-[#111318] border border-[#1E2128] rounded-2xl p-6 animate-pulse">
                  <div className="h-4 bg-[#1E2128] rounded w-1/3 mb-4" />
                  <div className="h-3 bg-[#1E2128] rounded w-2/3 mb-2" />
                  <div className="h-3 bg-[#1E2128] rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {result && (
            <div ref={resultRef} className="space-y-4">

              {/* Annotated chart canvas */}
              {overlayImage && (
                <div className="bg-[#111318] border border-[#1E2128] rounded-2xl overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-auto block"
                    style={{ maxHeight: '480px', objectFit: 'contain' }}
                  />
                  {!overlayRendered && (
                    <div className="p-3 text-center text-xs text-gray-600">Drawing levels...</div>
                  )}
                </div>
              )}

              {/* Setup status banner */}
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
                    <div className={`font-data font-bold text-2xl ${
                      result.confidence >= 85 ? 'text-emerald-400' :
                      result.confidence >= 75 ? 'text-amber-400' : 'text-orange-400'
                    }`}>{result.confidence}%</div>
                    <div className="font-data text-[10px] text-gray-600">CONFIDENCE</div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="w-full h-1.5 bg-[#1E2128] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full gauge-fill ${
                        result.confidence >= 85 ? 'bg-emerald-400' :
                        result.confidence >= 75 ? 'bg-amber-400' : 'bg-orange-400'
                      }`}
                      style={{ '--gauge-width': `${result.confidence}%` } as React.CSSProperties}
                    />
                  </div>
                </div>

                {result.higher_tf_bias && (
                  <div className="mt-3 px-3 py-2 bg-[#0A0B0D] border border-[#1E2128] rounded-xl">
                    <span className="text-[10px] text-gray-600 uppercase tracking-wider">HTF Bias · </span>
                    <span className="text-xs text-gray-300">{result.higher_tf_bias}</span>
                  </div>
                )}
              </div>

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
                <div className="bg-[#111318] border border-amber-500/15 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-amber-500/10 rounded-lg flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <span className="font-display font-semibold text-sm text-amber-400">Position Sizing</span>
                    <span className="font-data text-[10px] text-gray-600 ml-auto">{riskPercent}% risk · ${accountBalance.toLocaleString()}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Contracts',  val: sizing.contracts,                  color: 'text-white',    copy: true  },
                      { label: 'Dollar Risk', val: `$${sizing.dollarRisk.toFixed(0)}`, color: 'text-red-400',  copy: true  },
                      { label: 'Margin Est.', val: `~$${sizing.marginEstimate.toLocaleString()}`, color: 'text-gray-400', copy: false },
                      { label: 'R:R',         val: result.risk_reward,               color: 'text-amber-400', copy: false },
                    ].map(({ label, val, color, copy }) => (
                      <div key={label} className="bg-[#0A0B0D] rounded-xl p-3">
                        <div className="text-[10px] text-gray-600 mb-1">{label}</div>
                        <div className={`font-data font-bold text-lg ${color} flex items-center gap-1`}>
                          {val}
                          {copy && <CopyBtn value={String(val).replace('$', '')} />}
                        </div>
                      </div>
                    ))}
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
        </div>
      </div>
    </div>
  );
}
