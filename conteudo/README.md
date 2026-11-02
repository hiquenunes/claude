# Conteúdo de Instagram

Agente de criação de posts para clientes de Instagram. Primeiro cliente: **@psicojaquelinesauer** (conteúdo educativo: psicologia infantil, TCC e autismo).

## Como usar

No Claude Code, dentro deste repositório:

```
/posts-psicojaquelinesauer faz 3 posts sobre volta às aulas: 1 feed, 1 carrossel e uma sequência de stories
```

(ou só peça em linguagem natural: "cria um carrossel pra Jaqueline sobre hora de dormir")

A skill está em `.claude/skills/posts-psicojaquelinesauer/SKILL.md` e lê os documentos do cliente antes de criar.

## Estrutura

```
conteudo/
├── render/render.js            renderizador post.json → PNG (Playwright/Chromium)
├── assets/fonts/               fontes (Google Fonts, licença OFL)
└── psicojaquelinesauer/
    ├── PERFIL.md               quem é, público, tom, checklist ético do CFP
    ├── ESTILO.md               análise das referências, formatos de meme, regras de formato
    ├── BASE_TEORICA.md         conceitos + referências verificadas + cenas Disney/Pixar
    ├── FORMATO_POST.md         especificação do post.json
    ├── marca.json              assinatura e paleta
    └── posts/<id>/
        ├── post.json
        ├── imagens/            (opcional) frames de filme / fotos enviados pela usuária
        └── saida/              PNGs gerados, legenda.txt, previa.png
```

## Renderizar manualmente

```bash
node conteudo/render/render.js conteudo/psicojaquelinesauer/posts/<id>/post.json
node conteudo/render/render.js --todos
```

| Tipo | Saída |
|---|---|
| `feed` | `feed-01.png` 1080×1350 + `stories-01-adaptado.png` 1080×1920 |
| `carrossel` | `feed-01..NN.png` 1080×1350 (sem adaptação) |
| `story` | `stories-01..NN.png` 1080×1920 |
