# Sistema ADEHASC — Regularização Fundiária

Sistema web da **ADEHASC** (Associação para o Desenvolvimento Habitacional Sustentável de
Santa Catarina) para que o **morador** se cadastre sozinho e **acompanhe o andamento do seu
processo de regularização fundiária**, e para que a **equipe da ADEHASC** gerencie todos os
cadastros por um painel administrativo completo.

## O que o sistema faz

**Área do morador**
- Cadastro em 5 passos simples (assistente com barra de progresso), pensado para pessoas
  idosas e com pouca familiaridade com tecnologia.
- Entrada com CPF + senha.
- Painel com as 7 etapas do processo, barra de progresso, linha do tempo de atualizações,
  checklist de documentos e edição de telefone/e-mail.
- Modo escuro com um toque (preferência salva no navegador), letras grandes e navegação
  completa por teclado em todas as páginas.

**Painel administrativo** (`/admin`)
- Dashboard com estatísticas e gráfico de moradores por etapa.
- Busca por nome, CPF ou protocolo; filtros por etapa e município; exportação em CSV
  (compatível com o Excel brasileiro).
- Ficha completa do morador: edição de dados, mudança de etapa (com aviso automático na
  linha do tempo), publicação de avisos, situação dos documentos, notas internas,
  redefinição de senha temporária e exclusão de cadastro.
- Configurações: troca de senha, criação de novos administradores e situação do sistema.

## Tecnologia

- **Next.js 14 (App Router) + TypeScript + React 18**
- CSS próprio em um único `app/globals.css` (sem Tailwind nem bibliotecas de UI)
- **Postgres** (Neon via integração da Vercel) com o pacote `pg` — as tabelas são criadas
  automaticamente na primeira execução
- **Modo demonstração**: sem banco configurado, o sistema roda em memória com moradores
  fictícios (uma faixa âmbar avisa que os cadastros não estão sendo salvos)
- Autenticação própria: senhas com hash `bcryptjs` e sessão em cookie httpOnly assinado
  (HMAC-SHA256), validade de 7 dias
- PWA: instalável no celular (manifest + ícones SVG e PNG, com apple-touch-icon para iPhone)

## Como rodar localmente

Pré-requisito: Node.js 18 ou mais novo.

```bash
npm install
npm run dev
```

Abra <http://localhost:3000>. Sem banco configurado, o sistema entra sozinho no **modo
demonstração**:

- Morador de teste: CPF `123.456.789-09` · senha `123456`
- Administrador: `admin@adehasc.com.br` · senha `adehasc2026` (em `/admin/entrar`)

### Variáveis de ambiente (opcionais no modo demonstração)

| Variável | Para que serve |
| --- | --- |
| `DATABASE_URL` (ou `POSTGRES_URL`) | Conexão com o Postgres. Sem ela, roda em modo demonstração. |
| `AUTH_SECRET` | Segredo longo e aleatório que assina os cookies de sessão. **Defina sempre em produção.** |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | E-mail e senha do primeiro administrador (padrão: `admin@adehasc.com.br` / `adehasc2026`). |

Para o build de produção:

```bash
npm run build
npm start
```

## Estrutura de pastas

```
app/                    Páginas (App Router) e rotas de API
  page.tsx              Página inicial
  cadastro/             Assistente de cadastro em 5 passos
  entrar/               Entrada do morador (CPF + senha)
  esqueci-senha/        Orientação para recuperar a senha
  privacidade/          Política de privacidade em linguagem simples
  painel/               Painel do morador
  admin/
    entrar/             Entrada da equipe (e-mail + senha)
    (painel)/           Área protegida: dashboard, moradores, configurações
  api/                  Rotas REST (JSON) — auth, me, admin/…
components/             Logo (SVG), barra de acessibilidade, campo de senha, menu admin
lib/                    Etapas, CPF, máscaras, sessão, camada de dados (Postgres + memória)
public/                 manifest.webmanifest e ícone SVG (PWA)
```

## Publicação

O passo a passo completo (GitHub + Vercel + banco Neon + variáveis) está no
[SETUP.md](SETUP.md).

## Caminho para virar aplicativo mobile

Toda a comunicação do site com o servidor acontece por rotas REST em `/api/*` (JSON).
Um futuro aplicativo (React Native, Capacitor etc.) pode consumir exatamente o mesmo
backend:

1. `POST /api/auth/login` para entrar (o cookie de sessão pode ser trocado por um header
   quando o app precisar);
2. `GET /api/me` para montar o painel do morador;
3. As mesmas rotas `/api/admin/*` para uma versão da equipe.

Além disso, o site já é um **PWA**: no celular, o morador pode "Adicionar à tela inicial"
e usar o sistema como se fosse um aplicativo, sem instalar nada da loja.
