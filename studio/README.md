# Estúdio de posts

Primeira peça do ecossistema de social media: gera as artes dos posts, monta um feed no formato do Instagram e coleta a aprovação do cliente.

## Como funciona

```
clients/<cliente>/
  brand.md      voz, cores, o que falta confirmar
  posts.json    pauta do lote: artes (slides), legenda, hashtags, notas
  photos/       fotos do banco de imagens usadas nos posts
  logo.png      (opcional) substitui o logotipo tipográfico provisório
templates.mjs   modelos de arte 1080×1350
render.mjs      gera os PNGs, o feed.json e a página de aprovação
approval/       modelo da página de aprovação
out/<cliente>/  resultado: index.html + posts/*.png
```

Para gerar o lote:

```
node render.mjs dos2gastrobar
```

O script usa o Playwright (já instalado no ambiente em `/opt/node-tools`; em outra máquina, `npm i -D playwright`).

## Modelos de arte

| Modelo        | Uso                                             | Campos                                   |
|---------------|-------------------------------------------------|------------------------------------------|
| `statement`   | frase grande, capa de carrossel                 | `eyebrow`, `title`, `kicker`             |
| `info`        | horários, endereço, serviços                    | `eyebrow`, `title`, `rows`, `footer`     |
| `option`      | cards numerados de carrossel                    | `index`, `title`, `text`                 |
| `quote`       | frase de efeito                                 | `title`, `footer`                        |
| `photo`       | foto inteira com título por cima                | `photo`, `eyebrow`, `title`, `text`, `focus`, `size` |
| `photo-frame` | foto emoldurada com faixa de cor e título       | `photo`, `title`, `focus`, `size`        |

Temas: `vinho`, `carvao`, `chopp`, `gelo`, `garrafa`. Nos títulos, `<i>...</i>` vira o trecho em itálico colorido e `\n` quebra a linha. `photo` é o caminho relativo à pasta do cliente (ex.: `photos/petisco.jpg`); `focus` ajusta o enquadramento (ex.: `center 30%`).

## Aprovação

A página publicada mostra o lote como um perfil do Instagram (feed e grade). Em cada post dá para aprovar, pedir ajuste com comentário, copiar a legenda com as hashtags e baixar a arte (PNG, ou .zip com todos os cards e a legenda no caso de carrossel). As aprovações ficam salvas no banco da própria página, então quem tiver acesso vê o mesmo status.

- Dos 2 Gastrobar: https://claude.ai/artifact/NhXCwf1QQynA7KhMqLovmT

Para atualizar depois de mudar a pauta: rodar `render.mjs` e publicar de novo `out/<cliente>/index.html` com as imagens de `posts/` no mesmo endereço. As aprovações já feitas continuam lá, ligadas ao `id` de cada post.
