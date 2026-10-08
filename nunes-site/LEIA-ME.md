# Site Nunes Auditores — guia de publicação

Site estático em HTML, CSS e JavaScript puro, na direção visual "Institucional Clássica".
Hospedado na **Netlify**, publicado automaticamente a partir deste repositório no GitHub. Não depende de WordPress, banco de dados, PHP nem serviços de terceiros no navegador do visitante. O formulário de contato usa o **Netlify Forms**.

## Estrutura

```
netlify.toml                  (na raiz do repositório) diz à Netlify para publicar nunes-site/public
nunes-site/
  public/                     ← o site publicado
    index.html                Home
    sobre/  servicos/  conteudos/  contato/  politica-de-privacidade/
    contato/obrigado/         confirmação do formulário (fora do Google)
    404.html                  página de erro
    assets/css, js, fonts, img  estilos, script, fontes próprias e imagens
    robots.txt  sitemap.xml  llms.txt  site.webmanifest  favicon.ico
    _headers                  segurança e cache (lido pela Netlify)
    .well-known/security.txt  contato para relato de falhas de segurança
  _modelos/                   NÃO é publicado: modelo de artigo para a área Conteúdos
```

## Antes de publicar

1. **Validar com o Paulo** os trechos marcados com `<!-- VALIDAR -->` no código: lista e textos dos serviços, segmentos, pilares, etapas e cargos da trajetória.
2. **Trocar as fotos** marcadas com `<!-- TROCAR -->`. Hoje aparece o monograma no lugar.
   - Foto do topo da Home: salvar como `assets/img/hero.webp` (1920×1080, até 300 KB) e descomentar a linha indicada em `assets/css/style.css`.
   - Retrato do Paulo: `assets/img/paulo-nunes.webp` (800×1000). Escritório: `assets/img/escritorio.webp` (1200×900).
   - Use `<img ... width="" height="" alt="descrição" loading="lazy">`. O `alt` deve descrever a foto.
3. **Política de Privacidade:** o texto é uma base e precisa de revisão jurídica. Ela deve mencionar que as mensagens do formulário ficam armazenadas na Netlify (provedor de hospedagem) até serem apagadas.
4. **Domínio:** o site considera `https://nunesauditores.com.br` (sem www) como endereço oficial.

## Publicar na Netlify (uma única vez)

### 1. Criar o site
1. Acesse https://app.netlify.com e entre com a conta do **GitHub**.
2. **Add new project → Import an existing project → GitHub** e escolha o repositório `hiquenunes/claude`.
3. Em **Branch to deploy**, escolha a branch onde o site está (depois de aprovado, a `main`).
4. Os demais campos já vêm do `netlify.toml` (pasta `nunes-site/public`, sem comando de build). Clique em **Deploy**.
5. Em um minuto o site abre num endereço provisório `algum-nome.netlify.app`. Confira se está tudo certo.

### 2. Ativar o formulário
1. No painel do site: **Forms → Enable form detection** e faça um novo deploy (**Deploys → Trigger deploy**). O formulário "contato" aparece na lista.
2. **Forms → Form notifications → Add notification → Email notification**: formulário `contato`, e-mail `auditoria@nunesauditores.com.br`.
3. Teste: envie uma mensagem pela página Contato e confira se chegou no e-mail e em **Forms**.
4. A Netlify filtra spam automaticamente (Akismet + campo-armadilha do formulário). Mensagens suspeitas ficam em **Forms → Spam submissions**; vale olhar de vez em quando.

### 3. Conectar o domínio nunesauditores.com.br
1. **Domain management → Add a domain** → `nunesauditores.com.br`. Quando perguntar, adicione também o `www`.
2. Defina `nunesauditores.com.br` (sem www) como **domínio principal (primary domain)**. A Netlify redireciona o www sozinha.
3. A Netlify mostra os apontamentos a criar. Normalmente são:
   - Registro **A** para `nunesauditores.com.br` → IP do balanceador da Netlify (o painel mostra o número, hoje `75.2.60.5`).
   - Registro **CNAME** para `www` → `algum-nome.netlify.app`.
4. No **Registro.br** (ou onde o DNS do domínio estiver): editar a zona DNS e criar/alterar **somente** esses dois registros. **Não apague os registros MX, SPF (TXT) e de verificação do e-mail**, senão o e-mail do escritório para de funcionar. Se já existir um registro A ou CNAME antigo para o site, substitua-o.
5. Aguarde a propagação (de minutos a algumas horas). A Netlify emite o certificado HTTPS (Let's Encrypt) sozinha. Depois, em **HTTPS**, confirme que o certificado está ativo.

### Daqui em diante
Toda alteração enviada para a branch publicada vai ao ar sozinha em cerca de um minuto. Não é preciso enviar arquivos nem mexer no painel.

## Segurança aplicada

- HTTPS obrigatório (Netlify), HSTS e endereço único (sem www).
- Content-Security-Policy restrita: só carrega arquivos do próprio site (sem scripts, fontes ou estilos de terceiros), sem estilos ou scripts embutidos.
- Proteção contra clickjacking, MIME sniffing e vazamento de referência; recursos do navegador (câmera, microfone, localização) bloqueados.
- Formulário: campo-armadilha contra robôs, filtro de spam da Netlify, validação no navegador, limites de tamanho e consentimento LGPD obrigatório. Os dados ficam na conta Netlify, não em servidor próprio.
- Fontes auto-hospedadas: nenhum dado do visitante vai para o Google Fonts (LGPD).
- Sem cookies nem rastreadores, por isso o site não precisa de banner de cookies. Se adicionar Google Analytics ou Meta Pixel, será preciso banner de consentimento e ajuste da CSP em `_headers`.

## SEO aplicado

- Título e descrição únicos por página, URL canônica, `lang="pt-BR"`, um H1 por página, hierarquia de títulos e migalhas de pão.
- Open Graph e Twitter Card com imagem de compartilhamento (1200×630).
- Dados estruturados (JSON-LD): AccountingService com endereço, horário, telefone e CNPJ; Pessoa (Paulo Nunes); WebSite; páginas com BreadcrumbList; Serviços; FAQPage na Home.
- `sitemap.xml` e `robots.txt`; páginas de confirmação e erro com `noindex`.
- Desempenho: sem bibliotecas externas, fontes pré-carregadas, imagens WebP com tamanho declarado e carregamento tardio, CDN da Netlify.
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
