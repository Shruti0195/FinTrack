import React from 'react';
import { 
  ArrowRight, 
  TrendingUp,
  ShieldCheck, 
  PieChart, 
  Target, 
  CheckCircle2, 
  Sparkles,
  BarChart3,
  Wallet
} from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* HERO SECTION */}
      <section style={{
        padding: '70px 24px 80px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        textAlign: 'center'
      }}>
        {/* Badge */}
        <div style={{ marginBottom: '20px' }}>
          <span className="badge-pill">
            <Sparkles size={14} />
            Smart Financial Tracking & Analytics
          </span>
        </div>

        {/* Main Headline */}
        <h1 style={{
          fontSize: '44px',
          fontWeight: 700,
          color: 'var(--primary)',
          letterSpacing: '-0.03em',
          maxWidth: '820px',
          margin: '0 auto 18px',
          lineHeight: 1.2
        }}>
          Track it. Understand it. <span style={{ color: 'var(--accent)' }}>Grow it.</span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '18px',
          color: 'var(--secondary-text)',
          maxWidth: '680px',
          margin: '0 auto 32px',
          lineHeight: 1.6
        }}>
          A unified personal finance system designed to record daily transactions, enforce real-time category budgets, reach savings goals, and evaluate your true Financial Health Score.
        </p>

        {/* Hero CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '60px' }}>
          <button 
            onClick={() => onOpenAuth('register')}
            className="btn-primary"
            style={{ padding: '13px 26px', fontSize: '15px' }}
          >
            Get Started Free
            <ArrowRight size={18} />
          </button>
          <button 
            onClick={() => onOpenAuth('login')}
            className="btn-outline"
            style={{ padding: '13px 24px', fontSize: '15px' }}
          >
            Sign In to Account
          </button>
        </div>

        {/* PRODUCT DASHBOARD PREVIEW (Adapts to Light / Dark Theme) */}
        <div style={{
          backgroundColor: 'var(--card)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          padding: '28px',
          textAlign: 'left',
          maxWidth: '1050px',
          margin: '0 auto',
          transition: 'background-color 0.2s ease, border-color 0.2s ease'
        }}>
          {/* Mockup Top Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '18px',
            marginBottom: '20px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>
                  Good Morning, Sweni! 👋
                </h3>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--secondary-text)', marginTop: '2px' }}>
                Here's your live financial overview for April 2026.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                fontSize: '12px',
                padding: '6px 12px',
                backgroundColor: 'var(--card-subtle)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--secondary-text)',
                fontWeight: 500
              }}>
                📅 April 2026 ▾
              </span>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 600
              }}>
                SS
              </div>
            </div>
          </div>

          {/* 3 Metric Cards + Health Score Gauge Card */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {/* Total Income */}
            <div style={{
              backgroundColor: 'var(--card-subtle)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '16px',
              borderLeft: '4px solid var(--accent)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--secondary-text)', fontWeight: 500 }}>Total Income</span>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--light-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: '11px' }}>↑</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', marginTop: '6px' }}>
                ₹85,000
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--accent)', fontWeight: 600, marginTop: '4px' }}>
                ↑ 12% vs. last month
              </div>
            </div>

            {/* Total Expenses */}
            <div style={{
              backgroundColor: 'var(--card-subtle)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '16px',
              borderLeft: '4px solid var(--danger)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--secondary-text)', fontWeight: 500 }}>Total Expenses</span>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', fontSize: '11px' }}>↑</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', marginTop: '6px' }}>
                ₹42,000
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--danger)', fontWeight: 600, marginTop: '4px' }}>
                ↑ 5% vs. last month
              </div>
            </div>

            {/* Net Savings */}
            <div style={{
              backgroundColor: 'var(--card-subtle)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '16px',
              borderLeft: '4px solid var(--info)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--secondary-text)', fontWeight: 500 }}>Savings</span>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--info)', fontSize: '11px' }}>★</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', marginTop: '6px' }}>
                ₹43,000
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--accent)', fontWeight: 600, marginTop: '4px' }}>
                ↑ 18% vs. last month
              </div>
            </div>

            {/* Financial Health Score Widget */}
            <div style={{
              backgroundColor: 'var(--card-subtle)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--secondary-text)', fontWeight: 500 }}>Financial Health</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)' }}>Good</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '4px 0' }}>
                <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--primary)' }}>78</span>
                <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>/ 100</span>
              </div>
              <div style={{ height: '7px', borderRadius: '4px', backgroundColor: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ width: '78%', height: '100%', backgroundColor: 'var(--accent)', borderRadius: '4px' }}></div>
              </div>
            </div>
          </div>

          {/* Charts Row Simulation */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '16px'
          }}>
            {/* Income vs Expenses Bar Chart Mockup */}
            <div style={{
              backgroundColor: 'var(--card-subtle)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>Income vs Expenses</span>
                <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>Last 6 Months</span>
              </div>

              {/* SVG Mockup Chart */}
              <svg viewBox="0 0 380 110" width="100%" height="110">
                <line x1="0" y1="25" x2="380" y2="25" stroke="var(--border)" strokeDasharray="3,3" opacity="0.6" />
                <line x1="0" y1="65" x2="380" y2="65" stroke="var(--border)" strokeDasharray="3,3" opacity="0.6" />
                <line x1="0" y1="105" x2="380" y2="105" stroke="var(--border)" />
                
                {/* Jan */}
                <rect x="25" y="45" width="12" height="60" rx="3" fill="#10B981" />
                <rect x="40" y="65" width="12" height="40" rx="3" fill="#EF4444" />
                {/* Feb */}
                <rect x="85" y="38" width="12" height="67" rx="3" fill="#10B981" />
                <rect x="100" y="60" width="12" height="45" rx="3" fill="#EF4444" />
                {/* Mar */}
                <rect x="145" y="32" width="12" height="73" rx="3" fill="#10B981" />
                <rect x="160" y="55" width="12" height="50" rx="3" fill="#EF4444" />
                {/* Apr */}
                <rect x="205" y="24" width="12" height="81" rx="3" fill="#10B981" />
                <rect x="220" y="52" width="12" height="53" rx="3" fill="#EF4444" />
                {/* May */}
                <rect x="265" y="20" width="12" height="85" rx="3" fill="#10B981" />
                <rect x="280" y="48" width="12" height="57" rx="3" fill="#EF4444" />
                {/* Jun */}
                <rect x="325" y="15" width="12" height="90" rx="3" fill="#10B981" />
                <rect x="340" y="45" width="12" height="60" rx="3" fill="#EF4444" />
              </svg>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--secondary-text)', marginTop: '8px' }}>
                <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
              </div>
            </div>

            {/* Expense Breakdown Donut & Legend Mockup */}
            <div style={{
              backgroundColor: 'var(--card-subtle)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>Expense Breakdown</span>
                <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600 }}>₹42,000 total</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {/* Donut representation */}
                <div style={{
                  width: '95px',
                  height: '95px',
                  borderRadius: '50%',
                  background: 'conic-gradient(#10B981 0 32%, #3B82F6 32% 60%, #F59E0B 60% 72%, #8B5CF6 72% 82%, #64748B 82% 100%)',
                  position: 'relative',
                  flexShrink: 0
                }}>
                  <div style={{
                    position: 'absolute',
                    inset: '16px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--primary)'
                  }}>
                    Apr
                  </div>
                </div>

                {/* Legend list */}
                <div style={{ flex: 1, fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--main-text)' }}><i style={{ display: 'inline-block', width: '8px', height: '8px', background: '#10B981', borderRadius: '2px', marginRight: '6px' }}></i>Food & Dining (32%)</span>
                    <b>₹13,440</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--main-text)' }}><i style={{ display: 'inline-block', width: '8px', height: '8px', background: '#3B82F6', borderRadius: '2px', marginRight: '6px' }}></i>Rent (28%)</span>
                    <b>₹11,760</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--main-text)' }}><i style={{ display: 'inline-block', width: '8px', height: '8px', background: '#F59E0B', borderRadius: '2px', marginRight: '6px' }}></i>Transport (12%)</span>
                    <b>₹5,040</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--main-text)' }}><i style={{ display: 'inline-block', width: '8px', height: '8px', background: '#8B5CF6', borderRadius: '2px', marginRight: '6px' }}></i>Shopping (10%)</span>
                    <b>₹4,200</b>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* CORE FEATURES GRID */}
      <section id="features" style={{
        backgroundColor: 'var(--section-alt-bg)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        padding: '80px 24px',
        transition: 'background-color 0.2s ease'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <span className="badge-pill" style={{ marginBottom: '12px' }}>Everything You Need</span>
            <h2 className="section-heading" style={{ fontSize: '30px', marginTop: '8px' }}>
              Built for Complete Financial Control
            </h2>
            <p className="normal-text" style={{ maxWidth: '600px', margin: '8px auto 0' }}>
              FinTrack replaces disconnected spreadsheets with an automated, intelligent analytics engine.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px'
          }}>
            {/* Feature 1 */}
            <div className="card-box">
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'var(--light-accent)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px'
              }}>
                <Wallet size={22} />
              </div>
              <h3 className="card-heading" style={{ marginBottom: '8px' }}>Unified Transactions</h3>
              <p className="small-text">
                Log income and expenses seamlessly across UPI, credit cards, bank transfers, and cash. Filter by date or category, and bulk import/export CSV statements.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card-box">
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--warning)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px'
              }}>
                <PieChart size={22} />
              </div>
              <h3 className="card-heading" style={{ marginBottom: '8px' }}>Live Category Budgets</h3>
              <p className="small-text">
                Set monthly limits on expenses. The system calculates real-time consumption so you never drift from reality, warning you automatically at 80% and 100%.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card-box">
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: 'var(--info)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px'
              }}>
                <Target size={22} />
              </div>
              <h3 className="card-heading" style={{ marginBottom: '8px' }}>Milestone Savings Goals</h3>
              <p className="small-text">
                Define long-term targets like emergency funds or new tech. FinTrack computes your required monthly savings pace to hit your deadline on time.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card-box">
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                color: '#8B5CF6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px'
              }}>
                <BarChart3 size={22} />
              </div>
              <h3 className="card-heading" style={{ marginBottom: '8px' }}>Financial Health Score</h3>
              <p className="small-text">
                Get an objective score out of 100 based on five weighted factors: savings rate, budget discipline, expense stability, essential mix, and debt behavior.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" style={{ padding: '80px 24px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span className="badge-pill">Simple 3-Step Flow</span>
          <h2 className="section-heading" style={{ fontSize: '30px', marginTop: '8px' }}>
            From Chaos to Complete Clarity
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '30px',
          position: 'relative'
        }}>
          <div style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--secondary)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              1
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              Create Your Account
            </h3>
            <p className="small-text">
              Sign up in 30 seconds with email and password. Your personal data is protected by industry-standard bcrypt encryption.
            </p>
          </div>

          <div style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              2
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              Log or Import Transactions
            </h3>
            <p className="small-text">
              Add your daily expenses and income entries, or drag and drop your bank CSV statements for bulk processing.
            </p>
          </div>

          <div style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--secondary)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              3
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
              Track, Budget & Improve
            </h3>
            <p className="small-text">
              Monitor monthly spending trends, receive automatic email budget threshold alerts, and improve your Financial Health Score.
            </p>
          </div>
        </div>
      </section>

      {/* SECURITY & PRIVACY PROMISE */}
      <section id="security" style={{
        backgroundColor: 'var(--section-alt-bg)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        padding: '60px 24px',
        transition: 'background-color 0.2s ease'
      }}>
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '18px'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            backgroundColor: 'var(--light-accent)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={28} />
          </div>
          <h2 className="section-heading" style={{ fontSize: '26px' }}>
            Your Financial Data Is Strictly Private
          </h2>
          <p className="normal-text" style={{ maxWidth: '640px' }}>
            FinTrack does not sell user data or run targeted financial ads. Passwords are never stored in plain text, every session uses cryptographic JWT authentication, and users can export or delete their data at any time.
          </p>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '24px',
            marginTop: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--secondary-text)' }}>
              <CheckCircle2 size={16} color="var(--accent)" />
              Bcrypt Password Hashing
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--secondary-text)' }}>
              <CheckCircle2 size={16} color="var(--accent)" />
              JWT Session Tokens
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--accent)' }}>
              <CheckCircle2 size={16} color="var(--accent)" />
              Automated Email Budget Alerts
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          backgroundColor: '#0F172A',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          padding: '48px 36px',
          color: '#FFFFFF',
          textAlign: 'center',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <h2 style={{ color: '#FFFFFF', fontSize: '32px', fontWeight: 700, marginBottom: '14px' }}>
            Ready to Take Control of Your Money?
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '16px', maxWidth: '580px', margin: '0 auto 28px', lineHeight: 1.5 }}>
            Join FinTrack today. Track transactions, respect your budgets, hit your savings targets, and achieve financial clarity.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => onOpenAuth('register')}
              className="btn-primary"
              style={{ padding: '12px 24px', fontSize: '14px' }}
            >
              Create Free Account
              <ArrowRight size={16} />
            </button>
            <button 
              onClick={() => onOpenAuth('login')}
              className="btn-outline"
              style={{ padding: '12px 22px', fontSize: '14px', backgroundColor: 'transparent', color: '#FFFFFF', borderColor: '#475569' }}
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        marginTop: 'auto',
        backgroundColor: 'var(--navbar-bg)',
        borderTop: '1px solid var(--border)',
        padding: '30px 24px',
        textAlign: 'center',
        transition: 'background-color 0.2s ease'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              backgroundColor: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <TrendingUp size={14} strokeWidth={2.5} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--primary)' }}>FinTrack</span>
          </div>
          <p className="small-text" style={{ fontSize: '13px' }}>
            © 2026 FinTrack. Personal Finance Analytics. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
};
