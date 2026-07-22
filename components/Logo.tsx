// Logo oficial da ADEHASC (arquivos originais de adehasc.com.br).
// No tema claro usa a versão colorida; no tema escuro, a versão com texto branco.

const ALT = 'ADEHASC — Associação para o Desenvolvimento Habitacional Sustentável de Santa Catarina';

export default function Logo({ altura = 56 }: { altura?: number }) {
  const largura = Math.round(altura * 2.4); // proporção original 480x200
  return (
    <span className="logo" translate="no">
      <img
        className="logo-img logo-img-clara"
        src="/logo-adehasc.png"
        alt={ALT}
        width={largura}
        height={altura}
      />
      <img
        className="logo-img logo-img-escura"
        src="/logo-adehasc-branca.png"
        alt={ALT}
        width={largura}
        height={altura}
      />
    </span>
  );
}
