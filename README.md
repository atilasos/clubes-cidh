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
- edição administrativa estruturada sobre campanhas em rascunho com dados reais;
- fluxo público inicial para identificação e submissão;
- APIs para importação, campanhas, distribuição, finalização e submissão pública;
- serviços de domínio para capacidade, elegibilidade, inscrição, alocação, arquivo e segurança;
- endurecimento inicial de produção para segredos obrigatórios, URL pública canónica, headers de segurança e sessões temporárias;
- suite inicial de testes unitários.

### Nota importante

A aplicação suporta dois modos de persistência:
- **Prisma + PostgreSQL**, quando `DATABASE_URL` está definido e a base de dados está migrada;
- **armazenamento JSON local** em `./.data/clubes-db.json` como alternativa de desenvolvimento quando não existe ligação à base de dados.

O schema Prisma completo está em `prisma/schema.prisma` e a migração inicial está em `prisma/migrations/`.

## Tecnologias

- Next.js 15
- React 19
- TypeScript
- Vitest
- ESLint
- Prisma + PostgreSQL (com alternativa local em JSON para desenvolvimento)
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

Crie um ficheiro `.env` a partir do exemplo e defina a palavra-passe do painel administrativo:

```bash
cp .env.example .env
```

Depois edite `.env`:

```bash
ADMIN_PASSWORD=escolha-uma-password-segura
CAMPAIGN_SESSION_SECRET=defina-um-segredo-dedicado-para-a-sessao-publica
APP_BASE_URL=http://localhost:3000
```

Variáveis principais:
- `ADMIN_PASSWORD`: palavra-passe obrigatória do painel administrativo; em produção não existe fallback.
- `CAMPAIGN_SESSION_SECRET`: segredo da sessão temporária do fluxo público; em produção não existe fallback.
- `APP_BASE_URL`: URL pública canónica usada para gerar ligações dos pacotes de acesso; em produção deve apontar para o endereço real da app.

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
- palavra-passe da administração: valor definido em `ADMIN_PASSWORD`

## Demonstração rápida

Se quiser preparar uma demonstração para a direção, use estes recursos:

- guião: `docs/guiao-demonstracao-diretor.md`
- alunos fictícios para importação: `demo/director-demo-students.csv`
- configuração da campanha: `demo/director-demo-campaign.md`
- horários para copiar/colar: `demo/director-demo-slots.txt`
- clubes para copiar/colar: `demo/director-demo-clubs.txt`
- reservas para copiar/colar: `demo/director-demo-reservations.txt`
- listagem rápida dos códigos exportados: `node demo/show-latest-access-package.mjs`

Para repetir a demonstração num ambiente local com armazenamento JSON, limpe os dados antes de começar:

```bash
rm -f .data/clubes-db.json
```

## Scripts úteis

```bash
npm run dev
npm run build
npm run start
npm run test
npm run typecheck
npm run lint
```

## Deployment

O repositório inclui agora material mínimo para colocar o site online com PostgreSQL e Docker:

- checklist de produção: `docs/deploy-checklist.md`
- máquina da escola + Docker + Cloudflare Tunnel: `docs/deploy-school-cloudflare.md`
- VPS + subdomínio + Docker + Caddy: `docs/deploy-vps-subdomain.md`
- exemplos de infraestrutura: `deploy/`

Ficheiros-base de produção incluídos:

- `Dockerfile`
- `.dockerignore`
- `.env.example`
- `.env.production.example`
- `.github/workflows/ci.yml`

Para produção, recomenda-se usar `DATABASE_URL` com PostgreSQL real. Se `DATABASE_URL` estiver ausente, a aplicação continua a cair para o modo JSON local, o que só deve ser usado em desenvolvimento ou em cenários muito controlados.

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
Fluxos administrativos para preparar campanhas, editar campanhas em rascunho com dados reais, rever estados e finalizar o processo.

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

O repositório já cobre a edição estruturada em rascunho, a gestão administrativa sobre dados reais e o endurecimento base dentro da própria aplicação.

Continuam a poder evoluir, sobretudo fora da fronteira direta do repositório:
- endurecimento distribuído para produção multi-instância (por exemplo, rate limiting partilhado, CAPTCHA/WAF e observabilidade externa);
- automatização operacional externa para distribuição/rotação de acessos e integração com canais de comunicação da escola.

## GitHub

Repositório remoto:
- https://github.com/atilasos/clubes-cidh

## Licença

MIT — ver o ficheiro [LICENSE](./LICENSE).
