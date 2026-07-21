// Camada protegida do painel administrativo: sem sessão de admin, volta para a entrada.

import { redirect } from 'next/navigation';
import MenuAdmin from '@/components/MenuAdmin';
import { obterSessao } from '@/lib/sessao';

export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const sessao = obterSessao();
  if (!sessao || sessao.papel !== 'admin') {
    redirect('/admin/entrar');
  }
  return (
    <div className="admin-layout">
      <MenuAdmin />
      <main className="admin-conteudo">{children}</main>
    </div>
  );
}
