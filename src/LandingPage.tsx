import { useState, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Shield, ChevronDown,
  Mail, ArrowRight, Check, Zap, BarChart3, Calendar,
  MessageSquare, TrendingUp, Star
} from 'lucide-react'
import { supabase } from './supabaseClient'

/* ═══ Animation Variants ═══ */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
}

/* ═══ Section Wrapper ═══ */
function Section({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode
  className?: string
  id?: string
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={staggerContainer}
      className={className}
      style={{ position: 'relative', padding: '6rem 1rem' }}
    >
      {children}
    </motion.section>
  )
}

/* ═══ Magic Link Form ═══ */
function MagicLinkForm({ variant = 'hero' }: { variant?: 'hero' | 'contact' }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      })
      if (error) throw error
      setStatus('success')
      setMessage('Giriş linki e-posta adresinize gönderildi! Lütfen e-postanızı kontrol edin.')
      setEmail('')
    } catch (err: any) {
      console.error('Auth error details:', err)
      setStatus('error')
      
      let debugMsg = '';
      try {
        // Enumerable properties stringified
        debugMsg = JSON.stringify(err);
      } catch {
        debugMsg = String(err);
      }
      
      // Handle cases where JSON.stringify returns "{}" due to non-enumerable properties of Error class
      if ((debugMsg === '{}' || !debugMsg) && err) {
        debugMsg = `Error: ${err.message || 'unknown'} | Status: ${err.status || 'unknown'} | Name: ${err.name || 'unknown'}`;
      }
      
      setMessage(`Sistem Hatası: ${debugMsg}`)
    }
  }

  const isHero = variant === 'hero'

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '28rem', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: isHero ? 'row' : 'column', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Mail style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#a3a3a3' }} />
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setStatus('idle') }}
            placeholder="E-posta adresiniz"
            required
            style={{
              width: '100%',
              paddingLeft: '40px',
              paddingRight: '16px',
              paddingTop: '14px',
              paddingBottom: '14px',
              background: 'rgba(13, 15, 20, 0.85)',
              border: '1px solid rgba(197, 160, 89, 0.12)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'border-color 0.3s',
            }}
            onFocus={(e) => e.target.style.borderColor = '#c5a059'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(197, 160, 89, 0.12)'}
          />
        </div>
        <motion.button
          type="submit"
          disabled={status === 'loading'}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            padding: '14px 24px',
            background: 'linear-gradient(135deg, #c5a059, #d3b374)',
            color: '#fff',
            fontSize: '0.875rem',
            fontWeight: 600,
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            opacity: status === 'loading' ? 0.5 : 1,
            boxShadow: '0 8px 24px rgba(197, 160, 89, 0.25)',
            transition: 'all 0.3s',
          }}
        >
          {status === 'loading' ? (
            <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          ) : (
            <>
              Giriş Linki Gönder
              <ArrowRight style={{ width: '16px', height: '16px' }} />
            </>
          )}
        </motion.button>
      </div>
      <AnimatePresence>
        {status !== 'idle' && status !== 'loading' && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              marginTop: '12px',
              fontSize: '0.875rem',
              textAlign: 'center',
              color: status === 'success' ? '#34d399' : '#f87171',
            }}
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  )
}

/* ═══ Infinite Slider ═══ */
function InfiniteSlider({ children, speed = 30 }: { children: React.ReactNode; speed?: number }) {
  return (
    <div style={{ overflow: 'hidden', position: 'relative' }}>
      <motion.div
        style={{ display: 'flex', gap: '2rem', width: 'max-content' }}
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
      >
        {children}
        {children}
      </motion.div>
    </div>
  )
}

