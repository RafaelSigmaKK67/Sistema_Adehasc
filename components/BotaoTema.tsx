'use client';

// Botão flutuante de modo escuro (canto inferior direito, presente em todas as
// páginas). A preferência fica salva no navegador e é aplicada antes da página
// desenhar, sem "piscar".

import { useEffect, useState } from 'react';

export default function BotaoTema() {
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    setEscuro(document.documentElement.getAttribute('data-tema') === 'escuro');
  }, []);

  function alternarTema() {
    const novo = !escuro;
    setEscuro(novo);
    if (novo) {
      document.documentElement.setAttribute('data-tema', 'escuro');
    } else {
      document.documentElement.removeAttribute('data-tema');
    }
    try {
      localStorage.setItem('adehasc_tema', novo ? 'escuro' : 'claro');
    } catch {
      /* navegação privada sem localStorage */
    }
  }

  return (
    <button
      type="button"
      className="botao-tema-flutuante"
      onClick={alternarTema}
      aria-pressed={escuro}
      aria-label={escuro ? 'Trocar para o modo claro' : 'Trocar para o modo escuro'}
      title={escuro ? 'Modo claro' : 'Modo escuro'}
    >
      <span aria-hidden="true">{escuro ? '☀' : '☾'}</span>
    </button>
  );
}
