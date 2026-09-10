#!/usr/bin/env node
import { createServer } from "node:http";
import { URL } from "node:url";
import { buildAuthUrl, LOCAL_REDIRECT_PORT, newOAuthClient } from "./oauth.js";
import { saveCredentials, credentialsPath } from "./token-store.js";

async function main() {
  const client = newOAuthClient();
  const authUrl = buildAuthUrl(client);

  console.log("\nAutorização do Google Drive para o Jarvis\n");
  console.log("1. Abra este link no navegador (com a conta Google correta):\n");
  console.log(`   ${authUrl}\n`);
  console.log(`2. Aceite as permissões solicitadas.`);
  console.log(`3. Você será redirecionado para localhost — aguarde esta janela confirmar.\n`);

  const code = await new Promise<string>((resolve, reject) => {
    const server = createServer((req, res) => {
      if (!req.url) return;
      const url = new URL(req.url, `http://127.0.0.1:${LOCAL_REDIRECT_PORT}`);
      if (url.pathname !== "/oauth/callback") {
        res.writeHead(404).end();
        return;
      }
      const error = url.searchParams.get("error");
      const authCode = url.searchParams.get("code");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      if (error) {
        res.end(`<h1>Autorização não concluída</h1><p>${error}</p><p>Pode fechar esta janela.</p>`);
        server.close();
        reject(new Error(`Autorização recusada ou falhou: ${error}`));
        return;
      }
      res.end("<h1>Autorização concluída</h1><p>Pode fechar esta janela e voltar ao terminal.</p>");
      server.close();
      if (authCode) resolve(authCode);
      else reject(new Error("Nenhum código de autorização recebido."));
    });
    server.listen(LOCAL_REDIRECT_PORT);
  });

  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "O Google não retornou um refresh_token. Revogue o acesso anterior em https://myaccount.google.com/permissions e rode este comando de novo (isso força um novo consentimento)."
    );
  }

  saveCredentials({ refresh_token: tokens.refresh_token, saved_at: new Date().toISOString() });
  console.log(`\nPronto. Credenciais salvas em: ${credentialsPath()}`);
  console.log("Agora configure o servidor MCP no Claude Desktop/Code (veja docs/SETUP.md).\n");
}

main().catch((err) => {
  console.error(`\nFalha na autorização: ${err instanceof Error ? err.message : err}`);
  process.exitCode = 1;
});
