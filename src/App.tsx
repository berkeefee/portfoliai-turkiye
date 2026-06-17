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
  Link
} from 'lucide-react';
import { 
  runLocalAnalysis, 
  generateSimulationAdvisorReport,
  TURKEY_MACRO_SIGNALS
} from './engine/agentEngine';
import type { 
  AgentLog, 
  AgentSystemResult,
  AgentPortfolioItem
} from './engine/agentEngine';

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

export default function App() {
  // -------------------------------------------------------------
  // State Variables
  // -------------------------------------------------------------
  
  // New User Risk Profile States
  const [riskLevel, setRiskLevel] = useState<number>(5); // 1-10
  const [investmentGoal, setInvestmentGoal] = useState<'preservation' | 'balanced' | 'growth' | 'income'>('balanced');
  const [horizon, setHorizon] = useState<'short' | 'medium' | 'long'>('medium');
  
  // Custom Portfolio Mode States
  const [activeMode, setActiveMode] = useState<'build' | 'analyze'>('build');
  const [customPortfolio, setCustomPortfolio] = useState<AgentPortfolioItem[]>([
    { code: 'MAC', weight: 40 },
    { code: 'TMV', weight: 30 },
    { code: 'AFT', weight: 30 }
  ]);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeAgentIndex, setActiveAgentIndex] = useState<number>(-1); // -1 = idle
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AgentSystemResult | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [showKvkkModal, setShowKvkkModal] = useState<boolean>(false);
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

  // Apply rebalancing optimization
  const handleApplyOptimization = () => {
    if (analysisResult && analysisResult.optimization.optimized_portfolio.length > 0) {
      // Create new weights
      const optimizedItems = analysisResult.optimization.optimized_portfolio.map(p => ({
        code: p.code,
        weight: p.weight
      }));

      // Simulate load
      setAnalysisResult(prev => {
        if (!prev) return null;
        return {
          ...prev,
          portfolio: optimizedItems,
          optimization: {
            ...prev.optimization,
            changes_summary: ["Önerilen rebalans portföye uygulandı. Varlık dağılımları optimize edildi."]
          }
        };
      });
    }
  };

  // Run Orchestrator Pipeline
  const startOrchestration = async (isLiveMode: boolean) => {
    // Blur active element to prevent browser focus tracking from scrolling on layout shift
    if (document.activeElement && typeof (document.activeElement as any).blur === 'function') {
      (document.activeElement as any).blur();
    }

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

    const modeText = activeMode === 'analyze' 
      ? `Mevcut Kendi Portföyü Analizi Başlatıldı:\n- Girilen Portföy: ${JSON.stringify(customPortfolio)}\n`
      : 'Yeni AI Portföy Yapılandırma Başlatıldı\n';

    const initialLogs: AgentLog[] = [
      {
        agentName: 'Orchestrator Agent',
        role: 'Master Controller',
        status: 'running',
        promptSent: `${modeText}- Hedef Risk Seviyesi: ${riskLevel}/10\n- Yatırım Amacı: ${investmentGoal}\n- Yatırım Vadesi: ${horizon}\n- Makro Göstergeler: ${JSON.stringify(TURKEY_MACRO_SIGNALS, null, 2)}`,
        outputReceived: activeMode === 'analyze'
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
        riskLevel,
        investmentGoal,
        horizon,
        TURKEY_MACRO_SIGNALS,
        activeMode === 'analyze' ? customPortfolio : undefined
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
          promptSent: `Oluşturulan fon portföyünün risk oranları, volatilite seviyesi ve drawdown olasılığı, hedef risk seviyesi (${riskLevel}) ile karşılaştırılıyor...`,
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
      setActiveAgentIndex(6); // Advisor Agent active
      const finalReportText = generateSimulationAdvisorReport(localResult, riskLevel, investmentGoal, horizon);
      setLogs(prev => [
        ...prev,
        {
          agentName: 'Portfolio Advisor Agent',
          role: 'Final Explainer (User Facing)',
          status: 'success',
          promptSent: 'Müşteri profiline özel nihai tavsiye ve gerekçe raporu Türkçe dilinde derleniyor...',
          outputReceived: finalReportText,
          timestamp: new Date().toISOString()
        }
      ]);

      setAnalysisResult({
        ...localResult,
        logs: [],
        finalAdvisorReport: finalReportText
      });
      setIsRunning(false);
      setActiveAgentIndex(-1);
    } else {
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            riskLevel,
            investmentGoal,
            horizon,
            customPortfolio: activeMode === 'analyze' ? customPortfolio : undefined
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
                const newLog = data.log;
                setLogs(prev => {
                  const existingIndex = prev.findIndex(l => l.agentName === newLog.agentName);
                  if (existingIndex > -1) {
                    const updated = [...prev];
                    updated[existingIndex] = newLog;
                    return updated;
                  }
                  return [...prev, newLog];
                });

                if (newLog.agentName.includes('Data')) setActiveAgentIndex(1);
                else if (newLog.agentName.includes('Risk')) setActiveAgentIndex(2);
                else if (newLog.agentName.includes('Overlap')) setActiveAgentIndex(3);
                else if (newLog.agentName.includes('Regime')) setActiveAgentIndex(4);
                else if (newLog.agentName.includes('Optimization') || newLog.agentName.includes('Optimizer')) setActiveAgentIndex(5);
                else if (newLog.agentName.includes('Advisor')) setActiveAgentIndex(6);
              } else if (data.type === 'result') {
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
  const renderAdvisorReport = (markdownText: string) => {
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
          <div className="advisor-report-body" style={{ color: '#cbd5e1', fontSize: '0.925rem' }}>
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
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
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
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-red)' }}>%37</span>
                    <span className="badge-info signal-card-badge" style={{ padding: '1px 4px', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', background: 'rgba(239, 68, 68, 0.05)' }}>YÜKSEK</span>
                  </div>
                  <span className="tooltip-text">TCMB Politika Faizi: %37 seviyesinde olup sıkı para politikası duruşu korunmaktadır.</span>
                </div>

                <div className="glass-card tooltip-container" style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1rem' }}>📈</span>
                    <span className="signal-card-title">Enflasyon Trendi</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-green)' }}>%32.61</span>
                    <span className="badge-info signal-card-badge" style={{ padding: '1px 4px', borderColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', background: 'rgba(16, 185, 129, 0.05)' }}>DÜŞÜŞTE</span>
                  </div>
                  <span className="tooltip-text">Yıllık enflasyonda sıkılaşma ve baz etkisiyle düşüş eğilimi devam etmektedir.</span>
                </div>

                <div className="glass-card tooltip-container" style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1rem' }}>📊</span>
                    <span className="signal-card-title">BIST-100 Momentum</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>13,912</span>
                    <span className="badge-info signal-card-badge" style={{ padding: '1px 4px', borderColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)' }}>YATAY</span>
                  </div>
                  <span className="tooltip-text">BIST-100 endeksi yatay seyretmekte olup, seçici hisse bazlı hareketler ön plana çıkmaktadır.</span>
                </div>

                <div className="glass-card tooltip-container" style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1rem' }}>💸</span>
                    <span className="signal-card-title">Net Fon Akışları</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Dengeli</span>
                    <span className="badge-info signal-card-badge" style={{ padding: '1px 4px', borderColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)' }}>STABİL</span>
                  </div>
                  <span className="tooltip-text">Para piyasası fonları ve yabancı tematik fonlara seçici girişler olmakla beraber genel fon akışları stabildir.</span>
                </div>
              </div>
            </div>

            {(() => {
              const totalWeight = customPortfolio.reduce((sum, item) => sum + item.weight, 0);
              const isDisabled = isRunning || (activeMode === 'analyze' && totalWeight !== 100);
              return (
                <div className="action-btn-container" style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
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
                    {activeMode === 'analyze' ? 'Gemini Canlı Analiz Et' : 'Gemini Canlı Portföy Kur'}
                  </button>
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

          {/* Results dashboard tab layout */}
          {analysisResult ? (
            <div ref={resultsRef} className="glass-card" style={{ flex: 1 }}>
              {/* TAB 1: Advisor markdown report */}
              <div 
                onClick={() => toggleSection('report')}
                style={{ 
                  cursor: 'pointer', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  color: 'var(--accent-gold)', 
                  fontSize: '0.95rem', 
                  fontWeight: 700,
                  padding: '0.75rem 0',
                  borderBottom: expandedSections.report ? '1px solid var(--border-glass)' : 'none',
                  transition: 'all 0.2s ease',
                  userSelect: 'none',
                  marginBottom: '1rem'
                }}
                className="accordion-header"
              >
                <span>Analiz Gerekçesi & Taktiksel AI Raporu</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {expandedSections.report ? '▲ Kapat' : '▼ Detayları Aç'}
                </span>
              </div>

              {expandedSections.report && (
                <div className="advisor-report" style={{ marginBottom: '2.5rem' }}>
                  {renderAdvisorReport(analysisResult.finalAdvisorReport)}
                </div>
              )}

              {/* TAB 2: Portfolio Details & Allocation */}
              <div style={{ marginTop: '1.5rem', borderTop: '1px dashed var(--border-glass)', paddingTop: '1.5rem' }}>
                <div 
                  onClick={() => toggleSection('portfolio')}
                  style={{ 
                    cursor: 'pointer', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    color: 'var(--accent-gold)', 
                    fontSize: '0.95rem', 
                    fontWeight: 700,
                    padding: '0.75rem 0',
                    borderBottom: expandedSections.portfolio ? '1px solid var(--border-glass)' : 'none',
                    transition: 'all 0.2s ease',
                    userSelect: 'none',
                    marginBottom: '1rem'
                  }}
                  className="accordion-header"
                >
                  <span>Risk Seviyenize Özel Kurulan Fon Portföyü</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {expandedSections.portfolio ? '▲ Kapat' : '▼ Detayları Aç'}
                  </span>
                </div>
                
                {expandedSections.portfolio && (
                  <div>
                  
                  <div className="fund-list" style={{ maxHeight: 'none', overflowY: 'visible', marginBottom: '1.5rem' }}>
                    {analysisResult.portfolio.map((item, idx) => {
                      const fDetails = PRESET_FUNDS.find(x => x.code === item.code);
                      const fData = analysisResult.data.find(x => x.fund_code === item.code);
                      return (
                        <div key={idx} className="glass-card mb-2" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                          <div className="flex-between fund-item-header">
                            <div className="fund-item-code-name">
                              <span className="fund-code">{item.code}</span>
                              <span className="fund-name">
                                {fDetails ? fDetails.name : `${item.code} Serbest Fon`}
                              </span>
                            </div>
                            <div className="fund-weight">%{item.weight}</div>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="rebalance-bar-bg mt-1">
                            <div className="rebalance-bar-fill" style={{ width: `${item.weight}%`, backgroundColor: 'var(--accent-gold)' }} />
                          </div>
                          
                          {fData && (
                            <div className="flex-between mt-1 fund-item-subtext" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              <span>Kategori: {fData.category}</span>
                              <span>TEFAS Risk Değeri: {fData.risk_metrics.risk_value || 5}/7</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid-2">
                    {/* Volatility score Gauge */}
                    <div className="gauge-container glass-card" style={{ background: 'rgba(0,0,0,0.1)' }}>
                      <svg className="gauge-svg" viewBox="0 0 220 120">
                        <path className="gauge-bg" d="M20,110 A90,90 0 0,1 200,110" />
                        <path 
                           className="gauge-fill" 
                          d="M20,110 A90,90 0 0,1 200,110" 
                          style={{
                            strokeDasharray: `${(analysisResult.risk.risk_score / 100) * 283} 283`
                          }}
                        />
                      </svg>
                      <div className="gauge-value">{analysisResult.risk.risk_score}</div>
                      <div className="gauge-label" style={{ color: currentRisk.color }}>
                        Portföy Volatilite Derecesi
                      </div>
                    </div>

                    {/* Volatility comments */}
                    <div className="glass-card" style={{ background: 'rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.75rem' }}>
                      <div className="flex-between metric-row">
                        <span className="metric-label-text">Maksimum Kayıp Tahmini:</span>
                        <span className="metric-value-text text-danger">{analysisResult.risk.max_drawdown_estimate}</span>
                      </div>
                      <div className="flex-between metric-row">
                        <span className="metric-label-text">Varlık Konsantrasyonu:</span>
                        <span className="metric-value-text">{analysisResult.risk.concentration_risk}</span>
                      </div>
                      <div className="flex-between metric-row">
                        <span className="metric-label-text">Aktif Borsa Rejimi:</span>
                        <span className="badge-info metric-badge">
                          {(() => {
                            const rMap: Record<string, string> = {
                              'risk-on': 'BÜYÜME ODAKLI (RISK-ON)',
                              'risk-off': 'GÜVENLİ LİMAN (RISK-OFF)',
                              'neutral': 'YATAY / NÖTR',
                              'tightening': 'SIKILAŞMA (FAİZ ARTIŞI)',
                              'easing': 'GEVŞEME (FAİZ İNDİRİMİ)'
                            };
                            return rMap[analysisResult.regime.regime] || analysisResult.regime.regime.toUpperCase();
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Consolidated Asset Allocation */}
                  <div className="glass-card mt-3" style={{ background: 'rgba(0,0,0,0.1)' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      Konsolide Varlık Sınıfı Dağılımı
                    </h3>
                    
                    <div className="donut-container">
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {analysisResult.data.reduce((acc: {name: string, val: number}[], fund) => {
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
                        }, []).sort((a,b) => b.val - a.val).map((asset, i) => {
                          const colors = ['var(--accent-gold)', 'var(--accent-gold-light)', 'var(--accent-green)', '#f97316', 'var(--accent-blue)'];
                          const color = colors[i % colors.length];
                          return (
                            <div key={i} className="rebalance-bar-row">
                              <div className="rebalance-bar-label">
                                <span>{asset.name}</span>
                                <span>%{asset.val.toFixed(1)}</span>
                              </div>
                              <div className="rebalance-bar-bg">
                                <div className="rebalance-bar-fill" style={{ width: `${asset.val}%`, backgroundColor: color }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

              {/* TAB 3: Overlap Matrix Table */}
              <div style={{ marginTop: '1.5rem', borderTop: '1px dashed var(--border-glass)', paddingTop: '1.5rem' }}>
                <div 
                  onClick={() => toggleSection('summary')}
                  style={{ 
                    cursor: 'pointer', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    color: 'var(--accent-gold)', 
                    fontSize: '0.95rem', 
                    fontWeight: 700,
                    padding: '0.75rem 0',
                    borderBottom: expandedSections.summary ? '1px solid var(--border-glass)' : 'none',
                    transition: 'all 0.2s ease',
                    userSelect: 'none',
                    marginBottom: '1rem'
                  }}
                  className="accordion-header"
                >
                  <span>Portföy Özeti & Çeşitlendirme Analizi</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {expandedSections.summary ? '▲ Kapat' : '▼ Detayları Aç'}
                  </span>
                </div>
                
                {expandedSections.summary && (
                  <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                    Efektif Çeşitlendirme Skoru: 
                    <span style={{ 
                      color: analysisResult.overlap.effective_diversification_score > 60 ? '#10b981' : '#ef4444',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      marginLeft: '8px'
                    }}>
                      {analysisResult.overlap.effective_diversification_score}/100
                    </span>
                  </h3>
                  
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Aşağıdaki matris, seçilen fonların alt portföylerindeki ortak varlıkların kesişim derecesini gösterir. Düşük oranlar yüksek çeşitlendirme gücünü temsil eder.
                  </p>

                  <div className="overlap-matrix">
                    <div className="matrix-row">
                      <div className="matrix-cell matrix-label" style={{ background: 'transparent' }}>Fon Kodu</div>
                      {analysisResult.portfolio.map(p => (
                        <div key={p.code} className="matrix-cell matrix-label">{p.code}</div>
                      ))}
                    </div>
                    {analysisResult.portfolio.map(p1 => (
                      <div key={p1.code} className="matrix-row">
                        <div className="matrix-cell matrix-label">{p1.code}</div>
                        {analysisResult.portfolio.map(p2 => {
                          const val = analysisResult.overlap.fund_overlap_matrix[p1.code]?.[p2.code] || 0;
                          return (
                            <div 
                              key={p2.code} 
                              className="matrix-cell tooltip-container" 
                              style={{ 
                                backgroundColor: getOverlapBgColor(val),
                                color: val > 60 ? '#fff' : 'var(--text-primary)'
                              }}
                            >
                              %{val}
                              <span className="tooltip-text">
                                {p1.code} - {p2.code} ortaklık oranı: %{val}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  <div className="glass-card mt-2" style={{ background: 'rgba(0,0,0,0.1)' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--accent-gold)' }}>
                      Portföyde En Çok Ağırlık Kaplayan Ortak Varlıklar:
                    </h4>
                    <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                      {analysisResult.overlap.top_common_assets.map((asset, i) => (
                        <li key={i}>{asset}</li>
                      ))}
                      {analysisResult.overlap.top_common_assets.length === 0 && (
                        <li>Anlamlı bir ortak hisse kesişimi tespit edilmedi. Çeşitlendirme son derece başarılı.</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>

              {/* TAB 4: Tactical rebalancer optimization */}
              <div style={{ marginTop: '1.5rem', borderTop: '1px dashed var(--border-glass)', paddingTop: '1.5rem' }}>
                <div 
                  onClick={() => toggleSection('rebalance')}
                  style={{ 
                    cursor: 'pointer', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    color: 'var(--accent-gold)', 
                    fontSize: '0.95rem', 
                    fontWeight: 700,
                    padding: '0.75rem 0',
                    borderBottom: expandedSections.rebalance ? '1px solid var(--border-glass)' : 'none',
                    transition: 'all 0.2s ease',
                    userSelect: 'none',
                    marginBottom: '1rem'
                  }}
                  className="accordion-header"
                >
                  <span>Piyasa Koşullarına Göre Ağırlık Dengesi</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {expandedSections.rebalance ? '▲ Kapat' : '▼ Detayları Aç'}
                  </span>
                </div>
                
                {expandedSections.rebalance && (
                  <div>
                  <div className="flex-between mb-2 rebalance-title-row">
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                      Piyasa Koşullarına Göre Ağırlık Dengesi
                    </h3>
                    <div className="rebalance-status-badges" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge-info" style={{ color: 'var(--accent-red)' }}>Mevcut Uyum: {analysisResult.optimization.current_portfolio_score}/100</span>
                      <span className="rebalance-arrow" style={{ fontSize: '1.1rem', fontWeight: 800 }}>➡️</span>
                      <span className="badge-info" style={{ color: 'var(--accent-green)', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                        Optimize Uyum: ~{Math.min(analysisResult.optimization.current_portfolio_score + 18, 98)}/100
                      </span>
                    </div>
                  </div>

                  <div className="glass-card mb-3" style={{ background: 'rgba(0,0,0,0.1)', border: '1px solid var(--border-glass)' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>
                      Optimizasyon Önerisi Açıklaması:
                    </h4>
                    <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                      {analysisResult.optimization.changes_summary.map((change, i) => (
                        <li key={i} style={{ marginBottom: '6px' }}>{change}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rebalance-grid">
                    <div className="rebalance-col">
                      <div className="rebalance-header">Mevcut Kurulan Ağırlıklar</div>
                      {analysisResult.portfolio.map(p => (
                        <div key={p.code} className="rebalance-bar-row">
                          <div className="rebalance-bar-label">
                            <span>{p.code}</span>
                            <span>%{p.weight}</span>
                          </div>
                          <div className="rebalance-bar-bg">
                            <div className="rebalance-bar-fill" style={{ width: `${p.weight}%`, backgroundColor: 'var(--accent-red)' }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rebalance-col">
                      <div className="rebalance-header" style={{ color: 'var(--accent-gold)' }}>Taktiksel Optimize Edilen Ağırlıklar</div>
                      {analysisResult.optimization.optimized_portfolio.map(p => (
                        <div key={p.code} className="rebalance-bar-row">
                          <div className="rebalance-bar-label">
                            <span>{p.code}</span>
                            <span>%{p.weight}</span>
                          </div>
                          <div className="rebalance-bar-bg">
                            <div className="rebalance-bar-fill" style={{ width: `${p.weight}%`, backgroundColor: 'var(--accent-gold)' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', marginTop: '1.5rem', padding: '0.85rem' }}
                    onClick={handleApplyOptimization}
                  >
                    <RefreshCw size={16} /> Optimize Ağırlıkları Uygula ve Görselleştir
                  </button>
                </div>
              )}
            </div>
          </div>
          ) : isRunning ? (
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
          ) : null}
        </div>

      </div>

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

        <div className="seo-footer-bottom">
          <span>© 2026 Çalışkan Borsa. Tüm hakları saklıdır. Bu platform yatırım tavsiyesi sunmaz; yalnızca eğitim ve analiz amaçlıdır.</span>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <a href="https://portfolio-ai.com.tr/">Ana Sayfa</a>
            <a href="https://portfolio-ai.com.tr/sitemap.xml">Sitemap</a>
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
              <p>Finansal simülasyon tercihleriniz analiz edilmek üzere Google Gemini API sistemine anlık olarak aktarılır. Bu aktarım sırasında kimliğinizi doğrudan veya dolaylı olarak belirleyecek hiçbir kişisel veri (ad, e-posta, IP vb.) Gemini sunucularına iletilmez. Bu nedenle KVKK Madde 9 kapsamında sınır ötesi kişisel veri aktarımı söz konusu değildir.</p>
              
              <h3>4. Haklarınız</h3>
              <p>Uygulama hiçbir kişisel veriyi kaydetmediği için, KVKK Madde 11 kapsamında hak talebine konu olabilecek bir kişisel veri arşivimiz bulunmamaktadır. Her türlü sorunuz için bizimle iletişime geçebilirsiniz.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
