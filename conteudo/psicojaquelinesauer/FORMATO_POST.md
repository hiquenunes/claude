# Formato do `post.json`

Cada post é uma pasta `posts/AAAA-MM-<slug>/` com um `post.json`. O renderizador gera tudo em `saida/`.

```jsonc
{
  "id": "2026-11-raiva-nomear-para-domar",   // igual ao nome da pasta
  "tipo": "feed",                 // "feed" (1 slide; gera feed + stories adaptado) | "carrossel" | "story"
  "status": "rascunho",           // rascunho → aprovado → publicado
  "tema": "Raiva não se elimina, se regula",
  "formato_meme": "Sou psicóloga infantil, mas…",
  "imagem_sugerida": { "filme": "...", "cena": "...", "como_usar": "..." },   // opcional
  "notas_producao": "onde colocar enquete/caixinha etc.",                    // stories
  "base_teorica": [                                                           // OBRIGATÓRIO
    { "conceito": "...", "referencia": "Autor (ano). Título. Periódico/Editora.", "como_aparece": "..." }
  ],
  "slides": [ { /* ver abaixo */ } ],
  "stories_adaptado": { /* opcional, só feed: campos que substituem os do slide na versão stories */ },
  "legenda": "texto da legenda com \n para quebra de linha",
  "hashtags": ["#psicologiainfantil"]
}
```

## Slide

```jsonc
{
  "fundo": { "tipo": "quarto" },        // quarto | ceu | confete | explosao | lousa | papel | cor
                                         // extras: "cor": "#hex", "cores": [...] (confete/ceu), "centro_livre": false (confete)
  "imagem": "imagens/fundo.jpg",         // opcional: substitui o fundo. Use "_imagem" para deixar desativado
  "imagem_posicao": "50% 30%",           // enquadramento (object-position)
  "escurecer": 0.3,                      // véu escuro sobre a imagem (0 a 0.6)
  "escala_max": 1.15,                    // opcional: limite de quanto o texto pode crescer
  "ocupacao": 0.9,                       // opcional: fração da altura útil que o texto pode ocupar
  "cor_assinatura": "rgba(...)",         // opcional
  "blocos": [
    { "zona": "topo|centro|base", "estilo": "faixa", "texto": "linha", "tamanho": 66, "giro": -1,
      "cor": "#fff", "fundo": "#FFE07A", "destaque": "#FF4F7B", "cartao": true, "alinhar": "esquerda", "largura": 80 },
    { "zona": "centro", "estilo": "adesivos", "emojis": ["🃏", "😤", "🏆"], "tamanho": 130 },
    { "zona": "centro", "estilo": "espaco", "altura": 400 }
  ],
  "stickers": [ { "emoji": "🧸", "x": 14, "y": 8, "tamanho": 140, "giro": -10 } ]
}
```

### Texto
- `**negrito**` · `*destaque colorido*` · `\n` quebra de linha.
- No estilo `faixa`, cada linha (`\n`) vira uma faixa de papel; use um bloco por faixa para variar o `giro`.
- O tamanho se ajusta sozinho: o texto cresce até preencher a área útil ou encolhe até caber. `tamanho` é o tamanho-base relativo.

### Stickers × adesivos
- `stickers` (posição absoluta em %) **só nos cantos**: x < 20 ou x > 80 e y < 12 ou y > 88. No centro eles batem no texto.
- Para emojis junto do texto, use o bloco `adesivos`: ele entra no fluxo e nunca sobrepõe nada.

## Comandos

```bash
node conteudo/render/render.js conteudo/psicojaquelinesauer/posts/<id>/post.json
node conteudo/render/render.js --todos
```
