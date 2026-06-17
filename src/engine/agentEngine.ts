import { getFund } from '../data/fundsDatabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AgentPortfolioItem {
  code: string;
  weight: number;
}

export interface AgentLog {
  agentName: string;
  role: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  promptSent: string;
  outputReceived: string;
  timestamp: string;
}

export interface MarketRegimeSignals {
  interestRate: 'high' | 'medium' | 'low';
  inflation: 'rising' | 'stable' | 'falling';
  momentum: 'bullish' | 'bearish' | 'sideways';
  fundFlows: 'inflow' | 'outflow' | 'flat';
}

export const TURKEY_MACRO_SIGNALS: MarketRegimeSignals = {
  interestRate: 'high',
  inflation: 'falling',
  momentum: 'sideways',
  fundFlows: 'flat'
};

// -------------------------------------------------------------
// Core Engine Interfaces
// -------------------------------------------------------------
export interface DataAgentOutput {
  fund_code: string;
  name: string;
  category: string;
  asset_allocation: Record<string, number>;
  top_holdings: { name: string; weight: number; code?: string }[];
  sector_weights: Record<string, number>;
  historical_returns: Record<string, number>;
  risk_metrics: Record<string, number>;
}

export interface RiskAnalyzerOutput {
  risk_score: number;
  volatility_level: 'low' | 'medium' | 'high';
  max_drawdown_estimate: string;
  concentration_risk: string;
  comments: string[];
}

export interface OverlapAnalyzerOutput {
  fund_overlap_matrix: Record<string, Record<string, number>>;
  top_common_assets: string[];
  effective_diversification_score: number;
  key_findings: string[];
}

export interface MarketRegimeOutput {
  regime: 'risk-on' | 'risk-off' | 'neutral' | 'tightening' | 'easing';
  confidence: number;
  implications_for_portfolio: string[];
}

export interface OptimizationOutput {
  current_portfolio_score: number;
  optimized_portfolio: { code: string; weight: number; name?: string }[];
  changes_summary: string[];
}

export interface HealthScoresOutput {
  riskScore: number;
  diversificationScore: number;
  liquidityScore: number;
  inflationScore: number;
  fxScore: number;
  interestScore: number;
  overallScore: number;
}

export interface AdvancedRiskMetrics {
  volatility: number;
  sharpe: number;
  beta: number;
  maxDrawdown: number;
  correlation: number;
  concentration: number;
}

export interface ScenarioImpact {
  impact: number;
  comment: string;
}

export interface StressTestImpact {
  score: number;
  loss: number;
  rating: 'Güçlü' | 'Orta' | 'Zayıf';
  comment: string;
}

export interface BacktestResult {
  totalReturn: number;
  annualReturn: number;
  sharpe: number;
  volatility: number;
  maxDrawdown: number;
  monthlyData: { date: string; value: number }[];
  bist100Data?: { date: string; value: number }[];
  goldData?: { date: string; value: number }[];
}

export interface MonteCarloResult {
  medianPath: number[];
  optimisticPath: number[];
  pessimisticPath: number[];
}

export interface MacroAnalystOutput {
  cds: number;
  tufe: number;
  ufe: number;
  dxy: number;
  tcmbRate: number;
  flows: string;
  commentary: string;
}

export interface AgentSystemResult {
  portfolio: AgentPortfolioItem[];
  logs: AgentLog[];
  data: DataAgentOutput[];
  risk: RiskAnalyzerOutput;
  overlap: OverlapAnalyzerOutput;
  regime: MarketRegimeOutput;
  optimization: OptimizationOutput;
  finalAdvisorReport: string;
  healthScores?: HealthScoresOutput;
  advancedRiskMetrics?: AdvancedRiskMetrics;
  scenarios?: Record<string, ScenarioImpact>;
  stressTests?: Record<string, StressTestImpact>;
  backtest?: BacktestResult;
  monteCarlo?: MonteCarloResult;
  macroAnalyst?: MacroAnalystOutput;
}


// -------------------------------------------------------------
// Prompts Focused on Custom Risk-Based Portfolio Building
// -------------------------------------------------------------
export const AGENT_PROMPTS = {
  ORCHESTRATOR: `🎯 Role: Master Controller (Portfolio builder based on client risk profile)
You are the Portfolio Intelligence Orchestrator for a fintech AI system.
Your job is to:
1. Understand the client's risk profile (risk tolerance 1-10, goal, horizon)
2. Decide the target asset allocation mix based on these criteria and macro indicators
3. Task the Data Agent to retrieve the best matching Turkish mutual funds
4. Run Risk, Overlap, and Market Regime analysis on the constructed portfolio
5. Compile the final advice report explaining WHY this portfolio was built for this client
Rules:
- Never give financial advice as certainty
- Only provide analysis and scenario-based insights
- Always prioritize clarity for retail investors`,

  DATA_AGENT: `🎯 Role: Financial Data Collector
You are the Financial Data Extraction Agent.
Your job is to select the best matching funds (from TLY, PHE, PBR, DFI, TMV, IJC, MAC, IIH, AFT, YAS) based on the Orchestrator's target asset allocation, and structure their data.
Output format MUST be structured JSON:
{
  "fund_code": "",
  "asset_allocation": {},
  "top_holdings": [],
  "sector_weights": {},
  "historical_returns": {},
  "risk_metrics": {}
}
Rules:
- Do NOT analyze
- Do NOT give opinions
- Extract and normalize data`,

  RISK_ANALYZER: `🎯 Role: Portfolio Risk Engine
You are the Risk Analysis Agent.
Your job is to evaluate if the constructed portfolio matches the client's target risk tolerance (1-10).
Compute:
- Volatility score (0–100)
- Drawdown risk estimation
- Aggressiveness score
Output format MUST be structured JSON:
{
  "risk_score": 0-100,
  "volatility_level": "low | medium | high",
  "max_drawdown_estimate": "%",
  "concentration_risk": "",
  "comments": []
}
Rules:
- Focus on risk interpretation and validation against client's tolerance`,

  OVERLAP_ANALYZER: `🎯 Role: Hidden Exposure Detector
You are the Portfolio Overlap Analysis Agent.
Your job is to detect overlap across the selected funds to ensure the client is truly diversified.
Output format MUST be structured JSON:
{
  "fund_overlap_matrix": {},
  "top_common_assets": [],
  "effective_diversification_score": 0-100,
  "key_findings": []
}
Rules:
- Highlight hidden concentration risks in shared holdings`,

  MARKET_REGIME: `🎯 Role: Macro Context Engine
You are the Market Regime Detection Agent.
Your job is to classify current market conditions (signals: rates, inflation, momentum) and check if the portfolio weights need tactical adjustments.
Output format MUST be structured JSON:
{
  "regime": "risk-on | risk-off | neutral | tightening | easing",
  "confidence": 0-100,
  "implications_for_portfolio": []
}
Rules:
- Classify regimes and detail portfolio implications`,

  PORTFOLIO_ADVISOR: `🎯 Role: Final Explainer (User Facing)
You are the Portfolio Insight Advisor.
You receive outputs from: Data Agent, Risk Agent, Overlap Agent, Market Regime Agent.
Your job:
1. Explain in simple language why this portfolio was created for this client based on their risk level, goal, and horizon.
2. Outline the rationales behind each fund choice.
3. Highlight key risks, diversification level, and how macro conditions impact it.

Output style:
- Clear
- Friendly
- Non-technical where possible
- Structured with bullet points

Format:
### Portföy Özeti
...
### Kritik Tercihler & Gerekçeler
...
### Kritik Riskler
...
### Detaylı Varlık Gözlemleri
...
### Piyasa Koşullarının Etkisi
...
### Bu Ne Anlama Geliyor (Özet)
...`,

  OPTIMIZATION: `🎯 Role: Portfolio Optimizer
You are the Portfolio Optimization Agent.
Your job is to compare the constructed/custom portfolio against the client's target risk profile (risk level 1-10, goal, horizon) and current market regime signals, and suggest a rebalanced portfolio.
If the portfolio's risk level is too high or low compared to their target risk level, suggest shifting weights to bring it in line.
Output format:
{
  "current_portfolio_score": 0-100,
  "optimized_portfolio": [ {"code": "...", "weight": 0} ],
  "changes_summary": []
}`
};

