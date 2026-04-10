import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, Users, CheckSquare, Zap, Globe, Shield, 
  TrendingUp, Star, ChevronRight, ArrowRight, Play,
  Building2, Award, Clock, Target, Menu, X
} from "lucide-react";

const FEATURES = [
  {
    icon: BarChart3,
    title: "Real-time KPI Tracking",
    desc: "Monitor every metric that moves the needle — live, with zero lag.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Building2,
    title: "Multi-Tenant Architecture",
    desc: "Each workspace is fully isolated. Enterprise-grade data separation by design.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: Zap,
    title: "Smart Task Assignment",
    desc: "AI-ready task routing ensures the right task reaches the right person.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: TrendingUp,
    title: "Advanced Analytics",
    desc: "Weekly, monthly, yearly trends with drill-down by employee or department.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Award,
    title: "Global Rewards Engine",
    desc: "Automate incentives and recognition programs across all your teams.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    desc: "Role-based access control, session protection, and encrypted data at rest.",
    color: "from-indigo-500 to-blue-500",
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah Mitchell",
    role: "COO, NovaTech Solutions",
    avatar: "SM",
    text: "Zaptiz WorkHub transformed how we manage our 200+ remote team. KPI visibility went from monthly reports to real-time dashboards. Game-changing.",
    rating: 5,
  },
  {
    name: "Rajan Pillai",
    role: "HR Director, Apex Digital",
    avatar: "RP",
    text: "The multi-tenant architecture is exactly what we needed to manage our subsidiary companies. Each team feels they have their own platform.",
    rating: 5,
  },
  {
    name: "Linh Nguyen",
    role: "Operations Lead, FastScale",
    avatar: "LN",
    text: "Task completion rates jumped 40% in the first month. The leaderboard and reward engine genuinely motivates our controllers and employees.",
    rating: 5,
  },
];

const PRICING = [
  {
    name: "Starter",
    price: "$49",
    period: "/month",
    desc: "Perfect for growing teams getting started with KPI management.",
    features: ["Up to 50 employees", "Real-time KPI tracking", "Task management", "Basic reports", "Email support"],
    cta: "Start for Free",
    popular: false,
    gradient: "from-slate-700 to-slate-800",
  },
  {
    name: "Enterprise",
    price: "$149",
    period: "/month",
    desc: "Built for scaling companies that need full analytics and team control.",
    features: ["Up to 500 employees", "Advanced analytics", "Department management", "Custom leaderboards", "Rewards engine", "Priority support"],
    cta: "Start Free Trial",
    popular: true,
    gradient: "from-blue-600 to-violet-600",
  },
  {
    name: "Global",
    price: "Custom",
    period: "",
    desc: "Enterprise-grade for large organizations with complex requirements.",
    features: ["Unlimited employees", "White-label option", "SLA guarantee", "Dedicated CSM", "API access", "Custom integrations"],
    cta: "Contact Sales",
    popular: false,
    gradient: "from-slate-700 to-slate-800",
  },
];

const LIVE_STATS = [
  { label: "Active Users", value: "2,847", icon: Users, color: "text-blue-400" },
  { label: "Tasks Today", value: "1,293", icon: CheckSquare, color: "text-emerald-400" },
  { label: "KPI Score", value: "94.2%", icon: Target, color: "text-violet-400" },
  { label: "Avg Response", value: "1.2s", icon: Clock, color: "text-amber-400" },
  { label: "Countries", value: "38", icon: Globe, color: "text-pink-400" },
];

