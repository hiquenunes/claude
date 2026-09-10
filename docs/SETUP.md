# Configuração da Jarvis

Duas peças precisam de configuração manual no Google Cloud (você, Henrique) antes de tudo funcionar: (1) o app web (painel) e (2) o servidor MCP (para o Claude usar as ferramentas). Ambos podem reaproveitar o mesmo OAuth client.

## 1. Google Cloud — uma vez

1. Crie (ou reaproveite) um projeto em https://console.cloud.google.com/.
2. Ative as APIs: **Google Drive API**, **Google Sheets API**, **Google Docs API** (APIs e serviços → Biblioteca).
3. Configure a tela de consentimento OAuth (APIs e serviços → Tela de consentimento OAuth):
   - Tipo: Externo (ou Interno, se sua conta for Workspace).
   - Em "Usuários de teste" (se o app ficar em modo de teste), adicione seu e-mail: `henrique@henriquejnunes.com.br`.
4. Crie uma credencial OAuth (APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth):
   - Tipo de aplicativo: **Aplicativo da Web**.
   - URIs de redirecionamento autorizados, adicione todas as que for usar:
     - `http://localhost:3000/api/auth/callback/google` (painel, em desenvolvimento local)
     - `https://SEU-DOMINIO/api/auth/callback/google` (painel, se publicar)
     - `http://127.0.0.1:53682/oauth/callback` (necessária para autorizar o servidor MCP local)
   - Guarde o **Client ID** e o **Client Secret** — eles não vão para nenhum arquivo do repositório.

## 2. Painel web (`web/`)

```bash
cd web
cp .env.example .env.local
# preencha AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, ALLOWED_EMAIL
npx auth secret   # gera e já grava AUTH_SECRET em .env.local
```

Rodar localmente:

```bash
npm install        # na raiz do repositório, uma vez (workspaces)
npm run build:core
npm run dev:web
```

Abra `http://localhost:3000`, entre com a conta Google autorizada. No primeiro acesso, a Jarvis cria (de forma idempotente) a pasta "Jarvis" no seu Drive com a estrutura descrita em `docs/ARCHITECTURE.md`.

Publicar o painel (opcional): qualquer host que rode Next.js (Vercel, um servidor Node próprio, etc.) funciona. Isso é **opcional** — o painel serve para navegar/editar; a conversa do dia a dia acontece no Claude. Confirme os limites e custos do plano gratuito do host escolhido antes de publicar (mudam com o tempo); nenhum deploy foi feito por esta implementação.

## 3. Servidor MCP (`mcp-server/`) — para o Claude usar as ferramentas

```bash
cd mcp-server
cp .env.example .env
# preencha GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (mesmo client do passo 1,
# ou um client OAuth separado do tipo "Desktop app")
npm run build
npm run authorize
```

O comando `authorize` imprime um link — abra no navegador, aceite as permissões, e as credenciais (só o refresh token) ficam salvas em `~/.jarvis/credentials.json` (permissão 600, só o seu usuário lê). Rodar de novo revoga e gera um novo token; não precisa apagar o arquivo manualmente.

### Conectar ao Claude Desktop ou Claude Code

Adicione ao arquivo de configuração de servidores MCP do seu cliente Claude (`claude_desktop_config.json` no Claude Desktop, ou o equivalente no Claude Code):

```json
{
  "mcpServers": {
    "jarvis": {
      "command": "node",
      "args": ["/CAMINHO/ABSOLUTO/PARA/claude/mcp-server/dist/server.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "seu-client-id",
        "GOOGLE_CLIENT_SECRET": "seu-client-secret"
      }
    }
  }
}
```

Reinicie o Claude Desktop/Code. As ferramentas `jarvis_*` devem aparecer na lista de ferramentas disponíveis.

### Instruções operacionais

Cole o conteúdo de `docs/OPERATING_INSTRUCTIONS.md` como instrução personalizada do Claude (ou `CLAUDE.md`, se for usar via Claude Code). Não é necessário colar este `SETUP.md` nem `ARCHITECTURE.md` — eles são referência, não instrução recorrente.

## 4. Testando de ponta a ponta

1. No Claude, peça: "cria um cliente de teste chamado 'Cliente Teste Jarvis'".
2. Confirme que apareceu em `/clientes` no painel, com uma pasta correspondente no Drive.
3. Peça para registrar uma preferência e depois corrigi-la; confira em `/clientes/<id>/memoria` que o histórico preserva as duas versões.
4. Rode `npm run authorize` de novo só se precisar trocar de conta Google.

## 5. Solução de problemas

- **"Jarvis ainda não está autorizado..."** ao rodar o servidor MCP: rode `npm run authorize` em `mcp-server/`.
- **Erro 403 do Google ao autorizar**: confirme que seu e-mail está na lista de usuários de teste da tela de consentimento OAuth (passo 1.3), ou publique o app OAuth se quiser sair do modo de teste.
- **"Variável de ambiente ... não configurada"**: confira `.env.local` (painel) ou `.env`/variáveis de ambiente do processo (servidor MCP e do cliente Claude).
- **Redirect URI mismatch**: a URI exata (incluindo `http`/`https` e porta) precisa estar cadastrada no client OAuth (passo 1.4).
