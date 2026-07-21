'use client';

// Campo de senha com botão "mostrar/ocultar", reutilizado em todo o sistema.

import { useState } from 'react';

type Props = {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  erro?: string;
  autoComplete?: string;
  dica?: string;
};

export default function CampoSenha({ id, rotulo, valor, aoMudar, erro, autoComplete, dica }: Props) {
  const [mostrar, setMostrar] = useState(false);
  return (
    <div className={`campo ${erro ? 'campo-com-erro' : ''}`}>
      <label htmlFor={id}>{rotulo}</label>
      {dica && <p className="campo-dica">{dica}</p>}
      <div className="senha-caixa">
        <input
          id={id}
          type={mostrar ? 'text' : 'password'}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={!!erro}
          aria-describedby={erro ? `${id}-erro` : undefined}
        />
        <button
          type="button"
          className="senha-alternar"
          onClick={() => setMostrar(!mostrar)}
          aria-pressed={mostrar}
          aria-label={mostrar ? 'Ocultar a senha' : 'Mostrar a senha'}
        >
          {mostrar ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      {erro && (
        <p className="msg-erro" id={`${id}-erro`}>
          {erro}
        </p>
      )}
    </div>
  );
}