// -------------------------------------------------------------
// Algorithm Logic for Risk-Based Portfolio Construction
// -------------------------------------------------------------
export function runLocalAnalysis(
  riskLevel: number, // 1 to 10
  investmentGoal: 'preservation' | 'balanced' | 'growth' | 'income',
  _horizon: 'short' | 'medium' | 'long',
  signals: MarketRegimeSignals = TURKEY_MACRO_SIGNALS,
  customPortfolio?: AgentPortfolioItem[]
): Omit<AgentSystemResult, 'finalAdvisorReport' | 'logs'> {
  
  // 1. DETERMINE BASE PORTFOLIO CONFIG BASED ON USER RISK PROFILE
  let idealItems: AgentPortfolioItem[] = [];

  if (riskLevel <= 2) {
    // Very Conservative (Çok Defansif)
    idealItems = [
      { code: 'TMV', weight: 75 },
      { code: 'DFI', weight: 15 },
      { code: 'PBR', weight: 10 }
    ];
  } else if (riskLevel <= 4) {
    // Conservative-Moderate (Dengeli Muhafazakar)
    if (investmentGoal === 'income') {
      idealItems = [
        { code: 'TMV', weight: 45 },
        { code: 'DFI', weight: 35 },
        { code: 'PBR', weight: 20 }
      ];
    } else {
      idealItems = [
        { code: 'TMV', weight: 40 },
        { code: 'DFI', weight: 25 },
        { code: 'PBR', weight: 20 },
        { code: 'MAC', weight: 15 }
      ];
    }
  } else if (riskLevel <= 6) {
    // Moderate (Dengeli Büyüme)
    idealItems = [
      { code: 'TMV', weight: 20 },
      { code: 'DFI', weight: 25 },
      { code: 'MAC', weight: 30 },
      { code: 'AFT', weight: 15 },
      { code: 'PBR', weight: 10 }
    ];
  } else if (riskLevel <= 8) {
    // Aggressive (Agresif Büyüme)
    idealItems = [
      { code: 'MAC', weight: 25 },
      { code: 'PHE', weight: 20 },
      { code: 'AFT', weight: 25 },
      { code: 'IJC', weight: 15 },
      { code: 'DFI', weight: 10 },
      { code: 'YAS', weight: 5 }
    ];
  } else {
    // Hyper-Aggressive (Çok Yüksek Risk)
    idealItems = [
      { code: 'TLY', weight: 35 },
      { code: 'PHE', weight: 25 },
      { code: 'AFT', weight: 20 },
      { code: 'IJC', weight: 20 }
    ];
  }

  let baseItems: AgentPortfolioItem[] = [];
  if (customPortfolio && customPortfolio.length > 0) {
    baseItems = [...customPortfolio];
  } else {
    baseItems = [...idealItems];
  }

  // 2. TACTICAL ADJUSTMENTS BASED ON MACRO SIGNALS (ONLY FOR BUILD MODE)
  let adjustedItems = [...baseItems];
  
  if ((!customPortfolio || customPortfolio.length === 0) && signals.momentum === 'bearish') {
    // Market is dropping, reduce high risk equities and increase money market or eurobond
    adjustedItems = adjustedItems.map(item => {
      const fund = getFund(item.code);
      if (fund && (fund.category === 'Hisse Senedi' || fund.category === 'Yabancı Hisse Senedi' || item.code === 'IJC')) {
        const reduction = Math.round(item.weight * 0.3); // reduce equities by 30%
        return { code: item.code, weight: item.weight - reduction };
      }
      return item;
    });

    // Add reduced weight to TMV (Money Market) or DFI (Eurobond)
    const currentTotal = adjustedItems.reduce((sum, i) => sum + i.weight, 0);
    const remainder = 100 - currentTotal;
    
    if (remainder > 0) {
      const targetSafety = signals.interestRate === 'high' ? 'TMV' : 'DFI';
      const safetyIndex = adjustedItems.findIndex(i => i.code === targetSafety);
      if (safetyIndex > -1) {
        adjustedItems[safetyIndex].weight += remainder;
      } else {
        adjustedItems.push({ code: targetSafety, weight: remainder });
      }
    }
  } else if ((!customPortfolio || customPortfolio.length === 0) && signals.momentum === 'bullish' && signals.fundFlows === 'inflow') {
    // Strong market, slightly increase equity exposure for growth/moderate portfolios
    if (riskLevel >= 5) {
      adjustedItems = adjustedItems.map(item => {
        const fund = getFund(item.code);
        if (fund && (fund.category === 'Para Piyasası' || fund.category === 'Borçlanma Araçları')) {
          const reduction = Math.round(item.weight * 0.25);
          return { code: item.code, weight: item.weight - reduction };
        }
        return item;
      });

      const currentTotal = adjustedItems.reduce((sum, i) => sum + i.weight, 0);
      const remainder = 100 - currentTotal;
      if (remainder > 0) {
        const targetEquity = riskLevel >= 8 ? 'TLY' : 'MAC';
        const eqIndex = adjustedItems.findIndex(i => i.code === targetEquity);
        if (eqIndex > -1) {
          adjustedItems[eqIndex].weight += remainder;
        } else {
          adjustedItems.push({ code: targetEquity, weight: remainder });
        }
      }
    }
  }

  // Normalize final weights to sum exactly to 100
  const normalizedTotal = adjustedItems.reduce((sum, i) => sum + i.weight, 0);
  const normalizedPortfolio = adjustedItems.map(item => ({
    code: item.code,
    weight: normalizedTotal > 0 ? Math.round((item.weight / normalizedTotal) * 100) : 0
  })).filter(item => item.weight > 0);

  const diff = 100 - normalizedPortfolio.reduce((sum, i) => sum + i.weight, 0);
  if (diff !== 0 && normalizedPortfolio.length > 0) {
    normalizedPortfolio[0].weight += diff;
  }

  // 3. DATA AGENT SIMULATION
  const dataOutputs: DataAgentOutput[] = normalizedPortfolio.map(item => {
    const fund = getFund(item.code);
    return {
      fund_code: item.code,
      name: fund ? fund.name : `${item.code} Serbest Fon`,
      category: fund ? fund.category : 'Hisse Senedi',
      asset_allocation: fund ? fund.asset_allocation : { 'Hisse': 90, 'Likit': 10 },
      top_holdings: fund ? fund.top_holdings : [],
      sector_weights: fund ? fund.sector_weights : {},
      historical_returns: fund ? fund.historical_returns : { '1M': 3, '3M': 9, '6M': 20, '1Y': 60, 'YTD': 15 },
      risk_metrics: fund ? fund.risk_metrics : { volatility: 22, sharpe_ratio: 1.5, max_drawdown: -25, risk_value: 5 }
    };
  });

  // 4. OVERLAP ANALYZER SIMULATION
  const overlapMatrix: Record<string, Record<string, number>> = {};
  const commonHoldingsMap: Record<string, number> = {};
  
  normalizedPortfolio.forEach(p1 => {
    overlapMatrix[p1.code] = {};
    normalizedPortfolio.forEach(p2 => {
      overlapMatrix[p1.code][p2.code] = p1.code === p2.code ? 100 : 0;
    });
  });

  for (let i = 0; i < normalizedPortfolio.length; i++) {
    const p1 = normalizedPortfolio[i];
    const f1 = getFund(p1.code);
    if (!f1) continue;

    for (let j = i + 1; j < normalizedPortfolio.length; j++) {
      const p2 = normalizedPortfolio[j];
      const f2 = getFund(p2.code);
      if (!f2) continue;

      let sharedWeight = 0;
      f1.top_holdings.forEach(h1 => {
        const h2 = f2.top_holdings.find(x => x.name === h1.name || (h1.code && x.code === h1.code));
        if (h2) {
          sharedWeight += Math.min(h1.weight, h2.weight);
        }
      });

      const overlapPct = Math.round(sharedWeight * 2.5);
      const finalOverlap = Math.min(overlapPct, 95);
      
      overlapMatrix[p1.code][p2.code] = finalOverlap;
      overlapMatrix[p2.code][p1.code] = finalOverlap;
    }

    f1.top_holdings.forEach(h => {
      const portfolioContrib = (h.weight * p1.weight) / 100;
      commonHoldingsMap[h.name] = (commonHoldingsMap[h.name] || 0) + portfolioContrib;
    });
  }

  const topCommonAssets = Object.entries(commonHoldingsMap)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, weight]) => weight > 1.5)
    .map(([name, weight]) => `${name} (%${weight.toFixed(1)} portföy payı)`);

  let weightedOverlapSum = 0;
  normalizedPortfolio.forEach(p1 => {
    normalizedPortfolio.forEach(p2 => {
      if (p1.code !== p2.code) {
        const weightFactor = (p1.weight * p2.weight) / 10000;
        weightedOverlapSum += overlapMatrix[p1.code][p2.code] * weightFactor;
      }
    });
  });

  const overlapPenalty = Math.round(weightedOverlapSum * 1.5);
  let effectiveDiversificationScore = Math.max(100 - overlapPenalty, 10);
  
  const cashWeight = dataOutputs.reduce((sum, d) => {
    const pItem = normalizedPortfolio.find(p => p.code === d.fund_code);
    const w = pItem ? pItem.weight : 0;
    const cashPct = (d.asset_allocation['BPP / Vadeli'] || 0) + 
                    (d.asset_allocation['Ters Repo'] || 0) + 
                    (d.asset_allocation['BPP (Borsa Para Piyasası)'] || 0) +
                    (d.asset_allocation['Para Piyasası'] || 0);
    return sum + (cashPct * w) / 100;
  }, 0);

  if (cashWeight > 20) {
    effectiveDiversificationScore = Math.min(effectiveDiversificationScore + 15, 100);
  }

  const overlapFindings: string[] = [];
  if (weightedOverlapSum > 30) {
    overlapFindings.push(`Portföydeki hisse fonları arasında yüksek derecede ortak holding kesişimi bulunuyor.`);
  } else if (weightedOverlapSum > 10) {
    overlapFindings.push(`Hisse senedi ağırlıklı fonlarda makul düzeyde ortak holding kesişimi tespit edildi.`);
  } else {
    overlapFindings.push(`Fonlar arasında ortak varlık kesişimi oldukça düşük, çeşitlendirme yapısal olarak başarılı.`);
  }

  const overlapOutput: OverlapAnalyzerOutput = {
    fund_overlap_matrix: overlapMatrix,
    top_common_assets: topCommonAssets.slice(0, 5),
    effective_diversification_score: effectiveDiversificationScore,
    key_findings: overlapFindings
  };

  // 5. RISK ANALYZER SIMULATION
  let weightedVolatility = 0;
  let weightedMaxDrawdown = 0;
  let fundRiskSum = 0;
  const aggregatedAssetClass: Record<string, number> = {};
  const aggregatedSectors: Record<string, number> = {};

  dataOutputs.forEach(d => {
    const pItem = normalizedPortfolio.find(p => p.code === d.fund_code);
    const weight = pItem ? pItem.weight : 0;
    weightedVolatility += (d.risk_metrics.volatility * weight) / 100;
    weightedMaxDrawdown += (d.risk_metrics.max_drawdown * weight) / 100;
    fundRiskSum += ((d.risk_metrics.risk_value || 5) * weight) / 100;

    Object.entries(d.asset_allocation).forEach(([asset, pct]) => {
      aggregatedAssetClass[asset] = (aggregatedAssetClass[asset] || 0) + (pct * weight) / 100;
    });
    Object.entries(d.sector_weights).forEach(([sec, pct]) => {
      aggregatedSectors[sec] = (aggregatedSectors[sec] || 0) + (pct * weight) / 100;
    });
  });

  const calculatedRiskScore = Math.round(fundRiskSum * 14);
  let volatilityLevel: 'low' | 'medium' | 'high' = 'medium';
  if (weightedVolatility < 8) volatilityLevel = 'low';
  else if (weightedVolatility > 22) volatilityLevel = 'high';

  const riskComments: string[] = [];
  const maxAsset = Object.entries(aggregatedAssetClass).sort((a, b) => b[1] - a[1])[0];
  const maxSector = Object.entries(aggregatedSectors).sort((a, b) => b[1] - a[1])[0];

  if (maxAsset && maxAsset[1] > 70) {
    riskComments.push(`Portföy ${maxAsset[0]} sınıfına yüksek oranda konsantre olmuştur (%${maxAsset[1].toFixed(1)}).`);
  }
  if (maxSector && maxSector[1] > 25) {
    riskComments.push(`Sektörel bazda ${maxSector[0]} yoğunluğu %${maxSector[1].toFixed(1)} seviyesinde, sektöre duyarlılık fazladır.`);
  }

  if (calculatedRiskScore > 75) {
    riskComments.push(`Agresif fon seçimi nedeniyle olası piyasa düzeltmelerinde yüksek kayıp riski mevcuttur.`);
  } else if (calculatedRiskScore < 30) {
    riskComments.push(`Defansif ve likit ağırlıklı yapısıyla koruma odaklıdır, uzun vadede enflasyon karşısında reel getiri erimesi riski taşır.`);
  } else {
    riskComments.push(`Dengeli risk dağılımı mevcuttur; koruma ve büyüme varlıkları dengelenmiştir.`);
  }

  const riskOutput: RiskAnalyzerOutput = {
    risk_score: calculatedRiskScore,
    volatility_level: volatilityLevel,
    max_drawdown_estimate: `${weightedMaxDrawdown.toFixed(1)}%`,
    concentration_risk: maxAsset ? `${maxAsset[0]} yoğunluğu %${maxAsset[1].toFixed(0)}` : 'Dengeli',
    comments: riskComments
  };

  // 6. MARKET REGIME SIMULATION
  let regime: MarketRegimeOutput['regime'] = 'neutral';
  let confidence = 75;
  const implications: string[] = [];
  const { interestRate, inflation, momentum, fundFlows } = signals;

  if (momentum === 'bullish' && fundFlows === 'inflow') {
    regime = 'risk-on';
    confidence = interestRate === 'low' ? 90 : 75;
    implications.push('Borsa yükseliş trendinde, hisse yoğun fonlar (MAC, PHE) için getiri potansiyeli yüksektir.');
  } else if (momentum === 'bearish' || fundFlows === 'outflow') {
    regime = 'risk-off';
    confidence = inflation === 'rising' ? 85 : 70;
    implications.push('Negatif borsa trendi nedeniyle koruyucu enstrümanlar (TMV, DFI) ön plana çıkmaktadır.');
  } else if (interestRate === 'high' && inflation === 'rising') {
    regime = 'tightening';
    confidence = 80;
    implications.push('Yüksek faiz nedeniyle para piyasası (TMV) sabit ve risksiz getiri avantajı sağlamaktadır.');
  } else if (interestRate === 'low' && inflation === 'falling') {
    regime = 'easing';
    confidence = 80;
    implications.push('Genişlemeci makro adımlar risk iştahını artırmakta, borçlanma araçları ve eurobond değer kazanabilir.');
  }

  const regimeOutput: MarketRegimeOutput = {
    regime,
    confidence,
    implications_for_portfolio: implications
  };

  // 7. OPTIMIZATION SIMULATION
  let regimeAlignment = 50;
  if (regime === 'risk-on' && calculatedRiskScore > 60) regimeAlignment = 85;
  if (regime === 'risk-off' && calculatedRiskScore < 40) regimeAlignment = 90;
  if (regime === 'tightening' && cashWeight > 30) regimeAlignment = 85;

  const currentScore = Math.round(
    (effectiveDiversificationScore * 0.4) + 
    ((100 - Math.abs(calculatedRiskScore - (riskLevel * 10))) * 0.3) + 
    (regimeAlignment * 0.3)
  );

  const optimizedPortfolio: OptimizationOutput['optimized_portfolio'] = [];
  const changesSummary: string[] = [];

  if (customPortfolio && customPortfolio.length > 0) {
    const riskDifference = calculatedRiskScore - (riskLevel * 10);
    
    if (Math.abs(riskDifference) > 15) {
      // Risk mismatch! Suggest rebalancing by blending custom weights with ideal weights
      const customWeights: Record<string, number> = {};
      const idealWeights: Record<string, number> = {};
      
      normalizedPortfolio.forEach(p => {
        customWeights[p.code] = p.weight;
      });
      
      idealItems.forEach(p => {
        idealWeights[p.code] = p.weight;
      });
      
      const allCodes = Array.from(new Set([
        ...normalizedPortfolio.map(p => p.code),
        ...idealItems.map(p => p.code)
      ]));
      
      allCodes.forEach(code => {
        const wCustom = customWeights[code] || 0;
        const wIdeal = idealWeights[code] || 0;
        // Blend: 40% custom, 60% ideal target weights
        const blendedWeight = Math.round(wCustom * 0.4 + wIdeal * 0.6);
        if (blendedWeight > 0) {
          optimizedPortfolio.push({
            code,
            weight: blendedWeight,
            name: getFund(code)?.name
          });
        }
      });
      
      if (riskDifference > 15) {
        changesSummary.push(`Mevcut portföyünüzün risk derecesi (%${calculatedRiskScore}), hedeflediğiniz risk profiline (%${riskLevel * 10}) kıyasla oldukça yüksektir. Portföy riskini düşürerek hedeflerinize hizalamak için borsa yoğun/agresif fonların payı azaltılıp, ideal risk profilinizde yer alan para piyasası (TMV) ve Eurobond (DFI) fonlarının eklenmesi/artırılması önerilir.`);
      } else {
        changesSummary.push(`Mevcut portföyünüzün risk derecesi (%${calculatedRiskScore}), hedeflediğiniz risk seviyesine (%${riskLevel * 10}) göre çok düşük kalmıştır. Tercih ettiğiniz getiri hedefini yakalamak amacıyla portföye büyüme odaklı borsa ve teknoloji yoğun fonların (MAC, PHE, AFT) eklenmesi ve koruyucu likit varlıkların payının azaltılması önerilir.`);
      }
    } else {
      // Risk matches! Apply tactical bearish macro adjustments if needed
      if (signals.momentum === 'bearish') {
        const highestVolItem = [...normalizedPortfolio].sort((a,b) => {
          const fA = getFund(a.code)?.risk_metrics.volatility || 0;
          const fB = getFund(b.code)?.risk_metrics.volatility || 0;
          return fB - fA;
        })[0];

        normalizedPortfolio.forEach(p => {
          if (p.code === highestVolItem.code) {
            optimizedPortfolio.push({ code: p.code, weight: Math.max(p.weight - 10, 5), name: getFund(p.code)?.name });
          } else if (['TMV', 'DFI'].includes(p.code)) {
            optimizedPortfolio.push({ code: p.code, weight: p.weight + 5, name: getFund(p.code)?.name });
          } else {
            optimizedPortfolio.push({ code: p.code, weight: p.weight, name: getFund(p.code)?.name });
          }
        });

        changesSummary.push(`Mevcut portföyünüz seçtiğiniz risk profili ile uyumludur. Ancak borsa düzeltme (Bearish) trendine karşı korunmak amacıyla portföyün en yüksek volatiliteli varlığı olan ${highestVolItem.code} payı %10 azaltılarak risksiz faiz/eurobond fonlarına (TMV/DFI) aktarılmıştır.`);
      } else {
        normalizedPortfolio.forEach(p => {
          optimizedPortfolio.push({ code: p.code, weight: p.weight, name: getFund(p.code)?.name });
        });
        changesSummary.push("Mevcut portföy dağılımınız belirlediğiniz risk seviyesi, yatırım hedefiniz ve güncel piyasa koşullarıyla tam olarak uyumludur. Herhangi bir değişiklik önerilmemektedir.");
      }
    }
  } else {
    // Standard rebalancing (AI generated portfolio)
    if (signals.momentum === 'bearish') {
      const highestVolItem = [...normalizedPortfolio].sort((a,b) => {
        const fA = getFund(a.code)?.risk_metrics.volatility || 0;
        const fB = getFund(b.code)?.risk_metrics.volatility || 0;
        return fB - fA;
      })[0];

      normalizedPortfolio.forEach(p => {
        if (p.code === highestVolItem.code) {
          optimizedPortfolio.push({ code: p.code, weight: Math.max(p.weight - 10, 5), name: getFund(p.code)?.name });
        } else if (['TMV', 'DFI'].includes(p.code)) {
          optimizedPortfolio.push({ code: p.code, weight: p.weight + 5, name: getFund(p.code)?.name });
        } else {
          optimizedPortfolio.push({ code: p.code, weight: p.weight, name: getFund(p.code)?.name });
        }
      });

      changesSummary.push(`Negatif borsa momentuma karşı, en yüksek volatiliteye sahip olan ${highestVolItem.code} fonunun payı %10 azaltılarak risksiz getiri sunan TMV/DFI fonlarına aktarılması önerilir.`);
    } else {
      normalizedPortfolio.forEach(p => {
        optimizedPortfolio.push({ code: p.code, weight: p.weight, name: getFund(p.code)?.name });
      });
      changesSummary.push("Mevcut portföy dağılımı piyasa koşulları ve belirlediğiniz risk seviyesiyle tam uyumludur.");
    }
  }

  const optTotal = optimizedPortfolio.reduce((sum, p) => sum + p.weight, 0);
  if (optTotal !== 100 && optimizedPortfolio.length > 0) {
    optimizedPortfolio[0].weight += (100 - optTotal);
  }

  const optimizationOutput: OptimizationOutput = {
    current_portfolio_score: currentScore,
    optimized_portfolio: optimizedPortfolio,
    changes_summary: changesSummary
  };

  // 1. Health Scores Calculations
  const rawRiskDiff = Math.abs(calculatedRiskScore - (riskLevel * 10));
  const healthRiskScore = Math.max(100 - Math.round(rawRiskDiff * 1.5), 20);
  const healthDiversificationScore = effectiveDiversificationScore;
  
  const tmvItem = normalizedPortfolio.find(p => p.code === 'TMV');
  const dfiItem = normalizedPortfolio.find(p => p.code === 'DFI');
  const tmvWeight = tmvItem ? tmvItem.weight : 0;
  const dfiWeight = dfiItem ? dfiItem.weight : 0;
  const healthLiquidityScore = Math.min(60 + Math.round(tmvWeight * 0.8 + dfiWeight * 0.4), 100);
  
  const equityWeight = normalizedPortfolio.reduce((sum, p) => {
    if (['MAC', 'PHE', 'AFT', 'IJC', 'TLY'].includes(p.code)) {
      return sum + p.weight;
    }
    return sum;
  }, 0);
  const healthInflationScore = Math.min(30 + Math.round(equityWeight * 0.75), 100);
  
  const fxAssetsWeight = normalizedPortfolio.reduce((sum, p) => {
    if (['AFT', 'IJC', 'DFI'].includes(p.code)) {
      return sum + p.weight;
    }
    return sum;
  }, 0);
  const healthFxScore = Math.min(25 + Math.round(fxAssetsWeight * 0.85), 100);
  
  let healthInterestScore = 50;
  if (signals.interestRate === 'high') {
    healthInterestScore = Math.min(50 + Math.round(tmvWeight * 1.0), 100);
  } else {
    healthInterestScore = Math.min(60 + Math.round(dfiWeight * 0.8), 100);
  }

  const healthOverallScore = Math.round(
    (healthRiskScore +
     healthDiversificationScore +
     healthLiquidityScore +
     healthInflationScore +
     healthFxScore +
     healthInterestScore) / 6
  );

  const healthScores: HealthScoresOutput = {
    riskScore: healthRiskScore,
    diversificationScore: healthDiversificationScore,
    liquidityScore: healthLiquidityScore,
    inflationScore: healthInflationScore,
    fxScore: healthFxScore,
    interestScore: healthInterestScore,
    overallScore: healthOverallScore
  };

  // 2. Advanced Risk Metrics
  const advRiskMetrics: AdvancedRiskMetrics = {
    volatility: Math.round(weightedVolatility * 10) / 10,
    sharpe: Math.round((dataOutputs.reduce((sum, d) => {
      const p = normalizedPortfolio.find(x => x.code === d.fund_code);
      return sum + ((d.risk_metrics.sharpe_ratio || 1.5) * (p?.weight || 0));
    }, 0) / 100) * 100) / 100,
    beta: Math.round((dataOutputs.reduce((sum, d) => {
      const p = normalizedPortfolio.find(x => x.code === d.fund_code);
      let fBeta = 1.0;
      if (d.category === 'Para Piyasası') fBeta = 0.01;
      else if (d.category === 'Eurobond') fBeta = 0.15;
      else if (d.category === 'Değişken' && d.fund_code === 'PBR') fBeta = 0.65;
      else if (d.category === 'Değişken' && d.fund_code === 'DFI') fBeta = 0.55;
      else if (d.category === 'Yabancı Hisse Senedi') fBeta = 0.85;
      else fBeta = 1.15;
      return sum + (fBeta * (p?.weight || 0));
    }, 0) / 100) * 100) / 100,
    maxDrawdown: Math.round(Math.abs(weightedMaxDrawdown) * 10) / 10,
    correlation: Math.round((weightedOverlapSum / 100) * 100) / 100,
    concentration: Math.round(maxAsset ? maxAsset[1] : 0)
  };

  // 3. Scenario Simulation Center
  const scenarios: Record<string, ScenarioImpact> = {
    faiz_artisi: {
      impact: Math.round((tmvWeight * 0.12 - equityWeight * 0.08 - dfiWeight * 0.04) * 10) / 10,
      comment: tmvWeight > 40 
        ? "Yüksek para piyasası payı sayesinde faiz artışından pozitif etkilenir; risksiz getiri artar." 
        : "Portföyün hisse yoğun yapısı yüksek faiz baskısı altında kısıtlı negatif etkilenebilir."
    },
    faiz_indirimi: {
      impact: Math.round((equityWeight * 0.15 + dfiWeight * 0.08 - tmvWeight * 0.06) * 10) / 10,
      comment: equityWeight > 50 
        ? "Faiz indirimleri borsa çarpanlarını genişletir, hisse fonlarında güçlü yükseliş tetiklenebilir." 
        : "Borsa payı düşük olduğu için faiz indirimlerinden kısıtlı faydalanır; TMV getirisi düşer."
    },
    yuksek_enflasyon: {
      impact: Math.round((equityWeight * 0.18 + fxAssetsWeight * 0.10 - tmvWeight * 0.08) * 10) / 10,
      comment: equityWeight > 40
        ? "Hisse senedi ve yabancı varlık yoğunluğu enflasyona karşı reel koruma kalkanı sunar."
        : "Likit ve para piyasası ağırlığı yüksek olduğundan, enflasyon şoklarında reel getiri erimesi yaşanabilir."
    },
    dolar_yukselisi: {
      impact: Math.round((fxAssetsWeight * 0.22 + dfiWeight * 0.15) * 10) / 10,
      comment: fxAssetsWeight > 30
        ? "Dolar/TL yükselişinde yabancı teknoloji ve eurobond varlıkları üzerinden yüksek kur farkı getirisi yazar."
        : "Portföyün kur hassasiyeti düşüktür; TL bazlı varlıklar kur dalgalanmalarına karşı korumasızdır."
    },
    bist_dususu: {
      impact: Math.round((-equityWeight * 0.25) * 10) / 10,
      comment: equityWeight > 50
        ? "Portföyün BIST duyarlılığı yüksektir. Olası borsa düzeltmelerinde sert geri çekilmeler görülebilir."
        : "Hisse ağırlığı sınırlı olduğundan, borsa düşüşlerine karşı defansif koruma kalkanına sahiptir."
    },
    resesyon: {
      impact: Math.round((-equityWeight * 0.15 + tmvWeight * 0.05 + dfiWeight * 0.08) * 10) / 10,
      comment: equityWeight > 40
        ? "Küresel ve yerel resesyon endişeleri riskli varlıkları baskılar; nakit ve tahvil koruyucu olur."
        : "Dengeli ve korumacı yapısı sayesinde küresel yavaşlama dönemlerinde dalgalanma sınırlı kalır."
    }
  };

  // 4. Stres Test Laboratuvarı
  const stressTests: Record<string, StressTestImpact> = {
    pandemi: {
      score: Math.round(100 - equityWeight * 0.8),
      loss: Math.round((-equityWeight * 0.22 - dfiWeight * 0.05) * 10) / 10,
      rating: equityWeight > 60 ? 'Zayıf' : equityWeight > 30 ? 'Orta' : 'Güçlü',
      comment: "Mart 2020 Pandemi Şoku simülasyonu. Borsa çöküşü sırasında riskli varlıkların drawdown etkisi ölçülmüştür."
    },
    kur_krizi: {
      score: Math.round(40 + fxAssetsWeight * 0.6),
      loss: Math.round((fxAssetsWeight * 0.25 + dfiWeight * 0.18 - equityWeight * 0.08) * 10) / 10,
      rating: fxAssetsWeight > 40 ? 'Güçlü' : fxAssetsWeight > 20 ? 'Orta' : 'Zayıf',
      comment: "Ağustos 2018 Kur Krizi simülasyonu. Döviz şoklarında yabancı hisse senedi ve Eurobond koruma performansı."
    },
    enflasyon_soku: {
      score: Math.round(30 + equityWeight * 0.7),
      loss: Math.round((equityWeight * 0.35 - tmvWeight * 0.15) * 10) / 10,
      rating: equityWeight > 50 ? 'Güçlü' : equityWeight > 25 ? 'Orta' : 'Zayıf',
      comment: "2022 Enflasyon Rallisi simülasyonu. Enflasyonist büyüme dönemlerinde portföyün reel satın alma gücünü koruma kabiliyeti."
    },
    secim_volatilitesi: {
      score: Math.round(90 - equityWeight * 0.5),
      loss: Math.round((-equityWeight * 0.12 + tmvWeight * 0.04) * 10) / 10,
      rating: equityWeight > 50 ? 'Zayıf' : 'Güçlü',
      comment: "Mayıs 2023 Seçim Süreci simülasyonu. Yüksek belirsizlik ve volatilite ortamında portföyün dengede kalma gücü."
    }
  };

  // 5. Backtest Merkezi
  const totalReturn = Math.round(dataOutputs.reduce((sum, d) => {
    const p = normalizedPortfolio.find(x => x.code === d.fund_code);
    return sum + ((d.historical_returns['1Y'] || 60) * (p?.weight || 0));
  }, 0));
  const annualReturn = Math.round(totalReturn * 0.85);
  
  const monthlyData = [
    { date: 'Tem 25', value: 100.0 },
    { date: 'Ağu 25', value: 102.3 },
    { date: 'Eyl 25', value: 105.6 },
    { date: 'Eki 25', value: 101.2 },
    { date: 'Kas 25', value: 108.4 },
    { date: 'Ara 25', value: 114.9 },
    { date: 'Oca 26', value: 122.1 },
    { date: 'Şub 26', value: 128.5 },
    { date: 'Mar 26', value: 135.2 },
    { date: 'Nis 26', value: 141.0 },
    { date: 'May 26', value: 138.8 },
    { date: 'Haz 26', value: 100.0 + totalReturn * 0.8 }
  ];

  const bist100Data = [
    { date: 'Tem 25', value: 100.0 },
    { date: 'Ağu 25', value: 101.5 },
    { date: 'Eyl 25', value: 104.8 },
    { date: 'Eki 25', value: 99.2 },
    { date: 'Kas 25', value: 105.1 },
    { date: 'Ara 25', value: 108.7 },
    { date: 'Oca 26', value: 114.2 },
    { date: 'Şub 26', value: 119.5 },
    { date: 'Mar 26', value: 125.1 },
    { date: 'Nis 26', value: 130.4 },
    { date: 'May 26', value: 127.8 },
    { date: 'Haz 26', value: 148.0 }
  ];

  const goldData = [
    { date: 'Tem 25', value: 100.0 },
    { date: 'Ağu 25', value: 103.2 },
    { date: 'Eyl 25', value: 105.4 },
    { date: 'Eki 25', value: 107.1 },
    { date: 'Kas 25', value: 106.5 },
    { date: 'Ara 25', value: 111.3 },
    { date: 'Oca 26', value: 115.8 },
    { date: 'Şub 26', value: 121.2 },
    { date: 'Mar 26', value: 127.6 },
    { date: 'Nis 26', value: 134.1 },
    { date: 'May 26', value: 139.5 },
    { date: 'Haz 26', value: 142.5 }
  ];

  const backtest: BacktestResult = {
    totalReturn,
    annualReturn,
    sharpe: advRiskMetrics.sharpe,
    volatility: advRiskMetrics.volatility,
    maxDrawdown: advRiskMetrics.maxDrawdown,
    monthlyData,
    bist100Data,
    goldData
  };

  // 6. Monte Carlo Simulation
  const medianPath: number[] = [100];
  const optimisticPath: number[] = [100];
  const pessimisticPath: number[] = [100];
  let currentMed = 100;
  let currentOpt = 100;
  let currentPes = 100;
  const monthlyRate = annualReturn / 1200;
  const monthlyVol = advRiskMetrics.volatility / 100 / Math.sqrt(12);

  for (let m = 1; m <= 12; m++) {
    currentMed = currentMed * (1 + monthlyRate);
    currentOpt = currentOpt * (1 + monthlyRate + monthlyVol * 1.5);
    currentPes = currentPes * (1 + monthlyRate - monthlyVol * 1.8);
    medianPath.push(Math.round(currentMed * 10) / 10);
    optimisticPath.push(Math.round(currentOpt * 10) / 10);
    pessimisticPath.push(Math.round(currentPes * 10) / 10);
  }

  const monteCarlo: MonteCarloResult = {
    medianPath,
    optimisticPath,
    pessimisticPath
  };

  // 7. Macro Analyst
  const macroAnalyst: MacroAnalystOutput = {
    cds: 264,
    tufe: 32.61,
    ufe: 28.45,
    dxy: 104.2,
    tcmbRate: 37.0,
    flows: "Para piyasası fonları ve yabancı serbest fonlara girişler devam ediyor.",
    commentary: `Türkiye Cumhuriyet Merkez Bankası (TCMB) %37 politika faizi ile sıkı para politikasını korumaktadır. Enflasyon düşüş eğilimindedir (%32.61). CDS primi 264 baz puan ile dengeli bir görünüm sergilemektedir. Portföyünüzdeki TMV ağırlığı yüksek faiz getirisinden faydalanırken, MAC ve PHE fonları BIST yatay seyrinde seçici hisse kazanımları hedefler. Eurobond ağırlıklı DFI ise döviz kuru dalgalanmalarına karşı tampon oluşturmaktadır.`
  };

  return {
    portfolio: normalizedPortfolio,
    data: dataOutputs,
    overlap: overlapOutput,
    risk: riskOutput,
    regime: regimeOutput,
    optimization: optimizationOutput,
    healthScores,
    advancedRiskMetrics: advRiskMetrics,
    scenarios,
    stressTests,
    backtest,
    monteCarlo,
    macroAnalyst
  };
}


