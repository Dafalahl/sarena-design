'use client'

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  
  const isHomepage = pathname === '/';
  const isWorkspaceDetail = pathname ? (pathname.startsWith('/workspace/') && !pathname.startsWith('/workspace/new')) : false;
  const isDashboard = pathname ? (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/explore') ||
    pathname.startsWith('/sayembara') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/transactions') ||
    pathname.startsWith('/chat') ||
    pathname.startsWith('/inbox') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/help') ||
    pathname.startsWith('/faq') ||
    pathname.startsWith('/admin') ||
    pathname === '/workspace' ||
    pathname === '/workspace/new'
  ) : false;

  const isTransactionDetail = pathname ? (pathname.startsWith('/transactions/') && pathname !== '/transactions') : false;

  if (isWorkspaceDetail || isTransactionDetail) {
    return (
      <main className="flex-grow bg-background min-h-dvh">
        {children}
      </main>
    );
  }

  if (isHomepage) {
    return (
      <>
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </>
    );
  }

  if (isDashboard) {
    return (
      <>
        <Navbar />
        <main className="flex-grow pt-20 bg-background">
          {children}
        </main>
      </>
    );
  }

  const showFooter = pathname === '/' || 
                     pathname === '/membership' || 
                     pathname?.startsWith('/membership/') ||
                     pathname === '/contact' ||
                     pathname?.startsWith('/contact/');

  return (
    <>
      <Navbar />
      <main className="flex-grow pt-20">
        {children}
      </main>
      {showFooter && <Footer />}
    </>
  );
}
