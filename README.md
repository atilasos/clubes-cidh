# clubes-cidh

Portal para gestão das inscrições dos alunos nos clubes escolares.

## Objetivo

Este projeto existe para ajudar a escola a:
- distribuir vagas de forma justa;
- reduzir trabalho administrativo;
- evitar erros comuns, como respostas duplicadas ou inscrições incompatíveis no mesmo horário;
- manter histórico semestral para apoiar a distribuição automática futura.

## Estado atual

O repositório já contém uma base funcional de MVP com:
- app Next.js + TypeScript;
- painel administrativo inicial;
- fluxo público inicial para identificação e submissão;
- APIs para importação, campanhas, distribuição, finalização e submissão pública;
- serviços de domínio para capacidade, elegibilidade, inscrição, alocação, arquivo e segurança;
- suite inicial de testes unitários.

### Nota importante

A aplicação suporta dois modos de persistência:
- **Prisma + PostgreSQL**, quando `DATABASE_URL` está definido e a base de dados está migrada;
- **store JSON local** em `./.data/clubes-db.json` como fallback de desenvolvimento quando não existe ligação a base de dados.

O schema Prisma completo está em `prisma/schema.prisma` e a migração inicial está em `prisma/migrations/`.

## Stack

- Next.js 15
- React 19
- TypeScript
- Vitest
- ESLint
- Prisma + PostgreSQL (com fallback local JSON para desenvolvimento)
- `pdf-lib` (base para geração de documentos)

## Como correr localmente

### Requisitos

- Node.js 20+
- npm 10+

### Instalação

```bash
npm install
```

### Configuração inicial

Crie um ficheiro `.env` a partir do exemplo e defina a password do painel administrativo:

```bash
cp .env.example .env
```

Depois edite `.env`:

```bash
ADMIN_PASSWORD=escolha-uma-password-segura
```

### Desenvolvimento

```bash
npm run dev
```

App local por defeito:
- http://localhost:3000

Se a porta `3000` já estiver ocupada no seu ambiente, pode arrancar noutra porta:

```bash
PORT=3001 npm run dev
```

## Primeiro acesso

- página inicial: `http://localhost:3000`
- painel administrativo: `http://localhost:3000/admin`
- password do admin: valor definido em `ADMIN_PASSWORD`

## Scripts úteis

```bash
npm run dev
npm run build
npm run start
npm run test
npm run typecheck
npm run lint
```

## Verificação atual

Com o estado atual do repositório, os seguintes comandos passam:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Estrutura do projeto

```text
src/
  app/
    admin/
    api/
    campaign/
  components/
  server/
    auth/
    lib/
    services/
    store/
    types.ts
prisma/
tests/
docs/
```

## Principais áreas

### `src/app/admin`
Fluxos administrativos para preparar campanhas, rever estados e finalizar o processo.

### `src/app/campaign`
Fluxos públicos para identificação do aluno e submissão das escolhas.

### `src/app/api`
Endpoints HTTP para importação, campanhas, exportação de acessos, distribuição, finalização e submissão pública.

### `src/server/services`
Regras de negócio centrais:
- cálculo de vagas;
- elegibilidade;
- inscrições;
- alocação automática;
- arquivo;
- auditoria;
- segurança.

### `tests`
Cobertura inicial da lógica crítica do domínio.

## Documentação adicional

- `docs/site-inscricoes-clubes-product-flows.md`
- `docs/site-inscricoes-clubes-quality-gates.md`
- `docs/site-inscricoes-clubes-traceability-matrix.md`
- `.omx/plans/prd-site-inscricoes-clubes-20260407.md`
- `.omx/plans/test-spec-site-inscricoes-clubes-20260407.md`

## Funcionalidades previstas / em evolução

Ainda falta completar, entre outras coisas:
- endurecimento operacional adicional para produção;
- evolução da UI administrativa para edição mais rica após criação inicial;
- integração do fluxo admin com dados reais em UI mais completa;
- endurecimento adicional do fluxo público para produção.

## GitHub

Repositório remoto:
- https://github.com/atilasos/clubes-cidh

## Licença

MIT — ver o ficheiro [LICENSE](./LICENSE).
