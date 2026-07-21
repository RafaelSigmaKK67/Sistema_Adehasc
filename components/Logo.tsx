// Logo da ADEHASC recriado em SVG fiel à marca: casa vermelha com porta em arco,
// broto verde de duas folhas no telhado, wordmark "ADEHA" escuro + "SC" vermelho
// e tagline azul.

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
      {/* broto: caule com duas folhas */}
      <path
        d="M32 12 C31.2 8.5 29.8 5.8 27.2 3.6"
        fill="none"
        stroke="#4fae3d"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <ellipse cx="22.2" cy="4.9" rx="5.2" ry="2.9" fill="#4fae3d" transform="rotate(-25 22.2 4.9)" />
      <ellipse cx="32.4" cy="3.6" rx="3.8" ry="2.1" fill="#4fae3d" transform="rotate(18 32.4 3.6)" />
      {/* telhado com beirais */}
      <path d="M32 9 L59 35 L5 35 Z" fill="#d42b1e" />
      {/* corpo da casa */}
      <rect x="13" y="30" width="38" height="27" rx="2.5" fill="#d42b1e" />
      {/* porta em arco */}
      <path d="M27.5 57 L27.5 48.5 A4.5 4.5 0 0 1 36.5 48.5 L36.5 57 Z" fill="#ffffff" />
    </svg>
  );
}

export default function Logo({
  tamanho = 44,
  comTagline = false,
  vertical = false,
}: {
  tamanho?: number;
  comTagline?: boolean;
  vertical?: boolean;
}) {
  return (
    <span className={`logo ${vertical ? 'logo-vertical' : ''}`} translate="no">
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
