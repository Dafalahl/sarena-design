import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-rose-500">
              Sarena Design
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/explore" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Explore
            </Link>
            <Link href="/how-it-works" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              How it works
            </Link>
            <div className="h-6 w-px bg-slate-700" />
            <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Log in
            </Link>
            <Link href="/login">
              <Button variant="primary">Join Sarena</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