/* ═══ FAQ Item ═══ */
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div variants={fadeUp} style={{ border: '1px solid rgba(197, 160, 89, 0.12)', borderRadius: '12px', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff',
          transition: 'background 0.3s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#171717'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{ fontSize: '0.875rem', fontWeight: 500, paddingRight: '16px' }}>{question}</span>
        <ChevronDown style={{ width: '16px', height: '16px', color: '#a3a3a3', flexShrink: 0, transition: 'transform 0.3s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
            <p style={{ padding: '0 20px 20px', fontSize: '0.875rem', color: '#a3a3a3', lineHeight: 1.7 }}>{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════
   ─── LANDING PAGE ───
   ═══════════════════════════════════════════════ */
export default function LandingPage() {
  const features = [
    { icon: BarChart3, title: 'Akıllı Sağlık Karnesi', desc: 'Portföyünüzün çeşitlendirme oranını, getiri potansiyelini ve genel sağlık durumunu anında puanlayın.' },
    { icon: Shield, title: 'Risk & Stres Testleri', desc: 'Piyasadaki olası sert düşüş senaryolarında portföyünüzün ne kadar kayıp yaşayabileceğini simüle edin.' },
    { icon: Sparkles, title: 'Yapay Zeka Analisti', desc: 'Gemini destekli multi-agent (çoklu ajan) yapısıyla portföyünüze özel gerekçeli analiz raporu alın.' },
    { icon: Calendar, title: 'Kesişim (Overlap) Analizi', desc: 'Seçtiğiniz fonların alt kırılımlarındaki hisse yoğunlaşmalarını ve gizli risk ortaklıklarını bulun.' },
    { icon: Zap, title: 'Makro Piyasa Uyumu', desc: 'Faiz, enflasyon ve piyasa momentum verilerine göre portföyünüzün uyumluluğunu ölçün.' },
    { icon: TrendingUp, title: 'Gelişmiş Optimizasyon', desc: 'Maksimum verimlilik için AI tabanlı rebalans ve varlık dağılımı optimizasyonu uygulayın.' },
  ]

  const plans = [
    { name: 'Başlangıç', price: '0', period: '', desc: 'Temel analiz ve risk profili oluşturmak için', features: ['Standart portföy analizi', 'Temel risk profili', 'Sağlık karnesi özeti', 'Gecikmeli TEFAS verileri'], popular: false },
    { name: 'Profesyonel', price: '299', period: '/ay', desc: 'Bireysel yatırımcılar için gelişmiş araçlar', features: ['Sınırsız portföy analizi', 'Detaylı risk & stres testleri', 'Tam kesişim (overlap) taraması', 'Temel AI analist raporu', 'Gelişmiş rebalans önerileri'], popular: true },
    { name: 'Premium (AI Canlı)', price: '699', period: '/ay', desc: 'Akıllı kararlar için tam canlı AI gücü', features: ['Her şey dahil', 'Gemini Multi-Agent Canlı Analiz', 'Anlık KAP/TEFAS entegrasyonu', 'Özelleştirilmiş piyasa uyarıları', 'Gelişmiş backtest simülasyonları', '7/24 öncelikli destek'], popular: false },
  ]

  const testimonials = [
    { name: 'Kaan G.', role: 'Bireysel Yatırımcı', text: 'Fonlarımın altındaki hisse kesişimlerini (overlap) Çalışkan Borsa sayesinde gördüm. Çok faydalı.', rating: 5 },
    { name: 'Zeynep A.', role: 'Yatırım Danışmanı', text: 'Müşterilerimin risk profillerine uygun rebalans önerilerini hazırlarken bu aracı sıklıkla kullanıyorum.', rating: 5 },
    { name: 'Murat Y.', role: 'Finansal Analist', text: 'TEFAS fonlarının makro piyasa rejimleriyle uyum analizini yapay zeka ile bu kadar hızlı sunan başka bir yer yok.', rating: 5 },
    { name: 'Elif S.', role: 'Uzun Vadeli Yatırımcı', text: 'Stres testi simülasyonu sayesinde portföyümün piyasa çöküşlerindeki dayanıklılığını önceden görebiliyorum.', rating: 4 },
    { name: 'Ahmet T.', role: 'Hisse Senedi Yatırımcısı', text: 'Fon dağılımındaki AI optimizasyonu sayesinde getirimi pazarın üzerine çıkarmayı başardım.', rating: 5 },
    { name: 'Buse K.', role: 'Yeni Yatırımcı', text: 'Karışık finansal verileri yapay zeka raporuyla sade ve anlaşılır bir Türkçe ile sunması harika.', rating: 5 },
  ]

  const faqs = [
    { q: 'Çalışkan Borsa nedir?', a: 'Çalışkan Borsa, TEFAS ve KAP verilerini kullanarak yatırım fonu portföylerinizi yapay zeka desteğiyle analiz eden, risk ve stres testleri uygulayan modern bir finansal analiz platformudur.' },
    { q: 'Yapay Zeka Analisti nasıl çalışır?', a: 'Gemini tabanlı çoklu ajan (multi-agent) sistemimiz; portföyünüzün varlık dağılımını, fon kesişimlerini ve makro piyasa durumunu analiz ederek size özel detaylı bir yatırım ve rebalans raporu hazırlar.' },
    { q: 'Platformu kullanmak için ücret ödemem gerekiyor mu?', a: 'Başlangıç planı tamamen ücretsizdir. Daha gelişmiş stres testleri, overlap analizi ve canlı yapay zeka ajan raporları için Profesyonel veya Premium planları tercih edebilirsiniz.' },
    { q: 'Yatırım fonlarıma veya parama erişiminiz oluyor mu?', a: 'Hayır. Sadece girdiğiniz fon kodları ve ağırlıkları üzerinden matematiksel ve istatistical analizler yaparız. Herhangi bir para transferi veya portföy saklama işlemi gerçekleştirmiyoruz. Verileriniz tamamen güvendedir.' },
    { q: 'Veriler güncel mi?', a: 'Platformumuz TEFAS ve KAP üzerinden çekilen en güncel fon dağılımları ve fiyat verileri ile çalışmaktadır.' },
    { q: 'İstediğim zaman aboneliğimi iptal edebilir miyim?', a: 'Evet, herhangi bir taahhüt yoktur. Dilediğiniz an aboneliğinizi sonlandırabilirsiniz.' },
  ]

  const stats = [
    { value: '50K+', label: 'Analiz Edilen Portföy' },
    { value: '250+', label: 'Aktif TEFAS Fonu' },
    { value: '%99.9', label: 'Veri Doğruluğu' },
    { value: '4.8/5', label: 'Kullanıcı Değerlendirmesi' },
  ]

  const sectionMaxWidth = { maxWidth: '72rem', margin: '0 auto' }
  const cardStyle: React.CSSProperties = { padding: '24px', background: 'rgba(13, 15, 20, 0.85)', border: '1px solid rgba(197, 160, 89, 0.12)', borderRadius: '16px', transition: 'all 0.5s' }

  return (
    <div style={{ minHeight: '100vh', background: '#06070a', color: '#fff', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", overflowX: 'hidden' }}>
      {/* ─── CSS keyframes ─── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
        .landing-card:hover { border-color: rgba(197, 160, 89, 0.3) !important; transform: translateY(-4px); }
        .landing-nav-link:hover { color: #fff !important; }
        .landing-plan:hover { transform: translateY(-6px); }
        .landing-testimonial:hover { border-color: #404040 !important; }
        @media (max-width: 768px) {
          .landing-hero-title { font-size: 2.5rem !important; }
          .landing-grid-3 { grid-template-columns: 1fr !important; }
          .landing-grid-2 { grid-template-columns: 1fr !important; }
          .landing-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .landing-nav-links { display: none !important; }
          .landing-footer-inner { flex-direction: column !important; text-align: center; }
        }
      `}</style>

      {/* ─── NAVBAR ─── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          position: 'fixed', top: 0, width: '100%', zIndex: 50,
          borderBottom: '1px solid rgba(197, 160, 89, 0.15)',
          background: 'rgba(6, 7, 10, 0.8)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1rem', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid rgba(197, 160, 89, 0.3)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(197, 160, 89, 0.05)', boxShadow: '0 0 10px rgba(197, 160, 89, 0.1)', flexShrink: 0 }}>
              <img src="/logo.png" alt="Çalışkan Borsa Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span style={{ fontSize: '1.125rem', fontWeight: 700 }}>Çalışkan Borsa</span>
          </div>
          <div className="landing-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '2rem', fontSize: '0.875rem', color: '#a3a3a3' }}>
            {[['#ozellikler','Özellikler'],['#fiyatlandirma','Fiyatlandırma'],['#yorumlar','Yorumlar'],['#sss','S.S.S'],['#iletisim','İletişim']].map(([href, label]) => (
              <a key={href} href={href} className="landing-nav-link" style={{ color: '#a3a3a3', textDecoration: 'none', transition: 'color 0.3s' }}>{label}</a>
            ))}
          </div>
          <a href="#giris" style={{ padding: '8px 16px', fontSize: '0.875rem', fontWeight: 500, background: 'rgba(13, 15, 20, 0.85)', border: '1px solid rgba(197, 160, 89, 0.12)', borderRadius: '8px', color: '#fff', textDecoration: 'none', transition: 'border-color 0.3s' }}>
            Giriş Yap
          </a>
        </div>
      </motion.nav>

      {/* ─── HERO ─── */}
      <Section id="giris" className="" >
        <div style={{ ...sectionMaxWidth, maxWidth: '60rem', textAlign: 'center', paddingTop: '5rem' }}>
          {/* Ambient glow */}
          <div style={{ position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(circle at 50% 30%, rgba(197, 160, 89, 0.08) 0%, transparent 65%)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />

          <motion.div variants={fadeUp} custom={0} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', marginBottom: '2rem', fontSize: '0.75rem', fontWeight: 500, background: 'rgba(197, 160, 89, 0.08)', color: '#d3b374', border: '1px solid rgba(197, 160, 89, 0.18)', borderRadius: '9999px' }}>
            <Sparkles style={{ width: '14px', height: '14px' }} />
            Yapay Zeka Destekli Portföy Yönetimi
          </motion.div>

          <motion.h1 variants={fadeUp} custom={1} className="landing-hero-title" style={{ fontSize: '4rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '1.5rem' }}>
            Yatırımlarınızı AI ile{' '}
            <span style={{ background: 'linear-gradient(to right, #c5a059, #d3b374, #f3dcb3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Optimize Edin
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} custom={2} style={{ fontSize: '1.125rem', color: '#a3a3a3', maxWidth: '36rem', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
            TEFAS ve KAP verileriyle entegre, risk odaklı ve yapay zeka destekli yatırım fonu portföy kurucu ve danışmanlık paneli.
          </motion.p>

          <motion.div variants={fadeUp} custom={3}>
            <MagicLinkForm variant="hero" />
            <p style={{ marginTop: '16px', fontSize: '0.75rem', color: '#a3a3a3' }}>Şifre gerektirmez · Güvenli Magic Link · Anında Analiz</p>
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeUp} custom={4} className="landing-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginTop: '5rem', maxWidth: '48rem', margin: '5rem auto 0' }}>
            {stats.map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{s.value}</div>
                <div style={{ fontSize: '0.75rem', color: '#a3a3a3', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ─── PROOF / LOGOS SLIDER ─── */}
      <div style={{ padding: '3rem 0', borderTop: '1px solid rgba(197, 160, 89, 0.15)', borderBottom: '1px solid rgba(197, 160, 89, 0.15)' }}>
        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#a3a3a3', marginBottom: '2rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Desteklenen Altyapı & Veri Kaynakları</p>
        <InfiniteSlider speed={40}>
          {['TEFAS', 'KAP', 'BIST', 'Gemini AI', 'Supabase', 'Vercel', 'TypeScript', 'React'].map((t) => (
            <span key={t} style={{ fontSize: '1.125rem', fontWeight: 600, color: '#262626', whiteSpace: 'nowrap', padding: '0 1rem' }}>{t}</span>
          ))}
        </InfiniteSlider>
      </div>

      {/* ─── FEATURES ─── */}
      <Section id="ozellikler">
        <div style={sectionMaxWidth}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#d3b374', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Özellikler</span>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 700, marginTop: '12px' }}>Portföyünüzü Optimize Eden Teknolojiler</h2>
            <p style={{ color: '#a3a3a3', marginTop: '1rem', maxWidth: '32rem', margin: '1rem auto 0', fontSize: '0.875rem' }}>Yatırım fonlarınızı analiz etmek, riskleri yönetmek ve yapay zeka desteğiyle büyütmek için ihtiyacınız olan her şey.</p>
          </motion.div>

          <div className="landing-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {features.map((f, i) => (
              <motion.div key={f.title} variants={fadeUp} custom={i} className="landing-card" style={cardStyle}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(197, 160, 89, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <f.icon style={{ width: '20px', height: '20px', color: '#d3b374' }} />
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>{f.title}</h3>
                <p style={{ fontSize: '0.875rem', color: '#a3a3a3', lineHeight: 1.6 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── PRICING ─── */}
      <Section id="fiyatlandirma">
        <div style={{ ...sectionMaxWidth, background: 'rgba(13, 15, 20, 0.5)', borderRadius: '24px', padding: '4rem 2rem' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#d3b374', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Fiyatlandırma</span>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 700, marginTop: '12px' }}>Size Uygun Planı Seçin</h2>
            <p style={{ color: '#a3a3a3', marginTop: '1rem', fontSize: '0.875rem' }}>Taahhüt yok. İstediğiniz zaman iptal edin.</p>
          </motion.div>

          <div className="landing-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {plans.map((plan, i) => (
              <motion.div key={plan.name} variants={scaleIn} custom={i} className="landing-plan" style={{
                position: 'relative', padding: '28px', borderRadius: '16px', transition: 'all 0.5s',
                background: 'rgba(13, 15, 20, 0.85)',
                border: plan.popular ? '1px solid rgba(197, 160, 89, 0.5)' : '1px solid rgba(197, 160, 89, 0.12)',
                boxShadow: plan.popular ? '0 8px 32px rgba(197, 160, 89, 0.08)' : 'none',
              }}>
                {plan.popular && (
                  <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', padding: '4px 12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: 'linear-gradient(135deg, #c5a059, #d3b374)', color: '#fff', borderRadius: '9999px' }}>
                    Popüler
                  </div>
                )}
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{plan.name}</h3>
                <p style={{ fontSize: '0.75rem', color: '#a3a3a3', marginTop: '4px' }}>{plan.desc}</p>
                <div style={{ marginTop: '20px', marginBottom: '24px' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>₺{plan.price}</span>
                  <span style={{ fontSize: '0.875rem', color: '#a3a3a3' }}>{plan.period}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: '#a3a3a3' }}>
                      <Check style={{ width: '16px', height: '16px', color: '#d3b374', flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{
                  width: '100%', padding: '12px', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s', border: 'none',
                  background: plan.popular ? 'linear-gradient(135deg, #c5a059, #d3b374)' : '#0a0a0a',
                  color: '#fff',
                  ...(plan.popular ? { boxShadow: '0 8px 24px rgba(197, 160, 89, 0.18)' } : { border: '1px solid rgba(197, 160, 89, 0.12)' }),
                }}>
                  Hemen Başla
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── TESTIMONIALS ─── */}
      <Section id="yorumlar">
        <div style={sectionMaxWidth}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#d3b374', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Yorumlar</span>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 700, marginTop: '12px' }}>Yatırımcılarımızın Yorumları</h2>
          </motion.div>

          <div className="landing-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {testimonials.map((t, i) => (
              <motion.div key={t.name} variants={fadeUp} custom={i} className="landing-testimonial" style={cardStyle}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} style={{ width: '16px', height: '16px', color: s < t.rating ? '#facc15' : 'rgba(197, 160, 89, 0.15)', fill: s < t.rating ? '#facc15' : 'none' }} />
                  ))}
                </div>
                <p style={{ fontSize: '0.875rem', color: '#a3a3a3', lineHeight: 1.6, marginBottom: '20px' }}>"{t.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(197, 160, 89, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d3b374' }}>{t.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.name}</p>
                    <p style={{ fontSize: '0.75rem', color: '#a3a3a3' }}>{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── FAQ ─── */}
      <Section id="sss">
        <div style={{ ...sectionMaxWidth, maxWidth: '40rem' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#d3b374', letterSpacing: '0.15em', textTransform: 'uppercase' }}>S.S.S</span>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 700, marginTop: '12px' }}>Sıkça Sorulan Sorular</h2>
          </motion.div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqs.map((f) => <FAQItem key={f.q} question={f.q} answer={f.a} />)}
          </div>
        </div>
      </Section>

      {/* ─── CONTACT / CTA ─── */}
      <Section id="iletisim">
        <div style={{ ...sectionMaxWidth, maxWidth: '40rem', textAlign: 'center' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '500px', height: '300px', background: 'radial-gradient(circle, rgba(197, 160, 89, 0.05) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />
          <motion.div variants={fadeUp}>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#d3b374', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Hemen Başlayın</span>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 700, marginTop: '12px', marginBottom: '16px' }}>Yatırımlarınızı Optimize Etmeye Hazır mısınız?</h2>
            <p style={{ color: '#a3a3a3', fontSize: '0.875rem', marginBottom: '2.5rem' }}>E-posta adresinizi girin, size özel giriş linkini anında e-postanıza gönderelim.</p>
          </motion.div>
          <motion.div variants={fadeUp} custom={1}>
            <MagicLinkForm variant="contact" />
          </motion.div>
        </div>
      </Section>

      {/* ─── FOOTER ─── */}
      <footer style={{ borderTop: '1px solid rgba(197, 160, 89, 0.15)', padding: '3rem 1rem' }}>
        <div className="landing-footer-inner" style={{ maxWidth: '72rem', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid rgba(197, 160, 89, 0.3)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(197, 160, 89, 0.05)', boxShadow: '0 0 10px rgba(197, 160, 89, 0.1)', flexShrink: 0 }}>
              <img src="/logo.png" alt="Çalışkan Borsa Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>Çalışkan Borsa</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.75rem', color: '#a3a3a3' }}>
            {[['#ozellikler','Özellikler'],['#fiyatlandirma','Fiyatlandırma'],['#sss','S.S.S'],['#iletisim','İletişim']].map(([href, label]) => (
              <a key={href} href={href} className="landing-nav-link" style={{ color: '#a3a3a3', textDecoration: 'none', transition: 'color 0.3s' }}>{label}</a>
            ))}
          </div>
          <p style={{ fontSize: '0.75rem', color: '#a3a3a3' }}>© 2026 Çalışkan Borsa. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  )
}
