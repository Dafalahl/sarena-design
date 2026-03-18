import Link from "next/link";
import Button from "@/components/Button";

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full flex flex-col items-center justify-center min-h-[85vh] overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 -translate-y-12 shrink-0 blur-3xl opacity-30 select-none pointer-events-none w-[800px] h-[500px] bg-indigo-500 rounded-full mix-blend-screen" />
        <div className="absolute top-1/4 right-0 translate-x-1/3 shrink-0 blur-3xl opacity-20 select-none pointer-events-none w-[600px] h-[600px] bg-rose-500 rounded-full mix-blend-screen" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center mt-20">
          <div className="inline-flex space-x-2 items-center rounded-full glass px-3 py-1 text-sm text-indigo-300 font-medium mb-8">
            <span className="flex w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <span>The premier escrow marketplace for creators</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-8">
            Design freely. <br className="hidden md:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-rose-400">
              Get paid securely.
            </span>
          </h1>
          
          <p className="mt-4 text-xl text-slate-300 max-w-2xl mx-auto mb-12">
            Connect with top-tier illustrators and designers. Our admin-validated Escrow (Rekber) system ensures your project is delivered safely before funds are released.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Link href="/explore">
              <Button variant="gradient" className="text-base px-8 py-4">
                Explore Creators
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" className="text-base px-8 py-4 bg-slate-900/50 backdrop-blur-md">
                Become a Creator
              </Button>
            </Link>
          </div>
        </div>

        {/* Floating Mockup / Stats Elements */}
        <div className="relative z-0 mt-20 w-full max-w-6xl mx-auto hidden md:flex justify-center flex-wrap gap-8 opacity-80">
          <div className="glass p-6 rounded-2xl w-64 transform -rotate-6 hover:rotate-0 transition-transform duration-500 cursor-pointer">
            <div className="h-32 rounded-xl bg-slate-800 animate-pulse mb-4 flex items-center justify-center">
              <span className="text-slate-600">Portfolio Preview</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-white">@alexdesigns</span>
              <span className="text-rose-400 font-bold">$150</span>
            </div>
          </div>
          <div className="glass p-6 rounded-2xl w-64 transform translate-y-8 hover:-translate-y-2 relative z-10 shadow-2xl transition-transform duration-500 cursor-pointer border-indigo-500/30">
            <div className="h-40 rounded-xl bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center mb-4">
               <span className="text-indigo-400 font-medium">Verified Escrow</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div className="bg-indigo-500 h-2 rounded-full w-3/4"></div>
            </div>
            <p className="text-xs text-slate-400 mt-3 text-center">Payment secured in Rekber</p>
          </div>
          <div className="glass p-6 rounded-2xl w-64 transform rotate-6 hover:rotate-0 transition-transform duration-500 cursor-pointer">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">✓</div>
              <div className="text-sm">
                <p className="text-white font-medium">Completion Approved</p>
                <p className="text-slate-400">Funds released</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
