# Guia de estilo

## Perfis de referência

@psico.giovanavasc · @psicosuyanne · @omateuspsi · @gabrielleiferreira.psi · @aprendonaterapia · @psi.danielesita

A análise abaixo vem dos 5 prints enviados (o Instagram não abre neste ambiente; @psi.danielesita não tinha print, então ainda não foi analisado). Ao receber novos prints, acrescente aqui.

| Referência | Formato de meme | Visual | Estilo no renderizador |
|---|---|---|---|
| @psico.giovanavasc | "Eu sou psicóloga infantil / mas não vou impedir que / seu filho sofra": quebra de expectativa em 3 linhas | Foto de consultório (parede estampada, tons terrosos); texto em **faixas de papel creme, fonte de máquina de escrever**, levemente tortas | `faixa` + fundo `quarto` |
| @psicosuyanne | "coisas que eu vou dar ghost… edição ABA 👻": lista temática sazonal (Halloween) | Foto encenada (fantasma de lençol com óculos e notebook) num consultório infantil colorido (nuvens, arco-íris na parede) | `meme` + fundo `ceu` |
| @omateuspsi | "Imagina dizer que eu só brinco no trabalho e achar que isso me ofende": ironia com o estereótipo | Selfie do psicólogo com **brinquedos/jogos recortados flutuando como adesivos** (UNO, Pula Pirata, Quebra-Gelo); texto amarelo com sombra | `amarelo` + `stickers`/`adesivos` |
| @gabrielleiferreira.psi | "Eu também não iria dormir na hora certa se soubesse que resistir me daria mais 20 min de tela… / imagina uma criança": empatia com a lógica da criança | Foto com personagem de brinquedo (lousa mágica de sapo) **repetida em duas metades**: setup em cima, punchline embaixo | `meme`/`amarelo` em `topo` e `base` |
| @aprendonaterapia | "pronta pra guerra / (não vou deixar meu pacientinho ganhar o jogo)": exagero dramático + subtítulo entre parênteses | Imagem absurda e épica (gato de óculos tomando chá diante de explosão nuclear) | `titulo` + `sub` + fundo `explosao` |

### O que todas têm em comum

1. **Primeira pessoa e autoironia**: a profissional ri de si mesma e da profissão.
2. **Estrutura de piada**: setup → virada. A virada costuma estar na última linha, entre parênteses ou num balão.
3. **Pouco texto na arte** (10 a 25 palavras). O conteúdo vai para a legenda.
4. **Imagem que conta metade da piada**: personagem, brinquedo ou cena absurda.
5. **Universo infantil**: brinquedos, jogos de tabuleiro, desenho, cores de brinquedoteca.
6. **Assinatura discreta** (@perfil) pequena no rodapé.

## Formatos de meme reutilizáveis (troque o conteúdo, mantenha a estrutura)

- **"Sou psicóloga infantil, mas…"** → quebra de expectativa sobre o que a terapia faz.
- **"Imagina achar que…"** → ironia com um mito sobre terapia infantil.
- **"Eu também faria X se… / imagina uma criança"** → empatia com a lógica do comportamento infantil.
- **"[modo épico] / (contexto banal entre parênteses)"** → exagero dramático de situação de consultório.
- **"coisas que eu vou dar ghost / jogar fora / deixar em 2026"** → listas sazonais (Halloween, Ano-novo, volta às aulas).
- **"Ninguém: / Criança de 4 anos às 19h:"** → comportamento universal com personagem.
- **"Personagem X explicando Y"** → personagem Disney/Pixar como metáfora de um conceito (Divertida Mente = emoções; Marlin de Procurando Nemo = superproteção).
- **POV / "quando…"** → cenas do dia a dia de pais.

## Visual

- **Cores**: vivas e de brinquedoteca (rosa, amarelo, azul-céu, verde, lilás) ou terrosas aconchegantes (consultório). Evitar visual corporativo ou clínico frio.
- **Imagens**: cenas de filmes Disney/Pixar (fornecidas pela usuária), fotos do consultório e brinquedos, ou os fundos ilustrados do renderizador.
- **Emojis como adesivos** (contorno branco) fazem o papel dos brinquedos recortados do @omateuspsi.
- **Tipografia**: arredondada e divertida (Fredoka, Baloo), máquina de escrever para o estilo faixa (Special Elite), manuscrita para comentários (Caveat), Nunito para textos de carrossel.

### Estilos de texto disponíveis
`faixa` · `meme` · `amarelo` · `titulo` · `sub` · `nota` · `balao` · `etiqueta` · `texto` (com `cartao: true` para o fundo branco arredondado) · `adesivos` · `espaco`

### Fundos ilustrados disponíveis
`quarto` (consultório com parede estampada) · `ceu` (nuvens + arco-íris) · `confete` · `explosao` (épico/dramático) · `lousa` · `papel` (caderno, ideal para carrossel) · `cor` (cor sólida com rabiscos)

## Regras de formato

| Peça | Tamanho | Observações |
|---|---|---|
| Feed (post único) | 1080×1350 (4:5) | Sempre com adaptação para stories, gerada automaticamente. Texto importante longe das bordas laterais (a grade do perfil corta as laterais). |
| Adaptação stories | 1080×1920 (9:16) | Mesmo conteúdo, recomposto. 250 px do topo e 360 px da base ficam livres (interface do Instagram). Se a recomposição não ficar boa, use `stories_adaptado` no post.json para sobrescrever blocos/stickers só no story. |
| Carrossel | 1080×1350 cada | Sem adaptação. Capa = meme/gancho; meio = 1 ideia por slide; último = frase de fechamento + CTA (salvar/compartilhar). Contador "n/N" automático. |
| Story avulso | 1080×1920 | Feito para interação: enquete, caixinha, quiz, "isso ou aquilo", bastidores. Deixar `espaco` vazio onde vai o adesivo do Instagram e descrever em `notas_producao`. |

## Mix sugerido por semana

- 2 a 3 posts de feed (alternar meme único e carrossel educativo)
- 3 a 5 sequências de stories avulsos (pelo menos 1 de interação)
- Datas: Dia das Crianças (12/10), volta às aulas (fev/ago), férias, Halloween, Natal (presentes e telas), Dia das Mães/Pais, Abril Azul (conscientização do autismo, com muito cuidado e sem humor sobre a condição), Setembro Amarelo (sem humor; tom acolhedor).
