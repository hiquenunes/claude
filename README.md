# Jarvis

Segundo cérebro do Henrique. Sem código, sem servidor, sem credencial para configurar: o Claude lê e escreve a memória de trabalho diretamente no Google Drive, usando o conector já autorizado.

- **Como funciona, decisões e o que foi validado**: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **O que colar no Claude como instrução (opcional)**: [`docs/OPERATING_INSTRUCTIONS.md`](docs/OPERATING_INSTRUCTIONS.md)

A pasta "Jarvis" já existe no Drive, com um documento "Como isso funciona" na raiz explicando a convenção — qualquer conversa do Claude com o Drive conectado pode operar a partir dali, mesmo sem ter lido este repositório.

Além da documentação da Jarvis, o repositório guarda o **agente de posts de Instagram** em [`conteudo/`](conteudo/README.md) (skill `/posts-psicojaquelinesauer`), que gera as artes localmente com o Chromium já disponível no ambiente.
