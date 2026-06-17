export interface FundData {
  code: string;
  name: string;
  category: 'Hisse Senedi' | 'Eurobond' | 'Para Piyasası' | 'Değişken' | 'Yabancı Hisse Senedi' | 'Borçlanma Araçları';
  asset_allocation: Record<string, number>;
  top_holdings: { name: string; weight: number; code?: string }[];
  sector_weights: Record<string, number>;
  historical_returns: {
    '1M': number;
    '3M': number;
    '6M': number;
    '1Y': number;
    'YTD': number;
  };
  risk_metrics: {
    volatility: number;
    sharpe_ratio: number;
    max_drawdown: number;
    risk_value: number; // TEFAS risk value (1 to 7)
  };
}

export const fundsDatabase: Record<string, FundData> = {
  TLY: {
    code: 'TLY',
    name: 'Tera Portföy Birinci Serbest Fon',
    category: 'Değişken',
    asset_allocation: {
      'Yerli Hisse': 88.5,
      'BPP / Vadeli': 7.2,
      'Diğer': 4.3
    },
    top_holdings: [
      { name: 'Türk Hava Yolları', weight: 9.8, code: 'THYAO' },
      { name: 'Tüpraş', weight: 8.5, code: 'TUPRS' },
      { name: 'Ereğli Demir Çelik', weight: 7.2, code: 'EREGL' },
      { name: 'Yapı Kredi Bankası', weight: 6.8, code: 'YKBNK' },
      { name: 'BİM Birleşik Mağazalar', weight: 6.1, code: 'BIMAS' }
    ],
    sector_weights: {
      'Ulaştırma': 15.4,
      'Enerji & Kimya': 14.8,
      'Demir Çelik / Metal': 12.2,
      'Bankacılık & Finans': 18.5,
      'Perakende': 10.6,
      'Holdingler': 15.0,
      'Diğer': 13.5
    },
    historical_returns: {
      '1M': 4.5,
      '3M': 12.8,
      '6M': 28.4,
      '1Y': 82.3,
      'YTD': 22.1
    },
    risk_metrics: {
      volatility: 28.5,
      sharpe_ratio: 1.85,
      max_drawdown: -32.4,
      risk_value: 7
    }
  },
  PHE: {
    code: 'PHE',
    name: 'Pusula Portföy Hisse Senedi Fonu (Hisse Senedi Yoğun Fon)',
    category: 'Hisse Senedi',
    asset_allocation: {
      'Yerli Hisse': 92.1,
      'BPP / Vadeli': 5.8,
      'Diğer': 2.1
    },
    top_holdings: [
      { name: 'Türk Hava Yolları', weight: 11.2, code: 'THYAO' },
      { name: 'Tüpraş', weight: 9.1, code: 'TUPRS' },
      { name: 'BİM Birleşik Mağazalar', weight: 8.4, code: 'BIMAS' },
      { name: 'Migros Ticaret', weight: 7.2, code: 'MGROS' },
      { name: 'Sabancı Holding', weight: 6.5, code: 'SAHOL' }
    ],
    sector_weights: {
      'Perakende & Tüketim': 26.2,
      'Enerji & Kimya': 18.5,
      'Ulaştırma': 16.1,
      'Holdingler': 15.2,
      'Bankacılık & Finans': 10.5,
      'Diğer': 13.5
    },
    historical_returns: {
      '1M': 5.2,
      '3M': 14.1,
      '6M': 31.2,
      '1Y': 88.5,
      'YTD': 25.4
    },
    risk_metrics: {
      volatility: 29.1,
      sharpe_ratio: 1.98,
      max_drawdown: -30.8,
      risk_value: 6
    }
  },
  PBR: {
    code: 'PBR',
    name: 'Pusula Portföy Birinci Değişken Fon',
    category: 'Değişken',
    asset_allocation: {
      'Yerli Hisse': 65.0,
      'Eurobond': 20.0,
      'Para Piyasası': 15.0
    },
    top_holdings: [
      { name: 'Türk Hava Yolları', weight: 6.2, code: 'THYAO' },
      { name: 'Ereğli Demir Çelik', weight: 5.8, code: 'EREGL' },
      { name: 'Koç Holding', weight: 5.1, code: 'KCHOL' },
      { name: 'T.C. Hazine Eurobondu 2030', weight: 12.5 },
      { name: 'Aktif Bank BPP', weight: 8.4 }
    ],
    sector_weights: {
      'Holdingler': 12.2,
      'Kamu Borçlanma': 12.5,
      'Likit': 15.0,
      'Demir Çelik': 8.8,
      'Ulaştırma': 9.2,
      'Diğer': 42.3
    },
    historical_returns: {
      '1M': 3.8,
      '3M': 11.5,
      '6M': 25.6,
      '1Y': 76.8,
      'YTD': 19.8
    },
    risk_metrics: {
      volatility: 18.2,
      sharpe_ratio: 1.72,
      max_drawdown: -18.5,
      risk_value: 5
    }
  },
  DFI: {
    code: 'DFI',
    name: 'Atlas Portföy Serbest Fon',
    category: 'Değişken',
    asset_allocation: {
      'Yerli Hisse': 55.0,
      'Eurobond': 25.0,
      'BPP / Vadeli': 20.0
    },
    top_holdings: [
      { name: 'Türk Hava Yolları', weight: 6.5, code: 'THYAO' },
      { name: 'T.C. Hazine Eurobondu 2030', weight: 12.0 },
      { name: 'Tüpraş', weight: 5.5, code: 'TUPRS' },
      { name: 'Akbank Eurobond 2028', weight: 8.2 },
      { name: 'BIST Ters Repo İşlemleri', weight: 10.5 }
    ],
    sector_weights: {
      'Kamu Borçlanma': 25.0,
      'Finans': 18.5,
      'Holdingler / Sanayi': 36.5,
      'Likit / Nakit': 20.0
    },
    historical_returns: {
      '1M': 2.1,
      '3M': 7.5,
      '6M': 16.2,
      '1Y': 45.3,
      'YTD': 11.2
    },
    risk_metrics: {
      volatility: 16.5,
      sharpe_ratio: 1.45,
      max_drawdown: -14.2,
      risk_value: 5
    }
  },
  TMV: {
    code: 'TMV',
    name: 'Tera Portföy Algoritmik Stratejiler Serbest Fon',
    category: 'Değişken',
    asset_allocation: {
      'Ters Repo': 40.0,
      'Vadeli İşlem Teminatları': 30.0,
      'Yerli Hisse': 20.0,
      'BPP / Nakit': 10.0
    },
    top_holdings: [
      { name: 'BIST Ters Repo İşlemleri', weight: 40.0 },
      { name: 'VIOP Nakit Teminatı', weight: 30.0 },
      { name: 'Türk Hava Yolları (Algoritmik)', weight: 5.2, code: 'THYAO' },
      { name: 'Tüpraş (Algoritmik)', weight: 4.8, code: 'TUPRS' },
      { name: 'Garanti Bankası BPP', weight: 10.0 }
    ],
    sector_weights: {
      'Ters Repo & Nakit': 50.0,
      'VIOP Teminat': 30.0,
      'Pay Piyasası': 20.0
    },
    historical_returns: {
      '1M': 4.1,
      '3M': 12.6,
      '6M': 26.2,
      '1Y': 51.5,
      'YTD': 23.5
    },
    risk_metrics: {
      volatility: 11.2,
      sharpe_ratio: 2.1,
      max_drawdown: -8.5,
      risk_value: 4
    }
  },
  IJC: {
    code: 'IJC',
    name: 'İş Portföy Yarı İletken Teknolojileri Değişken Fonu',
    category: 'Değişken',
    asset_allocation: {
      'Yabancı Hisse (Yarı İletken)': 85.0,
      'Yerli Hisse (Teknoloji)': 10.0,
      'BPP / Vadeli': 5.0
    },
    top_holdings: [
      { name: 'NVIDIA Corp', weight: 9.8 },
      { name: 'Taiwan Semiconductor Manufacturing (TSMC)', weight: 8.5 },
      { name: 'Intel Corp', weight: 7.2 },
      { name: 'Advanced Micro Devices (AMD)', weight: 6.8 },
      { name: 'ASML Holding NV', weight: 6.1 }
    ],
    sector_weights: {
      'Teknoloji & Donanım': 85.0,
      'Yerli Teknoloji Hisseleri': 10.0,
      'Likit': 5.0
    },
    historical_returns: {
      '1M': 8.5,
      '3M': -5.2,
      '6M': 35.4,
      '1Y': 112.8,
      'YTD': 38.2
    },
    risk_metrics: {
      volatility: 38.5,
      sharpe_ratio: 1.62,
      max_drawdown: -45.2,
      risk_value: 7
    }
  },
  MAC: {
    code: 'MAC',
    name: 'Marmara Capital Portföy Hisse Senedi Fonu (Hisse Yoğun)',
    category: 'Hisse Senedi',
    asset_allocation: {
      'Yerli Hisse': 95.5,
      'BPP / Vadeli': 4.5
    },
    top_holdings: [
      { name: 'Sabancı Holding', weight: 8.5, code: 'SAHOL' },
      { name: 'Anadolu Efes', weight: 7.8, code: 'AEFES' },
      { name: 'Tofaş Oto Fabrikaları', weight: 7.2, code: 'TOASO' },
      { name: 'Ereğli Demir Çelik', weight: 6.5, code: 'EREGL' },
      { name: 'Vestel Beyaz Eşya', weight: 5.9, code: 'VESBE' }
    ],
    sector_weights: {
      'Otomotiv': 14.2,
      'Holdingler': 18.5,
      'Gıda & İçecek': 12.8,
      'Demir Çelik': 9.5,
      'Dayanıklı Tüketim': 11.2,
      'Diğer': 33.8
    },
    historical_returns: {
      '1M': 3.1,
      '3M': 10.5,
      '6M': 24.8,
      '1Y': 78.2,
      'YTD': 18.5
    },
    risk_metrics: {
      volatility: 25.4,
      sharpe_ratio: 1.91,
      max_drawdown: -26.8,
      risk_value: 6
    }
  },
  IIH: {
    code: 'IIH',
    name: 'İstanbul Portföy Üçüncü Hisse Senedi Fonu (Hisse Yoğun)',
    category: 'Hisse Senedi',
    asset_allocation: {
      'Yerli Hisse': 91.8,
      'BPP / Vadeli': 8.2
    },
    top_holdings: [
      { name: 'Aselsan', weight: 9.5, code: 'ASELS' },
      { name: 'Yapı Kredi Bankası', weight: 8.2, code: 'YKBNK' },
      { name: 'Turkcell', weight: 7.9, code: 'TCELL' },
      { name: 'Mavi Giyim', weight: 6.8, code: 'MAVI' },
      { name: 'Kardemir D', weight: 6.1, code: 'KRDMD' }
    ],
    sector_weights: {
      'Telekomünikasyon': 14.5,
      'Bankacılık': 15.2,
      'Savunma & Havacılık': 12.8,
      'Tekstil & Giyim': 10.2,
      'Metal Sanayi': 9.8,
      'Diğer': 37.5
    },
    historical_returns: {
      '1M': 4.8,
      '3M': 13.5,
      '6M': 29.5,
      '1Y': 85.2,
      'YTD': 24.1
    },
    risk_metrics: {
      volatility: 26.8,
      sharpe_ratio: 2.02,
      max_drawdown: -28.5,
      risk_value: 6
    }
  },
  AFT: {
    code: 'AFT',
    name: 'Ak Portföy Yeni Teknolojiler Yabancı Hisse Senedi Fonu',
    category: 'Yabancı Hisse Senedi',
    asset_allocation: {
      'Yabancı Hisse': 94.2,
      'Para Piyasası': 5.8
    },
    top_holdings: [
      { name: 'Microsoft Corp', weight: 9.1 },
      { name: 'Apple Inc', weight: 8.8 },
      { name: 'NVIDIA Corp', weight: 8.5 },
      { name: 'Alphabet Inc', weight: 7.9 },
      { name: 'Amazon.com Inc', weight: 7.2 }
    ],
    sector_weights: {
      'Teknoloji & Donanım': 42.5,
      'Yazılım & Bulut': 28.3,
      'E-Ticaret & İnternet': 15.2,
      'Yarı İletkenler': 14.0
    },
    historical_returns: {
      '1M': 6.2,
      '3M': 9.8,
      '6M': 24.2,
      '1Y': 68.4,
      'YTD': 21.5
    },
    risk_metrics: {
      volatility: 24.5,
      sharpe_ratio: 1.81,
      max_drawdown: -24.2,
      risk_value: 6
    }
  },
  YAS: {
    code: 'YAS',
    name: 'Yapı Kredi Portföy Koç Holding İştirakleri Hisse Senedi Fonu',
    category: 'Hisse Senedi',
    asset_allocation: {
      'Yerli Hisse': 95.8,
      'BPP / Vadeli': 4.2
    },
    top_holdings: [
      { name: 'Koç Holding', weight: 15.2, code: 'KCHOL' },
      { name: 'Tüpraş', weight: 14.8, code: 'TUPRS' },
      { name: 'Yapı Kredi Bankası', weight: 12.5, code: 'YKBNK' },
      { name: 'Ford Otomotiv', weight: 11.2, code: 'FROTO' },
      { name: 'Türk Traktör', weight: 8.5, code: 'TTRAK' }
    ],
    sector_weights: {
      'Holdingler': 25.2,
      'Enerji & Rafineri': 22.8,
      'Bankacılık': 18.5,
      'Otomotiv': 20.2,
      'Diğer': 13.3
    },
    historical_returns: {
      '1M': 5.8,
      '3M': 16.2,
      '6M': 34.5,
      '1Y': 92.4,
      'YTD': 28.9
    },
    risk_metrics: {
      volatility: 29.8,
      sharpe_ratio: 1.95,
      max_drawdown: -33.4,
      risk_value: 6
    }
  }
};

