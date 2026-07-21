'use client';

// Barra fina no topo com o botão de modo escuro (a preferência fica salva no
// navegador e é aplicada antes da página desenhar, sem "piscar").

import { useEffect, useState } from 'react';

export default function BarraAcessibilidade() {
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
    <div className="barra-topo" role="region" aria-label="Preferências de exibição">
      <button
        type="button"
        className="botao-tema"
        onClick={alternarTema}
        aria-pressed={escuro}
      >
        <span aria-hidden="true">{escuro ? '☀' : '☾'}</span>
        {escuro ? 'Modo claro' : 'Modo escuro'}
      </button>
      <a className="barra-topo-fone" href="tel:+554936223137">
        ☎ (49) 3622-3137
      </a>
    </div>
  );
}