// Generates simulation advisor response using templates matching risk level
export function generateSimulationAdvisorReport(
  analysis: Omit<AgentSystemResult, 'finalAdvisorReport' | 'logs'>,
  riskLevel: number,
  investmentGoal: string,
  horizon: string
): string {
  const { portfolio, risk, overlap, regime, optimization } = analysis;
  
  const fundsList = portfolio.map(p => `**${p.code}** (%${p.weight})`).join(', ');
  
  let riskText = '';
  if (riskLevel <= 2) riskText = 'Çok Defansif (Korumacı)';
  else if (riskLevel <= 4) riskText = 'Temkinli / Düşük-Orta Risk';
  else if (riskLevel <= 6) riskText = 'Dengeli Risk';
  else if (riskLevel <= 8) riskText = 'Agresif Büyüme';
  else riskText = 'Çok Agresif / Maksimum Risk';

  let goalTurkish = '';
  if (investmentGoal === 'preservation') goalTurkish = 'Anapara Korumak';
  else if (investmentGoal === 'balanced') goalTurkish = 'Dengeli Büyüme Sağlamak';
  else if (investmentGoal === 'growth') goalTurkish = 'Agresif Sermaye Büyümesi';
  else goalTurkish = 'Düzenli Gelir Elde Etmek';

  let horizonTurkish = '';
  if (horizon === 'short') horizonTurkish = 'Kısa Vade (< 1 Yıl)';
  else if (horizon === 'medium') horizonTurkish = 'Orta Vade (1-3 Yıl)';
  else horizonTurkish = 'Uzun Vade (> 3 Yıl)';

  let summaryText = `Bu portföy, **Risk Tercihiniz: ${riskLevel}/10 (${riskText})**, **Yatırım Amacınız: ${goalTurkish}** ve **Yatırım Vadeniz: ${horizonTurkish}** kriterlerinize özel olarak AI Analist ekibimiz tarafından yapılandırılmıştır.\n\n`;
  summaryText += `Portföyünüzün ana yapısı ${fundsList} fonlarından oluşmaktadır. AI modelimiz, belirlediğiniz risk seviyesi ve makro sinyallere göre en uyumlu dağılımı tasarlamıştır.`;

  let rationaleText = '';
  portfolio.forEach(p => {
    const fund = getFund(p.code);
    if (p.code === 'TMV') {
      rationaleText += `- **TMV (%${p.weight}):** ${riskLevel <= 4 ? 'Korumacı risk seviyeniz için risksiz getiri sağlamak' : 'Portföyün volatilitesini düşürmek'} amacıyla ve yüksek faiz ortamının sunduğu avantajları değerlendirmek üzere eklenmiştir.\n`;
    } else if (p.code === 'DFI') {
      rationaleText += `- **DFI (%${p.weight}):** Atlas Portföy Serbest Fonu, portföyde dolar bazlı (Eurobond) getiri dengesi kurmak ve küresel borçlanma araçları avantajını yakalamak için seçilmiştir.\n`;
    } else if (p.code === 'PBR') {
      rationaleText += `- **PBR (%${p.weight}):** Pusula Portföy Birinci Değişken Fonu, piyasa koşullarına göre varlık dağılımını esnek yönettiği için temkinli dengeli büyümeyi desteklemek amacıyla eklenmiştir.\n`;
    } else if (p.code === 'MAC') {
      rationaleText += `- **MAC (%${p.weight}):** Marmara Capital Portföy Hisse Senedi Yoğun Fonu, Borsa İstanbul'daki uzun vadeli değer odaklı büyüme potansiyeline dengeli bir hisse senedi katılımı sağlamak için seçilmiştir.\n`;
    } else if (p.code === 'AFT') {
      rationaleText += `- **AFT (%${p.weight}):** Ak Portföy Yeni Teknolojiler Yabancı Hisse Fonu, portföyünüze küresel teknoloji devlerinin (Apple, Nvidia, Microsoft) büyüme potansiyeliyle coğrafi çeşitlendirme katmak için seçilmiştir.\n`;
    } else if (p.code === 'IJC') {
      rationaleText += `- **IJC (%${p.weight}):** İş Portföy Yarı İletken Teknolojileri Değişken Fonu, yarı iletken ve çip teknolojilerindeki yüksek büyüme trendine agresif katılım sağlamak amacıyla eklenmiştir.\n`;
    } else if (p.code === 'TLY') {
      rationaleText += `- **TLY (%${p.weight}):** Tera Portföy Birinci Serbest Fonu, yüksek volatilite toleransınıza uygun olarak esnek yatırım stratejileriyle maksimum getiri hedefine ulaşmak amacıyla portföye dahil edilmiştir.\n`;
    } else if (p.code === 'PHE') {
      rationaleText += `- **PHE (%${p.weight}):** Pusula Portföy Hisse Yoğun Fonu, BIST hisse senedi piyasasındaki aktif hisse seçimiyle borsa yükselişlerinden maksimum payı almak için eklenmiştir.\n`;
    } else {
      rationaleText += `- **${p.code} (%${p.weight}):** Belirttiğiniz risk tercihiyle uyumlu ${fund ? fund.category : 'Hisse'} varlık grubunu desteklemek için portföye eklenmiştir.\n`;
    }
  });

  let risksText = '';
  risk.comments.forEach(c => {
    risksText += `- ${c}\n`;
  });
  risksText += `- Tarihsel verilere göre bu portföyün tahmini maksimum çekilme (drawdown) potansiyeli **~%${risk.max_drawdown_estimate}** seviyesindedir.`;

  let overlapText = `Efektif çeşitlendirme skorunuz **${overlap.effective_diversification_score}/100** seviyesindedir.\n`;
  if (overlap.top_common_assets.length > 0) {
    overlapText += `Fonların alt kırılımlarında en çok kesişen ortak varlıklar şunlardır:\n`;
    overlap.top_common_assets.forEach(a => {
      overlapText += `- **${a}**\n`;
    });
  } else {
    overlapText += `Fonların taşıdığı hisseler ve varlıklar arasında anlamlı bir kesişim bulunmamaktadır. Çeşitlendirme çok sağlıklıdır.`;
  }

  let regimeText = `Mevcut makroekonomik sinyallere göre piyasa rejimi **"${regime.regime.toUpperCase()}"** olarak sınıflandırılmıştır (Güven Derecesi: %${regime.confidence}).\n`;
  regime.implications_for_portfolio.forEach(imp => {
    regimeText += `- ${imp}\n`;
  });

  let simpleAdvice = '';
  if (riskLevel >= 7) {
    if (regime.regime === 'risk-off') {
      simpleAdvice = `Agresif profilinize uygun olarak büyüme odaklı fonlardasınız. Ancak piyasada borsa düşüş eğilimi (Risk-off) hakim olduğu için, hisse yoğunluğunu geçici olarak azaltıp **TMV** veya **DFI** ağırlığını artırmak mantıklı olabilir.`;
    } else {
      simpleAdvice = `Piyasa şu an risk iştahını desteklemektedir (Risk-on). Agresif portföyünüzün büyüme trendinden tam faydalanması için hisse ve teknoloji fonu ağırlıklarınızı korumanız uygundur.`;
    }
  } else if (riskLevel <= 3) {
    simpleAdvice = `Portföyünüz anapara koruma öncelikli kurulmuştur. Enflasyonun yüksek seyrettiği dönemlerde reel kayıp yaşamamak adına portföyün çok küçük bir kısmıyla (%5-10) **MAC** gibi geniş hisse fonlarına kademeli geçiş yapabilirsiniz.`;
  } else {
    simpleAdvice = `Dengeli portföyünüz hem faiz/döviz getirisini hem de hisse senedi büyümesini dengeler. Mevcut rejimde bu yapıyı bozmadan ilerleyebilirsiniz.`;
  }

  return `### Portföy Özeti
${summaryText}

### Kritik Tercihler & Gerekçeler
${rationaleText}

### Kritik Riskler
${risksText}

### Detaylı Varlık Gözlemleri
${overlapText}

### Piyasa Koşullarının Etkisi
${regimeText}

### Bu Ne Anlama Geliyor (Özet)
- **Yapısal Durum:** Portföyünüzün genel sağlık skoru **${optimization.current_portfolio_score}/100**'dür.
- **Tavsiye:** ${simpleAdvice}
- **Önerilen Adım:** Türkiye makroekonomik koşullarını takip ederek, AI Analist ekibimizin sunduğu taktiksel optimizasyon ve rebalans önerilerini uygulayabilirsiniz.`;
}

