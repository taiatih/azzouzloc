"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'Accueil', icon: '🏠' },
  { href: '/articles', label: 'Articles', icon: '📦' },
  { href: '/reservations/nouvelle', label: 'Réserver', icon: '➕' },
  { href: '/calendrier', label: 'Calendrier', icon: '🗓️' },
  { href: '/settings', label: 'Réglages', icon: '⚙️' },
];

export default function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="mobile-nav">
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = pathname === it.href;
          return (
            <li key={it.href}>
              <Link href={it.href} className={`mobile-nav-item ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <span aria-hidden>{it.icon}</span>
                <span className="mt-0.5">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
