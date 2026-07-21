import type { Metadata, Viewport } from 'next';
import { Atkinson_Hyperlegible } from 'next/font/google';
import BarraAcessibilidade from '@/components/BarraAcessibilidade';
import { modoDemonstracao } from '@/lib/ambiente';
import './globals.css';

const fonte = Atkinson_Hyperlegible({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ADEHASC — Regularização Fundiária',
  description:
    'Acompanhe o andamento do seu processo de regularização fundiária com a ADEHASC. Deixe o seu imóvel legal, com escritura no seu nome.',
  manifest: '/manifest.webmanifest',
  applicationName: 'ADEHASC',
};

export const viewport: Viewport = {
  themeColor: '#d42b1e',
  width: 'device-width',
  initialScale: 1,
};

// Aplica as preferências de acessibilidade antes da página desenhar (sem "piscar").
const scriptPreferencias = `try{var d=document.documentElement;var f=localStorage.getItem('adehasc_fonte');if(f!==null&&['0','1','2','3'].indexOf(f)>-1){d.setAttribute('data-fonte',f);}if(localStorage.getItem('adehasc_contraste')==='1'){d.setAttribute('data-contraste','1');}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={fonte.className}>
        <script dangerouslySetInnerHTML={{ __html: scriptPreferencias }} />
        <a className="pular-conteudo" href="#conteudo">
          Pular para o conteúdo
        </a>
        <BarraAcessibilidade />
        {modoDemonstracao() && (
          <div className="faixa-demo" role="status">
            Modo demonstração — os cadastros ainda não estão sendo salvos.
          </div>
        )}
        <div id="conteudo">{children}</div>
      </body>
    </html>
  );
}
