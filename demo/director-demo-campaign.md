# Dados da campanha de demonstração

Use estes valores no formulário **Criar campanha** do painel administrativo.

- **Título**: Demonstração para o diretor — Clubes 2026/2027
- **Slug**: demo-diretor-2026
- **Semestre**: 1.º semestre
- **Ano letivo**: 2026/2027
- **Início**: `2026-10-05T09:00:00.000Z`
- **Fim**: `2026-10-16T18:00:00.000Z`
- **Capacidade por defeito**: `2`
- **Abrir imediatamente**: ligado

Depois copie e cole os conteúdos destes ficheiros nos respetivos campos:

- `demo/director-demo-slots.txt`
- `demo/director-demo-clubs.txt`
- `demo/director-demo-reservations.txt`

Depois de usar **Gerar pacote de acesso**, pode listar rapidamente os códigos com:

```bash
node demo/show-latest-access-package.mjs
```
