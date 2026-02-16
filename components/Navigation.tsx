'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={`px-3 py-2 text-sm rounded ${
        active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-200'
      }`}
    >
      {label}
    </Link>
  );
}

export default function Navigation() {
  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-semibold">
          SHALE
        </Link>
        <div className="flex items-center gap-1">
          <NavLink href="/chat" label="Search" />
          <NavLink href="/admin" label="Admin" />
        </div>
      </div>
    </nav>
  );
}
