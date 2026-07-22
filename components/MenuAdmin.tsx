'use client';

// Menu lateral do painel administrativo (vira barra horizontal no celular).

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const ITENS = [
  { href: '/admin', rotulo: 'Dashboard' },
  { href: '/admin/moradores', rotulo: 'Moradores' },
  { href: '/admin/comunicados', rotulo: 'Comunicados' },
  { href: '/admin/configuracoes', rotulo: 'Configurações' },
];

export default function MenuAdmin() {
  const caminho = usePathname();
  const router = useRouter();

  async function sair() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    router.push('/admin/entrar');
    router.refresh();
  }

  function ativo(href: string): boolean {
    if (href === '/admin') return caminho === '/admin';
    return caminho === href || caminho.startsWith(`${href}/`);
  }

  return (
    <aside className="admin-menu">
      <div className="admin-menu-titulo">
        <strong>ADEHASC</strong>
        <span>Painel administrativo</span>
      </div>
      <nav aria-label="Menu do painel administrativo">
        {ITENS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={ativo(item.href) ? 'ativo' : ''}
            aria-current={ativo(item.href) ? 'page' : undefined}
          >
            {item.rotulo}
          </Link>
        ))}
        <button type="button" className="admin-menu-sair" onClick={sair}>
          Sair
        </button>
      </nav>
    </aside>
  );
}
