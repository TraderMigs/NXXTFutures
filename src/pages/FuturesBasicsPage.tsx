// src/pages/FuturesBasicsPage.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { BookOpen, ChevronDown, ChevronUp, CheckCircle, XCircle, Award, TrendingUp, Clock, Shield, BarChart2, DollarSign, AlertTriangle, Layers, Trophy, Star, Lock } from 'lucide-react';

interface QuizQuestion { id: string; question: string; options: { key: string; text: string }[]; correct: string; explanation: string; }
interface QAItem { question: string; answer: string; }
interface Section { id: number; title: string; icon: React.ElementType; color: string; intro: string; qa: QAItem[]; quiz: QuizQuestion[]; }
interface SectionProgress { section_id: number; answers: Record<string, string>; correct_count: number; total_questions: number; section_completed: boolean; }

const SECTIONS: Section[] = [
  { id: 1, title: 'What Are Futures Contracts?', icon: BookOpen, color: 'cyan',
    intro: `A futures contract is a legal agreement to buy or sell a specific asset at a predetermined price on a future date. Unlike stocks where you own a piece of a company, futures give you control over a standardized contract — whether that's an equity index like the S&P 500, a commodity like gold or crude oil, or even Treasury bonds. Futures are traded on regulated exchanges like the CME (Chicago Mercantile Exchange), which means prices are transparent and contracts are standardized.\n\nThe key difference from stocks: futures use leverage. You don't need to pay the full contract value upfront — you post a margin deposit (a fraction of the value) to control the full contract. This is what makes futures powerful for experienced traders, and dangerous for unprepared ones.`,
    qa: [
      { question: 'Why do futures have expiration dates?', answer: 'Futures were originally created for producers and consumers of physical goods to lock in prices. A wheat farmer wants to guarantee a sale price before harvest; a cereal company wants to guarantee a purchase price before planting season. The expiration date is when delivery (or cash settlement for financial futures) occurs. Most traders never hold to expiry — they close or roll positions before then.' },
      { question: 'What happens if I hold a futures contract to expiration?', answer: 'For financial futures like ES (S&P 500) or NQ (Nasdaq), they\'re cash-settled — you receive or pay the difference in cash based on the final price. For commodity futures like CL (crude oil), physical delivery can occur if you hold to expiry. As a retail trader, you should ALWAYS close or roll your position before the last trading day to avoid any delivery issues.' },
      { question: 'How is futures trading different from forex trading?', answer: 'Forex is traded over-the-counter (decentralized, no central exchange), has no official daily close, and pricing can vary by broker. Futures trade on centralized exchanges with standardized contracts, transparent pricing, regulated clearing, and defined trading hours. For institutional traders, futures are preferred for equity indexes and commodities because of this transparency and standardization.' },
    ],
    quiz: [
      { id: 'q1_1', question: 'What is a futures contract?', options: [{ key: 'a', text: 'Ownership of a share in a company' }, { key: 'b', text: 'An agreement to buy or sell an asset at a set price on a future date' }, { key: 'c', text: 'A loan from a broker to buy stocks' }, { key: 'd', text: 'A type of savings account with guaranteed returns' }], correct: 'b', explanation: 'A futures contract is a standardized agreement to buy or sell an asset at a predetermined price at a specified future date — not ownership of the asset itself.' },
      { id: 'q1_2', question: 'Where are futures contracts traded?', options: [{ key: 'a', text: 'Over-the-counter, directly between two parties' }, { key: 'b', text: 'Only on the New York Stock Exchange' }, { key: 'c', text: 'On regulated exchanges like the CME' }, { key: 'd', text: 'Through your regular stock brokerage only' }], correct: 'c', explanation: 'Futures are traded on regulated exchanges like the CME Group, which standardizes contracts and provides transparent, centralized pricing.' },
      { id: 'q1_3', question: 'What should a retail trader do before a futures contract expires?', options: [{ key: 'a', text: 'Accept physical delivery of the commodity' }, { key: 'b', text: 'Close or roll the position before the last trading day' }, { key: 'c', text: 'Nothing — expiration handles itself automatically' }, { key: 'd', text: 'Convert it to a stock position' }], correct: 'b', explanation: 'Retail traders should always close or roll their positions before expiration. Financial futures cash-settle automatically, but commodity futures can result in physical delivery notices if held too long.' },
    ],
  },
  { id: 2, title: 'Standard vs Micro Contracts', icon: Layers, color: 'purple',
    intro: `One of the biggest barriers to futures trading used to be account size. A single ES (S&P 500 E-mini) contract requires roughly $12,000–$14,000 in margin, and controls $250,000+ of S&P 500 exposure. That locked out smaller accounts entirely.\n\nThe CME solved this by launching Micro E-mini contracts in 2019 — exact replicas of the standard contracts at 1/10th the size. The MES (Micro E-mini S&P 500) tracks the same chart as ES, the same price action, the same SMC setups — just at 1/10th the position size and margin requirement.\n\nThis means a signal generated for ES is equally valid for MES. Same entry, same stop, same targets. You just size it to your account. A $12,000 ES trade becomes a $1,200 MES trade. The math works the same way — just scaled down.`,
    qa: [
      { question: 'Do micro contracts trade the same chart as standard contracts?', answer: 'Yes — MES tracks the exact same price action as ES. Same chart, same order blocks, same liquidity zones, same SMC setups. The only difference is the dollar value per tick. An ES signal from NXXT Futures is directly applicable to MES — just use the micro sizing on the signal card.' },
      { question: 'What account size do I need to trade micros?', answer: 'Micro contracts have intraday margin requirements as low as $40–$100 per contract depending on your broker, though overnight margins are higher (~$1,000–$1,500). A practical minimum for responsible micro trading (using 1-2% risk per trade) is $1,000–$5,000. Always check your specific broker\'s margin requirements.' },
      { question: 'If micros are smaller, are they less profitable?', answer: 'Profit potential scales with position size, not contract type. A trader using 5 MES contracts has the same exposure as 0.5 ES contracts. The key advantage of micros isn\'t that they\'re "less risky" in absolute terms — it\'s that they let you size positions correctly relative to your account. Proper position sizing on micros beats improperly sized standard contracts every time.' },
    ],
    quiz: [
      { id: 'q2_1', question: 'What is the size relationship between ES and MES?', options: [{ key: 'a', text: 'MES is 1/100th the size of ES' }, { key: 'b', text: 'MES is 1/10th the size of ES' }, { key: 'c', text: 'MES is the same size as ES' }, { key: 'd', text: 'MES is 1/5th the size of ES' }], correct: 'b', explanation: 'MES (Micro E-mini S&P 500) is exactly 1/10th the size of ES (E-mini S&P 500). All Micro E-mini contracts launched by the CME follow the 1/10th ratio.' },
      { id: 'q2_2', question: 'An ES signal at entry 5,200, stop 5,185 is generated. Can you use this for MES?', options: [{ key: 'a', text: 'No — ES and MES have different price levels' }, { key: 'b', text: 'Only if you have the Elite tier' }, { key: 'c', text: 'Yes — same entry, stop, and targets, just 1/10th the contract value' }, { key: 'd', text: 'Only if you hold the position overnight' }], correct: 'c', explanation: 'ES and MES trade at identical price levels. A signal for ES at 5,200 entry is the exact same setup for MES — you just select the micro option on the signal card and it recalculates your position size.' },
      { id: 'q2_3', question: 'What was the main reason the CME launched Micro E-mini contracts?', options: [{ key: 'a', text: 'To reduce volatility in the markets' }, { key: 'b', text: 'To allow smaller account traders to access futures markets' }, { key: 'c', text: 'To replace the standard E-mini contracts' }, { key: 'd', text: 'To create a product exclusively for hedge funds' }], correct: 'b', explanation: 'The CME launched Micro E-mini contracts in 2019 primarily to make futures accessible to retail traders with smaller accounts, without changing the underlying market mechanics.' },
    ],
  },
  { id: 3, title: 'Margin, Leverage & Risk', icon: Shield, color: 'red',
    intro: `Margin is the deposit you put up to control a futures contract. It's not a down payment on a purchase — it's a performance bond. The exchange holds it to cover potential losses. There are two types: initial margin (what you need to open a position) and maintenance margin (the minimum your account must maintain while holding it). If your account drops below maintenance margin, you get a margin call and must add funds or close the position.\n\nLeverage is the multiplier effect of margin. If you control a $250,000 ES contract with $12,000 of margin, you have roughly 20:1 leverage. A 1% move in the S&P 500 generates a 20% gain or loss on your margin. This cuts both ways — it's why professional risk management isn't optional in futures.`,
    qa: [
      { question: 'What happens during a margin call?', answer: 'When your account equity falls below the maintenance margin level (usually 75-80% of initial margin), your broker issues a margin call. You must either deposit additional funds to bring your account back above initial margin, or the broker will automatically close your position — usually at the worst possible time. The best defense is to never risk more than 1-2% of your account on any single trade.' },
      { question: 'Is leverage inherently bad?', answer: 'No — leverage is a tool. Like any tool, it\'s dangerous in unskilled hands and powerful in skilled ones. Professional traders use leverage intentionally and conservatively. The problem isn\'t leverage itself but using it without a defined risk framework. A trader using 1-2% account risk per trade with proper stop losses is using leverage correctly, regardless of the nominal leverage ratio.' },
      { question: 'What\'s the difference between intraday and overnight margin?', answer: 'Brokers allow reduced intraday margin (sometimes called "day trading margin") during active market hours. Overnight margin is the full exchange-required margin, which is significantly higher. If you hold a futures position past the close of the active session, your broker will check that you have full overnight margin — and automatically close your position if you don\'t.' },
    ],
    quiz: [
      { id: 'q3_1', question: 'What is margin in futures trading?', options: [{ key: 'a', text: 'A fee charged by your broker for each trade' }, { key: 'b', text: 'A performance deposit held to cover potential losses' }, { key: 'c', text: 'The profit made on a trade' }, { key: 'd', text: 'The total value of the futures contract' }], correct: 'b', explanation: 'Margin in futures is a performance bond — money held by the exchange to guarantee you can cover your losses. It\'s not a fee, not a purchase price, and not your profit.' },
      { id: 'q3_2', question: 'If you control a $250,000 contract with $12,500 margin, what is your leverage ratio?', options: [{ key: 'a', text: '5:1' }, { key: 'b', text: '10:1' }, { key: 'c', text: '20:1' }, { key: 'd', text: '100:1' }], correct: 'c', explanation: '$250,000 ÷ $12,500 = 20x leverage. A 1% move in your favor doubles your margin. A 1% move against you and you\'ve lost 20% of your margin.' },
      { id: 'q3_3', question: 'What is the safest maximum risk per trade as a percentage of account?', options: [{ key: 'a', text: '10-20%' }, { key: 'b', text: '5-10%' }, { key: 'c', text: '1-2%' }, { key: 'd', text: 'As much as needed to reach profit targets' }], correct: 'c', explanation: 'Professional risk management dictates risking no more than 1-2% of your total account on any single trade. This allows you to withstand a losing streak and stay in the game.' },
    ],
  },
  { id: 4, title: 'Trading Sessions Explained', icon: Clock, color: 'amber',
    intro: `Futures markets are nearly 24 hours a day, Sunday through Friday. But not all hours are equal. Liquidity determines how clean and reliable price action is. Low liquidity means wide spreads, choppy moves, and signals that don't follow through. High liquidity means tight spreads, clean breakouts, and setups that respect technical levels.\n\nThe two sessions that matter most for NXXT Futures signals:\n\nLondon Session (3:00–7:00 AM EST): European institutional desks come online. Metals, energy, and FX futures see a massive surge in volume. London is where the day's initial price direction is often established.\n\nNew York Session (7:00–11:00 AM EST): US market opens. Economic data releases land here. 60-70% of the day's volume in equity index futures occurs in this window. The London-NY overlap (8-11 AM EST) is peak global liquidity.\n\nThis is why NXXT Futures only scans during these hours — not because the other hours don't move, but because clean, institutional-grade setups form here.`,
    qa: [
      { question: 'Why doesn\'t NXXT Futures scan during the Asian session?', answer: 'The Asian session (roughly 7 PM–2 AM EST) has significantly lower volume for US equity index and commodity futures. Price action tends to be choppy and range-bound, with moves driven more by algorithmic positioning than institutional order flow. SMC setups that form in low-liquidity conditions have lower follow-through. We scan when institutions are active — that\'s London and NY.' },
      { question: 'What are the most important economic events to know?', answer: 'Non-Farm Payrolls (NFP, first Friday each month), CPI (Consumer Price Index, monthly), FOMC meetings (8 per year), GDP reports, and weekly Jobless Claims are the major volatility drivers. These drop exclusively during NY session. Always check the economic calendar before trading on release days — volatility spikes can blow through stops in seconds.' },
      { question: 'Can I trade signals that appear outside London/NY hours?', answer: 'The platform only generates signals during London and NY sessions. However, PENDING signals generated during those hours may still be valid if price hasn\'t reached the entry zone. Check the signal\'s age — we auto-expire PENDING signals after 8 hours. Always check the economic calendar before entering any position.' },
    ],
    quiz: [
      { id: 'q4_1', question: 'What time does the New York futures session start (EST)?', options: [{ key: 'a', text: '12:00 AM EST' }, { key: 'b', text: '7:00 AM EST' }, { key: 'c', text: '9:30 AM EST' }, { key: 'd', text: '2:00 PM EST' }], correct: 'b', explanation: 'The New York futures session opens at 7:00 AM EST when US pre-market activity intensifies. Major economic data like CPI and NFP typically drops at 8:30 AM EST.' },
      { id: 'q4_2', question: 'Why does NXXT Futures only scan during London and NY sessions?', options: [{ key: 'a', text: 'To reduce server costs' }, { key: 'b', text: 'Because futures markets are closed outside those hours' }, { key: 'c', text: 'Because institutional liquidity is highest then, producing cleaner SMC setups' }, { key: 'd', text: 'Because the AI only works during US business hours' }], correct: 'c', explanation: 'NXXT Futures scans during London (3-7 AM EST) and NY (7-11 AM EST) because institutional order flow is at its peak. Clean SMC setups form when smart money is actively positioning.' },
      { id: 'q4_3', question: 'What is the London-NY overlap and why does it matter?', options: [{ key: 'a', text: 'A time when both markets are closed for lunch' }, { key: 'b', text: 'The window (roughly 8-11 AM EST) when both London and NY institutions are simultaneously active — peak global liquidity' }, { key: 'c', text: 'When US and UK data releases happen simultaneously' }, { key: 'd', text: 'A regulatory requirement for reporting trades' }], correct: 'b', explanation: 'The London-NY overlap (approximately 8:00-11:00 AM EST) is when both European and US institutional desks are simultaneously active. This is peak global liquidity — the cleanest price action, tightest spreads, and highest probability setups of the trading day.' },
    ],
  },
  { id: 5, title: 'Reading a NXXT Futures Signal', icon: BarChart2, color: 'green',
    intro: `Every signal card on the Hot Picks tab contains everything you need to evaluate and execute a trade.\n\nSymbol — The futures contract (ES = S&P 500 E-mini, NQ = Nasdaq, GC = Gold, CL = Crude Oil, etc.)\nDirection — LONG (buy, expecting price up) or SHORT (sell, expecting price down)\nEntry Zone — The price range where the setup becomes valid. Wait for price to enter this zone.\nStop Loss — The price level where the idea is wrong. If price hits this, exit immediately.\nTP1 / TP2 / TP3 — Take profit targets at ascending reward levels.\nConfidence — The AI's conviction score based on multi-timeframe alignment. 80%+ is high conviction.\nRisk:Reward — The ratio of potential profit to potential loss. We target minimum 1:2.\nSetup Status — PENDING (waiting), AT_ENTRY (in zone now), MISSED (entry zone passed).`,
    qa: [
      { question: 'What does "AT_ENTRY" mean and how should I act on it?', answer: '"AT_ENTRY" means price is currently inside the entry zone right now. This is the signal\'s active window. You should evaluate it immediately — check the current price against the entry zone on your chart, confirm the setup looks clean, ensure you\'re not near a major economic release, and if everything checks out, size your position correctly and enter. AT_ENTRY signals don\'t last long.' },
      { question: 'Should I always aim for TP3?', answer: 'No. TP3 is the ideal extension if the trade develops perfectly with strong momentum. Experienced traders often scale out: take partial profits at TP1 to cover risk, move stop to breakeven, then hold remainder toward TP2/TP3. If you\'re new, focus on TP1 and TP2. A consistent 1:2 risk:reward win rate of 50% is mathematically profitable. Chasing TP3 on every trade often leads to giving back profits.' },
      { question: 'What does the confidence score measure?', answer: 'Confidence reflects how well-aligned the setup is across multiple timeframes. The AI checks structure (BOS, CHoCH), order blocks, fair value gaps, liquidity levels, and institutional bias at the Daily, 4H, and 1H timeframes. A 90% signal means all three timeframes agree and the setup is textbook. Below 78% we don\'t display the signal.' },
    ],
    quiz: [
      { id: 'q5_1', question: 'A signal shows Entry Zone: 5,195–5,200. Current price is 5,210. What does this mean?', options: [{ key: 'a', text: 'Enter immediately — it\'s close enough' }, { key: 'b', text: 'The entry zone was already passed — check the setup status (likely MISSED)' }, { key: 'c', text: 'Price will reverse back to 5,195 soon' }, { key: 'd', text: 'The signal is still valid at 5,210' }], correct: 'b', explanation: 'If price is above the entry zone for a LONG setup, the entry opportunity may have passed. The signal status should show MISSED. Chasing entries above the zone invalidates the risk:reward ratio.' },
      { id: 'q5_2', question: 'What does a 1:3 Risk:Reward ratio mean?', options: [{ key: 'a', text: 'You need to win 3 out of every 1 trade' }, { key: 'b', text: 'You risk $3 to potentially make $1' }, { key: 'c', text: 'You risk $1 to potentially make $3' }, { key: 'd', text: 'The trade lasts 3 times longer than the average' }], correct: 'c', explanation: '1:3 means for every $1 you risk (stop loss distance), your profit target is $3. With a 1:3 R:R, you only need to win 25% of trades to break even — mathematically a powerful edge.' },
      { id: 'q5_3', question: 'What should you do when a signal shows "MISSED" status?', options: [{ key: 'a', text: 'Enter anyway — the direction is still valid' }, { key: 'b', text: 'Do not trade it — the entry zone has passed and the original R:R is gone' }, { key: 'c', text: 'Double your position to make up for missing the entry' }, { key: 'd', text: 'Move your stop loss further away' }], correct: 'b', explanation: 'MISSED means the entry zone was passed and the setup is no longer valid at current prices. Entering late means your stop loss placement is wrong and your risk:reward ratio has deteriorated. Wait for the next setup.' },
    ],
  },
  { id: 6, title: 'Smart Money Concepts (SMC)', icon: TrendingUp, color: 'indigo',
    intro: `Smart Money Concepts is the framework NXXT Futures uses to identify where institutional traders (banks, hedge funds, prop firms) are positioning. The core idea: institutional order flow leaves tracks in price action that retail traders can read and trade alongside.\n\nMarket Structure — Price moves in cycles of Higher Highs/Higher Lows (uptrend) or Lower Highs/Lower Lows (downtrend). A Break of Structure (BOS) confirms continuation. A Change of Character (CHoCH) signals a potential reversal.\n\nOrder Blocks — Areas where institutional traders placed large orders. Price often returns to these zones because unfilled institutional orders remain there, acting as support or resistance.\n\nFair Value Gaps (FVG) — Price inefficiencies created when price moves too fast, leaving a gap with no trading. Institutions often send price back to fill these gaps before continuing.\n\nLiquidity — Retail stop losses cluster above swing highs and below swing lows. Institutions sweep these levels to fill their large orders, then reverse. Recognizing liquidity grabs is one of the most valuable SMC skills.`,
    qa: [
      { question: 'Why do Order Blocks work as support/resistance?', answer: 'Large institutions can\'t fill their entire order in one tick — they need volume on the other side. They accumulate positions across a price range (the order block). When price returns to that range, their remaining unfilled orders are still sitting there, creating real buy/sell pressure that manifests as support or resistance. It\'s not a self-fulfilling prophecy — it\'s supply and demand at an institutional scale.' },
      { question: 'What is a liquidity sweep and why should I care?', answer: 'A liquidity sweep is when price briefly spikes beyond a key high or low (where retail stop losses and pending orders cluster), triggers those orders, then immediately reverses. From an institutional perspective, they need someone to sell to (for a long entry) — retail stop losses below a swing low provide that selling. After the sweep, smart money is positioned long and price moves in their direction.' },
      { question: 'What is a BOS vs a CHoCH?', answer: 'A Break of Structure (BOS) happens when price breaks a swing point in the direction of the current trend — it confirms continuation. A Change of Character (CHoCH) happens when price breaks a swing point against the current trend for the first time — it signals the trend may be reversing. BOS = continue the trade. CHoCH = watch for reversal setups.' },
    ],
    quiz: [
      { id: 'q6_1', question: 'What does a "Break of Structure" (BOS) signal?', options: [{ key: 'a', text: 'The trend is reversing' }, { key: 'b', text: 'The current trend is continuing' }, { key: 'c', text: 'The market is entering a range' }, { key: 'd', text: 'A liquidity sweep is about to occur' }], correct: 'b', explanation: 'A BOS confirms trend continuation. In an uptrend, a BOS means price has broken above the previous swing high, confirming buyers remain in control.' },
      { id: 'q6_2', question: 'What is a Fair Value Gap (FVG)?', options: [{ key: 'a', text: 'The gap between the bid and ask price' }, { key: 'b', text: 'A price inefficiency created when price moves too fast, leaving a zone with no trading' }, { key: 'c', text: 'The difference between your entry and stop loss' }, { key: 'd', text: 'A gap that occurs only during overnight sessions' }], correct: 'b', explanation: 'A Fair Value Gap is a three-candle pattern where the middle candle moves so fast that price "skips" a range with no two-sided trading. Institutions often drive price back to fill these gaps before continuing.' },
      { id: 'q6_3', question: 'What is the purpose of a liquidity sweep?', options: [{ key: 'a', text: 'To clean up old orders on the exchange' }, { key: 'b', text: 'Institutions briefly spike price past clustered stops to fill their large orders, then reverse' }, { key: 'c', text: 'A regulatory process to verify trade accuracy' }, { key: 'd', text: 'When two large institutions trade directly with each other' }], correct: 'b', explanation: 'A liquidity sweep is an institutional move — price briefly violates a key high or low to trigger retail stop losses (providing liquidity institutions need), then reverses strongly. After a clean sweep, institutions are positioned and the "real" move begins.' },
    ],
  },
  { id: 7, title: 'Risk Management Fundamentals', icon: DollarSign, color: 'emerald',
    intro: `Risk management is the only variable you fully control in trading. You can't control where price goes. You can't control whether your setup plays out. But you 100% control how much you risk per trade, where you place your stop, and when you exit.\n\nThe 1-2% rule: Never risk more than 1-2% of your total account on a single trade. This sounds conservative. It is. It's also why professional traders survive and amateurs blow up. With 2% risk per trade, you can lose 10 trades in a row and still have 80% of your account. With 20% risk per trade, 3 losers and you're done.\n\nPosition sizing is the math that makes the 1-2% rule work. The NXXT Futures position calculator does this automatically — you input your account size and risk percentage, it tells you exactly how many contracts to trade for a given stop distance. Use it. Every. Single. Time.`,
    qa: [
      { question: 'Why is the 1-2% rule so important?', answer: 'Even the best traders in the world have losing streaks of 5, 8, 10+ trades. At 2% risk per trade, losing 10 in a row costs you 20% of your account — painful but survivable. At 10% risk per trade, losing 10 in a row costs you 100%. The 1-2% rule is what separates traders who are still trading after 5 years from those who blew up after 3 months.' },
      { question: 'Where should I place my stop loss?', answer: 'Stop losses should be placed beyond the structure that invalidates your trade — not at an arbitrary dollar amount. On a LONG setup, your stop goes below the order block or swing low that defines the setup. If price reaches that level, your trade thesis is wrong and you should be flat. The position calculator then figures out how many contracts gives you your 1-2% risk at that stop distance.' },
      { question: 'Should I ever move my stop loss further away to avoid getting stopped out?', answer: 'Never. Moving a stop away from your original placement is one of the most dangerous habits in trading. It means you\'re "hoping" rather than trading with a plan. The original stop was at the level that invalidates your idea — moving it further doesn\'t change that. It just means you\'re taking a bigger loss when you\'re wrong. Honor your stops. Always.' },
    ],
    quiz: [
      { id: 'q7_1', question: 'You have a $5,000 account and want to risk 2% per trade. What is your max risk per trade?', options: [{ key: 'a', text: '$500' }, { key: 'b', text: '$200' }, { key: 'c', text: '$100' }, { key: 'd', text: '$1,000' }], correct: 'c', explanation: '$5,000 × 2% = $100 maximum risk per trade. The position calculator will determine how many micro contracts you can trade with a $100 risk given the signal\'s stop loss distance.' },
      { id: 'q7_2', question: 'A trade is going against you. What should you do if it reaches your stop loss?', options: [{ key: 'a', text: 'Move the stop further away and wait for a recovery' }, { key: 'b', text: 'Add to the position to average down' }, { key: 'c', text: 'Close the position — your trade thesis is wrong' }, { key: 'd', text: 'Switch from micro to standard contracts to recover faster' }], correct: 'c', explanation: 'Your stop loss is the level where your trade idea is wrong. When price reaches it, close immediately. Moving stops or averaging down are account-killing habits that turn small losses into large ones.' },
      { id: 'q7_3', question: 'Why does proper position sizing matter more than picking the "right" trades?', options: [{ key: 'a', text: 'It doesn\'t — trade selection is the most important factor' }, { key: 'b', text: 'Proper sizing keeps losses survivable so you can stay in the game long enough for your edge to play out' }, { key: 'c', text: 'Because brokers require it for regulatory purposes' }, { key: 'd', text: 'It only matters for accounts over $100,000' }], correct: 'b', explanation: 'Even a 60% win rate strategy loses 40% of trades. Without proper sizing, those losses can be large enough to wipe out gains. Proper position sizing is what lets a statistical edge compound over time.' },
    ],
  },
  { id: 8, title: 'Common Beginner Mistakes', icon: AlertTriangle, color: 'rose',
    intro: `12+ years of watching traders blow up accounts reveals a pattern. The same mistakes appear over and over. None of them are about not knowing the right indicators. All of them are about psychology, discipline, and process.\n\nThe most expensive mistakes aren't about being wrong on direction — losses are a cost of doing business. The expensive mistakes are about letting small, manageable losses turn into account-killing disasters. Here are the ones that matter most.`,
    qa: [
      { question: 'What is overtrading and how do I avoid it?', answer: 'Overtrading is taking low-quality setups out of boredom, impatience, or desperation to "make back" losses. It\'s the single most common way good traders sabotage themselves. NXXT Futures only generates signals during peak liquidity sessions for exactly this reason — we remove the temptation by limiting signal output to high-conviction setups. If there\'s no signal, there\'s no trade. Not trading is a position.' },
      { question: 'What is "revenge trading" and why is it dangerous?', answer: 'Revenge trading is entering a new trade immediately after a loss, usually with a larger size, to "win back" what you lost. Your emotional state after a loss is the worst possible state for making trading decisions. Every revenge trade compounds the original mistake. The correct response to a losing trade is to step away, review what happened, and only re-enter when you\'re calm and a valid setup presents itself.' },
      { question: 'Why do most traders fail even when they have a working strategy?', answer: 'Because they can\'t follow their own rules consistently. They take profits early out of fear and let losses run out of hope. They skip stops when "this one feels different." They oversize after wins and undersize after losses. A working strategy executed inconsistently produces random results. Trading psychology is the last mile — and it\'s often harder than the technical skills.' },
    ],
    quiz: [
      { id: 'q8_1', question: 'You\'ve had 3 losing trades today. What is the correct response?', options: [{ key: 'a', text: 'Increase your position size to win it all back faster' }, { key: 'b', text: 'Take a break, review the trades calmly, and only re-enter on a valid new setup' }, { key: 'c', text: 'Enter in the opposite direction of your last trade' }, { key: 'd', text: 'Trade through the afternoon session to make up the losses before close' }], correct: 'b', explanation: 'Three losers in a row is a signal to step back, not press harder. Emotional decision-making after losses produces revenge trades. Review what happened, confirm whether you followed your plan, then wait for a fresh, valid setup.' },
      { id: 'q8_2', question: 'What does "not trading is a position" mean?', options: [{ key: 'a', text: 'You should always have at least one open trade' }, { key: 'b', text: 'Standing aside when there\'s no quality setup is a legitimate, capital-preserving choice' }, { key: 'c', text: 'You should hold cash instead of futures' }, { key: 'd', text: 'Trading costs money, so not trading saves money' }], correct: 'b', explanation: 'Being in cash (flat, no position) when there\'s no quality setup is one of the most disciplined things a trader can do. You preserve capital, avoid overtrading, and stay sharp for the next high-probability opportunity.' },
      { id: 'q8_3', question: 'A trader has a 65% win rate strategy but loses money overall. What is the most likely cause?', options: [{ key: 'a', text: 'The strategy has too many rules' }, { key: 'b', text: 'Losses on the 35% of losers are much larger than gains on the 65% of winners due to poor position sizing or moving stops' }, { key: 'c', text: 'The strategy only works on certain instruments' }, { key: 'd', text: 'They are not trading during London and NY sessions' }], correct: 'b', explanation: 'A 65% win rate with a negative risk:reward ratio (average loss bigger than average win) will lose money over time. Mathematical edge requires BOTH a win rate AND positive risk:reward working together.' },
    ],
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  cyan:    { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    text: 'text-cyan-400',    badge: 'bg-cyan-500/20 text-cyan-400' },
  purple:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  text: 'text-purple-400',  badge: 'bg-purple-500/20 text-purple-400' },
  red:     { bg: 'bg-red-500/10',     border: 'border-red-500/30',     text: 'text-red-400',     badge: 'bg-red-500/20 text-red-400' },
  amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400',   badge: 'bg-amber-500/20 text-amber-400' },
  green:   { bg: 'bg-green-500/10',   border: 'border-green-500/30',   text: 'text-green-400',   badge: 'bg-green-500/20 text-green-400' },
  indigo:  { bg: 'bg-indigo-500/10',  border: 'border-indigo-500/30',  text: 'text-indigo-400',  badge: 'bg-indigo-500/20 text-indigo-400' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-400' },
  rose:    { bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    text: 'text-rose-400',    badge: 'bg-rose-500/20 text-rose-400' },
};

export function FuturesBasicsPage() {
  const { user } = useAuth();
  const [progressMap, setProgressMap] = useState<Record<number, SectionProgress>>({});
  const [expandedQA, setExpandedQA] = useState<Record<string, boolean>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<number, boolean>>({});
  const [savingSection, setSavingSection] = useState<number | null>(null);
  const [badgeEarned, setBadgeEarned] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadProgress();
  }, [user]);

  const loadProgress = async () => {
    try {
      const { data } = await supabase.from('education_progress').select('*').eq('user_id', user!.id);
      const map: Record<number, SectionProgress> = {};
      data?.forEach(row => {
        map[row.section_id] = row;
        if (row.section_completed) {
          setQuizSubmitted(prev => ({ ...prev, [row.section_id]: true }));
          setQuizAnswers(prev => ({ ...prev, ...row.answers }));
        }
      });
      setProgressMap(map);
      const { data: profile } = await supabase.from('profiles').select('education_badge_earned').eq('id', user!.id).single();
      if (profile?.education_badge_earned) setBadgeEarned(true);
    } catch (err) { console.error('Error loading progress:', err); }
    finally { setLoading(false); }
  };

  const completedSections = Object.values(progressMap).filter(p => p.section_completed).length;
  const overallPct = Math.round((completedSections / SECTIONS.length) * 100);

  const handleSubmitQuiz = async (section: Section) => {
    if (!user) return;
    const allAnswered = section.quiz.every(q => quizAnswers[q.id]);
    if (!allAnswered) return;
    setSavingSection(section.id);
    try {
      const correctCount = section.quiz.filter(q => quizAnswers[q.id] === q.correct).length;
      const allCorrect = correctCount === section.quiz.length;
      const answers: Record<string, string> = {};
      section.quiz.forEach(q => { answers[q.id] = quizAnswers[q.id]; });
      await supabase.from('education_progress').upsert({
        user_id: user.id, section_id: section.id, answers,
        correct_count: correctCount, total_questions: section.quiz.length,
        section_completed: allCorrect,
        completed_at: allCorrect ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,section_id' });
      setQuizSubmitted(prev => ({ ...prev, [section.id]: true }));
      await loadProgress();
      const newCompleted = completedSections + (allCorrect ? 1 : 0);
      if (newCompleted === SECTIONS.length && !badgeEarned) await handleBadgeEarned();
    } catch (err) { console.error('Error saving quiz:', err); }
    finally { setSavingSection(null); }
  };

  const handleBadgeEarned = async () => {
    if (!user) return;
    try {
      await supabase.from('profiles').update({ education_badge_earned: true, education_badge_earned_at: new Date().toISOString(), education_completion_pct: 100 }).eq('id', user.id);
      const { data: profile } = await supabase.from('profiles').select('email').eq('id', user.id).single();
      if (profile?.email) {
        await supabase.functions.invoke('send-email', { body: { type: 'quiz_completion', email: profile.email, data: { user_id: user.id } } });
      }
      setBadgeEarned(true); setShowBadgeModal(true);
    } catch (err) { console.error('Error handling badge:', err); }
  };

  // E3 FIX: useEffect MUST come before any early return — Rules of Hooks.
  // Previously this was placed AFTER the if(loading) guard below, which caused
  // React #310: render 1 (loading=true) skipped this hook → N hooks total.
  // Render 2 (loading=false) reached it → N+1 hooks → crash.
  // FuturesBasicsPage is always mounted by AppShell (CSS block/hidden), so this
  // fires on every login even when the Education tab isn't visible.
  useEffect(() => { document.title = 'Futures Basics — NXXT Futures'; return () => { document.title = 'NXXT Futures'; }; }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-500" /></div>;

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-500/20 rounded-lg"><BookOpen className="w-6 h-6 text-cyan-400" /></div>
            <h1 className="text-3xl font-bold">Futures Basics</h1>
            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full border border-green-500/30">FREE</span>
          </div>
          <p className="text-gray-400">Everything you need to trade futures with confidence. Complete all sections to earn your graduation badge and unlock a special reward.</p>
        </div>

        <div className="mb-8 p-5 bg-gray-900 border border-gray-800 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {badgeEarned ? <Trophy className="w-5 h-5 text-amber-400" /> : <Star className="w-5 h-5 text-gray-500" />}
              <span className="font-semibold">Your Progress</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm">{completedSections} / {SECTIONS.length} sections</span>
              <span className={`text-lg font-bold ${overallPct === 100 ? 'text-amber-400' : 'text-white'}`}>{overallPct}%</span>
            </div>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <div className={`h-3 rounded-full transition-all duration-700 ${overallPct === 100 ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`} style={{ width: `${overallPct}%` }} />
          </div>
          {badgeEarned && <div className="mt-3 flex items-center gap-2"><span className="text-2xl">🏅</span><span className="text-amber-400 font-semibold text-sm">Futures Graduate — Badge Earned!</span><button onClick={() => setShowBadgeModal(true)} className="ml-auto text-xs text-amber-400 hover:text-amber-300 underline">View badge</button></div>}
          {!user && <p className="mt-2 text-xs text-amber-400">Sign in to save your progress and earn your graduation badge</p>}
        </div>

        <div className="space-y-8">
          {SECTIONS.map(section => {
            const colors = COLOR_MAP[section.color];
            const Icon = section.icon;
            const prog = progressMap[section.id];
            const status = !prog ? 'not_started' : prog.section_completed ? 'completed' : 'in_progress';
            const submitted = quizSubmitted[section.id];

            return (
              <div key={section.id} className={`border rounded-xl overflow-hidden ${status === 'completed' ? 'border-green-500/40 bg-green-500/5' : `${colors.border} ${colors.bg}`}`}>
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl flex-shrink-0 ${colors.bg} border ${colors.border}`}><Icon className={`w-5 h-5 ${colors.text}`} /></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold ${colors.badge} px-2 py-0.5 rounded-full`}>Section {section.id}</span>
                        {status === 'completed' && <span className="text-xs font-semibold bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Complete</span>}
                      </div>
                      <h2 className="text-xl font-bold mt-1">{section.title}</h2>
                    </div>
                  </div>
                  <div className="mt-4 text-gray-300 text-sm leading-relaxed whitespace-pre-line">{section.intro}</div>
                </div>

                <div className="px-6 pb-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Q&A — Common Questions</h3>
                  <div className="space-y-2">
                    {section.qa.map((item, idx) => {
                      const key = `${section.id}-qa-${idx}`;
                      const open = expandedQA[key];
                      return (
                        <div key={key} className="border border-gray-800 rounded-lg overflow-hidden">
                          <button onClick={() => setExpandedQA(prev => ({ ...prev, [key]: !prev[key] }))} className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors">
                            <span className="font-medium text-sm text-gray-200 pr-4">{item.question}</span>
                            {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                          </button>
                          {open && <div className={`px-4 pb-4 pt-3 text-sm text-gray-300 leading-relaxed border-t border-gray-800 ${colors.bg}`}>{item.answer}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="px-6 py-6">
                  <div className={`border rounded-xl p-5 ${status === 'completed' ? 'border-green-500/30 bg-green-500/5' : 'border-gray-700 bg-black/30'}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${status === 'completed' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'}`}>{status === 'completed' ? '✓' : '?'}</div>
                      <h3 className="font-semibold text-sm">Section {section.id} Quiz{status === 'completed' && <span className="ml-2 text-green-400 text-xs">— {prog?.correct_count}/{prog?.total_questions} correct</span>}</h3>
                      {!user && <span className="ml-auto flex items-center gap-1 text-xs text-gray-500"><Lock className="w-3 h-3" /> Sign in to save progress</span>}
                    </div>
                    <div className="space-y-5">
                      {section.quiz.map(q => {
                        const selected = quizAnswers[q.id];
                        const showResult = submitted;
                        return (
                          <div key={q.id}>
                            <p className="text-sm font-medium text-gray-200 mb-2">{q.question}</p>
                            <div className="space-y-2">
                              {q.options.map(opt => {
                                let cls = 'border-gray-700 bg-gray-900/50 text-gray-300 hover:border-gray-500';
                                if (selected === opt.key && !showResult) cls = `${colors.border} ${colors.bg} ${colors.text}`;
                                if (showResult) {
                                  if (opt.key === q.correct) cls = 'border-green-500/50 bg-green-500/10 text-green-400';
                                  else if (selected === opt.key) cls = 'border-red-500/50 bg-red-500/10 text-red-400';
                                  else cls = 'border-gray-800 bg-transparent text-gray-500';
                                }
                                return (
                                  <button key={opt.key} onClick={() => !submitted && setQuizAnswers(prev => ({ ...prev, [q.id]: opt.key }))} disabled={submitted} className={`w-full text-left p-3 rounded-lg border text-sm transition-all flex items-start gap-2 ${cls} ${submitted ? 'cursor-default' : 'cursor-pointer'}`}>
                                    <span className="font-mono font-bold uppercase flex-shrink-0 text-xs mt-0.5">{opt.key}.</span>
                                    <span>{opt.text}</span>
                                    {showResult && opt.key === q.correct && <CheckCircle className="w-4 h-4 ml-auto flex-shrink-0 text-green-400 mt-0.5" />}
                                    {showResult && selected === opt.key && selected !== q.correct && <XCircle className="w-4 h-4 ml-auto flex-shrink-0 text-red-400 mt-0.5" />}
                                  </button>
                                );
                              })}
                            </div>
                            {showResult && <div className={`mt-2 p-3 rounded-lg text-xs leading-relaxed ${quizAnswers[q.id] === q.correct ? 'bg-green-500/10 border border-green-500/20 text-green-300' : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'}`}><span className="font-semibold">{quizAnswers[q.id] === q.correct ? '✓ Correct — ' : '✗ Incorrect — '}</span>{q.explanation}</div>}
                          </div>
                        );
                      })}
                    </div>
                    {!submitted && (
                      <button onClick={() => handleSubmitQuiz(section)} disabled={!section.quiz.every(q => quizAnswers[q.id]) || savingSection === section.id} className={`mt-5 w-full py-3 rounded-lg font-semibold text-sm transition-all ${section.quiz.every(q => quizAnswers[q.id]) ? 'bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}>
                        {savingSection === section.id ? 'Saving...' : section.quiz.every(q => quizAnswers[q.id]) ? 'Submit Quiz' : 'Answer all questions to submit'}
                      </button>
                    )}
                    {submitted && (
                      <div className={`mt-4 p-3 rounded-lg text-center text-sm font-semibold ${status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                        {status === 'completed' ? `✓ Section complete — ${prog?.correct_count}/${prog?.total_questions} correct` : `${prog?.correct_count}/${prog?.total_questions} correct — review the explanations and retake`}
                        {status !== 'completed' && <button onClick={() => setQuizSubmitted(prev => ({ ...prev, [section.id]: false }))} className="block w-full mt-2 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition-colors">Retake Quiz</button>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showBadgeModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-amber-500/40 rounded-2xl p-8 max-w-md w-full text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
            <div className="text-6xl mb-4 relative">🏅</div>
            <div className="inline-block bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold text-xs px-3 py-1 rounded-full mb-4 uppercase tracking-widest">Futures Graduate</div>
            <h2 className="text-2xl font-bold mb-2 text-white">Course Complete!</h2>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">You've completed all 8 sections of Futures Basics. Check your email — you've earned 50% off your first month of Elite Trader, valid for 7 days.</p>
            <div className="bg-black/50 border border-amber-500/20 rounded-xl p-4 mb-6">
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-400">Sections Completed</span><span className="text-amber-400 font-bold">{SECTIONS.length} / {SECTIONS.length}</span></div>
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-400">Overall Score</span><span className="text-amber-400 font-bold">100%</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Reward</span><span className="text-green-400 font-bold">GRADUATE50 sent ✓</span></div>
            </div>
            <div className="flex gap-3">
              <a href="/pricing" className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-bold rounded-xl text-sm hover:from-amber-400 hover:to-yellow-500 transition-all">Upgrade with 50% Off</a>
              <button onClick={() => setShowBadgeModal(false)} className="flex-1 py-3 bg-gray-800 text-gray-300 font-medium rounded-xl text-sm hover:bg-gray-700 transition-all">Continue Learning</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
