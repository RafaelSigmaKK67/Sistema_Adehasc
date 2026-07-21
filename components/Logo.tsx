// Logo da ADEHASC recriado em SVG embutido — casa vermelha com folha verde,
// wordmark "ADEHA" escuro + "SC" vermelho e tagline azul.

export function CasaAdehasc({ tamanho = 44 }: { tamanho?: number }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 64 64"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="41" y="13" width="7" height="15" rx="1.5" fill="#d42b1e" />
      <path
        d="M32 7 L59 33 L52 33 L52 54 A3 3 0 0 1 49 57 L15 57 A3 3 0 0 1 12 54 L12 33 L5 33 Z"
        fill="#d42b1e"
      />
      <rect x="26.5" y="39" width="11" height="18" rx="2" fill="#ffffff" />
      <path
        d="M44.5 13 C44 5.5 51.5 1.5 58.5 3.5 C58 11.5 51.5 15 44.5 13 Z"
        fill="#4fae3d"
      />
    </svg>
  );
}

export default function Logo({
  tamanho = 44,
  comTagline = false,
}: {
  tamanho?: number;
  comTagline?: boolean;
}) {
  return (
    <span className="logo" translate="no">
      <CasaAdehasc tamanho={tamanho} />
      <span className="logo-textos">
        <span className="logo-nome" aria-label="ADEHASC">
          ADEHA<span className="logo-sc">SC</span>
        </span>
        {comTagline && (
          <span className="logo-tagline">
            Associação para o Desenvolvimento Habitacional Sustentável de Santa Catarina
          </span>
        )}
      </span>
    </span>
  );
}
