# Site Nunes Auditores — guia de publicação

Site estático em HTML, CSS e JavaScript puro, na direção visual "Institucional Clássica".
Não depende de WordPress, banco de dados nem serviços de terceiros. O único arquivo que roda no servidor é o formulário, em `contato/enviar.php`.

## Estrutura

```
public/                       ← enviar TODO o conteúdo desta pasta para a raiz do domínio
  index.html                  Home
  sobre/  servicos/  conteudos/  contato/  politica-de-privacidade/
  contato/enviar.php          recebe o formulário e envia por e-mail
  contato/obrigado/           confirmação (fora do Google)
  404.html                    página de erro
  assets/css, js, fonts, img  estilos, script, fontes próprias e imagens
  robots.txt  sitemap.xml  llms.txt  site.webmanifest  favicon.ico
  .htaccess                   HTTPS, segurança e cache (Apache)
  _headers                    o mesmo, para Netlify ou Cloudflare Pages
  .well-known/security.txt    contato para relato de falhas de segurança
_modelos/                     NÃO publicar: modelo de artigo para a área Conteúdos
```

## Antes de publicar

1. **Validar com o Paulo** os trechos marcados com `<!-- VALIDAR -->` no código: lista e textos dos serviços, segmentos, pilares, etapas e cargos da trajetória.
2. **Trocar as fotos** marcadas com `<!-- TROCAR -->`. Hoje aparece o monograma no lugar.
   - Foto do topo da Home: salvar como `assets/img/hero.webp` (1920×1080, até 300 KB) e descomentar a linha indicada em `assets/css/style.css`.
   - Retrato do Paulo: `assets/img/paulo-nunes.webp` (800×1000). Escritório: `assets/img/escritorio.webp` (1200×900).
   - Use `<img ... width="" height="" alt="descrição" loading="lazy">`. O `alt` deve descrever a foto.
3. **Política de Privacidade:** o texto é uma base e precisa de revisão jurídica.
4. **E-mail do formulário:** criar a caixa `site@nunesauditores.com.br` (remetente) e configurar SPF, DKIM e DMARC do domínio, para os e-mails não caírem no spam.
5. **Domínio:** o site considera `https://nunesauditores.com.br` (sem www) como endereço oficial. Se preferir com www, trocar em todos os arquivos.

## Hospedagem

- **Apache com PHP** (Hostinger, Locaweb, HostGator, KingHost etc.): enviar a pasta `public/` para `public_html`. O `.htaccess` já força HTTPS, tira o www e aplica os cabeçalhos de segurança. Ativar o SSL gratuito (Let's Encrypt) no painel antes.
- **Netlify ou Cloudflare Pages:** funcionam com o `_headers`, mas não rodam PHP. Nesse caso, trocar o formulário por um serviço como Netlify Forms ou Formspree e incluir o domínio do serviço em `form-action` e `connect-src` da política de segurança.
- **Nginx:** replicar os cabeçalhos do `_headers` no bloco `server`.

## Segurança aplicada

- HTTPS obrigatório, HSTS e endereço único.
- Content-Security-Policy restrita: só carrega arquivos do próprio site (sem scripts, fontes ou estilos de terceiros), sem estilos ou scripts embutidos.
- Proteção contra clickjacking, MIME sniffing e vazamento de referência; recursos do navegador (câmera, microfone, localização) bloqueados.
- Listagem de pastas desligada e arquivos ocultos bloqueados.
- Formulário: só aceita envio a partir do próprio domínio, tem campo-armadilha e tempo mínimo contra robôs, limite de 5 envios por IP por hora, validação e limpeza de todos os campos e bloqueio de injeção de cabeçalhos de e-mail. Nenhum dado é gravado no servidor.
- Fontes auto-hospedadas: nenhum dado do visitante vai para o Google Fonts (LGPD).
- Sem cookies nem rastreadores, por isso o site não precisa de banner de cookies. Se adicionar Google Analytics ou Meta Pixel, será preciso banner de consentimento e ajuste da CSP.

## SEO aplicado

- Título e descrição únicos por página, URL canônica, `lang="pt-BR"`, um H1 por página, hierarquia de títulos e migalhas de pão.
- Open Graph e Twitter Card com imagem de compartilhamento (1200×630).
- Dados estruturados (JSON-LD): AccountingService com endereço, horário, telefone e CNPJ; Pessoa (Paulo Nunes); WebSite; páginas com BreadcrumbList; Serviços; FAQPage na Home.
- `sitemap.xml` e `robots.txt`; páginas de confirmação e erro com `noindex`.
- Desempenho: sem bibliotecas externas, fontes pré-carregadas, imagens WebP com tamanho declarado e carregamento tardio.
- Acessibilidade: link "pular para o conteúdo", foco visível, menu acessível por teclado, contraste AA.

## GEO (otimização para buscas com IA)

- `llms.txt` na raiz com os fatos da empresa em linguagem direta.
- `robots.txt` libera explicitamente os robôs do ChatGPT, Claude, Perplexity, Gemini e Apple.
- Perguntas frequentes com respostas autossuficientes, que podem ser citadas isoladamente.
- Fatos consistentes em todas as páginas e nos dados estruturados (nome, endereço, telefone, horário, CNPJ).
- Autoria clara: os artigos levam o nome e o cargo do Paulo, com data de publicação e de atualização.

## Depois de publicar

1. Cadastrar o site no **Google Search Console** e no **Bing Webmaster Tools** e enviar o `sitemap.xml`.
2. Criar ou atualizar o **Perfil da Empresa no Google** com exatamente o mesmo nome, endereço e telefone do site.
3. Quando as redes sociais existirem, incluir os links no rodapé e no campo `"sameAs"` dos dados estruturados (em todas as páginas).
4. Testar em https://search.google.com/test/rich-results e https://securityheaders.com (meta: nota A).

## Publicar um artigo

1. Copiar `_modelos/conteudos/TITULO-DO-ARTIGO/` para `public/conteudos/nome-do-artigo/`.
2. Trocar os textos entre colchetes, inclusive título, descrição, URL canônica e datas no JSON-LD.
3. Comece pela resposta direta à pergunta principal e cite leis e normas pelo número.
4. Incluir um card do artigo em `conteudos/index.html` e a URL no `sitemap.xml`.
