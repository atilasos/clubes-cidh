# Checklist de deployment

Use esta lista antes de colocar o portal online numa máquina da escola ou numa VPS.

## 1. Configuração obrigatória

- [ ] Criar `.env.production` a partir de `.env.example`
- [ ] Definir `NODE_ENV=production`
- [ ] Definir `ADMIN_PASSWORD` com uma palavra-passe forte
- [ ] Definir `CAMPAIGN_SESSION_SECRET` com um segredo longo e aleatório
- [ ] Definir `APP_BASE_URL` com a URL pública final (`https://...`)
- [ ] Definir `DATABASE_URL` para PostgreSQL real
- [ ] Definir `POSTGRES_*` se usar os exemplos Docker incluídos

## 2. Base de dados

- [ ] PostgreSQL disponível antes de arrancar a app
- [ ] Migrações aplicadas com `npm run db:deploy` ou equivalente no container
- [ ] Volume persistente configurado para a base de dados
- [ ] Backup diário configurado e testado

## 3. Segurança e acesso

- [ ] Site servido apenas por HTTPS
- [ ] Porta `3000` não exposta diretamente à Internet
- [ ] Painel `/admin` protegido com palavra-passe forte e, se possível, uma camada adicional (ex.: Cloudflare Access)
- [ ] Sistema e Docker atualizados
- [ ] Acesso SSH limitado a administradores autorizados

## 4. Validação técnica

- [ ] `npm test`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `GET /api/health` responde `200` (liveness apenas; não confirma base de dados nem migrações)

## 5. Operação

- [ ] Procedimento de atualização documentado
- [ ] Procedimento de restore da base de dados documentado
- [ ] Teste funcional feito antes de abrir a campanha: admin, importação, campanha, identificação e submissão pública

## 6. Observações específicas deste projeto

- Se `DATABASE_URL` estiver ausente, a aplicação cai para o modo JSON local. Para um site online, isso deve ser evitado e substituído por PostgreSQL real.
- Os documentos PDF finais ficam guardados na persistência da aplicação, por isso o backup da base de dados é crítico.
- O portal tem uso sazonal; faça um teste completo alguns dias antes de cada abertura de campanha.
