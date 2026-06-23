import { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  TrendingUp, 
  ShieldAlert, 
  Network, 
  CheckCircle, 
  Zap, 
  BookOpen, 
  Info,
  RefreshCw,
  UserCheck,
  Award,
  Cpu,
  Database,
  Sliders,
  Link,
  Home,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { 
  runLocalAnalysis, 
  generateSimulationReport,
  TURKEY_MACRO_SIGNALS
} from './engine/agentEngine';
import type { 
  AgentLog, 
  AgentSystemResult,
  AgentPortfolioItem
} from './engine/agentEngine';
import { supabase, supabaseConfigured } from './supabaseClient';
import LandingPage from './LandingPage';
import type { User } from '@supabase/supabase-js';

// Common fund codes for dropdown selection
const PRESET_FUNDS = [
  { code: 'TLY', name: 'Tera Portföy Birinci Serbest Fon' },
  { code: 'PHE', name: 'Pusula Portföy Hisse Senedi Fonu (Hisse Yoğun)' },
  { code: 'PBR', name: 'Pusula Portföy Birinci Değişken Fon' },
  { code: 'DFI', name: 'Atlas Portföy Serbest Fon' },
  { code: 'TMV', name: 'Tera Portföy Algoritmik Stratejiler Serbest Fon' },
  { code: 'IJC', name: 'İş Portföy Yarı İletken Teknolojileri Değişken Fonu' },
  { code: 'MAC', name: 'Marmara Capital Portföy Hisse Senedi Yoğun Fon' },
  { code: 'IIH', name: 'İstanbul Portföy Üçüncü Hisse Senedi Yoğun Fon' },
  { code: 'AFT', name: 'Ak Portföy Yeni Teknolojiler Yabancı Hisse Fonu' },
  { code: 'YAS', name: 'Yapı Kredi Koç Holding İştirakleri Hisse Fonu' }
];

const getConicGradient = (assetAllocation: Record<string, number>) => {
  const colors = [
    'var(--accent-gold)', 
    'var(--accent-gold-light)', 
    'var(--accent-green)', 
    '#f97316', 
    'var(--accent-blue)',
    '#a855f7',
    '#ec4899',
    '#0ea5e9',
    '#10b981',
    '#ef4444'
  ];
  
  let cumulative = 0;
  const parts: string[] = [];
  
  Object.entries(assetAllocation).forEach(([_, pct], idx) => {
    if (pct <= 0) return;
    const start = cumulative;
    cumulative += pct;
    const end = cumulative;
    const color = colors[idx % colors.length];
    parts.push(`${color} ${start.toFixed(1)}% ${end.toFixed(1)}%`);
  });
  
  if (parts.length === 0) return 'rgba(255, 255, 255, 0.1)';
  
  // Ensure the gradient goes exactly to 100% or fill the rest if there's any rounding issue
  if (cumulative < 100) {
    parts.push(`rgba(255, 255, 255, 0.05) ${cumulative.toFixed(1)}% 100%`);
  }
  
  return `conic-gradient(${parts.join(', ')})`;
};

export default function App() {
  // -------------------------------------------------------------
  // Auth State
  // -------------------------------------------------------------
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState<boolean>(false);

  useEffect(() => {
    if (!supabaseConfigured) return;

    // Check current session in the background
    supabase.auth.getUser().then(({ data: { user: fetchedUser } }) => {
      if (fetchedUser) setUser(fetchedUser);
    }).catch(() => {});

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show LandingPage if not authenticated and showLogin is true
  if (showLogin && !user) {
    return <LandingPage onBack={() => setShowLogin(false)} />;
  }

  // If authenticated or bypassing login, show dashboard
  return <Dashboard user={user} onLoginClick={() => setShowLogin(true)} />;
}

// Wrap existing dashboard in its own component
function Dashboard({ user, onLoginClick }: { user: User | null; onLoginClick?: () => void }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // -------------------------------------------------------------
  // State Variables
  // -------------------------------------------------------------
  
  // New User Risk Profile States
  const [riskLevel, setRiskLevel] = useState<number>(5); // 1-10
  
  // Database Save Status
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);

  const [investmentGoal, setInvestmentGoal] = useState<'preservation' | 'balanced' | 'growth' | 'income'>('balanced');
  const [horizon, setHorizon] = useState<'short' | 'medium' | 'long'>('medium');
  
  // Custom Portfolio Mode States
  const [activeMode, setActiveMode] = useState<'build' | 'analyze'>('build');
  const [customPortfolio, setCustomPortfolio] = useState<AgentPortfolioItem[]>([
    { code: 'MAC', weight: 40 },
    { code: 'TMV', weight: 30 },
    { code: 'AFT', weight: 30 }
  ]);

  // Load saved portfolio from database on mount
  useEffect(() => {
    if (!user) {
      setIsInitialLoad(false);
      return;
    }
    const loadSavedPortfolio = async () => {
      try {
        const { data, error } = await supabase
          .from('user_portfolios')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (data && !error) {
          if (data.risk_level !== undefined) setRiskLevel(data.risk_level);
          if (data.investment_goal) setInvestmentGoal(data.investment_goal as any);
          if (data.horizon) setHorizon(data.horizon as any);
          if (data.portfolio) setCustomPortfolio(data.portfolio);
        }
      } catch (err) {
        console.error("Kayıtlı portföy yüklenirken hata oluştu:", err);
      } finally {
        setIsInitialLoad(false);
      }
    };

    loadSavedPortfolio();
  }, [user?.id]);

  // Debounced auto-save effect
  useEffect(() => {
    if (isInitialLoad) return;

    const timer = setTimeout(() => {
      saveUserPortfolio();
    }, 1500); // Auto save 1.5 seconds after user stops modifying settings

    return () => clearTimeout(timer);
  }, [riskLevel, investmentGoal, horizon, customPortfolio, isInitialLoad]);

  // Save portfolio to database helper
  const saveUserPortfolio = async (
    rL = riskLevel,
    iG = investmentGoal,
    hz = horizon,
    cP = customPortfolio
  ) => {
    if (!user) return;
    setSaveStatus('saving');
    try {
      const { error } = await supabase
        .from('user_portfolios')
        .upsert({
          user_id: user.id,
          portfolio: cP,
          risk_level: rL,
          investment_goal: iG,
          horizon: hz,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error("Portföy kaydedilirken hata oluştu:", err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeAgentIndex, setActiveAgentIndex] = useState<number>(-1); // -1 = idle
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AgentSystemResult | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<'tab-saglik-karnesi' | 'tab-risk-stres' | 'tab-fon-iliskileri' | 'tab-backtest-tahmin' | 'tab-ai-analist' | 'tab-premium'>('tab-saglik-karnesi');

  const tabSequence = ['tab-saglik-karnesi', 'tab-risk-stres', 'tab-fon-iliskileri', 'tab-backtest-tahmin', 'tab-ai-analist', 'tab-premium'];
  
  const handleNextTab = () => {
    const currentIndex = tabSequence.indexOf(activeResultTab);
    if (currentIndex === tabSequence.length - 1) {
      setActiveResultTab(tabSequence[0] as any);
    } else {
      setActiveResultTab(tabSequence[currentIndex + 1] as any);
    }
  };

  const handlePrevTab = () => {
    const currentIndex = tabSequence.indexOf(activeResultTab);
    if (currentIndex === 0) {
      setActiveResultTab(tabSequence[tabSequence.length - 1] as any);
    } else {
      setActiveResultTab(tabSequence[currentIndex - 1] as any);
    }
  };

  const [activeAuditorQuestion, setActiveAuditorQuestion] = useState<number | null>(null);
  const [premiumAlertConfig, setPremiumAlertConfig] = useState({ email: '', sms: '', volatilityAlert: true, drawdownAlert: true });
  const [hoveredAssetClass, setHoveredAssetClass] = useState<string | null>(null);
  
  // Backtest comparison states
  const [backtestCompareMode, setBacktestCompareMode] = useState<'all' | 'bist' | 'gold'>('all');
  const [hoveredBacktestIndex, setHoveredBacktestIndex] = useState<number | null>(null);
  const [backtestAnimKey, setBacktestAnimKey] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const backtestSvgRef = useRef<SVGSVGElement | null>(null);

  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [showKvkkModal, setShowKvkkModal] = useState<boolean>(false);
  const [showPremiumModal, setShowPremiumModal] = useState<boolean>(false);
  const [macroSignals, setMacroSignals] = useState({
    tcmbRate: 37.0,
    tcmbStatus: "YÜKSEK",
    tcmbDescription: "TCMB Politika Faizi: %37 seviyesinde olup sıkı para politikası duruşu korunmaktadır.",
    inflation: 32.61,
    inflationStatus: "DÜŞÜŞTE",
    inflationDescription: "Yıllık enflasyonda sıkılaşma ve baz etkisiyle düşüş eğilimi devam etmektedir.",
    bist100: 14791,
    bistStatus: "YÜKSEK",
    bistDescription: "BIST-100 endeksi 14,000 seviyesinin üzerinde yükseliş trendinde olup seçici hisse hareketleri ön plandadır.",
    fundFlows: "Dengeli",
    fundFlowsStatus: "STABİL",
    fundFlowsDescription: "Para piyasası fonları ve yabancı tematik fonlara seçici girişler olmakla beraber genel fon akışları stabildir."
  });

  useEffect(() => {
    fetch('/macro-signals.json')
      .then(res => res.json())
      .then(staticData => {
        if (staticData && staticData.tcmbRate) {
          setMacroSignals(prev => ({
            ...prev,
            tcmbRate: staticData.tcmbRate,
            tcmbStatus: staticData.tcmbStatus,
            tcmbDescription: staticData.tcmbDescription,
            inflation: staticData.inflation,
            inflationStatus: staticData.inflationStatus,
            inflationDescription: staticData.inflationDescription,
            bist100: staticData.bist100Fallback,
            bistStatus: staticData.bistStatus,
            bistDescription: staticData.bistDescription,
            fundFlows: staticData.fundFlows,
            fundFlowsStatus: staticData.fundFlowsStatus,
            fundFlowsDescription: staticData.fundFlowsDescription
          }));
        }

        // Live BIST-100 fetch
        fetch('https://query1.finance.yahoo.com/v8/finance/chart/XU100.IS')
          .then(res => res.json())
          .then(liveData => {
            const livePrice = liveData?.chart?.result?.[0]?.meta?.regularMarketPrice;
            if (livePrice) {
              setMacroSignals(prev => ({
                ...prev,
                bist100: Math.round(livePrice),
                bistStatus: livePrice > 14000 ? "YÜKSEK" : livePrice > 12000 ? "YATAY" : "DÜŞÜK",
                bistDescription: `BIST-100 endeksi anlık ${Math.round(livePrice).toLocaleString('tr-TR')} seviyesinde seyretmektedir.`
              }));
            }
          })
          .catch(e => console.warn("Live BIST-100 fetch failed, using fallback:", e));
      })
      .catch(err => console.error("Macro signals load failed:", err));
  }, []);

  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    report: true,
    portfolio: false,
    summary: false,
    rebalance: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Automatically trigger orchestration if query parameters are present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('run') === 'true') {
      const risk = params.get('risk');
      const goal = params.get('goal');
      const hor = params.get('horizon');
      const mode = params.get('mode') as 'build' | 'analyze' | null;
      const live = params.get('live') === 'true';
      const portfolioStr = params.get('portfolio');

      let parsedRisk = riskLevel;
      let parsedGoal = investmentGoal;
      let parsedHorizon = horizon;
      let parsedMode = activeMode;
      let parsedPortfolio = customPortfolio;

      if (risk) {
        parsedRisk = parseInt(risk, 10);
        setRiskLevel(parsedRisk);
      }
      if (goal) {
        parsedGoal = goal;
        setInvestmentGoal(parsedGoal);
      }
      if (hor) {
        parsedHorizon = hor;
        setHorizon(parsedHorizon);
      }
      if (mode) {
        parsedMode = mode;
        setActiveMode(parsedMode);
      }
      if (portfolioStr) {
        try {
          const arr = JSON.parse(portfolioStr);
          if (Array.isArray(arr)) {
            parsedPortfolio = arr;
            setCustomPortfolio(parsedPortfolio);
          }
        } catch (e) {
          console.error("Failed to parse custom portfolio from URL:", e);
        }
      }

      // Clear query parameters from address bar to keep it clean and prevent rerunning on manual refresh
      window.history.replaceState({}, document.title, window.location.pathname);

      // Trigger orchestration in the next tick with parsed values
      setTimeout(() => {
        startOrchestration(live, {
          riskLevel: parsedRisk,
          investmentGoal: parsedGoal,
          horizon: parsedHorizon,
          activeMode: parsedMode,
          customPortfolio: parsedPortfolio
        });
      }, 100);
    }
  }, []);

  const handleMouseMoveBacktest = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!backtestSvgRef.current || !analysisResult?.backtest?.monthlyData) return;
    
    const rect = backtestSvgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    const chartWidth = rect.width;
    const paddingLeft = (10 / 500) * chartWidth;
    const paddingRight = (10 / 500) * chartWidth;
    const usableWidth = chartWidth - paddingLeft - paddingRight;
    
    const relativeX = mouseX - paddingLeft;
    const dataLength = analysisResult.backtest.monthlyData.length;
    
    let index = Math.round((relativeX / usableWidth) * (dataLength - 1));
    index = Math.max(0, Math.min(dataLength - 1, index));
    
    setHoveredBacktestIndex(index);
  };
  
  const pipelineRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Scroll to pipeline when execution starts
  useEffect(() => {
    if (isRunning && pipelineRef.current) {
      pipelineRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isRunning]);

  // Dynamic risk details
  const getRiskDetails = (level: number) => {
    if (level <= 2) {
      return {
        label: 'Çok Defansif (Korumacı)',
        color: 'var(--accent-green)', // green
        description: 'Amacı anaparanın nominal değerini korumaktır. Çok düşük fiyat dalgalanması, düzenli ama sınırlı getiri.',
        gradient: 'linear-gradient(to right, var(--accent-green), #059669)'
      };
    } else if (level <= 4) {
      return {
        label: 'Temkinli Dengeli',
        color: '#34d399', // light green
        description: 'Dalgalanmayı sınırlı tutarak, enflasyon üzerinde makul bir getiri ve sermaye koruması hedefler.',
        gradient: 'linear-gradient(to right, #34d399, var(--accent-green))'
      };
    } else if (level <= 6) {
      return {
        label: 'Dengeli Büyüme',
        color: 'var(--accent-gold)', // gold
        description: 'Orta vadede hisse senedi büyümesi ve risksiz getiri dengesi kurar. Makul seviyede volatilite toleransı.',
        gradient: 'linear-gradient(to right, var(--accent-gold), var(--accent-gold-light))'
      };
    } else if (level <= 8) {
      return {
        label: 'Agresif Büyüme',
        color: '#f97316', // orange
        description: 'Uzun vadeli yüksek sermaye kazancı hedefler. Hisse senedi ve yabancı tech ağırlıklıdır, yüksek volatilite taşır.',
        gradient: 'linear-gradient(to right, #f97316, var(--accent-gold))'
      };
    } else {
      return {
        label: 'Hiper-Agresif (Maksimum Risk)',
        color: 'var(--accent-red)', // red
        description: 'Çok yüksek getiri için yüksek volatilite ve sert düşüşleri kabul eder. Tamamen serbest, değişken ve tematik fonlar.',
        gradient: 'linear-gradient(to right, var(--accent-red), #f97316)'
      };
    }
  };

  const currentRisk = getRiskDetails(riskLevel);

  // Apply rebalancing optimization (Premium upgrade prompt)
  const handleApplyOptimization = () => {
    setShowPremiumModal(true);
  };

  // Run Orchestrator Pipeline
  // Run Orchestrator Pipeline
  const startOrchestration = async (
    isLiveMode: boolean,
    overrideParams?: {
      riskLevel: number;
      investmentGoal: string;
      horizon: string;
      activeMode: 'build' | 'analyze';
      customPortfolio: AgentPortfolioItem[];
    }
  ) => {
    // Blur active element to prevent browser focus tracking from scrolling on layout shift
    if (document.activeElement && typeof (document.activeElement as any).blur === 'function') {
      (document.activeElement as any).blur();
    }

    const rL = overrideParams ? overrideParams.riskLevel : riskLevel;
    const iG = overrideParams ? overrideParams.investmentGoal : investmentGoal;
    const hz = overrideParams ? overrideParams.horizon : horizon;
    const aM = overrideParams ? overrideParams.activeMode : activeMode;
    const cP = overrideParams ? overrideParams.customPortfolio : customPortfolio;

    // Save portfolio asynchronously to DB
    saveUserPortfolio(rL, iG, hz, cP);

    setIsRunning(true);
    setLogs([]);
    setActiveAgentIndex(0); // Orchestrator active
    setAnalysisResult(null);
    setExpandedSections({
      report: true,
      portfolio: false,
      summary: false,
      rebalance: false
    });

    // Immediate scroll on user click trigger for better mobile support
    setTimeout(() => {
      if (pipelineRef.current) {
        pipelineRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);

    const modeText = aM === 'analyze' 
      ? `Mevcut Kendi Portföyü Analizi Başlatıldı:\n- Girilen Portföy: ${JSON.stringify(cP)}\n`
      : 'Yeni AI Portföy Yapılandırma Başlatıldı\n';

    const initialLogs: AgentLog[] = [
      {
        agentName: 'Orchestrator Agent',
        role: 'Master Controller',
        status: 'running',
        promptSent: `${modeText}- Hedef Risk Seviyesi: ${rL}/10\n- Yatırım Amacı: ${iG}\n- Yatırım Vadesi: ${hz}\n- Makro Göstergeler: ${JSON.stringify(TURKEY_MACRO_SIGNALS, null, 2)}`,
        outputReceived: aM === 'analyze'
          ? 'Mevcut portföy analiz edilmeye başlandı. Risk parametreleri ve veri toplayıcılar tetikleniyor...'
          : 'Analiz başlatıldı. Müşteri risk seviyesine göre hedef varlık dağılımı yapılıyor. Veriler için Data Agent tetikleniyor...',
        timestamp: new Date().toISOString()
      }
    ];
    setLogs(initialLogs);

    if (!isLiveMode) {
      // Simulation mode
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      const localResult = runLocalAnalysis(
        rL,
        iG,
        hz,
        TURKEY_MACRO_SIGNALS,
        aM === 'analyze' ? cP : undefined
      );

      await delay(1200);
      setActiveAgentIndex(1); // Data Agent active
      setLogs(prev => [
        ...prev,
        {
          agentName: 'Data Agent',
          role: 'Financial Data Collector',
          status: 'success',
          promptSent: `Hedef varlık dağılımına uygun en verimli fonlar (TLY, PHE, MAC, TMV, DFI vb.) sorgulanıyor...`,
          outputReceived: JSON.stringify(localResult.data, null, 2),
          timestamp: new Date().toISOString()
        }
      ]);

      await delay(1500);
      setActiveAgentIndex(2); // Risk Agent active
      setLogs(prev => [
        ...prev,
        {
          agentName: 'Risk Analyzer Agent',
          role: 'Portfolio Risk Engine',
          status: 'success',
          promptSent: `Oluşturulan fon portföyünün risk oranları, volatilite seviyesi ve drawdown olasılığı, hedef risk seviyesi (${rL}) ile karşılaştırılıyor...`,
          outputReceived: JSON.stringify(localResult.risk, null, 2),
          timestamp: new Date().toISOString()
        }
      ]);

      await delay(1200);
      setActiveAgentIndex(3); // Overlap Agent active
      setLogs(prev => [
        ...prev,
        {
          agentName: 'Overlap Analyzer Agent',
          role: 'Hidden Exposure Detector',
          status: 'success',
          promptSent: 'Seçilen fonların alt kırılımlarındaki (BIST/Yabancı) hisse kesişimleri ve ortak varlık yoğunlaşmaları taranıyor...',
          outputReceived: JSON.stringify(localResult.overlap, null, 2),
          timestamp: new Date().toISOString()
        }
      ]);

      await delay(1200);
      setActiveAgentIndex(4); // Market Regime Agent active
      setLogs(prev => [
        ...prev,
        {
          agentName: 'Market Regime Agent',
          role: 'Macro Context Engine',
          status: 'success',
          promptSent: `Makro göstergeler işleniyor: Faiz: ${TURKEY_MACRO_SIGNALS.interestRate}, Enflasyon: ${TURKEY_MACRO_SIGNALS.inflation}, Momentum: ${TURKEY_MACRO_SIGNALS.momentum}. Portföy ağırlıkları optimize ediliyor.`,
          outputReceived: JSON.stringify(localResult.regime, null, 2),
          timestamp: new Date().toISOString()
        }
      ]);

      await delay(1200);
      setActiveAgentIndex(5); // Optimizer Agent active
      setLogs(prev => [
        ...prev,
        {
          agentName: 'Optimization Agent',
          role: 'Portfolio Optimizer',
          status: 'success',
          promptSent: 'Makro uyumluluk ve çeşitlendirme için nihai ağırlık optimizasyonları yapılıyor...',
          outputReceived: JSON.stringify(localResult.optimization, null, 2),
          timestamp: new Date().toISOString()
        }
      ]);

      await delay(1500);
      setActiveAgentIndex(6); // Explainer Agent active
      const finalReportText = generateSimulationReport(localResult, rL, iG, hz);
      setLogs(prev => [
        ...prev,
        {
          agentName: 'Portfolio Explainer Agent',
          role: 'Final Explainer (User Facing)',
          status: 'success',
          promptSent: 'Müşteri profiline özel nihai açıklama ve gerekçe raporu Türkçe dilinde derleniyor...',
          outputReceived: finalReportText,
          timestamp: new Date().toISOString()
        }
      ]);

      setAnalysisResult({
        ...localResult,
        logs: [],
        finalReport: finalReportText
      });
      setIsRunning(false);
      setActiveAgentIndex(-1);
    } else {
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            riskLevel: rL,
            investmentGoal: iG,
            horizon: hz,
            customPortfolio: aM === 'analyze' ? cP : undefined
          })
        });

        if (!response.body) {
          throw new Error("Sunucudan veri akışı alınamadı.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);
              if (data.type === 'log') {
                const newLog: AgentLog = data.log;
                setLogs(prev => {
                  const idx = prev.findIndex(l => l.agentName === newLog.agentName);
                  if (idx !== -1) {
                    const updated = [...prev];
                    updated[idx] = newLog;
                    return updated;
                  }
                  return [...prev, newLog];
                });

                if (newLog.agentName.includes('Data')) setActiveAgentIndex(1);
                else if (newLog.agentName.includes('Risk')) setActiveAgentIndex(2);
                else if (newLog.agentName.includes('Overlap')) setActiveAgentIndex(3);
                else if (newLog.agentName.includes('Regime')) setActiveAgentIndex(4);
                else if (newLog.agentName.includes('Optimization') || newLog.agentName.includes('Optimizer')) setActiveAgentIndex(5);
                else if (newLog.agentName.includes('Explainer') || newLog.agentName.includes('Report')) setActiveAgentIndex(6);
              } else if (data.type === 'result') {
                setActiveAgentIndex(-1);
                setAnalysisResult(data.result);
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (err) {
              console.error("Satır ayrıştırma hatası:", err, line);
            }
          }
        }
      } catch (error: any) {
        alert("Canlı analiz sırasında bir hata oluştu: " + error.message);
      } finally {
        setIsRunning(false);
        setActiveAgentIndex(-1);
      }
    }
  };


  // Helper to parse markdown
  const renderReport = (markdownText: string) => {
    const sections = markdownText.split(/(?=### )/);
    
    return sections.map((sec, idx) => {
      const lines = sec.trim().split('\n');
      const titleLine = lines[0] || '';
      const contentLines = lines.slice(1);
      
      const titleText = titleLine.replace('###', '').trim();
      let icon = <BookOpen size={18} />;
      let headerColor = 'var(--accent-gold)';

      if (titleText.toLowerCase().includes('summary') || titleText.toLowerCase().includes('özet') || titleText.toLowerCase().includes('durum') || titleText.toLowerCase().includes('portföy')) {
        icon = <Info size={18} />;
        headerColor = 'var(--accent-gold)';
      } else if (titleText.toLowerCase().includes('risk')) {
        icon = <ShieldAlert size={18} />;
        headerColor = 'var(--accent-red)';
      } else if (titleText.toLowerCase().includes('choices') || titleText.toLowerCase().includes('gerekçe') || titleText.toLowerCase().includes('seçim')) {
        icon = <Award size={18} />;
        headerColor = 'var(--accent-green)';
      } else if (titleText.toLowerCase().includes('hidden') || titleText.toLowerCase().includes('gözlem') || titleText.toLowerCase().includes('analiz') || titleText.toLowerCase().includes('çeşitlendirme')) {
        icon = <Network size={18} />;
        headerColor = 'var(--accent-gold-light)';
      } else if (titleText.toLowerCase().includes('market') || titleText.toLowerCase().includes('makro') || titleText.toLowerCase().includes('konsept') || titleText.toLowerCase().includes('piyasa')) {
        icon = <TrendingUp size={18} />;
        headerColor = 'var(--accent-gold)';
      } else if (titleText.toLowerCase().includes('mean') || titleText.toLowerCase().includes('anlam') || titleText.toLowerCase().includes('tavsiye')) {
        icon = <CheckCircle size={18} />;
        headerColor = 'var(--accent-green)';
      }

      return (
        <div key={idx} className="mb-3" style={{ borderLeft: `3px solid ${headerColor}`, paddingLeft: '1rem' }}>
          {titleText && (
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: headerColor, marginBottom: '0.5rem', fontSize: '1.05rem', fontWeight: 700 }}>
              {icon} {titleText}
            </h3>
          )}
          <div className="report-body" style={{ color: '#cbd5e1', fontSize: '0.925rem' }}>
            {contentLines.map((line, lIdx) => {
              if (line.trim().startsWith('-')) {
                const listText = line.replace('-', '').trim();
                const boldMatch = listText.match(/^\*\*(.*?)\*\*(.*)/);
                if (boldMatch) {
                  return (
                    <ul key={lIdx} style={{ listStyleType: 'disc', paddingLeft: '1.25rem', margin: '4px 0' }}>
                      <li>
                        <strong>{boldMatch[1]}</strong>{boldMatch[2]}
                      </li>
                    </ul>
                  );
                }
                return (
                  <ul key={lIdx} style={{ listStyleType: 'disc', paddingLeft: '1.25rem', margin: '4px 0' }}>
                    <li>{listText}</li>
                  </ul>
                );
              }
              
              if (!line.trim()) return <div key={lIdx} style={{ height: '8px' }} />;
              
              const boldMatch = line.match(/^\*\*(.*?)\*\*(.*)/);
              if (boldMatch) {
                return (
                  <p key={lIdx} style={{ margin: '6px 0' }}>
                    <strong>{boldMatch[1]}</strong>{boldMatch[2]}
                  </p>
                );
              }
              return <p key={lIdx} style={{ margin: '6px 0' }}>{line}</p>;
            })}
          </div>
        </div>
      );
    });
  };

  const getOverlapBgColor = (val: number) => {
    if (val === 100) return 'rgba(255, 255, 255, 0.05)';
    if (val > 60) return 'rgba(239, 68, 68, 0.6)';
    if (val > 30) return 'rgba(197, 160, 89, 0.4)';
    return 'rgba(16, 185, 129, 0.15)';
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-logo">
            <img src="/logo.png" alt="Çalışkan Borsa Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div className="brand-text">
            <h1>Çalışkan Borsa</h1>
            <p>Yapay Zeka Tabanlı Risk Odaklı Yatırım Fonu Portföy Kurucu ve Danışmanı (TEFAS/KAP)</p>
          </div>
        </div>
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {analysisResult && (
            <button
              className="btn btn-accent"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.5rem 1rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                borderRadius: '8px',
              }}
              onClick={() => {
                setAnalysisResult(null);
                setActiveResultTab('tab-saglik-karnesi');
              }}
            >
              <ArrowLeft size={14} /> Ana Sayfa
            </button>
          )}
          {user ? (
            <button
              className="btn btn-icon"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-glass-active)',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onClick={handleLogout}
              title="Çıkış Yap"
            >
              <LogOut size={14} />
            </button>
          ) : (
            <button
              className="btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.5rem 1rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-gold-dark) 100%)',
                color: '#000',
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={onLoginClick}
            >
              <UserCheck size={14} /> Giriş Yap
            </button>
          )}
          <a 
            href="https://x.com/caliskanborsa6" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-icon" 
            style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-glass-active)',
              color: 'var(--accent-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="X'te Çalışkan Borsa"
          >
            <svg 
              viewBox="0 0 24 24" 
              width="16" 
              height="16" 
              fill="currentColor"
              style={{ display: 'block' }}
            >
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
            </svg>
          </a>
        </div>
      </header>

      {/* Main Grid */}
      {!analysisResult && (
        <div className="dashboard-grid">
        
        {/* Left Column: Risk Profiler Form */}
        <div className="dashboard-col" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <UserCheck size={18} className="text-gradient-teal" /> Risk Profiler & Kurucu
              </h2>
            </div>
            
            {/* Mode Tab Selector */}
            <div className="mode-tab-container" style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '2px', border: '1px solid var(--border-glass)', marginBottom: '1.25rem' }}>
              <button
                className="btn"
                style={{
                  flex: 1,
                  background: activeMode === 'build' ? 'var(--bg-card-hover)' : 'transparent',
                  border: 'none',
                  borderRadius: '2px',
                  color: activeMode === 'build' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                  fontWeight: activeMode === 'build' ? 700 : 500,
                  fontSize: '0.8rem',
                  padding: '8px',
                  boxShadow: activeMode === 'build' ? 'var(--shadow-glow-gold)' : 'none',
                  height: '34px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  margin: 0
                }}
                onClick={() => setActiveMode('build')}
              >
                <Cpu size={14} style={{ marginRight: '6px' }} /> AI Portföy Kurucu
              </button>
              <button
                className="btn"
                style={{
                  flex: 1,
                  background: activeMode === 'analyze' ? 'var(--bg-card-hover)' : 'transparent',
                  border: 'none',
                  borderRadius: '2px',
                  color: activeMode === 'analyze' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                  fontWeight: activeMode === 'analyze' ? 700 : 500,
                  fontSize: '0.8rem',
                  padding: '8px',
                  boxShadow: activeMode === 'analyze' ? 'var(--shadow-glow-gold)' : 'none',
                  height: '34px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  margin: 0
                }}
                onClick={() => setActiveMode('analyze')}
              >
                <TrendingUp size={14} style={{ marginRight: '6px' }} /> Kendi Portföyümü Analiz Et
              </button>
            </div>

            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              {activeMode === 'build'
                ? 'Yatırım tercihlerinizi ve risk limitinizi belirleyin; çoklu yapay zeka modelleri size özel portföyü gerekçeleriyle kursun.'
                : 'Yatırım limitlerinizi ve sahip olduğunuz fonların dağılımını girin; yapay zeka modelleri risk ve rebalans analizini yapsın.'
              }
            </p>

            {/* Risk Slider */}
            <div className="input-group mb-2">
              <div className="flex-between">
                <label>Risk Toleransınız (1 - 10)</label>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: currentRisk.color }}>
                  {riskLevel} / 10
                </span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={riskLevel} 
                onChange={(e) => setRiskLevel(parseInt(e.target.value, 10))}
                style={{ 
                  width: '100%', 
                  height: '6px', 
                  borderRadius: '3px',
                  background: 'rgba(255,255,255,0.1)',
                  outline: 'none',
                  cursor: 'pointer',
                  accentColor: currentRisk.color
                }} 
              />
              {/* Dynamic Risk Description */}
              <div 
                className="mt-1" 
                style={{ 
                  padding: '1rem', 
                  borderRadius: '2px', 
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-glass)',
                  borderLeft: `4px solid ${currentRisk.color}`
                }}
              >
                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: currentRisk.color, marginBottom: '4px' }}>
                  {currentRisk.label}
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {currentRisk.description}
                </p>
              </div>
            </div>

            {/* Goal Selector */}
            <div className="input-group">
              <label>Yatırım Amacınız</label>
              <select 
                className="input-field"
                value={investmentGoal}
                onChange={(e) => setInvestmentGoal(e.target.value as any)}
              >
                <option value="balanced">Dengeli Büyüme</option>
                <option value="growth">Sermaye Büyümesi (Agresif Değer Kazancı)</option>
                <option value="preservation">Anapara Korumak (Sermaye Koruma)</option>
                <option value="income">Düzenli Gelir (Nakit Akışı)</option>
              </select>
            </div>

            {/* Horizon Selector */}
            <div className="input-group">
              <label>Yatırım Vadeniz</label>
              <select 
                className="input-field"
                value={horizon}
                onChange={(e) => setHorizon(e.target.value as any)}
              >
                <option value="medium">Orta Vade (1 - 3 Yıl)</option>
                <option value="long">Uzun Vade (3+ Yıl)</option>
                <option value="short">Kısa Vade (0 - 1 Yıl)</option>
              </select>
            </div>

            {/* Custom Portfolio Input Form (Only for Analyze Mode) */}
            {activeMode === 'analyze' && (
              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Kendi Portföyünüzün Dağılımı (Toplam %100 Olmalı)
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {customPortfolio.map((item, idx) => (
                    <div key={idx} className="custom-portfolio-row" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <select
                        className="input-field"
                        style={{ flex: 2, height: '36px', fontSize: '0.8rem', padding: '0 8px' }}
                        value={item.code}
                        onChange={(e) => {
                          const newPortfolio = [...customPortfolio];
                          newPortfolio[idx].code = e.target.value;
                          setCustomPortfolio(newPortfolio);
                        }}
                      >
                        {PRESET_FUNDS.map(fund => (
                          <option key={fund.code} value={fund.code}>
                            {fund.code} - {fund.name.length > 28 ? fund.name.substring(0, 28) + '...' : fund.name}
                          </option>
                        ))}
                      </select>
                      
                      <div style={{ position: 'relative', flex: 1 }}>
                        <input
                          type="number"
                          className="input-field"
                          style={{ height: '36px', fontSize: '0.8rem', paddingRight: '1.5rem', width: '100%' }}
                          min="1"
                          max="100"
                          value={item.weight || ''}
                          onChange={(e) => {
                            const newPortfolio = [...customPortfolio];
                            newPortfolio[idx].weight = parseInt(e.target.value, 10) || 0;
                            setCustomPortfolio(newPortfolio);
                          }}
                        />
                        <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>%</span>
                      </div>
                      
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: '0px 10px', height: '36px', minWidth: '36px', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', margin: 0, justifyContent: 'center' }}
                        onClick={() => {
                          const newPortfolio = customPortfolio.filter((_, i) => i !== idx);
                          setCustomPortfolio(newPortfolio);
                        }}
                        disabled={customPortfolio.length <= 1}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn"
                    style={{ fontSize: '0.75rem', padding: '4px 10px', height: '28px', margin: 0 }}
                    onClick={() => {
                      if (customPortfolio.length < 8) {
                        setCustomPortfolio([...customPortfolio, { code: 'PBR', weight: 10 }]);
                      }
                    }}
                  >
                    + Fon Ekle
                  </button>
                  
                  {/* Total Weight Validator badge */}
                  {(() => {
                    const totalWeight = customPortfolio.reduce((sum, item) => sum + item.weight, 0);
                    const isOk = totalWeight === 100;
                    return (
                      <span 
                        className="badge-info" 
                        style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 700, 
                          color: isOk ? '#10b981' : totalWeight > 100 ? '#ef4444' : '#eab308', 
                          borderColor: isOk ? 'rgba(16, 185, 129, 0.2)' : totalWeight > 100 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                          background: isOk ? 'rgba(16, 185, 129, 0.05)' : totalWeight > 100 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(234, 179, 8, 0.05)' 
                        }}
                      >
                        Toplam: %{totalWeight} {isOk ? '✓' : totalWeight > 100 ? '(!)' : ''}
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Macro Settings Card */}
            <div className="macro-analysis-panel" style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={16} className="text-gradient-teal" /> Türkiye Makroekonomik Analiz Paneli
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.4 }}>
                AI modelimiz, portföy dağılımını Türkiye'nin güncel makroekonomik göstergelerini otomatik olarak analiz ederek optimize eder.
              </p>
              
              <div className="signals-grid" style={{ marginBottom: '1.25rem' }}>
                <div className="glass-card tooltip-container" style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1rem' }}>🏦</span>
                    <span className="signal-card-title">TCMB Faiz Seviyesi</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: macroSignals.tcmbStatus === 'YÜKSEK' ? 'var(--accent-red)' : 'var(--accent-green)' }}>%{macroSignals.tcmbRate}</span>
                    <span className="badge-info signal-card-badge" style={{ 
                      padding: '1px 4px', 
                      borderColor: macroSignals.tcmbStatus === 'YÜKSEK' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)', 
                      color: macroSignals.tcmbStatus === 'YÜKSEK' ? '#ef4444' : '#10b981', 
                      background: macroSignals.tcmbStatus === 'YÜKSEK' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)' 
                    }}>{macroSignals.tcmbStatus}</span>
                  </div>
                  <span className="tooltip-text">{macroSignals.tcmbDescription}</span>
                </div>

                <div className="glass-card tooltip-container" style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1rem' }}>📈</span>
                    <span className="signal-card-title">Enflasyon Trendi</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-green)' }}>%{macroSignals.inflation}</span>
                    <span className="badge-info signal-card-badge" style={{ 
                      padding: '1px 4px', 
                      borderColor: 'rgba(16, 185, 129, 0.2)', 
                      color: '#10b981', 
                      background: 'rgba(16, 185, 129, 0.05)' 
                    }}>{macroSignals.inflationStatus}</span>
                  </div>
                  <span className="tooltip-text">{macroSignals.inflationDescription}</span>
                </div>

                <div className="glass-card tooltip-container" style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1rem' }}>📊</span>
                    <span className="signal-card-title">BIST-100 Momentum</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{macroSignals.bist100.toLocaleString('tr-TR')}</span>
                    <span className="badge-info signal-card-badge" style={{ 
                      padding: '1px 4px', 
                      borderColor: macroSignals.bistStatus === 'YÜKSEK' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)', 
                      color: macroSignals.bistStatus === 'YÜKSEK' ? '#10b981' : 'var(--text-secondary)' 
                    }}>{macroSignals.bistStatus}</span>
                  </div>
                  <span className="tooltip-text">{macroSignals.bistDescription}</span>
                </div>

                <div className="glass-card tooltip-container" style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1rem' }}>💸</span>
                    <span className="signal-card-title">Net Fon Akışları</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{macroSignals.fundFlows}</span>
                    <span className="badge-info signal-card-badge" style={{ 
                      padding: '1px 4px', 
                      borderColor: 'rgba(255, 255, 255, 0.1)', 
                      color: 'var(--text-secondary)' 
                    }}>{macroSignals.fundFlowsStatus}</span>
                  </div>
                  <span className="tooltip-text">{macroSignals.fundFlowsDescription}</span>
                </div>
              </div>
            </div>

            {(() => {
              const totalWeight = customPortfolio.reduce((sum, item) => sum + item.weight, 0);
              const isDisabled = isRunning || (activeMode === 'analyze' && totalWeight !== 100);
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <div className="action-btn-container" style={{ display: 'flex', gap: '0.75rem', margin: 0 }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ flex: 1, padding: '0.85rem' }} 
                      onClick={() => startOrchestration(false)}
                      disabled={isDisabled}
                    >
                      <RefreshCw size={16} className={isRunning ? 'pulse-dot' : ''} />
                      {activeMode === 'analyze' ? 'Mevcut Portföyü Analiz Et' : 'Simüle Portföy Kur'}
                    </button>
                    
                    <button 
                      className="btn btn-accent" 
                      style={{ flex: 1, padding: '0.85rem' }} 
                      onClick={() => startOrchestration(true)}
                      disabled={isDisabled}
                    >
                      <Play size={16} />
                      {activeMode === 'analyze' ? 'AI ile Detaylı Analiz Et' : 'AI ile Detaylı Portföy Kur'}
                    </button>
                  </div>

                  {saveStatus !== 'idle' && (
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: saveStatus === 'saved' ? '#10b981' : saveStatus === 'error' ? '#ef4444' : 'var(--text-secondary)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      justifyContent: 'center', 
                      marginTop: '0.25rem',
                      minHeight: '16px'
                    }}>
                      {saveStatus === 'saving' && <div style={{ width: '10px', height: '10px', border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid var(--accent-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: '4px' }} />}
                      {saveStatus === 'saving' && 'Değişiklikler kaydediliyor...'}
                      {saveStatus === 'saved' && 'Değişiklikler otomatik kaydedildi ✓'}
                      {saveStatus === 'error' && 'Otomatik kaydetme hatası ✕'}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* SPK / Legal Disclaimer warning text */}
            <div className="disclaimer-container" style={{ 
              marginTop: '1.25rem', 
              padding: '0.75rem 1rem', 
              background: 'rgba(239, 68, 68, 0.03)', 
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              borderRadius: '2px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start'
            }}>
              <ShieldAlert size={16} style={{ color: 'var(--accent-red)', marginTop: '2px', flexShrink: 0 }} />
              <p style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                <strong>Yasal Uyarı (Yatırım Tavsiyesi Değildir)</strong>: Bu uygulamada simüle edilen portföy dağılımları ve raporlar, yapay zeka modelleri tarafından sadece eğitim ve analiz amaçlı üretilmiştir. Kesinlikle SPK mevzuatı kapsamında bir yatırım tavsiyesi, alım-satım önerisi veya portföy yöneticiliği taahhüdü niteliği taşımaz.
              </p>
            </div>
          </div>

          {/* Database Funds list */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Info size={14} /> Yapay Zekanın Kullandığı Popüler TEFAS Fonları:
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {PRESET_FUNDS.map(f => (
                <span 
                  key={f.code} 
                  className="badge-info tooltip-container"
                  style={{ cursor: 'help' }}
                >
                  {f.code}
                  <span className="tooltip-text">{f.name}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Visual Pipeline and Created Portfolio Display */}
        <div className="dashboard-col" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Agent Pipeline Visualizer */}
          <div ref={pipelineRef} className="glass-card" style={{ padding: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={18} className="text-gradient-purple" /> Yapay Zeka Analist Ekibi Akışı
            </h2>
            
            <div className="agent-flow-container">
              <div className="agent-flow-line"></div>
              <div 
                className="agent-flow-line-active" 
                style={{ 
                  width: activeAgentIndex === -1 
                    ? (analysisResult ? '100%' : '0%') 
                    : `${(activeAgentIndex / 6) * 100}%` 
                }}
              ></div>
              
              <div className={`agent-node ${activeAgentIndex === 0 ? 'active' : activeAgentIndex > 0 ? 'success' : ''}`}>
                <div className="agent-node-circle"><Cpu size={18} /></div>
                <p>Orkestratör</p>
              </div>

              <div className={`agent-node ${activeAgentIndex === 1 ? 'active' : activeAgentIndex > 1 ? 'success' : ''}`}>
                <div className="agent-node-circle"><Database size={18} /></div>
                <p>Veri Ajanı</p>
              </div>

              <div className={`agent-node ${activeAgentIndex === 2 ? 'active' : activeAgentIndex > 2 ? 'success' : ''}`}>
                <div className="agent-node-circle"><ShieldAlert size={18} /></div>
                <p>Risk Motoru</p>
              </div>

              <div className={`agent-node ${activeAgentIndex === 3 ? 'active' : activeAgentIndex > 3 ? 'success' : ''}`}>
                <div className="agent-node-circle"><Link size={18} /></div>
                <p>Kesişim Ajanı</p>
              </div>

              <div className={`agent-node ${activeAgentIndex === 4 ? 'active' : activeAgentIndex > 4 ? 'success' : ''}`}>
                <div className="agent-node-circle"><TrendingUp size={18} /></div>
                <p>Rejim Ajanı</p>
              </div>

              <div className={`agent-node ${activeAgentIndex === 5 ? 'active' : activeAgentIndex > 5 ? 'success' : ''}`}>
                <div className="agent-node-circle"><Sliders size={18} /></div>
                <p>Optimizasyon</p>
              </div>

              <div className={`agent-node ${activeAgentIndex === 6 ? 'active' : analysisResult ? 'success' : ''}`}>
                <div className="agent-node-circle"><Award size={18} /></div>
                <p>Danışman</p>
              </div>
            </div>

            {/* Ajan Bento Paneli (Innovative Bento Grid of Interactive Cards) */}
            <div className="agent-bento-grid">
              {/* Agent 1: Orkestratör */}
              {(() => {
                const log = logs.find(l => l.agentName.includes('Orchestrator'));
                const status = log ? log.status : (activeAgentIndex === 0 ? 'running' : 'pending');
                const isExpanded = expandedAgent === 'orchestrator';
                
                let summary = 'Orkestratör ajanı analiz emri bekliyor.';
                if (status === 'running') summary = `Müşteri risk seviyesi (${riskLevel}/10), yatırım amacı (${investmentGoal}) ve vadesi (${horizon}) işleniyor. Veri analiz ajanları tetikleniyor...`;
                if (status === 'success') summary = 'Müşteri profili analiz parametreleri belirlendi. Diğer ajanlardan gelen raporlar doğrultusunda nihai portföy kurgulandı.';

                return (
                  <div 
                    className={`agent-bento-card ${activeAgentIndex === 0 ? 'active' : ''} ${status}`}
                    onClick={() => log && setExpandedAgent(isExpanded ? null : 'orchestrator')}
                  >
                    <div>
                      <div className="agent-bento-card-header">
                        <div className="agent-bento-card-title">
                          <Cpu size={16} className="text-warning" /> Orkestratör Ajanı
                        </div>
                        <span className={`agent-bento-card-status ${status}`}>
                          {status === 'pending' && 'Beklemede'}
                          {status === 'running' && 'Çalışıyor'}
                          {status === 'success' && 'Başarılı'}
                          {status === 'failed' && 'Hata'}
                        </span>
                      </div>
                      <div className="agent-bento-card-role">Master Controller</div>
                      <div className="agent-bento-card-body">{summary}</div>
                    </div>
                    
                    {log && (
                      <div className="agent-bento-card-footer">
                        <span>{isExpanded ? '▲ Detayları Kapat' : '▼ Detayları İncele'}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    )}
                    
                    {isExpanded && log && (
                      <div className="agent-bento-card-details">
                        <strong>Prompt:</strong> {log.promptSent}
                        <br /><br />
                        <strong>Output:</strong> {log.outputReceived}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Agent 2: Veri Ajanı */}
              {(() => {
                const log = logs.find(l => l.agentName.includes('Data'));
                const status = log ? log.status : (activeAgentIndex === 1 ? 'running' : 'pending');
                const isExpanded = expandedAgent === 'data';
                
                let summary = 'Fon verilerinin TEFAS\'tan çekilmesini bekliyor.';
                if (status === 'running') summary = `TEFAS veritabanından ${riskLevel} risk seviyesine en uygun fonların dağılımları ve performansları çekiliyor...`;
                if (status === 'success') summary = 'Varlık sınıfları ve popüler fon dağılımları başarıyla çekildi.';

                return (
                  <div 
                    className={`agent-bento-card ${activeAgentIndex === 1 ? 'active' : ''} ${status}`}
                    onClick={() => log && setExpandedAgent(isExpanded ? null : 'data')}
                  >
                    <div>
                      <div className="agent-bento-card-header">
                        <div className="agent-bento-card-title">
                          <Database size={16} className="text-warning" /> Veri Ajanı
                        </div>
                        <span className={`agent-bento-card-status ${status}`}>
                          {status === 'pending' && 'Beklemede'}
                          {status === 'running' && 'Çalışıyor'}
                          {status === 'success' && 'Başarılı'}
                          {status === 'failed' && 'Hata'}
                        </span>
                      </div>
                      <div className="agent-bento-card-role">Financial Data Collector</div>
                      <div className="agent-bento-card-body">{summary}</div>
                    </div>
                    
                    {log && (
                      <div className="agent-bento-card-footer">
                        <span>{isExpanded ? '▲ Detayları Kapat' : '▼ Detayları İncele'}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    )}
                    
                    {isExpanded && log && (
                      <div className="agent-bento-card-details">
                        <strong>Prompt:</strong> {log.promptSent}
                        <br /><br />
                        <strong>Output:</strong> {log.outputReceived}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Agent 3: Risk Motoru */}
              {(() => {
                const log = logs.find(l => l.agentName.includes('Risk'));
                const status = log ? log.status : (activeAgentIndex === 2 ? 'running' : 'pending');
                const isExpanded = expandedAgent === 'risk';
                
                let summary = 'Portföy risk analizi sırasını bekliyor.';
                if (status === 'running') summary = `Oluşturulan fon portföyünün volatilite, kayıp riski ve konsantrasyon dereceleri hesaplanıyor...`;
                if (status === 'success') summary = 'Volatilite skoru ve Drawdown olasılığı başarıyla hesaplandı.';

                return (
                  <div 
                    className={`agent-bento-card ${activeAgentIndex === 2 ? 'active' : ''} ${status}`}
                    onClick={() => log && setExpandedAgent(isExpanded ? null : 'risk')}
                  >
                    <div>
                      <div className="agent-bento-card-header">
                        <div className="agent-bento-card-title">
                          <ShieldAlert size={16} className="text-warning" /> Risk Motoru
                        </div>
                        <span className={`agent-bento-card-status ${status}`}>
                          {status === 'pending' && 'Beklemede'}
                          {status === 'running' && 'Çalışıyor'}
                          {status === 'success' && 'Başarılı'}
                          {status === 'failed' && 'Hata'}
                        </span>
                      </div>
                      <div className="agent-bento-card-role">Portfolio Risk Engine</div>
                      <div className="agent-bento-card-body">{summary}</div>
                    </div>
                    
                    {log && (
                      <div className="agent-bento-card-footer">
                        <span>{isExpanded ? '▲ Detayları Kapat' : '▼ Detayları İncele'}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    )}
                    
                    {isExpanded && log && (
                      <div className="agent-bento-card-details">
                        <strong>Prompt:</strong> {log.promptSent}
                        <br /><br />
                        <strong>Output:</strong> {log.outputReceived}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Agent 4: Kesişim Ajanı */}
              {(() => {
                const log = logs.find(l => l.agentName.includes('Overlap'));
                const status = log ? log.status : (activeAgentIndex === 3 ? 'running' : 'pending');
                const isExpanded = expandedAgent === 'overlap';
                
                let summary = 'Hisse ve varlık çakışma taranmasını bekliyor.';
                if (status === 'running') summary = `Seçilen fonların alt portföy detayları taranıyor; ortak varlıklar ve çakışma yüzdeleri çıkarılıyor...`;
                if (status === 'success') summary = 'Efektif çeşitlendirme skoru ve ortak holding listesi başarıyla hesaplandı.';

                return (
                  <div 
                    className={`agent-bento-card ${activeAgentIndex === 3 ? 'active' : ''} ${status}`}
                    onClick={() => log && setExpandedAgent(isExpanded ? null : 'overlap')}
                  >
                    <div>
                      <div className="agent-bento-card-header">
                        <div className="agent-bento-card-title">
                          <Link size={16} className="text-warning" /> Kesişim Ajanı
                        </div>
                        <span className={`agent-bento-card-status ${status}`}>
                          {status === 'pending' && 'Beklemede'}
                          {status === 'running' && 'Çalışıyor'}
                          {status === 'success' && 'Başarılı'}
                          {status === 'failed' && 'Hata'}
                        </span>
                      </div>
                      <div className="agent-bento-card-role">Hidden Exposure Detector</div>
                      <div className="agent-bento-card-body">{summary}</div>
                    </div>
                    
                    {log && (
                      <div className="agent-bento-card-footer">
                        <span>{isExpanded ? '▲ Detayları Kapat' : '▼ Detayları İncele'}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    )}
                    
                    {isExpanded && log && (
                      <div className="agent-bento-card-details">
                        <strong>Prompt:</strong> {log.promptSent}
                        <br /><br />
                        <strong>Output:</strong> {log.outputReceived}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Agent 5: Rejim Ajanı */}
              {(() => {
                const log = logs.find(l => l.agentName.includes('Regime') || l.agentName.includes('Rejim'));
                const status = log ? log.status : (activeAgentIndex === 4 ? 'running' : 'pending');
                const isExpanded = expandedAgent === 'regime';
                
                let summary = 'Türkiye makroekonomik rejim analizini bekliyor.';
                if (status === 'running') summary = `Türkiye faiz, enflasyon ve BIST-100 borsa momentum göstergeleri analiz ediliyor...`;
                if (status === 'success') summary = 'Aktif borsa ve faiz rejimi sınıflandırıldı, portföy etki raporu çıkarıldı.';

                return (
                  <div 
                    className={`agent-bento-card ${activeAgentIndex === 4 ? 'active' : ''} ${status}`}
                    onClick={() => log && setExpandedAgent(isExpanded ? null : 'regime')}
                  >
                    <div>
                      <div className="agent-bento-card-header">
                        <div className="agent-bento-card-title">
                          <TrendingUp size={16} className="text-warning" /> Rejim Ajanı
                        </div>
                        <span className={`agent-bento-card-status ${status}`}>
                          {status === 'pending' && 'Beklemede'}
                          {status === 'running' && 'Çalışıyor'}
                          {status === 'success' && 'Başarılı'}
                          {status === 'failed' && 'Hata'}
                        </span>
                      </div>
                      <div className="agent-bento-card-role">Macro Context Engine</div>
                      <div className="agent-bento-card-body">{summary}</div>
                    </div>
                    
                    {log && (
                      <div className="agent-bento-card-footer">
                        <span>{isExpanded ? '▲ Detayları Kapat' : '▼ Detayları İncele'}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    )}
                    
                    {isExpanded && log && (
                      <div className="agent-bento-card-details">
                        <strong>Prompt:</strong> {log.promptSent}
                        <br /><br />
                        <strong>Output:</strong> {log.outputReceived}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Agent 6: Optimizasyon */}
              {(() => {
                const log = logs.find(l => l.agentName.includes('Optimization') || l.agentName.includes('Optimizer') || l.agentName.includes('Optimizasyon'));
                const status = log ? log.status : (activeAgentIndex === 5 ? 'running' : 'pending');
                const isExpanded = expandedAgent === 'optimization';
                
                let summary = 'Portföy ağırlıklarının optimize edilmesini bekliyor.';
                if (status === 'running') summary = `Ajan raporları doğrultusunda taktiksel rebalans ağırlıkları hesaplanıyor...`;
                if (status === 'success') summary = 'Taktiksel rebalans önerisi ve optimizasyon skoru başarıyla hesaplandı.';

                return (
                  <div 
                    className={`agent-bento-card ${activeAgentIndex === 5 ? 'active' : ''} ${status}`}
                    onClick={() => log && setExpandedAgent(isExpanded ? null : 'optimization')}
                  >
                    <div>
                      <div className="agent-bento-card-header">
                        <div className="agent-bento-card-title">
                          <Sliders size={16} className="text-warning" /> Optimizasyon
                        </div>
                        <span className={`agent-bento-card-status ${status}`}>
                          {status === 'pending' && 'Beklemede'}
                          {status === 'running' && 'Çalışıyor'}
                          {status === 'success' && 'Başarılı'}
                          {status === 'failed' && 'Hata'}
                        </span>
                      </div>
                      <div className="agent-bento-card-role">Portfolio Optimizer</div>
                      <div className="agent-bento-card-body">{summary}</div>
                    </div>
                    
                    {log && (
                      <div className="agent-bento-card-footer">
                        <span>{isExpanded ? '▲ Detayları Kapat' : '▼ Detayları İncele'}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    )}
                    
                    {isExpanded && log && (
                      <div className="agent-bento-card-details">
                        <strong>Prompt:</strong> {log.promptSent}
                        <br /><br />
                        <strong>Output:</strong> {log.outputReceived}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            {/* Scroll anchor removed to prevent pulling screen down on every log */}
          </div>
          
          {/* If running, show loading results placeholder inside the right column */}
          {isRunning && (
            <div className="glass-card loading-results-placeholder" style={{ 
              flex: 1, 
              minHeight: '400px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: 'rgba(197, 160, 89, 0.02)',
              border: '1px dashed var(--border-glass)',
              gap: '1rem',
              marginTop: '1.5rem',
              padding: '2rem',
              textAlign: 'center'
            }}>
              <div className="pulse-dot" style={{ width: '12px', height: '12px', background: 'var(--accent-gold)' }}></div>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                Yapay Zeka Portföy Analiz Raporu Hazırlanıyor...
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Analist ajanlar TEFAS verilerini ve risk parametrelerini inceliyor. Lütfen bekleyin.
              </p>
            </div>
          )}
        </div>
      </div>
    )}

      {/* Results dashboard tab layout */}
      {analysisResult && (
            <div ref={resultsRef} className="glass-card results-dashboard-container" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'row', gap: '1.5rem', minHeight: '600px' }}>
              <style dangerouslySetInnerHTML={{__html: `
                @media (max-width: 1024px) {
                  .results-dashboard-container {
                    flex-direction: column !important;
                    padding: 0.75rem !important;
                  }
                  .results-sidebar {
                    width: 100% !important;
                    flex-direction: row !important;
                    overflow-x: auto !important;
                    border-right: none !important;
                    border-bottom: 1px solid var(--border-glass) !important;
                    padding-right: 0 !important;
                    padding-bottom: 0.75rem !important;
                    margin-bottom: 0.5rem !important;
                  }
                  .sidebar-tab-btn {
                    width: auto !important;
                    flex-shrink: 0 !important;
                  }
                  .results-sidebar-title {
                    display: none !important;
                  }
                  .reset-analysis-btn {
                    width: auto !important;
                    flex-shrink: 0 !important;
                    margin-top: 0 !important;
                    margin-left: auto !important;
                  }
                }
              `}} />

              {/* Sidebar Menu (Left Side) */}
              <div 
                className="results-sidebar" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '6px', 
                  width: '200px',
                  flexShrink: 0,
                  borderRight: '1px solid var(--border-glass)',
                  paddingRight: '1rem',
                }}
              >
                <div className="results-sidebar-title" style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', paddingLeft: '8px' }}>
                  Kontrol Paneli
                </div>
                {[
                  { id: 'tab-saglik-karnesi', label: 'Sağlık Karnesi', icon: <Award size={14} /> },
                  { id: 'tab-risk-stres', label: 'Risk & Stres Testi', icon: <ShieldAlert size={14} /> },
                  { id: 'tab-fon-iliskileri', label: 'Fon İlişkileri', icon: <Link size={14} /> },
                  { id: 'tab-backtest-tahmin', label: 'Backtest & Tahmin', icon: <TrendingUp size={14} /> },
                  { id: 'tab-ai-analist', label: 'AI Analist & Denetçi', icon: <Cpu size={14} /> },
                  { id: 'tab-premium', label: 'Premium Bölümü', icon: <Zap size={14} /> }
                ].map(tab => (
                  <button
                    key={tab.id}
                    id={tab.id}
                    className="btn sidebar-tab-btn"
                    style={{
                      background: activeResultTab === tab.id ? 'var(--bg-card-hover)' : 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      color: activeResultTab === tab.id ? 'var(--accent-gold)' : 'var(--text-secondary)',
                      fontWeight: activeResultTab === tab.id ? 700 : 500,
                      fontSize: '0.75rem',
                      padding: '8px 12px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      textAlign: 'left',
                      justifyContent: 'flex-start',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: activeResultTab === tab.id ? 'var(--shadow-glow-gold)' : 'none'
                    }}
                    onClick={() => setActiveResultTab(tab.id as any)}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
                
                {/* Reset / Back to parameters form */}
                <button
                  className="btn sidebar-tab-btn reset-analysis-btn"
                  style={{
                    background: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '8px',
                    color: '#ef4444',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    padding: '8px 12px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    textAlign: 'left',
                    justifyContent: 'flex-start',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginTop: 'auto',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
                  }}
                  onClick={() => {
                    setAnalysisResult(null);
                    setActiveResultTab('tab-saglik-karnesi');
                  }}
                >
                  <RefreshCw size={12} /> Yeni Analiz Başlat
                </button>
              </div>

              {/* Main Content Area (Right Side) */}
              <div className="results-content-area" style={{ flex: 1, minWidth: 0 }}>
                {/* Mobile Tab Navigation Helper (Arrows) */}
                <div 
                  className="mobile-tab-navigation"
                  style={{
                    position: 'fixed',
                    bottom: '24px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'rgba(10, 11, 15, 0.9)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(197, 160, 89, 0.3)',
                    borderRadius: '30px',
                    padding: '6px 14px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(197, 160, 89, 0.15)',
                    width: 'max-content',
                    minWidth: '280px',
                    justifyContent: 'space-between'
                  }}
                >
                  <button
                    className="btn"
                    style={{
                      width: '36px',
                      height: '36px',
                      minHeight: '36px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#fff',
                      cursor: 'pointer',
                      padding: 0,
                      margin: 0,
                      transition: 'all 0.2s ease',
                    }}
                    onClick={handlePrevTab}
                    title="Önceki Bölüm"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                      Bölüm {tabSequence.indexOf(activeResultTab) + 1} / 6
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-gold)', whiteSpace: 'nowrap' }}>
                      {activeResultTab === 'tab-saglik-karnesi' && 'Sağlık Karnesi'}
                      {activeResultTab === 'tab-risk-stres' && 'Risk & Stres Testi'}
                      {activeResultTab === 'tab-fon-iliskileri' && 'Fon İlişkileri'}
                      {activeResultTab === 'tab-backtest-tahmin' && 'Backtest & Tahmin'}
                      {activeResultTab === 'tab-ai-analist' && 'AI Analist & Denetçi'}
                      {activeResultTab === 'tab-premium' && 'Premium Bölümü'}
                    </span>
                  </div>

                  <button
                    className="btn btn-accent"
                    style={{
                      width: '36px',
                      height: '36px',
                      minHeight: '36px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, var(--accent-gold) 0%, #f3dcb3 100%)',
                      border: 'none',
                      color: '#000',
                      cursor: 'pointer',
                      padding: 0,
                      margin: 0,
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(197, 160, 89, 0.4)'
                    }}
                    onClick={handleNextTab}
                    title="Sonraki Bölüm"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
                {/* TAB 1: SAĞLIK KARNESİ */}
                {activeResultTab === 'tab-saglik-karnesi' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Gauge & Cards Container */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', ...({ '@media (min-width: 768px)': { gridTemplateColumns: '1fr 2fr' } } as any) }} className="health-grid-1">
                    
                    {/* SVG Health Gauge */}
                    <div className="glass-card" style={{ background: 'rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '1.25rem', textAlign: 'center', height: 'fit-content' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase' }}>Portföy Genel Sağlık Skoru</h4>
                      
                      <div className="gauge-container" style={{ position: 'relative', width: '150px', height: '100px', display: 'flex', justifyContent: 'center' }}>
                        <svg className="gauge-svg" viewBox="0 0 200 110" style={{ width: '100%', height: '100%' }}>
                          <path className="gauge-bg" d="M20,100 A80,80 0 0,1 180,100" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="16" strokeLinecap="round" />
                          <path 
                            className="gauge-fill" 
                            d="M20,100 A80,80 0 0,1 180,100" 
                            fill="none" 
                            stroke="var(--accent-gold)" 
                            strokeWidth="16" 
                            strokeLinecap="round"
                            strokeDasharray={`${((analysisResult.healthScores?.overallScore || 75) / 100) * 251} 251`}
                          />
                        </svg>
                        <div style={{ position: 'absolute', bottom: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-gold)', lineHeight: 1 }}>{analysisResult.healthScores?.overallScore || 75}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>/ 100</span>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '8px 0 0 0', lineHeight: 1.4 }}>
                        Belirlediğiniz risk seviyesi ve makroekonomik değişkenlerle uyum yüzdesidir.
                      </p>
                    </div>

                    {/* Health metrics breakout */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                      {[
                        { title: 'Risk Skoru', value: analysisResult.healthScores?.riskScore || 70, icon: '🛡️', desc: 'Risk hedefinize yakınlık' },
                        { title: 'Çeşitlendirme Skoru', value: analysisResult.healthScores?.diversificationScore || 80, icon: '🌿', desc: 'Sektör & varlık çeşitliliği' },
                        { title: 'Likidite Skoru', value: analysisResult.healthScores?.liquidityScore || 75, icon: '💧', desc: 'Nakde dönme hızı' },
                        { title: 'Enflasyon Koruma', value: analysisResult.healthScores?.inflationScore || 80, icon: '🔥', desc: 'Reel alım gücü koruması' },
                        { title: 'Kur Riski Skoru', value: analysisResult.healthScores?.fxScore || 65, icon: '💵', desc: 'Kur şoklarına karşı direnç' },
                        { title: 'Faiz Riski Skoru', value: analysisResult.healthScores?.interestScore || 75, icon: '🏦', desc: 'Faiz değişimlerine tepki' }
                      ].map((score, i) => (
                        <div key={i} className="glass-card" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{score.title}</span>
                            <span>{score.icon}</span>
                          </div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: score.value > 65 ? '#10b981' : score.value > 45 ? '#eab308' : '#ef4444' }}>
                            {score.value}
                          </div>
                          <div className="rebalance-bar-bg" style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '1.5px', marginTop: '2px' }}>
                            <div className="rebalance-bar-fill" style={{ height: '100%', width: `${score.value}%`, backgroundColor: score.value > 65 ? '#10b981' : score.value > 45 ? '#eab308' : '#ef4444', borderRadius: '1.5px' }} />
                          </div>
                          <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '2px' }}>{score.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fund weights list */}
                  <div>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Portföy Ağırlıkları</h3>
                    <div className="fund-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {analysisResult.portfolio.map((item, idx) => {
                        const fDetails = PRESET_FUNDS.find(x => x.code === item.code);
                        const fData = analysisResult.data.find(x => x.fund_code === item.code);
                        return (
                          <div key={idx} className="glass-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="fund-code" style={{ padding: '2px 6px', fontSize: '0.725rem', fontWeight: 700, borderRadius: '2px', background: 'var(--accent-gold-light)', color: '#000' }}>{item.code}</span>
                                <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {fDetails ? fDetails.name : `${item.code} Serbest Fon`}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-gold)' }}>%{item.weight}</span>
                            </div>
                            <div className="rebalance-bar-bg" style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                              <div className="rebalance-bar-fill" style={{ height: '100%', width: `${item.weight}%`, backgroundColor: 'var(--accent-gold)', borderRadius: '2px' }} />
                            </div>
                            {fData && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255, 255, 255, 0.03)', paddingBottom: '4px' }}>
                                <span>Kategori: {fData.category}</span>
                                <span>TEFAS Risk Değeri: {fData.risk_metrics.risk_value || 5}/7</span>
                              </div>
                            )}
                            
                            {fData && fData.asset_allocation && (
                              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '4px', background: 'rgba(0,0,0,0.1)', padding: '6px 10px', borderRadius: '2px' }}>
                                {/* Donut Chart */}
                                <div style={{
                                  position: 'relative',
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '50%',
                                  background: getConicGradient(fData.asset_allocation),
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.4)'
                                }}>
                                  <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: '#1a1c23', // Matches parent glass-card dark theme
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.55rem',
                                    fontWeight: 800,
                                    color: 'var(--text-muted)'
                                  }}>
                                    %
                                  </div>
                                </div>
                                
                                {/* Legend */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', flex: 1 }}>
                                  {Object.entries(fData.asset_allocation).map(([asset, pct], idx) => {
                                    const colors = [
                                      'var(--accent-gold)', 
                                      'var(--accent-gold-light)', 
                                      'var(--accent-green)', 
                                      '#f97316', 
                                      'var(--accent-blue)',
                                      '#a855f7',
                                      '#ec4899',
                                      '#0ea5e9',
                                      '#10b981',
                                      '#ef4444'
                                    ];
                                    const color = colors[idx % colors.length];
                                    return (
                                      <div key={asset} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.675rem' }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, display: 'inline-block' }} />
                                        <span style={{ color: 'var(--text-secondary)' }}>{asset}:</span>
                                        <strong style={{ color: 'var(--text-primary)' }}>%{pct.toFixed(0)}</strong>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                   {/* Asset Allocation */}
                   <div className="glass-card" style={{ background: 'rgba(0,0,0,0.1)' }}>
                     <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Konsolide Varlık Sınıfı Dağılımı</h3>
                     
                     {(() => {
                       const consolidatedAllocation = analysisResult.data.reduce((acc: {name: string, val: number}[], fund) => {
                         const p = analysisResult.portfolio.find(x => x.code === fund.fund_code);
                         if (!p) return acc;
                         Object.entries(fund.asset_allocation).forEach(([asset, pct]) => {
                           const contrib = (pct * p.weight) / 100;
                           const existing = acc.find(x => x.name === asset);
                           if (existing) {
                             existing.val += contrib;
                           } else {
                             acc.push({ name: asset, val: contrib });
                           }
                         });
                         return acc;
                       }, []).sort((a,b) => b.val - a.val);

                       const totalAllocVal = consolidatedAllocation.reduce((sum, item) => sum + item.val, 0);
                       const normalizedAlloc = consolidatedAllocation.map(item => ({
                         name: item.name,
                         val: totalAllocVal > 0 ? (item.val / totalAllocVal) * 100 : 0
                       }));

                       const assetColors: Record<string, string> = {
                         'Yerli Hisse': 'var(--accent-gold)',
                         'Yabancı Hisse': 'var(--accent-blue)',
                         'Eurobond': 'var(--accent-green)',
                         'BPP / Vadeli': 'var(--accent-purple)',
                         'Para Piyasası': '#f97316',
                         'Yatırım Fonları': '#ec4899',
                         'Döviz': '#10b981',
                         'Ters Repo': '#eab308',
                         'Vadeli İşlem Teminatları': '#ef4444',
                         'Diğer': '#6366f1'
                       };
                       const getAssetColor = (name: string, index: number) => {
                         return assetColors[name] || ['var(--accent-gold)', 'var(--accent-blue)', 'var(--accent-green)', '#f97316', 'var(--accent-purple)', '#ec4899', '#6366f1'][index % 7];
                       };

                       const C = 2 * Math.PI * 38; // ~238.76
                       let accumulatedPercent = 0;

                       return (
                         <div className="health-grid-2">
                           {/* SVG Donut Chart Card */}
                           <div className="glass-card" style={{ background: 'rgba(0,0,0,0.15)', padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                             <div className="donut-layout-container" style={{ width: '100%' }}>
                               <div style={{ position: 'relative', width: '210px', height: '210px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, margin: '0 auto' }}>
                                 <svg width="100%" height="100%" viewBox="0 0 100 100">
                                   {/* Background Circle */}
                                   <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="12" />
                                   
                                   {/* Slices Group rotated to start from top */}
                                   <g transform="rotate(-90 50 50)">
                                     {normalizedAlloc.map((asset, idx) => {
                                       const sliceLength = (asset.val / 100) * C;
                                       const offset = - (accumulatedPercent / 100) * C;
                                       accumulatedPercent += asset.val;
                                       const isHovered = hoveredAssetClass === asset.name;
                                       const isAnyHovered = hoveredAssetClass !== null;
                                       const color = getAssetColor(asset.name, idx);

                                       return (
                                         <circle
                                           key={idx}
                                           cx="50"
                                           cy="50"
                                           r="38"
                                           fill="none"
                                           stroke={color}
                                           strokeWidth={isHovered ? 16 : 12}
                                           strokeDasharray={`${sliceLength} ${C}`}
                                           strokeDashoffset={offset}
                                           strokeLinecap={asset.val > 2 ? 'round' : 'butt'}
                                           className="animate-donut"
                                           style={{
                                             transition: 'all 0.3s ease',
                                             cursor: 'pointer',
                                             opacity: isAnyHovered && !isHovered ? 0.35 : 1,
                                             filter: isHovered ? `drop-shadow(0 0 8px ${color})` : 'none'
                                           }}
                                           onMouseEnter={() => setHoveredAssetClass(asset.name)}
                                           onMouseLeave={() => setHoveredAssetClass(null)}
                                         />
                                       );
                                     })}
                                   </g>
                                 </svg>

                                 {/* Central Hole Info */}
                                 <div style={{
                                   position: 'absolute',
                                   display: 'flex',
                                   flexDirection: 'column',
                                   alignItems: 'center',
                                   justifyContent: 'center',
                                   width: '98px',
                                   height: '98px',
                                   borderRadius: '50%',
                                   background: '#090b0e',
                                   boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8), 0 0 12px rgba(197, 160, 89, 0.05)',
                                   border: '1px solid rgba(255,255,255,0.03)',
                                   padding: '4px',
                                   textAlign: 'center'
                                 }}>
                                   {(() => {
                                     const hoveredAsset = hoveredAssetClass ? normalizedAlloc.find(a => a.name === hoveredAssetClass) : null;
                                     const color = hoveredAsset ? getAssetColor(hoveredAsset.name, normalizedAlloc.indexOf(hoveredAsset)) : 'var(--text-primary)';
                                     return (
                                       <>
                                         <span style={{ 
                                           fontSize: hoveredAsset ? '1.25rem' : '1.45rem', 
                                           fontWeight: 800, 
                                           color: color, 
                                           textShadow: hoveredAsset ? `0 0 10px ${color}` : '0 0 10px rgba(255,255,255,0.1)',
                                           transition: 'all 0.2s ease',
                                           lineHeight: 1.1
                                         }}>
                                           {hoveredAsset ? `%${hoveredAsset.val.toFixed(0)}` : '%100'}
                                         </span>
                                         <span style={{ 
                                           fontSize: '0.65rem', 
                                           fontWeight: 700, 
                                           color: 'var(--text-muted)', 
                                           textTransform: 'uppercase', 
                                           letterSpacing: '0.5px', 
                                           marginTop: '3px',
                                           display: 'block',
                                           width: '88px',
                                           whiteSpace: 'nowrap',
                                           overflow: 'hidden',
                                           textOverflow: 'ellipsis'
                                         }}>
                                           {hoveredAsset ? hoveredAsset.name : 'Dağılım'}
                                         </span>
                                       </>
                                     );
                                   })()}
                                 </div>
                               </div>
                             </div>
                           </div>

                           {/* Legend Details Card */}
                           <div className="glass-card" style={{ background: 'rgba(0,0,0,0.15)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                               {normalizedAlloc.map((asset, idx) => {
                                 const isHovered = hoveredAssetClass === asset.name;
                                 const isAnyHovered = hoveredAssetClass !== null;
                                 const color = getAssetColor(asset.name, idx);

                                 return (
                                   <div
                                     key={idx}
                                     style={{
                                       display: 'flex',
                                       alignItems: 'center',
                                       justifyContent: 'space-between',
                                       padding: '6px 8px',
                                       borderRadius: '8px',
                                       background: isHovered ? 'rgba(255,255,255,0.03)' : 'transparent',
                                       border: isHovered ? '1px solid var(--border-glass-active)' : '1px solid transparent',
                                       cursor: 'pointer',
                                       transition: 'all 0.25s ease',
                                       opacity: isAnyHovered && !isHovered ? 0.45 : 1
                                     }}
                                     onMouseEnter={() => setHoveredAssetClass(asset.name)}
                                     onMouseLeave={() => setHoveredAssetClass(null)}
                                   >
                                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                       <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, boxShadow: isHovered ? `0 0 6px ${color}` : 'none' }} />
                                       <span style={{ fontSize: '0.8rem', fontWeight: isHovered ? 700 : 500, color: 'var(--text-primary)' }}>{asset.name}</span>
                                     </div>
                                     <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                       <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isHovered ? color : 'var(--text-secondary)' }}>%{asset.val.toFixed(1)}</span>
                                       <div className="rebalance-bar-bg" style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                         <div className="rebalance-bar-fill" style={{ width: `${asset.val}%`, height: '100%', backgroundColor: color }} />
                                       </div>
                                     </div>
                                   </div>
                                 );
                                })}
                             </div>
                           </div>
                         </div>
                       );
                     })()}
                   </div>
                </div>
              )}

              {/* TAB 2: RISK & STRES TESTI */}
              {activeResultTab === 'tab-risk-stres' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Advanced Risk metrics list */}
                  <div>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Risk Analiz Merkezi</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                      {[
                        { title: 'Ağırlıklı Volatilite', value: `%${analysisResult.advancedRiskMetrics?.volatility || 22.4}`, desc: 'Yıllık ortalama dalgalanma payı' },
                        { title: 'Sharpe Oranı', value: analysisResult.advancedRiskMetrics?.sharpe || 1.82, desc: 'Birim risk başına düşen getiri' },
                        { title: 'Beta Katsayısı', value: analysisResult.advancedRiskMetrics?.beta || 0.85, desc: 'Piyasaya (BIST) karşı duyarlılık' },
                        { title: 'Maksimum Düşüş', value: `-%${analysisResult.advancedRiskMetrics?.maxDrawdown || 28.5}`, desc: 'Tarihsel en yüksek kayıp' },
                        { title: 'Korelasyon Skoru', value: analysisResult.advancedRiskMetrics?.correlation || 0.45, desc: 'Fonların çakışma derecesi' },
                        { title: 'Yoğunlaşma Oranı', value: `%${analysisResult.advancedRiskMetrics?.concentration || 60}`, desc: 'En yüksek varlık payı' }
                      ].map((metric, i) => (
                        <div key={i} className="glass-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(255,255,255,0.01)' }}>
                          <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{metric.title}</span>
                          <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-gold)' }}>{metric.value}</span>
                          <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>{metric.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Senaryo Simülasyon Merkezi */}
                  <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Makroekonomik Senaryo Simülasyonu</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                      Aşağıdaki olayların gerçekleşmesi durumunda, portföyünüzün tahmini getiri etkileri ve sebepleri hesaplanmıştır:
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {[
                        { key: 'faiz_artisi', label: 'TCMB Faiz Artışı (%+5)', color: 'var(--accent-red)', icon: '🏦' },
                        { key: 'faiz_indirimi', label: 'TCMB Faiz İndirimi (%-5)', color: 'var(--accent-green)', icon: '📉' },
                        { key: 'yuksek_enflasyon', label: 'Yüksek Enflasyon Şoku', color: 'var(--accent-gold)', icon: '🔥' },
                        { key: 'dolar_yukselisi', label: 'Dolar/TL Yükselişi (%+15)', color: 'var(--accent-gold-light)', icon: '💵' },
                        { key: 'bist_dususu', label: 'Borsa İstanbul Düzeltmesi (%-20)', color: 'var(--accent-red)', icon: '📊' },
                        { key: 'resesyon', label: 'Küresel Ekonomik Resesyon', color: 'var(--text-muted)', icon: '🌍' }
                      ].map(scene => {
                        const data = analysisResult.scenarios?.[scene.key] || { impact: -2.5, comment: 'Hesaplanıyor...' };
                        const isPos = data.impact >= 0;
                        return (
                          <div key={scene.key} className="glass-card" style={{ padding: '0.85rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '200px' }}>
                              <span style={{ fontSize: '1.1rem' }}>{scene.icon}</span>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{scene.label}</span>
                            </div>
                            <span style={{ 
                              fontSize: '0.9rem', 
                              fontWeight: 800, 
                              color: isPos ? '#10b981' : '#ef4444',
                              padding: '2px 8px',
                              borderRadius: '2px',
                              background: isPos ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                              border: `1px solid ${isPos ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                            }}>
                              {isPos ? '+' : ''}{data.impact}%
                            </span>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, flex: 1, minWidth: '260px', lineHeight: 1.4 }}>
                              {data.comment}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stres Testi Laboratuvarı */}
                  <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Stres Testi Laboratuvarı</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                      Portföyünüzün Türkiye'nin yakın geçmişindeki kriz ortamlarına dayanıklılık performansı test edilmiştir:
                    </p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                      {[
                        { key: 'pandemi', label: '2020 Pandemi Şoku', date: 'Mart 2020' },
                        { key: 'kur_krizi', label: '2018 Kur Krizi', date: 'Ağustos 2018' },
                        { key: 'enflasyon_soku', label: '2022 Enflasyon Şoku', date: 'Tüm Yıl' },
                        { key: 'secim_volatilitesi', label: '2023 Seçim Volatilitesi', date: 'Mayıs 2023' }
                      ].map(test => {
                        const data = analysisResult.stressTests?.[test.key] || { score: 70, loss: -12.4, rating: 'Orta' as const, comment: 'Analiz ediliyor...' };
                        const colors = { Güçlü: '#10b981', Orta: '#eab308', Zayıf: '#ef4444' };
                        const ratingColor = colors[data.rating];
                        return (
                          <div key={test.key} className="glass-card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>{test.label}</span>
                              <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>{test.date}</span>
                            </div>
                            <div style={{ display: 'flex', justifyItems: 'baseline', gap: '8px', alignItems: 'baseline' }}>
                              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: ratingColor }}>{data.score} Skor</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Maksimum Kayıp: <strong style={{ color: '#ef4444' }}>{data.loss}%</strong></span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '2px', background: `${ratingColor}20`, color: ratingColor, border: `1px solid ${ratingColor}40` }}>{data.rating.toUpperCase()}</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Dayanıklılık Derecesi</span>
                            </div>
                            <p style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4, borderTop: '1px solid var(--border-glass)', paddingTop: '6px' }}>
                              {data.comment}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: FON İLİŞKİLERİ & MATRİS */}
              {activeResultTab === 'tab-fon-iliskileri' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Diversification Score & Matrix Header */}
                  <div>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Portföy Çeşitlendirme Analizi</h3>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>Efektif Çeşitlendirme Skoru:</span>
                      <span style={{ 
                        color: (analysisResult.overlap?.effective_diversification_score || 80) > 60 ? '#10b981' : '#ef4444',
                        fontSize: '1.35rem',
                        fontWeight: 800
                      }}>{analysisResult.overlap?.effective_diversification_score || 80}/100</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      Aşağıdaki korelasyon ve varlık kesişim matrisi, fonlarınızın alt portföy detaylarındaki ortak hisse taşımalarını analiz eder. Düşük çakışma oranları, portföyün çeşitlendirme gücünün yüksek olduğunu gösterir.
                    </p>
                  </div>

                  {/* Overlap Matrix Table */}
                  <div className="overlap-matrix" style={{ display: 'flex', flexDirection: 'column', overflowX: 'auto', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '2px', border: '1px solid var(--border-glass)' }}>
                    <div className="matrix-row" style={{ display: 'flex', minWidth: '400px' }}>
                      <div className="matrix-cell matrix-label" style={{ background: 'transparent', flex: 1, textAlign: 'center', fontWeight: 700 }}>Fon Kodu</div>
                      {analysisResult.portfolio.map(p => (
                        <div key={p.code} className="matrix-cell matrix-label" style={{ flex: 1, textAlign: 'center', fontWeight: 700 }}>{p.code}</div>
                      ))}
                    </div>
                    {analysisResult.portfolio.map(p1 => (
                      <div key={p1.code} className="matrix-row" style={{ display: 'flex', minWidth: '400px' }}>
                        <div className="matrix-cell matrix-label" style={{ flex: 1, fontWeight: 700 }}>{p1.code}</div>
                        {analysisResult.portfolio.map(p2 => {
                          const val = analysisResult.overlap?.fund_overlap_matrix[p1.code]?.[p2.code] || 0;
                          return (
                            <div 
                              key={p2.code} 
                              className="matrix-cell tooltip-container" 
                              style={{ 
                                flex: 1,
                                textAlign: 'center',
                                backgroundColor: getOverlapBgColor(val),
                                color: val > 60 ? '#fff' : 'var(--text-primary)',
                                padding: '8px 0',
                                fontSize: '0.8rem',
                                border: '1px solid rgba(255,255,255,0.02)',
                                cursor: 'help'
                              }}
                            >
                              %{val}
                              <span className="tooltip-text">
                                {p1.code} ve {p2.code} fonlarının ortak holding/hisse taşıma oranı: %{val}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Overlapping Holdings Info Card */}
                  <div className="glass-card" style={{ background: 'rgba(0,0,0,0.1)', padding: '1rem' }}>
                    <h4 style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Link size={14} /> Portföyde En Çok Ağırlık Kaplayan Ortak Varlıklar:
                    </h4>
                    <p style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                      Aşağıdaki hisseler/varlıklar, seçtiğiniz farklı fonların portföylerinde ortak olarak yer aldığından portföy genelinde yüksek birikim payına sahiptir:
                    </p>
                    <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.6, margin: 0 }}>
                      {analysisResult.overlap?.top_common_assets.map((asset, i) => (
                        <li key={i}>{asset}</li>
                      ))}
                      {(analysisResult.overlap?.top_common_assets.length || 0) === 0 && (
                        <li>Fonlar arasında anlamlı bir ortak hisse kesişimi tespit edilmedi. Çeşitlendirme son derece başarılı.</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 4: BACKTEST & GELECEK TAHMİNİ */}
              {activeResultTab === 'tab-backtest-tahmin' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Backtest metrics display */}
                  <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Backtest Merkezi (Tarihsel Performans)</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                      Oluşturulan fon portföyünün son 12 ay içindeki ağırlıklı performansı ve risk ayarlı getiri oranları:
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                      {[
                        { label: 'Son 1 Yıl Getiri', value: `%${analysisResult.backtest?.totalReturn || 72}`, color: 'var(--accent-green)' },
                        { label: 'Yıllıklandırılmış Getiri', value: `%${analysisResult.backtest?.annualReturn || 61}`, color: 'var(--accent-green)' },
                        { label: 'Sharpe Oranı', value: analysisResult.backtest?.sharpe || 1.82, color: 'var(--accent-gold)' },
                        { label: 'Yıllık Volatilite', value: `%${analysisResult.backtest?.volatility || 22.4}`, color: 'var(--accent-red)' },
                        { label: 'Maks. Çekilme', value: `-%${analysisResult.backtest?.maxDrawdown || 28.5}`, color: 'var(--accent-red)' }
                      ].map((item, i) => (
                        <div key={i} className="glass-card" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '2px', background: 'rgba(255,255,255,0.01)' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: item.color }}>{item.value}</span>
                        </div>
                      ))}
                    </div>

                    {analysisResult.backtest?.monthlyData && (() => {
                      const mData = analysisResult.backtest.monthlyData;
                      const defaultBistVals = [100.0, 98.4, 87.1, 81.9, 89.9, 103.4, 124.6, 124.6, 121.7, 123.5, 125.9, 136.9];
                      const defaultGoldVals = [100.0, 101.8, 112.4, 130.0, 132.0, 139.9, 152.5, 169.6, 160.4, 159.6, 156.1, 150.0];
                      const bistData = (analysisResult.backtest.bist100Data && analysisResult.backtest.bist100Data.length > 0)
                        ? analysisResult.backtest.bist100Data 
                        : mData.map((d, idx) => ({ date: d.date, value: defaultBistVals[idx] || 100.0 }));
                      const goldData = (analysisResult.backtest.goldData && analysisResult.backtest.goldData.length > 0)
                        ? analysisResult.backtest.goldData 
                        : mData.map((d, idx) => ({ date: d.date, value: defaultGoldVals[idx] || 100.0 }));
                      const bistRet = bistData.length > 0 ? Math.round(bistData[bistData.length - 1].value - 100) : 37;
                      const goldRet = goldData.length > 0 ? Math.round(goldData[goldData.length - 1].value - 100) : 50;
                      return (
                        <div>
                          {/* CSS animations inject */}
                        <style dangerouslySetInnerHTML={{__html: `
                          @keyframes drawLine {
                            to { stroke-dashoffset: 0; }
                          }
                          .animate-line-primary {
                            stroke-dasharray: 1200;
                            stroke-dashoffset: 1200;
                            animation: drawLine 2.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                          }
                          .animate-line-secondary {
                            stroke-dasharray: 1200;
                            stroke-dashoffset: 1200;
                            animation: drawLine 2.2s cubic-bezier(0.4, 0, 0.2, 1) 0.25s forwards;
                          }
                          .animate-line-tertiary {
                            stroke-dasharray: 1200;
                            stroke-dashoffset: 1200;
                            animation: drawLine 2.2s cubic-bezier(0.4, 0, 0.2, 1) 0.5s forwards;
                          }
                          .chart-legend-row {
                            display: flex;
                            flex-wrap: wrap;
                            gap: 12px 20px;
                            margin-bottom: 0.5rem;
                            padding-bottom: 0.75rem;
                            border-bottom: 1px dashed rgba(255, 255, 255, 0.05);
                          }
                          .legend-item {
                            display: inline-flex;
                            align-items: center;
                            gap: 6px;
                            font-size: 0.75rem;
                            color: var(--text-secondary);
                            transition: all 0.2s;
                          }
                          .legend-item:hover {
                            color: var(--text-primary);
                            transform: translateY(-1px);
                          }
                          @keyframes pulseGlow {
                            0% { r: 3px; opacity: 1; stroke-width: 1px; }
                            100% { r: 9px; opacity: 0; stroke-width: 2px; }
                          }
                          .pulse-circle {
                            animation: pulseGlow 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
                          }
                          @keyframes spinOnce {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                          }
                          .spin-active {
                            animation: spinOnce 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                          }
                          .compare-mode-btn {
                            position: relative;
                            overflow: hidden;
                          }
                          .compare-mode-btn::after {
                            content: '';
                            position: absolute;
                            bottom: 0;
                            left: 50%;
                            width: 0;
                            height: 2px;
                            background: var(--accent-green);
                            transition: all 0.3s;
                            transform: translateX(-50%);
                          }
                          .compare-mode-btn-active::after {
                            width: 80%;
                          }
                        `}} />

                        {/* Selector Controls & Replay Button */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.03)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                            {[
                              { mode: 'all', label: 'Tümünü Yarıştır' },
                              { mode: 'bist', label: 'vs BIST 100' },
                              { mode: 'gold', label: 'vs Saf Altın' }
                            ].map((btn) => (
                              <button
                                key={btn.mode}
                                onClick={() => {
                                  setBacktestCompareMode(btn.mode as any);
                                  setBacktestAnimKey(prev => prev + 1);
                                }}
                                style={{
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                  background: backtestCompareMode === btn.mode ? 'rgba(255,255,255,0.08)' : 'transparent',
                                  color: backtestCompareMode === btn.mode ? 'var(--text-primary)' : 'var(--text-muted)',
                                  boxShadow: backtestCompareMode === btn.mode ? '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
                                }}
                                className={`compare-mode-btn ${backtestCompareMode === btn.mode ? 'compare-mode-btn-active' : ''}`}
                              >
                                {btn.label}
                              </button>
                            ))}
                          </div>
                          
                          <button
                            onClick={() => {
                              setIsSpinning(true);
                              setBacktestAnimKey(prev => prev + 1);
                              setTimeout(() => setIsSpinning(false), 600);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: 'rgba(255, 255, 255, 0.02)',
                              border: '1px solid var(--border-glass)',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                              e.currentTarget.style.color = 'var(--text-primary)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                              e.currentTarget.style.color = 'var(--text-secondary)';
                            }}
                          >
                            <RefreshCw size={12} className={isSpinning ? "spin-active" : ""} style={{ transition: 'transform 0.6s' }} />
                            Yarışı Yeniden Oynat
                          </button>
                        </div>

                        {/* Chart Header & Comparison Legend */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Tarihsel Performans Karşılaştırma Grafiği (100 TL Başlangıç)</span>
                          
                          <div className="chart-legend-row">
                            <div className="legend-item">
                              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
                              <span>Yapay Zeka Sepeti:</span>
                              <strong style={{ color: '#10b981' }}>%{analysisResult.backtest.totalReturn}</strong>
                            </div>
                            {(backtestCompareMode === 'all' || backtestCompareMode === 'bist') && (
                              <div className="legend-item">
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block', boxShadow: '0 0 6px #3b82f6' }} />
                                <span>BIST 100 Endeksi:</span>
                                <strong style={{ color: '#3b82f6' }}>%{bistRet}</strong>
                              </div>
                            )}
                            {(backtestCompareMode === 'all' || backtestCompareMode === 'gold') && (
                              <div className="legend-item">
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block', boxShadow: '0 0 6px #f59e0b' }} />
                                <span>Saf Altın (Ons):</span>
                                <strong style={{ color: '#f59e0b' }}>%{goldRet}</strong>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="glass-card" style={{ background: 'rgba(0,0,0,0.22)', padding: '1.25rem', border: '1px solid var(--border-glass)' }}>
                          {(() => {
                            
                            const allVals = [
                              ...mData.map(d => d.value),
                              ...(backtestCompareMode === 'all' || backtestCompareMode === 'bist' ? bistData.map(d => d.value) : []),
                              ...(backtestCompareMode === 'all' || backtestCompareMode === 'gold' ? goldData.map(d => d.value) : [])
                            ];
                            
                            const minVal = Math.min(...allVals) * 0.95;
                            const maxVal = Math.max(...allVals) * 1.05;
                            
                            const getBezierPath = (data: { date: string, value: number }[]) => {
                              if (data.length === 0) return '';
                              const points = data.map((d, i) => {
                                const x = (i / (data.length - 1)) * 480 + 10;
                                const y = 140 - ((d.value - minVal) / (maxVal - minVal)) * 120;
                                return { x, y };
                              });
                              
                              let path = `M ${points[0].x} ${points[0].y}`;
                              for (let i = 0; i < points.length - 1; i++) {
                                const p0 = points[i];
                                const p1 = points[i + 1];
                                const cpX1 = p0.x + (p1.x - p0.x) / 2;
                                const cpY1 = p0.y;
                                const cpX2 = p0.x + (p1.x - p0.x) / 2;
                                const cpY2 = p1.y;
                                path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
                              }
                              return path;
                            };
                            
                            const portfolioPath = getBezierPath(mData);
                            const bistPath = getBezierPath(bistData);
                            const goldPath = getBezierPath(goldData);
                            
                            const areaPath = portfolioPath ? `${portfolioPath} L 490,140 L 10,140 Z` : '';
                            const xCoord = hoveredBacktestIndex !== null ? (hoveredBacktestIndex / (mData.length - 1)) * 480 + 10 : 0;

                            return (
                              <div 
                                style={{ position: 'relative', width: '100%' }}
                                onMouseLeave={() => setHoveredBacktestIndex(null)}
                              >
                                <svg 
                                  ref={backtestSvgRef}
                                  key={backtestAnimKey}
                                  viewBox="0 0 500 150" 
                                  onMouseMove={handleMouseMoveBacktest}
                                  style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
                                >
                                  <defs>
                                    <linearGradient id="backtestAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                                    </linearGradient>
                                  </defs>
                                  <line x1="10" y1="20" x2="490" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                                  <line x1="10" y1="80" x2="490" y2="80" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                                  <line x1="10" y1="140" x2="490" y2="140" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                                  
                                  {/* Area Fill under Portfolio Line */}
                                  <path d={areaPath} fill="url(#backtestAreaGrad)" style={{ transition: 'd 0.5s ease-in-out' }} />
                                  
                                  {/* BIST 100 Line */}
                                  <path 
                                    d={bistPath} 
                                    fill="none" 
                                    stroke="#3b82f6" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    className="animate-line-secondary"
                                    style={{ 
                                      opacity: (backtestCompareMode === 'all' || backtestCompareMode === 'bist') ? 0.85 : 0,
                                      transition: 'opacity 0.4s ease, d 0.5s ease-in-out',
                                      pointerEvents: 'none'
                                    }}
                                  />
                                  
                                  {/* Saf Altın Line */}
                                  <path 
                                    d={goldPath} 
                                    fill="none" 
                                    stroke="#f59e0b" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    className="animate-line-tertiary"
                                    style={{ 
                                      opacity: (backtestCompareMode === 'all' || backtestCompareMode === 'gold') ? 0.85 : 0,
                                      transition: 'opacity 0.4s ease, d 0.5s ease-in-out',
                                      pointerEvents: 'none'
                                    }}
                                  />

                                  {/* AI Portfolio Line (Primary) */}
                                  <path 
                                    d={portfolioPath} 
                                    fill="none" 
                                    stroke="#10b981" 
                                    strokeWidth="3.5" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    className="animate-line-primary"
                                    style={{
                                      filter: 'drop-shadow(0px 0px 4px rgba(16, 185, 129, 0.5))',
                                      transition: 'd 0.5s ease-in-out'
                                    }}
                                  />
                                  
                                  {/* Interactive Vertical Crosshair Guide Line */}
                                  {hoveredBacktestIndex !== null && (
                                    <line 
                                      x1={xCoord} 
                                      y1={10} 
                                      x2={xCoord} 
                                      y2={140} 
                                      stroke="rgba(255, 255, 255, 0.25)" 
                                      strokeWidth="1.25" 
                                      strokeDasharray="4 4" 
                                      pointerEvents="none"
                                    />
                                  )}

                                  {/* Hover Intersection Glow Circles */}
                                  {hoveredBacktestIndex !== null && (
                                    <g pointerEvents="none">
                                      {/* AI Sepeti intersecting point */}
                                      {(() => {
                                        const y = 140 - ((mData[hoveredBacktestIndex].value - minVal) / (maxVal - minVal)) * 120;
                                        return (
                                          <g>
                                            <circle cx={xCoord} cy={y} className="pulse-circle" fill="none" stroke="#10b981" />
                                            <circle cx={xCoord} cy={y} r="4.5" fill="#10b981" stroke="#0f172a" strokeWidth="1.5" />
                                          </g>
                                        );
                                      })()}

                                      {/* BIST 100 intersecting point */}
                                      {(backtestCompareMode === 'all' || backtestCompareMode === 'bist') && bistData[hoveredBacktestIndex] && (() => {
                                        const y = 140 - ((bistData[hoveredBacktestIndex].value - minVal) / (maxVal - minVal)) * 120;
                                        return (
                                          <g>
                                            <circle cx={xCoord} cy={y} className="pulse-circle" fill="none" stroke="#3b82f6" />
                                            <circle cx={xCoord} cy={y} r="4.5" fill="#3b82f6" stroke="#0f172a" strokeWidth="1.5" />
                                          </g>
                                        );
                                      })()}

                                      {/* Saf Altın intersecting point */}
                                      {(backtestCompareMode === 'all' || backtestCompareMode === 'gold') && goldData[hoveredBacktestIndex] && (() => {
                                        const y = 140 - ((goldData[hoveredBacktestIndex].value - minVal) / (maxVal - minVal)) * 120;
                                        return (
                                          <g>
                                            <circle cx={xCoord} cy={y} className="pulse-circle" fill="none" stroke="#f59e0b" />
                                            <circle cx={xCoord} cy={y} r="4.5" fill="#f59e0b" stroke="#0f172a" strokeWidth="1.5" />
                                          </g>
                                        );
                                      })()}
                                    </g>
                                  )}
                                </svg>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                                  <span>{mData[0].date}</span>
                                  <span>{mData[Math.floor(mData.length / 2)].date}</span>
                                  <span>{mData[mData.length - 1].date}</span>
                                </div>

                                {/* Floating Glassmorphism Tooltip */}
                                {hoveredBacktestIndex !== null && (() => {
                                  const hoveredDate = mData[hoveredBacktestIndex].date;
                                  const hoveredPortfolioVal = mData[hoveredBacktestIndex].value;
                                  const hoveredBistVal = bistData[hoveredBacktestIndex]?.value;
                                  const hoveredGoldVal = goldData[hoveredBacktestIndex]?.value;
                                  
                                  return (
                                    <div 
                                      style={{
                                        position: 'absolute',
                                        top: '5px',
                                        left: xCoord > 250 ? 'auto' : `${(xCoord / 500) * 100 + 3}%`,
                                        right: xCoord > 250 ? `${100 - (xCoord / 500) * 100 + 3}%` : 'auto',
                                        zIndex: 20,
                                        background: 'rgba(15, 23, 42, 0.92)',
                                        backdropFilter: 'blur(10px)',
                                        WebkitBackdropFilter: 'blur(10px)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(16, 185, 129, 0.1)',
                                        borderRadius: '8px',
                                        padding: '0.65rem 0.8rem',
                                        width: '185px',
                                        pointerEvents: 'none',
                                        transition: 'left 0.1s ease, right 0.1s ease',
                                      }}
                                    >
                                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.25rem', marginBottom: '0.4rem' }}>
                                        {hoveredDate} Değerleri
                                      </div>
                                      
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                        {/* AI Portfolio */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 4px #10b981' }} />
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>AI Sepeti</span>
                                          </div>
                                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>
                                            {hoveredPortfolioVal.toFixed(1)} TL (%{((hoveredPortfolioVal - 100)).toFixed(1)})
                                          </span>
                                        </div>
                                        
                                        {/* BIST 100 */}
                                        {(backtestCompareMode === 'all' || backtestCompareMode === 'bist') && hoveredBistVal !== undefined && (
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 4px #3b82f6' }} />
                                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>BIST 100</span>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6' }}>
                                              {hoveredBistVal.toFixed(1)} TL (%{((hoveredBistVal - 100)).toFixed(1)})
                                            </span>
                                          </div>
                                        )}
                                        
                                        {/* Saf Altın */}
                                        {(backtestCompareMode === 'all' || backtestCompareMode === 'gold') && hoveredGoldVal !== undefined && (
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 4px #f59e0b' }} />
                                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Saf Altın</span>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b' }}>
                                              {hoveredGoldVal.toFixed(1)} TL (%{((hoveredGoldVal - 100)).toFixed(1)})
                                            </span>
                                          </div>
                                        )}

                                        {/* Dynamic winner comparison info */}
                                        <div style={{ marginTop: '0.4rem', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '0.4rem', fontSize: '0.68rem', color: 'var(--accent-gold-light)', display: 'flex', gap: '3px', alignItems: 'center' }}>
                                          <Zap size={10} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
                                          <span>
                                            {(() => {
                                              let compVal = hoveredBistVal;
                                              let label = 'BIST 100';
                                              if (backtestCompareMode === 'gold') {
                                                compVal = hoveredGoldVal;
                                                label = 'Altın';
                                              }
                                              const diff = hoveredPortfolioVal - compVal;
                                              if (diff > 0) {
                                                return `Portföyünüz ${label}'e göre %${diff.toFixed(1)} önde`;
                                              } else if (diff < 0) {
                                                return `Portföyünüz ${label}'e göre %${Math.abs(diff).toFixed(1)} geride`;
                                              } else {
                                                return `Başabaş seyrediyor`;
                                              }
                                            })()}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Battle Card Race Analysis */}
                        <div 
                          className="glass-card" 
                          style={{ 
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(30, 41, 59, 0.45) 100%)', 
                            border: '1px solid rgba(16, 185, 129, 0.12)',
                            padding: '1.25rem',
                            borderRadius: '12px',
                            marginTop: '1.25rem',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.06)', filter: 'blur(40px)', pointerEvents: 'none' }} />

                          <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                            <Zap size={14} style={{ color: 'var(--accent-gold)' }} />
                            AI Sepet Yarış Analizi
                          </h4>
                          
                          {(() => {
                            const portRet = analysisResult.backtest?.totalReturn || 0;
                            const bistDiff = portRet - bistRet;
                            const goldDiff = portRet - goldRet;
                            const isWinner = portRet > bistRet && portRet > goldRet;

                            return (
                              <>
                                {backtestCompareMode === 'all' && (
                                  <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                      12 aylık geriye dönük test (backtest) sonuçlarına göre portföyünüz <strong>%{portRet}</strong> getiri sağlarken, aynı dönemde <strong>BIST 100 Endeksi</strong> %{bistRet} ve <strong>Saf Altın</strong> %{goldRet} performans göstermiştir. {isWinner ? <strong>Portföyünüz yarışı lider tamamlamıştır.</strong> : <strong>Portföyünüz piyasa koşullarına göre dengeli bir seyir izlemiştir.</strong>}
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                                      <div style={{ background: 'rgba(255,255,255,0.01)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>BIST 100'e Karşı Alfa</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: bistDiff >= 0 ? '#10b981' : '#f87171' }}>
                                          {bistDiff >= 0 ? `+%${bistDiff.toFixed(1)} Alfa` : `-%${Math.abs(bistDiff).toFixed(1)} Geride`}
                                        </span>
                                      </div>
                                      <div style={{ background: 'rgba(255,255,255,0.01)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Altın'a Karşı Alfa</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: goldDiff >= 0 ? '#10b981' : '#f87171' }}>
                                          {goldDiff >= 0 ? `+%${goldDiff.toFixed(1)} Alfa` : `-%${Math.abs(goldDiff).toFixed(1)} Geride`}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {backtestCompareMode === 'bist' && (
                                  <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                      Portföyünüz (%{portRet}), BIST 100 endeksine (%{bistRet}) karşı <strong>{bistDiff >= 0 ? `+%${bistDiff.toFixed(1)}` : `-%${Math.abs(bistDiff).toFixed(1)}`}</strong> fark oluşturmuştur. Portföydeki varlık dağılımı (seçilen fon kodları ve risk limitleri) endeks üzeri getiri ve volatilite dengesi sağlamada kritik rol oynamıştır.
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.75rem', background: 'rgba(59, 130, 246, 0.05)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                      <Info size={14} style={{ color: '#3b82f6', flexShrink: 0 }} />
                                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                                        BIST 100 dalgalanırken, sepetinizdeki algoritma/koruma fonları ve risksiz likit varlıklar drawdown riskini düşürmüştür.
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {backtestCompareMode === 'gold' && (
                                  <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                      Güvenli liman Saf Altın (%{goldRet}) enflasyona karşı dengeli bir getiri sunarken, portföyünüz altının getirisini <strong>{goldDiff >= 0 ? `+%${goldDiff.toFixed(1)}` : `-%${Math.abs(goldDiff).toFixed(1)}`}</strong> fark ile takip etmiştir.
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.75rem', background: 'rgba(245, 158, 11, 0.05)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                                      <Info size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                                        Altın küresel ons ve döviz seyrini takip ederken, sepetinizdeki teknoloji, hisse senedi ve serbest fonlar ekstra alfa yaratma potansiyeline sahiptir.
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                  {/* Monte Carlo Simulator Card */}
                  <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monte Carlo Projeksiyonu (Gelecek 12 Ay)</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                      Yıllık volatilite ve getiri oranlarını kullanarak, portföyünüzün gelecek 12 ay içindeki başarı olasılıklarını 10,000 farklı simülasyon yolu üzerinden tahmin eder:
                    </p>

                    {analysisResult.monteCarlo && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        
                        {/* Simulation Line Chart */}
                        <div className="glass-card" style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', border: '1px solid var(--border-glass)' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Simüle Gelecek Olasılık Dağılımları (100 TL Başlangıç)</span>
                          
                          {(() => {
                            const mc = analysisResult.monteCarlo;
                            const steps = mc.medianPath.length;
                            const allVals = [...mc.optimisticPath, ...mc.pessimisticPath];
                            const minVal = Math.min(...allVals) * 0.95;
                            const maxVal = Math.max(...allVals) * 1.05;

                            const getPointsString = (path: number[]) => {
                              return path.map((val, i) => {
                                const x = (i / (steps - 1)) * 480 + 10;
                                const y = 140 - ((val - minVal) / (maxVal - minVal)) * 120;
                                return `${x},${y}`;
                              }).join(' ');
                            };

                            const optPts = getPointsString(mc.optimisticPath);
                            const medPts = getPointsString(mc.medianPath);
                            const pesPts = getPointsString(mc.pessimisticPath);

                            return (
                              <div>
                                <svg viewBox="0 0 500 150" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
                                  <line x1="10" y1="20" x2="490" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                                  <line x1="10" y1="80" x2="490" y2="80" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                                  <line x1="10" y1="140" x2="490" y2="140" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

                                  {/* Pessimistic path */}
                                  <polyline points={pesPts} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round" />
                                  {/* Median path */}
                                  <polyline points={medPts} fill="none" stroke="var(--accent-gold)" strokeWidth="2.5" strokeLinecap="round" />
                                  {/* Optimistic path */}
                                  <polyline points={optPts} fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round" />
                                </svg>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                  <span>Başlangıç (Şimdi)</span>
                                  <span>6. Ay</span>
                                  <span>12. Ay (Vade Sonu)</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Probability results cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                          <div className="glass-card" style={{ padding: '0.75rem', background: 'rgba(16,185,129,0.02)', border: '1px solid rgba(16,185,129,0.1)' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>İyimser Senaryo (%10 Olasılık)</span>
                            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981', display: 'block', margin: '2px 0' }}>%{((analysisResult.monteCarlo.optimisticPath[12] - 100)).toFixed(1)} Getiri</span>
                            <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Varlık: ~{analysisResult.monteCarlo.optimisticPath[12]} TL</span>
                          </div>
                          
                          <div className="glass-card" style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.02)', border: '1px solid rgba(245,158,11,0.1)' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Medyan Senaryo (%50 Olasılık)</span>
                            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-gold)', display: 'block', margin: '2px 0' }}>%{((analysisResult.monteCarlo.medianPath[12] - 100)).toFixed(1)} Getiri</span>
                            <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Varlık: ~{analysisResult.monteCarlo.medianPath[12]} TL</span>
                          </div>

                          <div className="glass-card" style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.02)', border: '1px solid rgba(239,68,68,0.1)' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Kötümser Senaryo (%90 Olasılık)</span>
                            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444', display: 'block', margin: '2px 0' }}>%{((analysisResult.monteCarlo.pessimisticPath[12] - 100)).toFixed(1)} Getiri</span>
                            <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Varlık: ~{analysisResult.monteCarlo.pessimisticPath[12]} TL</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: AI ANALİST & DENETÇİ */}
              {activeResultTab === 'tab-ai-analist' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* AI Macro Financial Dashboard */}
                  {analysisResult.macroAnalyst && (
                    <div className="glass-card" style={{ padding: '1.25rem' }}>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Yapay Zeka Makroekonomik Analist</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                        Portföyünüzün Türkiye'nin güncel CDS, enflasyon ve faiz oranlarıyla ilişkisinin analizi:
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                        <div className="glass-card" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.01)' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>TCMB Politika Faizi</span>
                          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-red)', display: 'block' }}>%{analysisResult.macroAnalyst.tcmbRate.toFixed(1)}</span>
                        </div>
                        <div className="glass-card" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.01)' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>CDS Ülke Risk Primi</span>
                          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-gold)', display: 'block' }}>{analysisResult.macroAnalyst.cds} bp</span>
                        </div>
                        <div className="glass-card" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.01)' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Yıllık TÜFE Enflasyon</span>
                          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-green)', display: 'block' }}>%{analysisResult.macroAnalyst.tufe.toFixed(2)}</span>
                        </div>
                        <div className="glass-card" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.01)' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Yıllık ÜFE Enflasyon</span>
                          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-green)', display: 'block' }}>%{analysisResult.macroAnalyst.ufe.toFixed(2)}</span>
                        </div>
                        <div className="glass-card" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.01)' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ABD Dolar Endeksi (DXY)</span>
                          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>{analysisResult.macroAnalyst.dxy}</span>
                        </div>
                      </div>

                      <div className="glass-card" style={{ padding: '1rem', background: 'rgba(0,0,0,0.1)' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>Makroekonomik AI Yorumu:</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                          {analysisResult.macroAnalyst.commentary}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Yapay Zeka Portföy Denetçisi Q&A Section */}
                  <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Yapay Zeka Portföy Denetçisi</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                      Portföyünüzün kritik durumlarına ilişkin denetçi sorularını seçerek yapay zeka analizini okuyabilirsiniz:
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {[
                        {
                          q: 'Portföyüm fazla riskli mi?',
                          a: (analysisResult.advancedRiskMetrics?.volatility || 22) > 22 
                            ? `Evet, portföyünüzün ağırlıklı volatilitesi (%${analysisResult.advancedRiskMetrics?.volatility || 22.4}) ve risk skoru (%${analysisResult.risk.risk_score}/100) oldukça yüksektir. Hisse senedi ve tematik fonların yüksek payı, ani piyasa düzeltmelerinde portföyünüzün dalgalanma riskini artırır. Ancak bu, uzun vadede yüksek getiri potansiyeli sağlar.` 
                            : (analysisResult.advancedRiskMetrics?.volatility || 22) < 8
                            ? `Hayır, portföyünüz son derece korumacı kurgulanmıştır (%${analysisResult.advancedRiskMetrics?.volatility || 22.4} volatilite). Ağırlıklı olarak para piyasası ve risksiz sabit getirili enstrümanlar taşıdığınız için fiyat dalgalanması minimum seviyededir. Ancak uzun vadede enflasyona karşı reel kayıp riski taşımaktadır.`
                            : `Portföyünüz dengeli bir risk yapısına sahiptir (%${analysisResult.advancedRiskMetrics?.volatility || 22.4} volatilite). Portföyünüzde koruyucu sabit getiri ve büyüme odaklı hisse senedi varlıkları dengeli bir şekilde dağıtılmıştır.`
                        },
                        {
                          q: 'Aynı sektöre fazla mı yüklenmişim?',
                          a: (analysisResult.advancedRiskMetrics?.concentration || 50) > 25
                            ? `Evet, sektörel bazda yoğunlaşma tespit edilmiştir. Portföyünüzün en büyük varlık/sektör sınıfı toplamda %${analysisResult.advancedRiskMetrics?.concentration || 60} ağırlık taşımaktadır. Bu sektöre ait olumsuz haber akışları portföy performansınızı doğrudan etkileyebilir.`
                            : `Hayır, sektörel dağılımınız dengelidir. Tek bir sektöre ait ağırlık %25 sınırını aşmamaktadır, bu da sektörel şoklara karşı portföyünüzün dayanıklılığını destekler.`
                        },
                        {
                          q: 'Gizli yoğunlaşma riski var mı?',
                          a: (analysisResult.advancedRiskMetrics?.correlation || 0.45) > 0.3
                            ? `Evet, portföyünüzdeki fonlar arasında ortak varlık kesişimleri ve korelasyonlar (%${analysisResult.advancedRiskMetrics?.correlation}) tespit edilmiştir. Farklı isimlerde hisse fonları seçmiş olsanız da, bu fonların alt detaylarında benzer BIST-100 dev hisselerini (örn: Türk Hava Yolları, Tüpraş, BİM) ortak olarak taşıdığı görülmektedir. Bu durum gizli yoğunlaşma riski yaratır.`
                            : `Hayır, fonlarınızın alt kırılımlarında anlamlı ortak hisse veya varlık kesişimi bulunmamaktadır. Çeşitlendirme skoru (%${analysisResult.overlap.effective_diversification_score}/100) bunu doğrulamaktadır.`
                        },
                        {
                          q: 'Enflasyona karşı korunaklı mıyım?',
                          a: (analysisResult.healthScores?.inflationScore || 80) > 65
                            ? `Evet, portföyünüz enflasyona karşı güçlü bir koruma kalkanına sahiptir (%${analysisResult.healthScores?.inflationScore || 80} enflasyon koruma skoru). Hisse senedi ve yabancı teknoloji fonlarının yüksek ağırlığı, uzun vadede enflasyon oranının üzerinde getiri sağlama gücünü artırır.`
                            : `Hayır, portföyünüzün enflasyon koruması zayıf kalmıştır (%${analysisResult.healthScores?.inflationScore || 80}/100). Sabit ve risksiz getiri sağlayan fonların (para piyasası vb.) ağırlığı yüksek olduğundan, enflasyonun yüksek seyrettiği ortamlarda birikimlerinizin reel alım gücü eriyebilir.`
                        },
                        {
                          q: 'Kur riskim yüksek mi?',
                          a: (analysisResult.healthScores?.fxScore || 65) > 60
                            ? `Evet, portföyünüz yüksek döviz hassasiyetine sahiptir (%${analysisResult.healthScores?.fxScore || 65} kur koruması). Yabancı hisse fonları ve Eurobond serbest fonlarının (DFI vb.) ağırlığı sayesinde, Dolar/TL'deki yükselişlerden pozitif yönde kur farkı kazancı elde etme potansiyeliniz fazladır. Ancak kurun sabit veya düşüş eğiliminde olduğu dönemlerde bu varlıklar durağan kalabilir.`
                            : `Hayır, portföyünüzün döviz duyarlılığı sınırlıdır (%${analysisResult.healthScores?.fxScore || 65}). Varlıklarınızın büyük kısmı TL bazlı enstrümanlarda olduğundan, olası döviz şoklarında satın alma gücünüzü koruma potansiyeli zayıftır.`
                        }
                      ].map((item, idx) => {
                        const isOpen = activeAuditorQuestion === idx;
                        return (
                          <div key={idx} style={{ border: '1px solid var(--border-glass)', borderRadius: '2px', background: 'rgba(255,255,255,0.01)', overflow: 'hidden' }}>
                            <button
                              type="button"
                              className="accordion-header"
                              style={{ 
                                width: '100%', 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                padding: '10px 12px',
                                background: isOpen ? 'rgba(255,255,255,0.03)' : 'transparent',
                                border: 'none',
                                color: 'var(--text-primary)',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                textAlign: 'left'
                              }}
                              onClick={() => setActiveAuditorQuestion(isOpen ? null : idx)}
                            >
                              <span>🤖 {item.q}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isOpen ? '▲' : '▼'}</span>
                            </button>
                            {isOpen && (
                              <div style={{ padding: '10px 12px', fontSize: '0.775rem', color: '#cbd5e1', borderTop: '1px solid var(--border-glass)', lineHeight: 1.5, background: 'rgba(0,0,0,0.1)' }}>
                                {item.a}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Report details (Gemini Report Markdown) */}
                  <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--accent-gold)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Detaylı Taktiksel AI Analiz Raporu</span>
                    </div>
                    <div className="advisor-report">
                      {renderReport(analysisResult.finalReport)}
                    </div>
                    
                    {/* SPK Disclaimer */}
                    <div style={{
                      marginTop: '1.25rem',
                      padding: '0.85rem 1rem',
                      borderTop: '1px solid var(--border-glass)',
                      fontSize: '0.725rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.4,
                      textAlign: 'justify'
                    }}>
                      <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>SPK UYARI NOTU:</span>
                      Burada yer alan yatırım bilgi, yorum ve tavsiyeleri yatırım danışmanlığı kapsamında değildir. Yatırım danışmanlığı hizmeti; aracı kurumlar, portföy yönetim şirketleri, mevduat kabul etmeyen bankalar ile müşteri arasında imzalanacak yatırım danışmanlığı sözleşmesi çerçevesinde sunulmaktadır. Burada yer alan yorum ve tavsiyeler, yorum ve tavsiyede bulunanların kişisel görüşlerine dayanmaktadır. Bu görüşler mali durumunuz ile risk ve getiri tercihlerinize uygun olmayabilir. Bu nedenle, sadece burada yer alan bilgilere dayanılarak yatırım kararı verilmesi beklentilerinize uygun sonuçlar doğurmayabilir.
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: PREMIUM HİZMETLER */}
              {activeResultTab === 'tab-premium' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Risk Alert System Setup Card */}
                  <div className="glass-card" style={{ padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Portföy Alarm & Takip Sistemi</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                      Portföyünüzün risk değerlerinde veya fon dağılımlarında ani bir değişim (Örn: fon yöneticisinin portföy dağılımını değiştirerek volatiliteyi yükseltmesi) gerçekleştiğinde anlık bildirim alın:
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.1)', padding: '1.25rem', borderRadius: '2px', border: '1px solid var(--border-glass)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div className="input-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '0.75rem' }}>E-posta Adresi</label>
                          <input 
                            type="email" 
                            className="input-field" 
                            placeholder="ornek@domain.com"
                            style={{ height: '36px', fontSize: '0.8rem' }}
                            value={premiumAlertConfig.email}
                            onChange={(e) => setPremiumAlertConfig({ ...premiumAlertConfig, email: e.target.value })}
                          />
                        </div>
                        <div className="input-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '0.75rem' }}>Telefon Numarası (SMS Alarmları)</label>
                          <input 
                            type="text" 
                            className="input-field" 
                            placeholder="+90 5xx xxx xx xx"
                            style={{ height: '36px', fontSize: '0.8rem' }}
                            value={premiumAlertConfig.sms}
                            onChange={(e) => setPremiumAlertConfig({ ...premiumAlertConfig, sms: e.target.value })}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '0.25rem' }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={premiumAlertConfig.volatilityAlert} 
                            onChange={(e) => setPremiumAlertConfig({ ...premiumAlertConfig, volatilityAlert: e.target.checked })}
                            style={{ accentColor: 'var(--accent-gold)' }}
                          />
                          Volatilite Değişim Alarmı (Aylık %+3 Değişim)
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={premiumAlertConfig.drawdownAlert} 
                            onChange={(e) => setPremiumAlertConfig({ ...premiumAlertConfig, drawdownAlert: e.target.checked })}
                            style={{ accentColor: 'var(--accent-gold)' }}
                          />
                          Maksimum Düşüş Alarmı (Tepe Değerden %5 Kayıp)
                        </label>
                      </div>

                      <button 
                        type="button" 
                        className="btn btn-accent" 
                        style={{ height: '36px', padding: '0 16px', fontSize: '0.8rem', alignSelf: 'flex-start', margin: 0 }}
                        onClick={() => {
                          if (!premiumAlertConfig.email && !premiumAlertConfig.sms) {
                            alert("Lütfen e-posta veya telefon numarası giriniz.");
                            return;
                          }
                          alert(`Premium Alarm Sistemi Aktive Edildi!\nE-posta: ${premiumAlertConfig.email || 'Kaydedilmedi'}\nTelefon: ${premiumAlertConfig.sms || 'Kaydedilmedi'}`);
                        }}
                      >
                        🔔 Alarmları Kaydet
                      </button>
                    </div>
                  </div>

                  {/* PDF Risk Report & Download Card */}
                  <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>İndirilebilir PDF Risk Karnesi</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                        Fon dağılımlarını, stres testlerini, korelasyon analizlerini ve AI denetim raporlarını içeren kurumsal kalitede PDF Karnesini bilgisayarınıza indirin.
                      </p>
                    </div>
                    
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      style={{ padding: '0.75rem 1.25rem', fontSize: '0.8rem', height: '40px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}
                      onClick={() => {
                        alert("PDF Raporu Oluşturuluyor...\nBu işlem premium üyelerimiz için ücretsizdir. (Simüle rapor indiriliyor)");
                        
                        // Simple file generation trigger
                        const element = document.createElement("a");
                        const file = new Blob([
                          `ÇALIŞKAN BORSA PORTFÖY RİSK ANALİZ RAPORU\n`,
                          `Tarih: ${new Date().toLocaleDateString()}\n`,
                          `Genel Sağlık Skoru: ${analysisResult.healthScores?.overallScore || 75}/100\n`,
                          `Risk Seviyesi: ${riskLevel}/10\n`,
                          `Yıllık Getiri: %${analysisResult.backtest?.totalReturn || 72}\n`,
                          `Ağırlıklı Volatilite: %${analysisResult.advancedRiskMetrics?.volatility || 22.4}\n`,
                          `Korelasyon Skoru: ${analysisResult.advancedRiskMetrics?.correlation || 0.45}\n`,
                          `-----------------------------------------------------\n`,
                          `Portföy Dağılımı:\n`,
                          analysisResult.portfolio.map(p => `- ${p.code}: %${p.weight}`).join('\n'),
                          `\n-----------------------------------------------------\n`,
                          `Bilgilendirme amaçlıdır. Yatırım tavsiyesi değildir.`
                        ], {type: 'text/plain'});
                        element.href = URL.createObjectURL(file);
                        element.download = `Caliskan_Borsa_Portfolio_Risk_Report.txt`;
                        document.body.appendChild(element);
                        element.click();
                        document.body.removeChild(element);
                      }}
                    >
                      <span>📥 PDF Karnesi İndir (Simüle)</span>
                    </button>
                  </div>

                  {/* Premium subscription Pricing card */}
                  <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(197, 160, 89, 0.03)', border: '1px solid rgba(197, 160, 89, 0.2)', display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 2, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span className="badge-info" style={{ color: 'var(--accent-gold)', borderColor: 'rgba(197,160,89,0.3)', background: 'rgba(197,160,89,0.05)', alignSelf: 'flex-start', fontSize: '0.65rem', fontWeight: 700 }}>PREMIUM AYRICALIĞI</span>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Çalışkan Borsa Pro Aboneliği</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                        Sınırsız portföy takibi, tam teşekküllü Monte Carlo simülasyonları, 12 farklı stres testi kriz senaryosu, otomatik haftalık AI Denetim Raporları ve WhatsApp Risk Alarmları ile proaktif portföy yönetimi yapın.
                      </p>
                    </div>

                    <div style={{ flex: 1, minWidth: '150px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', textAlign: 'center', borderLeft: '1px dashed rgba(197,160,89,0.2)', paddingLeft: '1.25rem' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent-gold)' }}>299 TL <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ ay</span></span>
                      <button 
                        type="button" 
                        className="btn btn-accent" 
                        style={{ width: '100%', height: '34px', fontSize: '0.75rem', margin: 0 }}
                        onClick={() => alert("Çalışkan Borsa Premium Aboneliği şu anda simülasyon aşamasındadır. Gösterdiğiniz ilgi için teşekkür ederiz!")}
                      >
                        Premium Üye Ol
                      </button>
                      <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Yıllık alımlarda %30 indirim</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Taktiksel Optimizasyon Quick Banner */}
              {activeResultTab !== 'tab-premium' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed var(--border-glass)', paddingTop: '1.25rem', marginTop: '0.75rem' }}>
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <h4 style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>💡</span> Piyasa Rejimi Taktiksel Rebalans Önerisi
                    </h4>
                    <p style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      Ajanlarımız, portföyünüzün piyasa rejimi uyum puanını <strong>{analysisResult.optimization.current_portfolio_score}/100</strong> olarak belirlemiştir. Optimum rebalans ile bu uyumu artırabilirsiniz.
                    </p>
                  </div>
                  
                  <button 
                    className="btn btn-accent" 
                    style={{ fontSize: '0.775rem', padding: '0px 14px', height: '34px', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}
                    onClick={handleApplyOptimization}
                  >
                    <Zap size={12} style={{ fill: 'currentColor' }} /> Optimize Ağırlıkları Uygula (Premium)
                  </button>
                </div>
              )}
              </div> {/* results-content-area close */}
            </div>
          )}

      {/* SEO Information & FAQ Section */}
      <footer className="glass-card seo-footer">
        <div className="seo-footer-grid">
          
          <div className="seo-footer-col">
            <h2>Çalışkan Borsa Yatırım Teknolojisi</h2>
            <p>
              Çalışkan Borsa; modern portföy teorisi, yapay zeka ajanları ve makroekonomik rejim analizi entegrasyonu ile yatırım süreçlerini optimize eder. Türkiye Elektronik Fon Dağıtım Platformu (TEFAS) ve KAP duyurularını gerçek zamanlı tarayarak, risk toleransınız ve vadelerinize en uyumlu fon kombinasyonlarını dinamik olarak modeller.
            </p>
            <p>
              Veri analitiği, risk modelleme, holding ve varlık kesişimleri gibi kritik süreçlerin tamamı otonom yapay zeka ajanlarımız tarafından yönetilmektedir. Yatırımlarınızda maksimum risk kontrolü ve optimum getiri dengesi kurmak için geliştirilmiştir.
            </p>
          </div>

          <div className="seo-footer-col">
            <h2>Sıkça Sorulan Sorular (FAQ)</h2>
            
            <div className="seo-faq-item">
              <h3>Çalışkan Borsa nedir?</h3>
              <p>
                Yatırımcıların TEFAS fonları ve KAP verilerini tarayarak kendi belirledikleri risk seviyeleri, yatırım amacı ve vadelerine en uygun fon dağılımlarını bulmalarını sağlayan çok ajanlı yapay zeka finans asistanıdır.
              </p>
            </div>

            <div className="seo-faq-item">
              <h3>Yatırım fonu portföyü nasıl optimize edilir?</h3>
              <p>
                Sistemimize risk toleransı (1-10) değerinizi girdikten sonra, otonom veri, risk ve rejim ajanlarımız TEFAS veritabanı üzerinden taktiksel rebalans ağırlıklarını ve hisse kesişimlerini hesaplayarak dağılımı optimize eder.
              </p>
            </div>

            <div className="seo-faq-item">
              <h3>TEFAS fon verileri güncel midir?</h3>
              <p>
                Evet, Çalışkan Borsa, veri analisti ajanlarımız aracılığıyla en popüler ve işlem hacmi yüksek TEFAS yatırım fonlarının varlık dağılımlarını ve risk metriklerini düzenli olarak günceller ve analiz eder.
              </p>
            </div>
          </div>

        </div>

        <div className="seo-footer-bottom" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{ width: '100%', fontSize: '0.675rem', color: 'rgba(255, 255, 255, 0.4)', lineHeight: 1.4, textAlign: 'justify', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.75rem' }}>
            <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>YASAL UYARI: </span>
            Burada yer alan yatırım bilgi, yorum ve tavsiyeleri yatırım danışmanlığı kapsamında değildir. Yatırım danışmanlığı hizmeti; aracı kurumlar, portföy yönetim şirketleri, mevduat kabul etmeyen bankalar ile müşteri arasında imzalanacak yatırım danışmanlığı sözleşmesi çerçevesinde sunulmaktadır. Burada yer alan yorum ve tavsiyeler, yorum ve tavsiyede bulunanların kişisel görüşlerine dayanmaktadır. Bu görüşler mali durumunuz ile risk ve getiri tercihlerinize uygun olmayabilir. Bu nedenle, sadece burada yer alan bilgilere dayanılarak yatırım kararı verilmesi beklentilerinize uygun sonuçlar doğurmayabilir.
          </div>
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', fontSize: '0.75rem' }}>
            <span>© 2026 Çalışkan Borsa. Tüm hakları saklıdır. Bu platform yatırım tavsiyesi sunmaz; yalnızca eğitim ve analiz amaçlıdır.</span>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <a href="https://portfolio-ai.com.tr/" target="_blank" rel="noopener noreferrer">Ana Sayfa</a>
              <a href="https://portfolio-ai.com.tr/sitemap.xml" target="_blank" rel="noopener noreferrer">Sitemap</a>
              <a 
                href="https://x.com/caliskanborsa6" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <svg 
                  viewBox="0 0 24 24" 
                  width="14" 
                  height="14" 
                  fill="currentColor"
                  style={{ display: 'inline-block', verticalAlign: 'middle' }}
                >
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg> Twitter (X)
              </a>
              <button 
                onClick={() => setShowKvkkModal(true)} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--accent-gold)', 
                  cursor: 'pointer', 
                  fontFamily: 'inherit', 
                  fontSize: 'inherit',
                  padding: 0 
                }}
              >
                KVKK Aydınlatma Metni
              </button>
            </div>
          </div>
        </div>
      </footer>

      {showKvkkModal && (
        <div className="modal-overlay" onClick={() => setShowKvkkModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>KVKK Aydınlatma Metni</h2>
              <button className="modal-close" onClick={() => setShowKvkkModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p><strong>Çalışkan Borsa Kişisel Verilerin Korunması ve Gizlilik Bildirimi</strong></p>
              <p>6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında, bu web uygulaması üzerinde gerçekleştirdiğiniz işlemlerin veri gizliliğine ilişkin açıklamalar aşağıda yer almaktadır:</p>
              
              <h3>1. Veri Sorumlusu</h3>
              <p>Bu uygulama bir simülasyon ve yapay zeka analiz aracı olup, kişisel veri toplayan veya işleyen herhangi bir merkezi veri tabanına sahip değildir.</p>
              
              <h3>2. İşlenen Veriler ve Amaçları</h3>
              <p>Uygulamayı kullanırken girdiğiniz parametreler (Risk toleransı, yatırım amacı, vade tercihleri ve fon kodları/ağırlıkları) tamamen anonim niteliktedir. Bu veriler hiçbir şekilde kimlik bilgilerinizle (isim, soyisim, e-posta adresi, telefon numarası vb.) ilişkilendirilmez.</p>
              <p>Girdiğiniz finansal simülasyon parametreleri, yalnızca yapay zeka ajanları vasıtasıyla size özel portföy önerileri ve rebalans analizleri üretmek amacıyla anlık olarak işlenir ve saklanmaz.</p>
              
              <h3>3. Verilerin Aktarılması</h3>
              <p>Finansal simülasyon tercihleriniz analiz edilmek üzere Google Gemini API sistemine anlık olarak aktarılır. Bu aktarım sırasında kimliğinizi doğrudan veya dolaylı olarak belirleyecek hiçbir kişisel veri (ad, e-posta, IP vb.) Gemini sunucularına iletelmez. Bu nedenle KVKK Madde 9 kapsamında sınır ötesi kişisel veri aktarımı söz konusu değildir.</p>
              
              <h3>4. Haklarınız</h3>
              <p>Uygulama hiçbir kişisel veriyi kaydetmediği için, KVKK Madde 11 kapsamında hak talebine konu olabilecek bir kişisel veri arşivimiz bulunmamaktadır. Her türlü sorunuz için bizimle iletişime geçebilirsiniz.</p>
            </div>
          </div>
        </div>
      )}

      {showPremiumModal && (
        <div className="modal-overlay" onClick={() => setShowPremiumModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{
            background: 'linear-gradient(135deg, #0a0a0a 0%, #171717 100%)',
            border: '1px solid rgba(197, 160, 89, 0.35)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.85), 0 0 30px rgba(197, 160, 89, 0.15)',
            maxWidth: '480px'
          }}>
            <div className="modal-header" style={{ borderBottom: '1px dashed rgba(197, 160, 89, 0.25)', paddingBottom: '1rem' }}>
              <h2 style={{ color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: 800 }}>
                <Zap style={{ fill: 'var(--accent-gold)', color: 'var(--accent-gold)' }} size={20} />
                Çalışkan Borsa Premium
              </h2>
              <button className="modal-close" onClick={() => setShowPremiumModal(false)} style={{ color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                background: 'rgba(197, 160, 89, 0.08)',
                borderRadius: '50%',
                width: '64px',
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                border: '1px solid rgba(197, 160, 89, 0.25)',
                boxShadow: '0 0 15px rgba(197, 160, 89, 0.1)'
              }}>
                <TrendingUp size={32} style={{ color: 'var(--accent-gold)' }} />
              </div>
              
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Optimum Ağırlıkları Uygulayın</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Piyasa rejimine göre optimize edilmiş taktiksel rebalans ağırlıklarını tek tıkla portföyünüze uygulamak ve portföyünüzün uyum puanını yükseltmek <strong>Premium</strong> üyeliğe özeldir.
                </p>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--accent-gold)' }}>✔</span> <span>Tek Tıkla Taktiksel Rebalans Uygulama</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--accent-gold)' }}>✔</span> <span>12 Farklı Kriz Senaryosu & Stres Testi</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--accent-gold)' }}>✔</span> <span>WhatsApp & SMS Anlık Risk Alarmları</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '0.5rem' }}>
                <button 
                  className="btn btn-accent" 
                  style={{ width: '100%', height: '42px', fontSize: '0.85rem', fontWeight: 700, margin: 0, boxShadow: '0 4px 12px rgba(197, 160, 89, 0.2)' }}
                  onClick={() => {
                    setShowPremiumModal(false);
                    alert("Çalışkan Borsa Premium Aboneliği şu anda simülasyon aşamasındadır. Gösterdiğiniz ilgi için teşekkür ederiz!");
                  }}
                >
                  Premium'a Yükselt (299 TL / ay)
                </button>
                <button 
                  className="btn" 
                  style={{ width: '100%', height: '36px', fontSize: '0.8rem', background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)', margin: 0 }}
                  onClick={() => setShowPremiumModal(false)}
                >
                  Daha Sonra
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}