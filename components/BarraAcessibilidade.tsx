'use client';

// Barra de acessibilidade fixa: A– / A+ (4 níveis) e alto contraste.
// As preferências ficam no localStorage e são aplicadas antes da página desenhar
// por um script no layout raiz.

import { useEffect, useState } from 'react';

const NIVEL_MAXIMO = 3;
const NIVEL_PADRAO = 1;

export default function BarraAcessibilidade() {
  const [nivel, setNivel] = useState(NIVEL_PADRAO);
  const [contraste, setContraste] = useState(false);

  useEffect(() => {
    const raiz = document.documentElement;
    const salvo = parseInt(raiz.getAttribute('data-fonte') || '', 10);
    if (!Number.isNaN(salvo) && salvo >= 0 && salvo <= NIVEL_MAXIMO) setNivel(salvo);
    setContraste(raiz.getAttribute('data-contraste') === '1');
  }, []);

  function aplicarNivel(novo: number) {
    const limitado = Math.min(Math.max(novo, 0), NIVEL_MAXIMO);
    setNivel(limitado);
    document.documentElement.setAttribute('data-fonte', String(limitado));
    try {
      localStorage.setItem('adehasc_fonte', String(limitado));
    } catch {
      /* navegação privada sem localStorage */
    }
  }

  function alternarContraste() {
    const novo = !contraste;
    setContraste(novo);
    if (novo) {
      document.documentElement.setAttribute('data-contraste', '1');
    } else {
      document.documentElement.removeAttribute('data-contraste');
    }
    try {
      localStorage.setItem('adehasc_contraste', novo ? '1' : '0');
    } catch {
      /* navegação privada sem localStorage */
    }
  }

  return (
    <div className="barra-acesso" role="region" aria-label="Opções de acessibilidade">
      <div className="barra-acesso-grupo">
        <span className="barra-acesso-rotulo">Tamanho da letra:</span>
        <button
          type="button"
          className="barra-acesso-botao"
          onClick={() => aplicarNivel(nivel - 1)}
          disabled={nivel <= 0}
          aria-label="Diminuir o tamanho da letra"
        >
          A−
        </button>
        <button
          type="button"
          className="barra-acesso-botao"
          onClick={() => aplicarNivel(nivel + 1)}
          disabled={nivel >= NIVEL_MAXIMO}
          aria-label="Aumentar o tamanho da letra"
        >
          A+
        </button>
        <button
          type="button"
          className="barra-acesso-botao barra-acesso-contraste"
          onClick={alternarContraste}
          aria-pressed={contraste}
        >
          Alto contraste
        </button>
      </div>
      <a className="barra-acesso-fone" href="tel:+554936223137">
        ☎ (49) 3622-3137
      </a>
    </div>
  );
}
