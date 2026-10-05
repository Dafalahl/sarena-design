export default function Footer() {
  return (
    <footer className="bg-white border-t-[3px] border-black py-12 text-black select-none">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="space-y-2">
          <span className="text-xl font-black tracking-tighter">SARENA DESIGN</span>
          <p className="text-slate-600 text-xs font-semibold max-w-sm leading-relaxed">
            The premier escrow marketplace securing web design deliverables and transactions.
          </p>
        </div>
        <div className="flex flex-wrap gap-8 text-xs font-bold font-mono uppercase tracking-wider">
          <a href="#" className="hover:text-accent-purple hover:underline transition-all">Terms of Service</a>
          <a href="#" className="hover:text-accent-purple hover:underline transition-all">Privacy Policy</a>
          <a href="/contact" className="hover:text-accent-purple hover:underline transition-all">Support Center</a>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 mt-8 pt-6 border-t-2 border-black/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest">
        <span>© {new Date().getFullYear()} Sarena. All Rights Reserved.</span>
        <span>Secure Escrow Protection TM</span>
      </div>
    </footer>
  );
}