function NavBar({ onCTA }: { onCTA: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-slate-950/90 backdrop-blur-xl border-b border-white/5 shadow-2xl" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Zaptiz <span className="text-blue-400">WorkHub</span></span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {["Features", "Pricing", "Testimonials"].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} className="text-slate-400 hover:text-white text-sm font-medium transition-colors">
              {item}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button onClick={onCTA} className="text-slate-400 hover:text-white text-sm font-medium px-4 py-2 transition-colors">
            Sign In
          </button>
          <button
            onClick={onCTA}
            className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
          >
            Start Your Workspace
          </button>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-white" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-slate-950/95 backdrop-blur-xl border-t border-white/5 px-6 py-4 space-y-4">
            {["Features", "Pricing", "Testimonials"].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="block text-slate-300 hover:text-white text-sm font-medium" onClick={() => setMenuOpen(false)}>
                {item}
              </a>
            ))}
            <button onClick={() => { onCTA(); setMenuOpen(false); }}
              className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold px-5 py-3 rounded-xl">
              Start Your Workspace
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const handleCTA = () => navigate("/login");

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      <NavBar onCTA={handleCTA} />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-24 pb-16">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-3xl" />
          {/* Grid */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-400 font-medium mb-8">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              Now with Advanced Task Analytics
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none mb-6">
              The Command Center for
              <span className="block bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                High-Performance Teams
              </span>
            </h1>

            <p className="text-slate-400 text-lg md:text-xl max-w-3xl mx-auto mb-10 leading-relaxed">
              Unify your workforce, automate KPI tracking, and deploy global rewards — all from one intelligent dashboard built for modern enterprises.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                id="hero-start-workspace-btn"
                onClick={handleCTA}
                className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold px-8 py-4 rounded-2xl text-base transition-all duration-200 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105"
              >
                Start Your Workspace
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                id="hero-see-how-btn"
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center gap-2 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold px-8 py-4 rounded-2xl text-base transition-all duration-200"
              >
                <Play className="w-4 h-4" />
                See How It Works
              </button>
            </div>
          </motion.div>

          {/* ── LIVE DASHBOARD PREVIEW ── */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-20 max-w-4xl mx-auto"
          >
            <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl shadow-black/50">
              {/* Fake browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-slate-800/60">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
                </div>
                <div className="flex-1 text-center text-xs text-slate-500 font-mono">app.zaptiz.com/dashboard</div>
              </div>

              {/* Dashboard preview */}
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                  {LIVE_STATS.map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="bg-slate-800/60 rounded-2xl p-3 border border-white/5"
                    >
                      <stat.icon className={`w-4 h-4 ${stat.color} mb-2`} />
                      <div className="text-white font-bold text-lg">{stat.value}</div>
                      <div className="text-slate-500 text-xs">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Fake chart bars */}
                <div className="bg-slate-800/40 rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-300 text-sm font-semibold">Team Performance Trend</span>
                    <span className="text-emerald-400 text-xs bg-emerald-400/10 px-2 py-0.5 rounded-full">↑ 12% this week</span>
                  </div>
                  <div className="flex items-end gap-1 h-20">
                    {[40, 60, 45, 80, 65, 90, 75, 95, 70, 88, 92, 85].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: 0.8 + i * 0.05, duration: 0.5 }}
                        className={`flex-1 rounded-sm ${i === 11 ? "bg-gradient-to-t from-blue-600 to-violet-500" : "bg-slate-700"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Platform Features</div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Everything your team needs.<br />
              <span className="text-slate-400">Nothing they don't.</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Built from the ground up for high-growth teams who can't afford to miss a beat.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group bg-slate-900/50 hover:bg-slate-900 border border-white/5 hover:border-white/10 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/10 to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Simple Pricing</div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Start free. Scale as you grow.</h2>
            <p className="text-slate-400">No hidden fees. No credit card required for free trial.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {PRICING.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl overflow-hidden border ${plan.popular ? "border-blue-500/50 scale-105" : "border-white/10"}`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-violet-500" />
                )}
                <div className={`bg-gradient-to-br ${plan.gradient} p-6`}>
                  {plan.popular && (
                    <div className="inline-flex items-center gap-1 bg-white/20 rounded-full px-3 py-1 text-xs font-semibold text-white mb-3">
                      <Star className="w-3 h-3 fill-white" /> Most Popular
                    </div>
                  )}
                  <div className="text-slate-300 text-sm font-medium mb-2">{plan.name}</div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    <span className="text-slate-400 text-sm">{plan.period}</span>
                  </div>
                  <p className="text-slate-400 text-sm">{plan.desc}</p>
                </div>
                <div className="bg-slate-900/80 p-6">
                  <ul className="space-y-3 mb-6">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={handleCTA}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${plan.popular
                      ? "bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-lg shadow-blue-500/25"
                      : "border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white"
                      }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      <section id="testimonials" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Customer Stories</div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Trusted by teams worldwide</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all duration-300"
              >
                <div className="flex mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-white text-sm font-semibold">{t.name}</div>
                    <div className="text-slate-500 text-xs">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────── */}
      <section className="py-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600 via-violet-600 to-cyan-600 p-12 md:p-16">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <div className="relative">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-white">
                Start Free Today
              </h2>
              <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
                Join thousands of teams using Zaptiz WorkHub to unlock peak performance. No credit card required.
              </p>
              <button
                id="cta-start-free-btn"
                onClick={handleCTA}
                className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold px-10 py-4 rounded-2xl text-base hover:bg-blue-50 transition-all duration-200 shadow-xl hover:scale-105"
              >
                Launch Your Command Center
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-bold">Zaptiz</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">Command center for high-performance teams worldwide.</p>
            </div>

            {[
              { title: "Product", links: ["Features", "Pricing", "Changelog", "Roadmap"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
              { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Security"] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="text-white font-semibold text-sm mb-4">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(l => (
                    <li key={l}>
                      <a href="#" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-600 text-sm">© {new Date().getFullYear()} Zaptiz WorkHub. All rights reserved.</p>
            <p className="text-slate-700 text-xs">Built for high-performance teams</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