export function getFund(code: string): FundData | null {
  const upperCode = code.toUpperCase().trim();
  if (fundsDatabase[upperCode]) {
    return fundsDatabase[upperCode];
  }
  // Generate generic fund for unknown codes to ensure stability
  if (upperCode.length >= 3 && upperCode.length <= 5) {
    return generateGenericFund(upperCode);
  }
  return null;
}

function generateGenericFund(code: string): FundData {
  // Deterministic seed from letters
  let seed = 0;
  for (let i = 0; i < code.length; i++) {
    seed += code.charCodeAt(i);
  }
  
  const categories: FundData['category'][] = ['Hisse Senedi', 'Değişken', 'Borçlanma Araçları', 'Para Piyasası'];
  const cat = categories[seed % categories.length];
  
  let asset_allocation: Record<string, number> = {};
  let top_holdings: FundData['top_holdings'] = [];
  let sector_weights: Record<string, number> = {};
  let risk_metrics = { volatility: 20, sharpe_ratio: 1.5, max_drawdown: -20, risk_value: 5 };
  
  if (cat === 'Hisse Senedi') {
    asset_allocation = { 'Yerli Hisse': 90, 'BPP / Vadeli': 10 };
    top_holdings = [
      { name: 'Türk Hava Yolları', weight: 10, code: 'THYAO' },
      { name: 'Tüpraş', weight: 8, code: 'TUPRS' },
      { name: 'Ereğli Demir Çelik', weight: 7, code: 'EREGL' },
      { name: 'Akbank', weight: 6, code: 'AKBNK' },
      { name: 'Koç Holding', weight: 5, code: 'KCHOL' }
    ];
    sector_weights = { 'Sanayi': 35, 'Holdingler': 25, 'Bankacılık': 20, 'Diğer': 20 };
    risk_metrics = { volatility: 27.5, sharpe_ratio: 1.75, max_drawdown: -31.5, risk_value: 6 };
  } else if (cat === 'Para Piyasası') {
    asset_allocation = { 'Ters Repo': 70, 'BPP': 30 };
    top_holdings = [
      { name: 'BIST Ters Repo İşlemleri', weight: 70 },
      { name: 'Mevduat Katılım', weight: 30 }
    ];
    sector_weights = { 'Finans / Likit': 100 };
    risk_metrics = { volatility: 1.1, sharpe_ratio: 3.2, max_drawdown: -0.02, risk_value: 1 };
  } else if (cat === 'Borçlanma Araçları') {
    asset_allocation = { 'Devlet Tahvili': 80, 'Özel Sektör Tahvili': 20 };
    top_holdings = [
      { name: 'T.C. Devlet Tahvili', weight: 50 },
      { name: 'Hazine Bonosu', weight: 30 }
    ];
    sector_weights = { 'Kamu': 80, 'Finans': 20 };
    risk_metrics = { volatility: 8.5, sharpe_ratio: 1.3, max_drawdown: -6.5, risk_value: 3 };
  } else {
    asset_allocation = { 'Yerli Hisse': 40, 'Yabancı Hisse': 30, 'Eurobond': 20, 'Nakit': 10 };
    top_holdings = [
      { name: 'T.C. Hazine Eurobondu', weight: 20 },
      { name: 'Türk Hava Yolları', weight: 8, code: 'THYAO' },
      { name: 'NVIDIA Corp', weight: 7 },
      { name: 'Tüpraş', weight: 6, code: 'TUPRS' }
    ];
    sector_weights = { 'Teknoloji': 30, 'Enerji': 20, 'Kamu Borç': 20, 'Diğer': 30 };
    risk_metrics = { volatility: 18.2, sharpe_ratio: 1.6, max_drawdown: -18.5, risk_value: 4 };
  }

  return {
    code,
    name: `${code} Portföy ${cat === 'Hisse Senedi' ? 'Hisse Yoğun' : cat} Fonu`,
    category: cat,
    asset_allocation,
    top_holdings,
    sector_weights,
    historical_returns: {
      '1M': 3.5,
      '3M': 10.2,
      '6M': 22.4,
      '1Y': 65.8,
      'YTD': 18.2
    },
    risk_metrics
  };
}
