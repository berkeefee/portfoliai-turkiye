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
    } catch {
      setStatus('error')
      setMessage('Bir hata oluştu. Lütfen tekrar deneyin.')
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
              background: '#171717',
              border: '1px solid #262626',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'border-color 0.3s',
            }}
            onFocus={(e) => e.target.style.borderColor = '#6366f1'}
            onBlur={(e) => e.target.style.borderColor = '#262626'}
          />
        </div>
        <motion.button
          type="submit"
          disabled={status === 'loading'}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            padding: '14px 24px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
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
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.25)',
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
    <motion.div variants={fadeUp} style={{ border: '1px solid #262626', borderRadius: '12px', overflow: 'hidden' }}>
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
    { icon: Calendar, title: 'Akıllı Randevu Yönetimi', desc: 'Müşterileriniz 7/24 online randevu alabilir. Çakışma kontrolü ve otomatik hatırlatmalar.' },
    { icon: BarChart3, title: 'Gelir Analitikleri', desc: 'Günlük, haftalık ve aylık gelir raporlarınızı tek panelden takip edin.' },
    { icon: MessageSquare, title: 'Müşteri İletişimi', desc: 'Entegre mesajlaşma ile müşterilerinizle doğrudan iletişim kurun.' },
    { icon: Shield, title: 'Güvenli Altyapı', desc: 'Verileriniz SSL şifreleme ve kurumsal güvenlik standartlarıyla korunur.' },
    { icon: Zap, title: 'Hızlı Kurulum', desc: '5 dakikada profilinizi oluşturun, hemen randevu almaya başlayın.' },
    { icon: TrendingUp, title: 'Büyüme Araçları', desc: 'SEO optimize profil sayfası ve sosyal medya entegrasyonları.' },
  ]

  const plans = [
    { name: 'Başlangıç', price: '299', period: '/ay', desc: 'Kariyerine yeni başlayan ustalar için', features: ['Aylık 50 randevu', 'Temel analitikler', 'E-posta desteği', 'Profil sayfası'], popular: false },
    { name: 'Profesyonel', price: '599', period: '/ay', desc: 'İşini büyütmek isteyen profesyoneller için', features: ['Sınırsız randevu', 'Gelişmiş analitikler', 'Öncelikli destek', 'Müşteri CRM', 'Otomatik hatırlatmalar', 'Özel profil sayfası'], popular: true },
    { name: 'Kurumsal', price: '999', period: '/ay', desc: 'Ekip ve kurumsal hizmet sağlayıcılar için', features: ['Her şey dahil', 'Ekip yönetimi', 'API erişimi', 'Beyaz etiket', 'Özel entegrasyonlar', 'Dedicated destek'], popular: false },
  ]

  const testimonials = [
    { name: 'Ahmet Y.', role: 'Elektrik Ustası', text: 'Randevularımı artık tek yerden yönetiyorum. Müşteri memnuniyetim %40 arttı.', rating: 5 },
    { name: 'Fatma K.', role: 'Güzellik Uzmanı', text: 'Müşterilerim 7/24 randevu alabiliyor. İş kaybım sıfıra indi.', rating: 5 },
    { name: 'Mehmet D.', role: 'Tesisat Teknisyeni', text: 'Gelir raporları sayesinde hangi hizmetimin daha karlı olduğunu görebiliyorum.', rating: 5 },
    { name: 'Ayşe B.', role: 'Terzi', text: "Profesyonel bir profil sayfam oldu. Google'dan yeni müşteriler geliyor.", rating: 4 },
    { name: 'Can S.', role: 'Boyacı', text: 'Teknik bilgim yok ama 5 dakikada kurdum. Çok kolay kullanılıyor.', rating: 5 },
    { name: 'Zeynep T.', role: 'Masör', text: 'Hatırlatma mesajları sayesinde randevu iptalleri %80 azaldı.', rating: 5 },
  ]

  const faqs = [
    { q: 'Platforma nasıl kayıt olabilirim?', a: 'E-posta adresinizi girin, size gönderilen giriş linkine tıklayın ve profilinizi oluşturmaya başlayın.' },
    { q: 'Hangi meslek grupları kullanabilir?', a: 'Ustalar, profesyoneller, teknisyenler ve hizmet sağlayıcılar dahil tüm bağımsız çalışanlar kullanabilir.' },
    { q: 'Ödeme nasıl yapılır?', a: 'Kredi kartı, banka kartı veya havale/EFT ile ödeme yapabilirsiniz. Tüm ödemeler SSL ile güvence altındadır.' },
    { q: 'İstediğim zaman iptal edebilir miyim?', a: 'Evet, herhangi bir taahhüt yoktur. Aboneliğinizi dilediğiniz zaman iptal edebilirsiniz.' },
    { q: 'Müşterilerim nasıl randevu alacak?', a: 'Size özel profil sayfanızın linkini paylaşmanız yeterli.' },
    { q: 'Teknik destek sağlıyor musunuz?', a: 'Evet, tüm planlarda e-posta desteği mevcuttur. Profesyonel ve Kurumsal planlarda öncelikli destek sunulmaktadır.' },
  ]

  const stats = [
    { value: '10K+', label: 'Aktif Usta' },
    { value: '500K+', label: 'Randevu' },
    { value: '%99.9', label: 'Uptime' },
    { value: '4.9/5', label: 'Memnuniyet' },
  ]

  const sectionMaxWidth = { maxWidth: '72rem', margin: '0 auto' }
  const cardStyle: React.CSSProperties = { padding: '24px', background: '#171717', border: '1px solid #262626', borderRadius: '16px', transition: 'all 0.5s' }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", overflowX: 'hidden' }}>
      {/* ─── CSS keyframes ─── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
        .landing-card:hover { border-color: rgba(99,102,241,0.3) !important; transform: translateY(-4px); }
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
          borderBottom: '1px solid rgba(38,38,38,0.5)',
          background: 'rgba(10,10,10,0.8)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1rem', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles style={{ width: '16px', height: '16px', color: '#fff' }} />
            </div>
            <span style={{ fontSize: '1.125rem', fontWeight: 700 }}>PortfoliAI</span>
          </div>
          <div className="landing-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '2rem', fontSize: '0.875rem', color: '#a3a3a3' }}>
            {[['#ozellikler','Özellikler'],['#fiyatlandirma','Fiyatlandırma'],['#yorumlar','Yorumlar'],['#sss','S.S.S'],['#iletisim','İletişim']].map(([href, label]) => (
              <a key={href} href={href} className="landing-nav-link" style={{ color: '#a3a3a3', textDecoration: 'none', transition: 'color 0.3s' }}>{label}</a>
            ))}
          </div>
          <a href="#giris" style={{ padding: '8px 16px', fontSize: '0.875rem', fontWeight: 500, background: '#171717', border: '1px solid #262626', borderRadius: '8px', color: '#fff', textDecoration: 'none', transition: 'border-color 0.3s' }}>
            Giriş Yap
          </a>
        </div>
      </motion.nav>

      {/* ─── HERO ─── */}
      <Section id="giris" className="" >
        <div style={{ ...sectionMaxWidth, maxWidth: '60rem', textAlign: 'center', paddingTop: '5rem' }}>
          {/* Ambient glow */}
          <div style={{ position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse, rgba(99,102,241,0.12), transparent 70%)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />

          <motion.div variants={fadeUp} custom={0} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', marginBottom: '2rem', fontSize: '0.75rem', fontWeight: 500, background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '9999px' }}>
            <Sparkles style={{ width: '14px', height: '14px' }} />
            Ustalar, Profesyoneller, Teknisyenler ve Hizmet Sağlayıcılar İçin
          </motion.div>

          <motion.h1 variants={fadeUp} custom={1} className="landing-hero-title" style={{ fontSize: '4rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '1.5rem' }}>
            İşinizi Dijitale{' '}
            <span style={{ background: 'linear-gradient(to right, #818cf8, #a78bfa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Taşıyın
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} custom={2} style={{ fontSize: '1.125rem', color: '#a3a3a3', maxWidth: '36rem', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
            Randevu yönetimi, müşteri takibi ve gelir analitiklerini tek bir platformda birleştirin. Yapay zeka destekli araçlarla işinizi büyütün.
          </motion.p>

          <motion.div variants={fadeUp} custom={3}>
            <MagicLinkForm variant="hero" />
            <p style={{ marginTop: '16px', fontSize: '0.75rem', color: '#a3a3a3' }}>Şifre gerektirmez · 30 saniyede başlayın · Kredi kartı gerekmez</p>
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
      <div style={{ padding: '3rem 0', borderTop: '1px solid rgba(38,38,38,0.5)', borderBottom: '1px solid rgba(38,38,38,0.5)' }}>
        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#a3a3a3', marginBottom: '2rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Güvenilir Teknoloji Altyapısı</p>
        <InfiniteSlider speed={40}>
          {['Next.js', 'Supabase', 'Vercel', 'Stripe', 'Resend', 'TailwindCSS', 'TypeScript', 'PostgreSQL'].map((t) => (
            <span key={t} style={{ fontSize: '1.125rem', fontWeight: 600, color: '#262626', whiteSpace: 'nowrap', padding: '0 1rem' }}>{t}</span>
          ))}
        </InfiniteSlider>
      </div>

      {/* ─── FEATURES ─── */}
      <Section id="ozellikler">
        <div style={sectionMaxWidth}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#818cf8', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Özellikler</span>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 700, marginTop: '12px' }}>İşinizi Güçlendiren Araçlar</h2>
            <p style={{ color: '#a3a3a3', marginTop: '1rem', maxWidth: '32rem', margin: '1rem auto 0', fontSize: '0.875rem' }}>Profesyonel hizmet sunumunuz için ihtiyacınız olan her şey tek platformda.</p>
          </motion.div>

          <div className="landing-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {features.map((f, i) => (
              <motion.div key={f.title} variants={fadeUp} custom={i} className="landing-card" style={cardStyle}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <f.icon style={{ width: '20px', height: '20px', color: '#818cf8' }} />
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
        <div style={{ ...sectionMaxWidth, background: 'rgba(13,13,13,0.5)', borderRadius: '24px', padding: '4rem 2rem' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#818cf8', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Fiyatlandırma</span>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 700, marginTop: '12px' }}>Size Uygun Planı Seçin</h2>
            <p style={{ color: '#a3a3a3', marginTop: '1rem', fontSize: '0.875rem' }}>Taahhüt yok. İstediğiniz zaman iptal edin.</p>
          </motion.div>

          <div className="landing-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {plans.map((plan, i) => (
              <motion.div key={plan.name} variants={scaleIn} custom={i} className="landing-plan" style={{
                position: 'relative', padding: '28px', borderRadius: '16px', transition: 'all 0.5s',
                background: '#171717',
                border: plan.popular ? '1px solid rgba(99,102,241,0.5)' : '1px solid #262626',
                boxShadow: plan.popular ? '0 8px 32px rgba(99,102,241,0.1)' : 'none',
              }}>
                {plan.popular && (
                  <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', padding: '4px 12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', borderRadius: '9999px' }}>
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
                      <Check style={{ width: '16px', height: '16px', color: '#818cf8', flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{
                  width: '100%', padding: '12px', borderRadius: '12px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s', border: 'none',
                  background: plan.popular ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#0a0a0a',
                  color: '#fff',
                  ...(plan.popular ? { boxShadow: '0 8px 24px rgba(99,102,241,0.25)' } : { border: '1px solid #262626' }),
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
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#818cf8', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Yorumlar</span>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 700, marginTop: '12px' }}>Ustalarımız Ne Diyor?</h2>
          </motion.div>

          <div className="landing-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {testimonials.map((t, i) => (
              <motion.div key={t.name} variants={fadeUp} custom={i} className="landing-testimonial" style={cardStyle}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} style={{ width: '16px', height: '16px', color: s < t.rating ? '#facc15' : '#262626', fill: s < t.rating ? '#facc15' : 'none' }} />
                  ))}
                </div>
                <p style={{ fontSize: '0.875rem', color: '#a3a3a3', lineHeight: 1.6, marginBottom: '20px' }}>"{t.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8' }}>{t.name.charAt(0)}</span>
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
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#818cf8', letterSpacing: '0.15em', textTransform: 'uppercase' }}>S.S.S</span>
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
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '500px', height: '300px', background: 'radial-gradient(ellipse, rgba(99,102,241,0.08), transparent 70%)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />
          <motion.div variants={fadeUp}>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#818cf8', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Hemen Başlayın</span>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 700, marginTop: '12px', marginBottom: '16px' }}>İşinizi Dijitale Taşımaya Hazır mısınız?</h2>
            <p style={{ color: '#a3a3a3', fontSize: '0.875rem', marginBottom: '2.5rem' }}>E-posta adresinizi girin, size özel giriş linkini hemen gönderelim.</p>
          </motion.div>
          <motion.div variants={fadeUp} custom={1}>
            <MagicLinkForm variant="contact" />
          </motion.div>
        </div>
      </Section>

      {/* ─── FOOTER ─── */}
      <footer style={{ borderTop: '1px solid rgba(38,38,38,0.5)', padding: '3rem 1rem' }}>
        <div className="landing-footer-inner" style={{ maxWidth: '72rem', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles style={{ width: '14px', height: '14px', color: '#fff' }} />
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>PortfoliAI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.75rem', color: '#a3a3a3' }}>
            {[['#ozellikler','Özellikler'],['#fiyatlandirma','Fiyatlandırma'],['#sss','S.S.S'],['#iletisim','İletişim']].map(([href, label]) => (
              <a key={href} href={href} className="landing-nav-link" style={{ color: '#a3a3a3', textDecoration: 'none', transition: 'color 0.3s' }}>{label}</a>
            ))}
          </div>
          <p style={{ fontSize: '0.75rem', color: '#a3a3a3' }}>© 2024 PortfoliAI. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  )
}
