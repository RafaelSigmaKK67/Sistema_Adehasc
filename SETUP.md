# SETUP — Como publicar o Sistema ADEHASC

Este guia mostra, clique por clique, como colocar o sistema no ar usando **GitHub** +
**Vercel** (com banco **Neon Postgres**). Não precisa saber programar: é só seguir na ordem.

---

## 1. Criar o repositório no GitHub e subir o código

1. Entre em **github.com/new** (faça login na sua conta do GitHub).
2. Em **Repository name**, escreva o nome do repositório (ex.: `adehasc-sistema`).
3. Escolha **Private** (recomendado) e clique em **Create repository**.
4. Se você usa um **token fine-grained** (começa com `github_pat_`), confira em
   GitHub → **Settings** → **Developer settings** → **Personal access tokens** se ele tem
   acesso a esse repositório com a permissão **Contents: Read and write**. Se não tiver,
   edite o token e marque o repositório na lista.
5. No computador, dentro da pasta do projeto, rode no terminal (troque `SEU_USUARIO`,
   `NOME_DO_REPOSITORIO` e `SEU_TOKEN` pelos seus dados):

```bash
git init -b main            # só se a pasta ainda não for um repositório git
git add -A
git commit -m "Sistema ADEHASC — versão inicial"
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git
git push https://SEU_TOKEN@github.com/SEU_USUARIO/NOME_DO_REPOSITORIO.git main
```

> Se o projeto foi entregue já com os commits prontos (confira com `git log`), os três
> primeiros comandos não são necessários — vá direto ao `git remote add` e ao `git push`.

> ⚠️ **O token é como uma senha.** Nunca escreva o token dentro de arquivos do projeto,
> em commits ou no README. Depois de publicar, você pode apagar o token no GitHub e criar
> outro quando precisar.

## 2. Importar o projeto na Vercel

1. Entre em **vercel.com** e faça login (pode usar a própria conta do GitHub).
2. Clique em **Add New…** → **Project**.
3. Na lista, encontre o repositório e clique em **Import**.
4. Não mude nenhuma configuração de build (a Vercel detecta o Next.js sozinha).
5. Clique em **Deploy** e aguarde. O site já vai entrar no ar em **modo demonstração**
   (uma faixa âmbar avisa que os cadastros ainda não estão sendo salvos).

## 3. Ativar o banco de dados (Neon Postgres)

1. No painel do projeto na Vercel, abra a aba **Storage**.
2. Clique em **Create Database** e escolha **Neon (Postgres)**.
3. Aceite as opções sugeridas e clique em **Connect** para ligar o banco ao projeto —
   isso cria a variável `DATABASE_URL` sozinho.
4. Volte na aba **Deployments**, abra o menu **⋯** do último deploy e clique em
   **Redeploy**.
5. Pronto: a faixa de demonstração some e os cadastros passam a ser salvos de verdade.
   As tabelas são criadas automaticamente na primeira execução.

## 4. Configurar as variáveis de segurança

1. No projeto da Vercel, vá em **Settings** → **Environment Variables**.
2. Crie a variável **`AUTH_SECRET`** com um valor aleatório longo (50+ caracteres).
   Dica para gerar um: rode `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
   no terminal, ou use um gerador de senhas.
3. (Opcional) Crie **`ADMIN_EMAIL`** e **`ADMIN_PASSWORD`** para definir o e-mail e a
   senha do primeiro administrador. Sem elas, o padrão é `admin@adehasc.com.br` /
   `adehasc2026`.
4. Faça **Redeploy** de novo para as variáveis valerem.

## 5. Primeiro acesso do administrador

1. Abra `https://SEU-PROJETO.vercel.app/admin/entrar`.
2. Entre com `admin@adehasc.com.br` / `adehasc2026` (ou o que você definiu no passo 4).
3. O painel mostra um **aviso vermelho** enquanto a senha padrão não for trocada:
   vá em **Configurações** → **Trocar a minha senha** e crie uma senha forte.
4. Em **Configurações** você também pode criar contas para as outras pessoas da equipe.

## 6. Apontar um domínio próprio (ex.: sistema.adehasc.com.br)

1. No projeto da Vercel, vá em **Settings** → **Domains**.
2. Escreva `sistema.adehasc.com.br` e clique em **Add**.
3. A Vercel vai mostrar um registro **CNAME** (algo como `cname.vercel-dns.com`).
4. No painel onde o domínio `adehasc.com.br` é administrado (Registro.br ou o provedor de
   hospedagem), crie um registro **CNAME** com nome `sistema` apontando para o endereço
   que a Vercel mostrou.
5. Aguarde alguns minutos e o sistema estará disponível no endereço novo, já com HTTPS.

---

## Resumo dos acessos

| Quem | Endereço | Como entra |
| --- | --- | --- |
| Morador | `/entrar` | CPF + senha criada no cadastro |
| Equipe ADEHASC | `/admin/entrar` | E-mail + senha |

Qualquer dúvida técnica, o [README.md](README.md) explica como rodar o sistema no
computador e como ele funciona por dentro.
