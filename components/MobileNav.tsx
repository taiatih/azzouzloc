"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function Icon({ name, active }: { name: 'home'|'box'|'list'|'plus'|'calendar'; active?: boolean }){
  const stroke = active ? '#2563eb' : '#6b7280';
  const props = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as any;
  switch(name){
    case 'home': return (<svg {...props}><path d="M3 10.5L12 3l9 7.5"/><path d="M9 22V12h6v10"/></svg>);
    case 'box': return (<svg {...props}><path d="M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="M3.3 7L12 12l8.7-5"/></svg>);
    case 'list': return (<svg {...props}><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>);
    case 'plus': return (<svg {...props}><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>);
    case 'calendar': return (<svg {...props}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>);
  }
}

const items = [
  { href: '/', label: 'Accueil', icon: 'home' as const },
  { href: '/articles', label: 'Articles', icon: 'box' as const },
  { href: '/reservations', label: 'Réservations', icon: 'list' as const },
  { href: '/reservations/nouvelle', label: 'Réserver', icon: 'plus' as const },
  { href: '/calendrier', label: 'Calendrier', icon: 'calendar' as const },
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
                <Icon name={it.icon} active={active} />
                <span className="mt-0.5">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