// -------------------------------------------------------------
// Live Gemini API Multi-Agent Execution Flow
// -------------------------------------------------------------
export async function runLiveAgentAnalysis(
  riskLevel: number,
  investmentGoal: 'preservation' | 'balanced' | 'growth' | 'income',
  horizon: 'short' | 'medium' | 'long',
  signals: MarketRegimeSignals = TURKEY_MACRO_SIGNALS,
  apiKey: string,
  onLogCallback?: (log: AgentLog) => void,
  customPortfolio?: AgentPortfolioItem[]
): Promise<AgentSystemResult> {
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' }
  });

  const logs: AgentLog[] = [];
  const addLog = (agentName: string, role: string, promptSent: string, outputReceived: string, status: AgentLog['status'] = 'success') => {
    const log: AgentLog = {
      agentName,
      role,
      status,
      promptSent,
      outputReceived,
      timestamp: new Date().toISOString()
    };
    logs.push(log);
    if (onLogCallback) {
      onLogCallback(log);
    }
  };

  // Pre-calculate local statistics to inject as Grounding Data for agents
  const localAnalysis = runLocalAnalysis(riskLevel, investmentGoal, horizon, signals, customPortfolio);

  // 1. DATA AGENT (Selects and extracts data)
  const dataAgentPrompt = `${AGENT_PROMPTS.DATA_AGENT}
  
  CLIENT RISK PROFILE:
  - Target Risk Level (1-10): ${riskLevel}
  - Investment Goal: ${investmentGoal}
  - Time Horizon: ${horizon}
  
  TARGET ASSET CLASSES FROM ORCHESTRATOR:
  ${JSON.stringify(localAnalysis.portfolio, null, 2)}
  
  DATABASE GROUNDING DATA:
  ${JSON.stringify(localAnalysis.data, null, 2)}
  
  Select the matching funds and output the response strictly following the JSON schema structure specified in the rules.`;
  
  let dataResults: DataAgentOutput[] = [];
  try {
    addLog('Data Agent', 'Financial Data Collector', dataAgentPrompt, 'Running API request...', 'running');
    const result = await model.generateContent(dataAgentPrompt);
    const text = result.response.text();
    dataResults = JSON.parse(text);
    if (!Array.isArray(dataResults)) {
      dataResults = [dataResults] as any;
    }
    addLog('Data Agent', 'Financial Data Collector', dataAgentPrompt, JSON.stringify(dataResults, null, 2), 'success');
  } catch (error: any) {
    console.error('Data Agent failed, using local fallback:', error);
    dataResults = localAnalysis.data;
    addLog('Data Agent (Fallback)', 'Financial Data Collector', dataAgentPrompt, `Error: ${error?.message || error}. Used local database fallback:\n${JSON.stringify(dataResults, null, 2)}`, 'failed');
  }

  // 2. RISK ANALYZER
  const riskAgentPrompt = `${AGENT_PROMPTS.RISK_ANALYZER}
  
  CLIENT PROFILE:
  - Target Risk Level: ${riskLevel}/10
  - Goal: ${investmentGoal}
  
  SELECTED PORTFOLIO DATA:
  ${JSON.stringify(dataResults, null, 2)}
  
  ALGORITHMIC CALCULATIONS (for reference):
  - Weighted Risk Score: ${localAnalysis.risk.risk_score}
  - Max Drawdown: ${localAnalysis.risk.max_drawdown_estimate}
  - Volatility level: ${localAnalysis.risk.volatility_level}
  
  Evaluate portfolio risk alignment against client risk level and output JSON.`;

  let riskResult: RiskAnalyzerOutput = localAnalysis.risk;
  try {
    addLog('Risk Analyzer Agent', 'Portfolio Risk Engine', riskAgentPrompt, 'Running API request...', 'running');
    const result = await model.generateContent(riskAgentPrompt);
    riskResult = JSON.parse(result.response.text());
    addLog('Risk Analyzer Agent', 'Portfolio Risk Engine', riskAgentPrompt, JSON.stringify(riskResult, null, 2), 'success');
  } catch (error: any) {
    console.error('Risk Agent failed, using local fallback:', error);
    addLog('Risk Analyzer Agent (Fallback)', 'Portfolio Risk Engine', riskAgentPrompt, `Error: ${error?.message || error}. Fallback value:\n${JSON.stringify(riskResult, null, 2)}`, 'failed');
  }

  // 3. OVERLAP ANALYZER
  const overlapAgentPrompt = `${AGENT_PROMPTS.OVERLAP_ANALYZER}
  
  SELECTED PORTFOLIO DATA:
  ${JSON.stringify(dataResults, null, 2)}
  
  ALGORITHMIC CALCULATIONS (for reference):
  - Overlap Matrix: ${JSON.stringify(localAnalysis.overlap.fund_overlap_matrix, null, 2)}
  - Top Common Assets: ${JSON.stringify(localAnalysis.overlap.top_common_assets, null, 2)}
  - Effective Diversification Score: ${localAnalysis.overlap.effective_diversification_score}
  
  Analyze holding overlaps and output JSON.`;

  let overlapResult: OverlapAnalyzerOutput = localAnalysis.overlap;
  try {
    addLog('Overlap Analyzer Agent', 'Hidden Exposure Detector', overlapAgentPrompt, 'Running API request...', 'running');
    const result = await model.generateContent(overlapAgentPrompt);
    overlapResult = JSON.parse(result.response.text());
    addLog('Overlap Analyzer Agent', 'Hidden Exposure Detector', overlapAgentPrompt, JSON.stringify(overlapResult, null, 2), 'success');
  } catch (error: any) {
    console.error('Overlap Agent failed, using local fallback:', error);
    addLog('Overlap Analyzer Agent (Fallback)', 'Hidden Exposure Detector', overlapAgentPrompt, `Error: ${error?.message || error}. Fallback value:\n${JSON.stringify(overlapResult, null, 2)}`, 'failed');
  }

  // 4. MARKET REGIME AGENT
  const marketAgentPrompt = `${AGENT_PROMPTS.MARKET_REGIME}
  
  USER MACRO SIGNAL INPUTS:
  - Interest rate: ${signals.interestRate}
  - Inflation: ${signals.inflation}
  - Momentum: ${signals.momentum}
  - Fund Flows: ${signals.fundFlows}
  
  Classify current market conditions and output JSON.`;

  let marketResult: MarketRegimeOutput = localAnalysis.regime;
  try {
    addLog('Market Regime Agent', 'Macro Context Engine', marketAgentPrompt, 'Running API request...', 'running');
    const result = await model.generateContent(marketAgentPrompt);
    marketResult = JSON.parse(result.response.text());
    addLog('Market Regime Agent', 'Macro Context Engine', marketAgentPrompt, JSON.stringify(marketResult, null, 2), 'success');
  } catch (error: any) {
    console.error('Market Agent failed, using local fallback:', error);
    addLog('Market Regime Agent (Fallback)', 'Macro Context Engine', marketAgentPrompt, `Error: ${error?.message || error}. Fallback value:\n${JSON.stringify(marketResult, null, 2)}`, 'failed');
  }

  // 5. OPTIMIZATION AGENT
  const optAgentPrompt = `${AGENT_PROMPTS.OPTIMIZATION}
  
  CLIENT TARGET PROFILE:
  - Target Risk Level: ${riskLevel}/10
  - Investment Goal: ${investmentGoal}
  - Time Horizon: ${horizon}
  
  PORTFOLIO WEIGHTS:
  ${JSON.stringify(localAnalysis.portfolio, null, 2)}
  
  RISK ANALYZER:
  ${JSON.stringify(riskResult, null, 2)}
  
  OVERLAP ANALYZER:
  ${JSON.stringify(overlapResult, null, 2)}
  
  MARKET REGIME:
  ${JSON.stringify(marketResult, null, 2)}
  
  Suggest rebalancing based on client target risk profile and market regime, outputting JSON.`;

  let optResult: OptimizationOutput = localAnalysis.optimization;
  try {
    addLog('Optimization Agent', 'Portfolio Optimizer', optAgentPrompt, 'Running API request...', 'running');
    const result = await model.generateContent(optAgentPrompt);
    optResult = JSON.parse(result.response.text());
    addLog('Optimization Agent', 'Portfolio Optimizer', optAgentPrompt, JSON.stringify(optResult, null, 2), 'success');
  } catch (error: any) {
    console.error('Optimization Agent failed, using local fallback:', error);
    addLog('Optimization Agent (Fallback)', 'Portfolio Optimizer', optAgentPrompt, `Error: ${error?.message || error}. Fallback value:\n${JSON.stringify(optResult, null, 2)}`, 'failed');
  }

  // 6. PORTFOLIO ADVISOR AGENT
  const textModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const advisorPrompt = `${AGENT_PROMPTS.PORTFOLIO_ADVISOR}
  
  CLIENT PROFILE:
  - Risk Level: ${riskLevel}/10
  - Investment Goal: ${investmentGoal}
  - Time Horizon: ${horizon}
  
  SELECTED PORTFOLIO DATA:
  ${JSON.stringify(dataResults, null, 2)}
  
  RISK ANALYSIS:
  ${JSON.stringify(riskResult, null, 2)}
  
  OVERLAP ANALYSIS:
  ${JSON.stringify(overlapResult, null, 2)}
  
  MARKET REGIME:
  ${JSON.stringify(marketResult, null, 2)}
  
  Write a comprehensive investment advisor report in Turkish, explaining WHY these funds were selected, why the weights fit their profile, and what risks/conditions to watch. Follow the requested headings. Output markdown.`;

  let finalReport = '';
  try {
    addLog('Portfolio Advisor Agent', 'Final Explainer (User Facing)', advisorPrompt, 'Running API request...', 'running');
    const result = await textModel.generateContent(advisorPrompt);
    finalReport = result.response.text();
    addLog('Portfolio Advisor Agent', 'Final Explainer (User Facing)', advisorPrompt, finalReport, 'success');
  } catch (error: any) {
    console.error('Advisor Agent failed, using local fallback:', error);
    finalReport = generateSimulationAdvisorReport(localAnalysis, riskLevel, investmentGoal, horizon);
    addLog('Portfolio Advisor Agent (Fallback)', 'Final Explainer (User Facing)', advisorPrompt, `Error: ${error?.message || error}. Generated fallback report:\n${finalReport}`, 'failed');
  }

  return {
    portfolio: localAnalysis.portfolio,
    logs,
    data: dataResults,
    risk: riskResult,
    overlap: overlapResult,
    regime: marketResult,
    optimization: optResult,
    finalAdvisorReport: finalReport,
    healthScores: localAnalysis.healthScores,
    advancedRiskMetrics: localAnalysis.advancedRiskMetrics,
    scenarios: localAnalysis.scenarios,
    stressTests: localAnalysis.stressTests,
    backtest: localAnalysis.backtest,
    monteCarlo: localAnalysis.monteCarlo,
    macroAnalyst: localAnalysis.macroAnalyst
  };
}

