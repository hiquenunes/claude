# Pauta quinzenal: sugestões automáticas de posts

Roda nos dias **1 e 15 de cada mês** (tarefa agendada). Objetivo: entregar no Estúdio um lote de posts **prontos para a Jaqueline só revisar**, com temas novos e relevantes para o momento. Ela edita o que quiser e muda o status para Aprovado.

## Entregável de cada rodada

- **Pelo menos 4 posts de feed** (pelo menos 1 carrossel e 2 posts únicos) e **3 sequências de stories avulsos** (pelo menos 1 com enquete/caixinha/quiz).
- Cada um gravado no Estúdio com `"status": "sugestao"` e o campo:
  ```json
  "sugestao": { "lote": "AAAA-MM-DD", "motivo": "1 ou 2 frases: por que este tema agora (data, pesquisa nova, dúvida frequente, lacuna no perfil)" }
  ```
- Também salvos em `posts/<id>/post.json` no repositório e renderizados (`node conteudo/render/render.js --todos`) para conferência visual.

## Passo a passo

1. **Contexto**: leia `PERFIL.md`, `ESTILO.md`, `BASE_TEORICA.md`, `FORMATO_POST.md` e a skill `.claude/skills/posts-psicojaquelinesauer/SKILL.md`.
2. **Histórico**: leia a coleção `posts` do Estúdio (ArtifactData `list`, com `out_dir`). Anote temas, piadas e cenas já usados, para não repetir. Veja o que ela aprovou ou publicou (sinal do que funciona) e o que ficou parado como sugestão (sinal do que não agradou). Atualize os `post.json` do repositório com as edições dela.
3. **Pesquisa de temas** (WebSearch; use `extended` para notícias e pesquisas recentes):
   - datas dos próximos 30 dias (tabela abaixo);
   - novidades confiáveis sobre autismo, TCC infantil e parentalidade: estudos recentes em periódicos, notas da Sociedade Brasileira de Pediatria, CDC, OMS, leis ou políticas novas no Brasil;
   - dúvidas frequentes de famílias atípicas (escola, diagnóstico, rotina, irmãos, crises, seletividade alimentar, sono, telas);
   - se o Instagram estiver acessível (WebFetch das páginas públicas), os formatos recentes dos perfis de referência listados em `ESTILO.md`. Só observe o formato e o tom; nunca copie a piada.
4. **Distribuição** (ver `ESTILO.md`): cerca de 40% autismo, 25% TCC explicada para pais, 25% parentalidade, 10% interação/bastidores. Varie estilos visuais e fundos.
5. **Escrever** cada post seguindo a skill: base teórica real e verificada (nunca inventar), checklists éticos e de TEA do `PERFIL.md`, legenda que traduz a teoria e termina com algo prático.
6. **Fotos do Drive**: liste a pasta "Estúdio Jaqueline — Fotos para posts" (id `1nIY5FRi7s0l9qVtKvIFYTFsfZyKcg0Qm`) com o conector Google Drive (`search_files`, `parentId = '<id>'`). Se uma foto combinar com o post pelo nome do arquivo, coloque no slide `"imagem_drive": {"id": "<fileId>", "nome": "<título>"}`. **Não baixe a imagem**: a Jaqueline importa com um toque no Estúdio. Sem foto adequada, use o fundo ilustrado.
7. **Fotos de banco de imagens**: quando uma foto real valorizar o post e não houver foto adequada no Drive, siga o passo 6 da skill (script `banco_imagens.py`, envio ao Estúdio, `imagem_asset` + `imagem_credito` + `alternativas`). Prefira fotos de objetos, brinquedos, ambientes e mãos a rostos de crianças.
8. **Cenas de filme**: preencha `imagem_sugerida` quando uma cena Disney/Pixar reforçar a piada.
9. **Renderizar e revisar** cada peça com a `previa.png` (Read). Corrija texto cortado, sobreposição e erros de português.
10. **Gravar no Estúdio**: ArtifactData `batch` com `set` na coleção `posts` (url `https://claude.ai/artifact/Suz1EGtTRhwhY4748peWYC`), `doc_id` = `id`, com `criado_em` = agora (ISO). Leia de volta (`list`) para confirmar.
11. **Commit e push** dos `post.json` e `saida/`.
12. **Resumo final** (é o que chega como notificação): quantas sugestões, uma linha por post (tema + por que agora) e o link do Estúdio. Diga também o que não deu para fazer (Instagram inacessível, Drive vazio etc.).

## Datas que pedem conteúdo

| Quando | Data | Tom |
|---|---|---|
| Janeiro | Janeiro Branco (saúde mental) · férias | leve |
| Fev / Ago | Volta às aulas, adaptação escolar, inclusão | prático |
| 21/03 | Dia Mundial da Síndrome de Down | educativo, sem humor sobre a condição |
| 02/04 + Abril | Dia Mundial de Conscientização do Autismo · Abril Azul | **data central**: série de posts, educativo |
| 2º domingo de maio | Dia das Mães (maternidade atípica, culpa, autocuidado) | acolhedor |
| 18/06 | Dia do Orgulho Autista | celebração, voz autista |
| 2º domingo de agosto | Dia dos Pais (pais presentes, divisão de tarefas) | leve |
| 25/08 | Dia Nacional da Educação Infantil | educativo |
| 27/08 | Dia do Psicólogo (falar da profissão, sem se apresentar como psicóloga) | leve |
| Setembro | Setembro Amarelo | **sem humor**, acolhedor, com canais de ajuda (CVV 188) |
| 10/10 | Dia Mundial da Saúde Mental | educativo |
| 12/10 | Dia das Crianças (brincar, presentes, telas) | muito lúdico |
| 15/10 | Dia do Professor (parceria família–escola) | leve |
| 31/10 | Halloween (medos, fantasias, sensorial) | lúdico |
| Dezembro | Natal, presentes, férias, quebra de rotina, festas e sobrecarga sensorial | prático |
