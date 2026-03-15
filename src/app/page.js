import Link from 'next/link';
import RevealScript from '@/components/landing/RevealScript';
import '@/components/landing/landing.css';

export default function LandingPage() {
  return (
    <>
      <RevealScript />

      <nav className="landing-nav">
        <Link href="/" className="nav-logo">Run<em>way</em></Link>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <Link href="/app">Sign in</Link>
        </div>
        <Link href="/app" className="nav-cta">Start free &rarr;</Link>
      </nav>

      <section style={{ background: 'var(--bg)' }}>
        <div className="hero">
          <div>
            <div className="hero-eyebrow">Financial modeling &middot; Startups</div>
            <h1 className="hero-headline">Know your runway.<br /><em>Before</em> it runs out.</h1>
            <p className="hero-sub">Runway gives founders a live financial model — burn rate, runway, headcount, and actuals — without the spreadsheet chaos.</p>
            <div className="hero-actions">
              <Link href="/app" className="btn-primary">Start for free <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg></Link>
              <a href="#features" className="btn-ghost">See features</a>
            </div>
            <div className="hero-note">Free forever &middot; No credit card required</div>
          </div>
          <div className="hero-right">
            <div className="app-mock">
              {/* Runway card */}
              <div className="am-runway">
                <div className="am-runway-left">
                  <div className="am-label">CASH RUNWAY</div>
                  <div className="am-runway-num">27</div>
                  <div className="am-runway-sub">months remaining</div>
                  <div className="am-progress"><div className="am-progress-bar"></div></div>
                </div>
                <div className="am-runway-right">
                  <div className="am-label" style={{ textAlign: 'right' }}>CASH-OUT DATE</div>
                  <div className="am-cashout">May 2028</div>
                  <div className="am-cashout-sub">projected cash-out</div>
                </div>
              </div>
              {/* Metric cards */}
              <div className="am-cards">
                <div className="am-card">
                  <div className="am-card-label">CASH POSITION — MAR</div>
                  <div className="am-card-val" style={{ color: '#e8edf5' }}>$1,408,000.00</div>
                  <div className="am-card-sub">proj. month-end: $1,408,000.00</div>
                </div>
                <div className="am-card">
                  <div className="am-card-label">MONTHLY BURN</div>
                  <div className="am-card-val" style={{ color: '#f87171' }}>$85,950.00</div>
                  <div className="am-card-sub">$767,400.00/yr payroll +<br />$22,000.00/mo overhead</div>
                </div>
                <div className="am-card">
                  <div className="am-card-label">MONTHLY REVENUE</div>
                  <div className="am-card-val" style={{ color: '#4ade80' }}>$30,000.00</div>
                  <div className="am-card-sub">$360,000.00/yr</div>
                </div>
                <div className="am-card">
                  <div className="am-card-label">NET BURN</div>
                  <div className="am-card-val" style={{ color: '#f87171' }}>$55,950.00</div>
                  <div className="am-card-sub">cash outflow / month</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="stats">
        <div className="reveal"><div className="stat-num"><em>2</em> min</div><div className="stat-lbl">To your first model</div></div>
        <div className="reveal d1"><div className="stat-num"><em>$0</em></div><div className="stat-lbl">To get started</div></div>
        <div className="reveal d2"><div className="stat-num"><em>Live</em></div><div className="stat-lbl">Runway calculations</div></div>
      </div>

      <section className="features" id="features">
        <div className="reveal"><div className="eyebrow">What&apos;s included</div><h2 className="section-title">Everything a founder needs.<br /><em>Nothing they don&apos;t.</em></h2></div>
        <div className="feat-grid reveal">
          <div className="feat-card">
            <div className="feat-icon"><svg viewBox="0 0 24 24"><path d="M3 3v18h18" /><path d="M18 9l-5 5-2-2-4 4" /></svg></div>
            <div className="feat-title">Burn &amp; Runway</div>
            <div className="feat-body">See exactly how long your cash lasts. Update salaries, add a hire, watch the runway number change instantly.</div>
          </div>
          <div className="feat-card">
            <div className="feat-icon"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg></div>
            <div className="feat-title">Headcount Planning</div>
            <div className="feat-body">Model every employee and contractor with salaries, benefits, and start dates. Plan hires and reductions months out.</div>
          </div>
          <div className="feat-card">
            <div className="feat-icon"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg></div>
            <div className="feat-title">Revenue Pipeline</div>
            <div className="feat-body">Track clients and MRR with start dates. Your model auto-adjusts projections as deals close.</div>
          </div>
          <div className="feat-card">
            <div className="feat-icon"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M8 14h2v4H8z" /></svg></div>
            <div className="feat-title">Actuals Grid</div>
            <div className="feat-body">Enter real monthly numbers alongside your model. Compare actuals vs estimates to keep your runway honest.</div>
            <div className="feat-tag">Pro</div>
          </div>
          <div className="feat-card">
            <div className="feat-icon"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg></div>
            <div className="feat-title">Team Collaboration</div>
            <div className="feat-body">Invite your CFO, investors, or board as editors or viewers. Role-based access keeps your model secure.</div>
            <div className="feat-tag">Pro</div>
          </div>
          <div className="feat-card">
            <div className="feat-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /></svg></div>
            <div className="feat-title">Excel Export</div>
            <div className="feat-body">Export your full financial model to Excel with one click. Board meetings, investor updates, due diligence — covered.</div>
            <div className="feat-tag">Pro</div>
          </div>
        </div>
      </section>

      <section className="pricing" id="pricing">
        <div className="pricing-inner">
          <div className="reveal"><div className="eyebrow">Pricing</div><h2 className="section-title" style={{ marginBottom: 0 }}>Start free.<br /><em>Upgrade when you&apos;re ready.</em></h2></div>
          <div className="price-grid reveal">
            <div className="price-card">
              <div className="price-tier">Free</div>
              <div className="price-amt"><sup>$</sup>0</div>
              <div className="price-desc">Get started with no credit card. Build your first model in minutes.</div>
              <ul className="price-list">
                <li>Full financial model</li>
                <li>Burn rate &amp; runway dashboard</li>
                <li>Up to 1 employee</li>
                <li>Revenue pipeline</li>
                <li>Cloud save</li>
                <li className="na">Actuals grid</li>
                <li className="na">Team collaboration</li>
                <li className="na">Excel export</li>
              </ul>
              <Link href="/app" className="price-btn outline">Get started free</Link>
            </div>
            <div className="price-card dark">
              <div className="price-tier">Pro</div>
              <div className="price-amt"><sup>$</sup>49<span>/mo</span></div>
              <div className="price-desc">For founders and finance leads who need the full picture.</div>
              <ul className="price-list">
                <li>Everything in Free</li>
                <li>Unlimited employees</li>
                <li>Actuals grid</li>
                <li>Team collaboration</li>
                <li>Editor &amp; viewer roles</li>
                <li>Excel export</li>
                <li>Priority support</li>
              </ul>
              <Link href="/app" className="price-btn solid">Start Pro — $49/mo</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <h2 className="cta-title reveal">Your runway is ticking.<br /><em>Start modeling today.</em></h2>
        <p className="cta-sub reveal">Free to start. No spreadsheets. No consultants. Just clear numbers.</p>
        <Link href="/app" className="btn-primary reveal">Start for free <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg></Link>
        <div className="cta-note reveal">No credit card required &middot; Cancel anytime</div>
      </section>

      <footer className="landing-footer">
        <Link href="/" className="foot-logo">Run<em>way</em></Link>
        <div className="foot-copy">&copy; 2026 Runway &middot; Financial modeling for startups</div>
      </footer>
    </>
  );
}
