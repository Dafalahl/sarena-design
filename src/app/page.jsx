'use client'

import Link from 'next/link';
import { Play, Sparkles, Shield, Users, Award, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="w-full bg-[#FAF9F6] text-black">
      {/* ─── Hero Section ─── */}
      <section className="relative min-h-[90vh] pt-32 pb-16 px-5 sm:px-6 lg:px-8 border-b-[3px] border-black flex items-center">
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero Content Left */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 border border-black bg-white px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider shadow-brutalist-sm">
              <Sparkles className="w-3.5 h-3.5 text-accent-purple" />
              <span>Sarena Escrow™ Protection</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95] uppercase">
              Close the rift <br />
              <span className="text-slate-500">linking</span> <br />
              <span className="bg-accent-lime px-3 py-1 border-2 border-black inline-block mt-2 shadow-brutalist-sm text-black">
                design
              </span> &amp; payment
            </h1>
            
            <p className="text-sm sm:text-base md:text-lg leading-relaxed max-w-xl font-bold text-slate-800 pt-2">
              Shape scattered web design scopes into verified digital products via client-approved escrow workflows. Protect your funds and files automatically.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Link href="/explore">
                <Button size="lg" variant="default">
                  Hire Creators
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="secondary">
                  Become a Creator
                </Button>
              </Link>
            </div>
          </div>

          {/* Hero Graphic Right */}
          <div className="lg:col-span-5 relative">
            <div className="border-[3px] border-black bg-white p-2.5 shadow-brutalist max-w-md mx-auto relative group">
              <img 
                src="/images/hero.webp" 
                alt="Hero background" 
                className="w-full h-auto border-2 border-black grayscale object-cover" 
              />
              <div className="absolute -bottom-4 -left-4 bg-accent-purple text-white border-2 border-black px-4 py-2 font-mono font-bold uppercase text-[10px] tracking-wider shadow-brutalist-sm">
                Escrow Guarantee
              </div>
              <div className="absolute -top-4 -right-4 bg-accent-yellow text-black border-2 border-black px-3 py-1 font-mono font-bold uppercase text-[10px] tracking-wider shadow-brutalist-sm">
                Pakasir Powered
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ─── Purpose Section ─── */}
      <section id="purpose" className="py-16 md:py-24 px-5 sm:px-6 lg:px-8 bg-white border-b-[3px] border-black">
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-block border border-black bg-slate-50 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider">
              01 / Purpose
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase leading-[0.95]">
              Bridging the trust gap in creative delivery.
            </h2>
            <p className="text-slate-800 text-sm sm:text-base leading-relaxed font-bold">
              We started Sarena Design because the conventional way of hiring designers is flawed. Creators worry about getting ghosted after finishing projects, while clients fear depositing funds only to receive low-quality work. 
            </p>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-medium">
              Sarena provides a legal escrow framework that holds milestones, manages files, and verifies work quality before any funds change hands.
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Box 1 */}
            <div className="p-6 border-2 border-black bg-[#FAF9F6] space-y-4 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brutalist active:translate-x-0 active:translate-y-0 active:shadow-brutalist-sm transition-all shadow-brutalist-sm group">
              <div className="w-12 h-12 border-2 border-black bg-accent-lime flex items-center justify-center text-black shadow-brutalist-sm group-hover:bg-black group-hover:text-white transition-colors">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider">Safe Escrow Protection</h3>
              <p className="text-slate-600 text-xs leading-relaxed font-medium">
                Payments are held legally secure in our Pakasir escrow vault. No deposits are sent directly to the creator until you approve the draft.
              </p>
            </div>

            {/* Box 2 */}
            <div className="p-6 border-2 border-black bg-[#FAF9F6] space-y-4 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brutalist active:translate-x-0 active:translate-y-0 active:shadow-brutalist-sm transition-all shadow-brutalist-sm group">
              <div className="w-12 h-12 border-2 border-black bg-accent-purple flex items-center justify-center text-white shadow-brutalist-sm group-hover:bg-black group-hover:text-white transition-colors">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider">Verified Top Talent</h3>
              <p className="text-slate-600 text-xs leading-relaxed font-medium">
                Creators undergo a strict background check. Browse portfolios, verified reviews, and explicit flat pricing before choosing to hire.
              </p>
            </div>

            {/* Box 3 */}
            <div className="p-6 border-2 border-black bg-[#FAF9F6] space-y-4 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brutalist active:translate-x-0 active:translate-y-0 active:shadow-brutalist-sm transition-all shadow-brutalist-sm group">
              <div className="w-12 h-12 border-2 border-black bg-accent-orange flex items-center justify-center text-black shadow-brutalist-sm group-hover:bg-black group-hover:text-white transition-colors">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider">Zero-Dispute Process</h3>
              <p className="text-slate-600 text-xs leading-relaxed font-medium">
                Clear milestones are agreed upon before payment starts. In case of disagreement, our internal admin panel moderates objectively.
              </p>
            </div>

            {/* Box 4 */}
            <div className="p-6 border-2 border-black bg-[#FAF9F6] space-y-4 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brutalist active:translate-x-0 active:translate-y-0 active:shadow-brutalist-sm transition-all shadow-brutalist-sm group">
              <div className="w-12 h-12 border-2 border-black bg-accent-yellow flex items-center justify-center text-black shadow-brutalist-sm group-hover:bg-black group-hover:text-white transition-colors">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider">100% Quality Delivery</h3>
              <p className="text-slate-600 text-xs leading-relaxed font-medium">
                Designers upload source files directly to the project workspace. Inspect designs in high-res before triggering release.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ─── The Process Section ─── */}
      <section id="process" className="py-16 md:py-24 px-5 sm:px-6 lg:px-8 bg-[#FAF9F6] border-b-[3px] border-black">
        <div className="max-w-4xl mx-auto w-full space-y-12">
          
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-block border border-black bg-white px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider">
              02 / Process
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight">
              Simple, secure collaboration.
            </h2>
            <p className="text-slate-700 text-xs sm:text-sm font-bold uppercase tracking-wider font-mono">
              Follow our transparent lifecycle built around escrow checks.
            </p>
          </div>

          <div className="relative border-l-4 border-black ml-4 md:ml-8 space-y-8 py-4">
            
            {/* Step 1 */}
            <div className="relative pl-10 md:pl-14 group">
              <div className="absolute -left-6.5 top-0 w-12 h-12 border-[3px] border-black bg-black text-white flex items-center justify-center font-mono font-bold text-sm shadow-brutalist-sm group-hover:bg-accent-lime group-hover:text-black transition-colors">
                01
              </div>
              <div className="border-2 border-black bg-white p-5 shadow-brutalist-sm hover:shadow-brutalist hover:-translate-y-0.5 transition-all">
                <h3 className="text-sm font-black uppercase tracking-wider">Discover &amp; Engage</h3>
                <p className="text-slate-600 text-xs mt-2 leading-relaxed">
                  Browse our public catalog of vetted developers and illustrators. View their Creative Synopsis, pricing structures, and external portfolio links.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative pl-10 md:pl-14 group">
              <div className="absolute -left-6.5 top-0 w-12 h-12 border-[3px] border-black bg-black text-white flex items-center justify-center font-mono font-bold text-sm shadow-brutalist-sm group-hover:bg-accent-purple group-hover:text-white transition-colors">
                02
              </div>
              <div className="border-2 border-black bg-white p-5 shadow-brutalist-sm hover:shadow-brutalist hover:-translate-y-0.5 transition-all">
                <h3 className="text-sm font-black uppercase tracking-wider">Secure the Milestone</h3>
                <p className="text-slate-600 text-xs mt-2 leading-relaxed">
                  Click &quot;Start Workspace&quot;. Customize your price, revision allowance, briefing details, and complete your secure deposit payment via Sarena Escrow.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative pl-10 md:pl-14 group">
              <div className="absolute -left-6.5 top-0 w-12 h-12 border-[3px] border-black bg-black text-white flex items-center justify-center font-mono font-bold text-sm shadow-brutalist-sm group-hover:bg-accent-orange group-hover:text-black transition-colors">
                03
              </div>
              <div className="border-2 border-black bg-white p-5 shadow-brutalist-sm hover:shadow-brutalist hover:-translate-y-0.5 transition-all">
                <h3 className="text-sm font-black uppercase tracking-wider">Iterate and Deliver</h3>
                <p className="text-slate-600 text-xs mt-2 leading-relaxed">
                  The designer is notified, accepts the workspace terms via handshake, and communicates progress or delivers source files inside the portal.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative pl-10 md:pl-14 group">
              <div className="absolute -left-6.5 top-0 w-12 h-12 border-[3px] border-black bg-black text-white flex items-center justify-center font-mono font-bold text-sm shadow-brutalist-sm group-hover:bg-accent-yellow group-hover:text-black transition-colors">
                04
              </div>
              <div className="border-2 border-black bg-white p-5 shadow-brutalist-sm hover:shadow-brutalist hover:-translate-y-0.5 transition-all">
                <h3 className="text-sm font-black uppercase tracking-wider">Review &amp; Release</h3>
                <p className="text-slate-600 text-xs mt-2 leading-relaxed">
                  Download the final source file (up to 10MB) in your workspace. You can approve and finalize the delivery to release the funds, or request a revision cycle if needed.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── Developer Section ─── */}
      <section id="developer" className="py-16 md:py-24 px-5 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto w-full space-y-12">
          
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-block border border-black bg-slate-50 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider">
              03 / Developers
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight">
              Meet the creators
            </h2>
            <p className="text-slate-700 text-xs sm:text-sm font-bold uppercase tracking-wider font-mono">
              The creative engineering team behind Sarena Design&apos;s escrow transaction workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { name: "Rasyad Lintang Wahyunindar", role: "Leader", initial: "RL" },
              { name: "Muhammad Ramdhan", role: "Developer", initial: "MR" },
              { name: "Muhammad Fikrie Ath Thahiru", role: "Developer", initial: "MF" },
              { name: "Muhammad Dafa Falah Labib", role: "Developer", initial: "ML" },
              { name: "Sholahuddin Ahmad", role: "Developer", initial: "SA" }
            ].map((dev, idx) => (
              <div 
                key={idx} 
                className="bg-[#FAF9F6] border-2 border-black p-6 text-center flex flex-col items-center justify-center space-y-4 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-brutalist transition-all shadow-brutalist-sm group cursor-default select-none"
              >
                <div className="w-16 h-16 border-2 border-black bg-accent-lime text-black font-black text-base flex items-center justify-center shadow-brutalist-sm group-hover:bg-accent-purple group-hover:text-white transition-colors font-mono">
                  {dev.initial}
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-tight leading-tight">{dev.name}</h4>
                  <span className="inline-block font-mono text-[9px] uppercase tracking-wider font-bold border border-black px-2 py-0.5 mt-2 bg-white text-slate-700">
                    {dev.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
