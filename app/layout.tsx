import type { Metadata, Viewport } from 'next';
import { Atkinson_Hyperlegible } from 'next/font/google';
import BotaoTema from '@/components/BotaoTema';
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

// Aplica o modo escuro antes da página desenhar (sem "piscar").
const scriptPreferencias = `try{if(localStorage.getItem('adehasc_tema')==='escuro'){document.documentElement.setAttribute('data-tema','escuro');}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={fonte.className}>
        <script dangerouslySetInnerHTML={{ __html: scriptPreferencias }} />
        <a className="pular-conteudo" href="#conteudo">
          Pular para o conteúdo
        </a>
        {modoDemonstracao() && (
          <div className="faixa-demo" role="status">
            Modo demonstração — os cadastros ainda não estão sendo salvos.
          </div>
        )}
        <div id="conteudo">{children}</div>
        <BotaoTema />
      </body>
    </html>
  );
}
