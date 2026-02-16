import Link from 'next/link';
import Navigation from '@/components/Navigation';

const tabs = [
  ['dashboard', 'Dashboard'],
  ['sources', 'Sources'],
  ['documents', 'Documents'],
  ['pipeline', 'Pipeline'],
  ['indexes', 'Indexes'],
  ['entities', 'Entities'],
  ['users', 'Users'],
  ['settings', 'Settings'],
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map(([slug, label]) => (
            <Link key={slug} href={`/admin/${slug}`} className="rounded border bg-white px-3 py-1.5 text-sm">
              {label}
            </Link>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}
