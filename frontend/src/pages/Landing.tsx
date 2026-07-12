import { Link } from 'react-router-dom';
import { Package, ShieldCheck, Calendar, Wrench, ArrowRight } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-foreground flex flex-col font-sans">
      {/* Navbar header */}
      <header className="px-8 h-20 border-b border-border flex items-center justify-between max-w-7xl w-full mx-auto bg-white">
        <div className="flex items-center gap-3">
          <div className="size-8.5 bg-primary rounded-xs flex items-center justify-center shadow-none">
            <span className="font-mono font-bold text-sm text-white">AF</span>
          </div>
          <span className="font-bold text-sm tracking-tight text-foreground uppercase font-mono">AssetFlow</span>
        </div>
        <div className="flex items-center gap-4">
          {/* <Link to="/login" className="text-xs font-bold text-foreground uppercase tracking-wider font-mono hover:underline">
            Sign In
          </Link> */}
          <Link to="/signup" className="text-xs font-bold bg-primary hover:opacity-90 text-white px-6 py-3 rounded-full font-mono uppercase tracking-wider">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-16 md:py-24 bg-white flex flex-col gap-24">
        {/* Hero Grid 50:50 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Column: Content */}
          <div className="flex flex-col items-start text-left">
            {/* <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-border text-foreground text-[10px] font-mono font-bold uppercase tracking-wider mb-6">
              <ShieldCheck className="size-3.5 text-[#003c33]" />
              <span>Centralized Enterprise ERP</span>
            </div> */}

            <h1 className="text-4xl md:text-6xl font-bold tracking-[-1.5px] text-foreground mb-6 leading-[1.1]">
              Physical assets & resources.<br />
              <span className="text-accent">Controlled with precision.</span>
            </h1>

            <p className="text-muted-foreground text-sm md:text-base mb-8 leading-relaxed font-sans max-w-lg">
              AssetFlow is an enterprise-grade ERP system built to eliminate spreadsheet chaos. Register physical inventory, schedule resource bookings, execute maintenance workflows, and run compliance audits in one unified hub.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto">
              <Link 
                to="/signup" 
                className="flex items-center justify-center gap-2 bg-primary hover:opacity-90 text-white text-xs font-bold font-mono uppercase tracking-wider px-8 py-3.5 rounded-full shadow-none w-full sm:w-auto text-center"
              >
                <span>Register Employee Account</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link 
                to="/login" 
                className="text-xs font-bold text-foreground uppercase tracking-wider font-mono underline hover:text-accent py-2"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Right Column: Image Preview */}
          <div className="relative border border-border rounded-xs overflow-hidden bg-slate-50/50 p-2">
            <img 
              src="/dashboard_mockup.png" 
              alt="AssetFlow Dashboard Mockup" 
              className="w-full h-auto object-cover border border-border rounded-xs select-none"
            />
          </div>
        </div>

        {/* Monochrome Trust Logo Strip */}
        <div className="w-full max-w-4xl mx-auto mb-24 border-t border-b border-border py-8 flex flex-col gap-4 items-center">
          <span className="text-[10px] uppercase font-mono font-bold text-muted-foreground tracking-widest">Trusted by Compliance Audited Divisions</span>
          <div className="flex flex-wrap justify-center items-center gap-12 text-sm font-mono font-extrabold text-muted-foreground/60 tracking-wider">
            <span>METRO_LOGISTICS</span>
            <span>APEX_VALUATION</span>
            <span>SECURE_INFRA</span>
            <span>VERTEX_CORP</span>
          </div>
        </div>

        {/* Capability Cards / 3-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left mb-24">
          <div className="p-8 rounded-sm bg-secondary/20 border border-border">
            <div className="size-10 rounded-xs bg-primary/5 text-primary flex items-center justify-center mb-6">
              <Package className="size-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground font-mono uppercase tracking-wider mb-3">Asset Lifecycle</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Track asset health, details, custom parameters, and location history through state changes from acquisition to retirement.
            </p>
          </div>

          <div className="p-8 rounded-sm bg-secondary/20 border border-border">
            <div className="size-10 rounded-xs bg-primary/5 text-primary flex items-center justify-center mb-6">
              <Calendar className="size-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground font-mono uppercase tracking-wider mb-3">Shared Scheduler</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Schedule meeting rooms, cars, and equipment in real-time. Automated conflict checking ensures zero overlaps.
            </p>
          </div>

          <div className="p-8 rounded-sm bg-secondary/20 border border-border">
            <div className="size-10 rounded-xs bg-primary/5 text-primary flex items-center justify-center mb-6">
              <Wrench className="size-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground font-mono uppercase tracking-wider mb-3">Kanban Repairs</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Submit maintenance tickets, approve repair budgets, assign tech contractors, and track repair tasks on a Kanban board.
            </p>
          </div>
        </div>

        {/* Deep Green Feature Band */}
        <div className="w-full bg-[#003c33] text-white p-12 md:p-20 rounded-md text-left flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-3 max-w-xl">
            <span className="text-[10px] font-bold tracking-widest font-mono uppercase text-accent">Auditing Security</span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Ready for Q3 Compliance Audits?</h2>
            <p className="text-white/70 text-xs md:text-sm leading-relaxed">
              Run real-time barcode reconciliation and discrepancy verification. Automatically update your ledger matching local regulations.
            </p>
          </div>
          <Link 
            to="/login" 
            className="bg-white text-[#003c33] hover:opacity-90 font-mono font-bold text-xs uppercase tracking-wider px-8 py-4 rounded-full inline-flex items-center gap-2 shrink-0"
          >
            <span>Launch audit cycle</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-20 border-t border-border flex items-center justify-center text-[10px] font-mono uppercase tracking-wider text-muted-foreground max-w-7xl w-full mx-auto px-8">
        <p>&copy; {new Date().getFullYear()} AssetFlow ERP. Built for corporate resource transparency.</p>
      </footer>
    </div>
  );
}
