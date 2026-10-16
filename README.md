# Jarvis

Segundo cérebro do Henrique. Sem código, sem servidor, sem credencial para configurar: o Claude lê e escreve a memória de trabalho diretamente no Google Drive, usando o conector já autorizado.

- **Como funciona, decisões e o que foi validado**: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **O que colar no Claude como instrução (opcional)**: [`docs/OPERATING_INSTRUCTIONS.md`](docs/OPERATING_INSTRUCTIONS.md)

A pasta "Jarvis" já existe no Drive, com um documento "Como isso funciona" na raiz explicando a convenção — qualquer conversa do Claude com o Drive conectado pode operar a partir dali, mesmo sem ter lido este repositório.

Este repositório existe só como registro/documentação da arquitetura — não há nada para instalar, buildar ou rodar aqui.

## Estúdio de posts

A pasta [`studio/`](studio/README.md) é o começo do ecossistema de social media: gera artes para Instagram a partir de uma pauta em JSON e publica uma página de aprovação no formato de feed. Primeiro cliente: Dos 2 Gastrobar.
