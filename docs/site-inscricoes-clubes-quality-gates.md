# Portal de Inscrição nos Clubes — Quality Gates

## Contexto
O repositório foi iniciado a partir de um estado greenfield. Este documento define critérios de revisão técnica e de release para a implementação do PRD e do test spec.

## Gate 1 — Estrutura e isolamento
- Separar claramente superfícies **pública**, **admin** e **domínio**.
- Evitar colocar regras de negócio críticas apenas em componentes/UI.
- Centralizar masking, validação de acesso, rate limiting e logging de segurança.
- Garantir que PDFs, exportações e jobs usam serviços partilhados, não lógica duplicada.

### Sinais de alerta
- Queries ou regras críticas espalhadas por rotas e componentes.
- Helpers de segurança copiados para múltiplos ficheiros.
- Mistura de autenticação admin com autenticação da campanha pública.

## Gate 2 — Integridade e concorrência
- Submissões para a última vaga devem ser protegidas por transação/lock server-side.
- A disponibilidade apresentada ao utilizador não substitui a revalidação no backend.
- Dry-run de distribuição não persiste placements finais.
- Finalização exige placements completos ou exceções explícitas aprovadas.

### Evidência esperada
- Teste de concorrência cobrindo disputa pela última vaga.
- Serviço de submissão com caminho explícito de erro para indisponibilidade.
- Distinção clara entre preview e commit no motor de distribuição.

## Gate 3 — Privacidade e segurança
- CC/NIF mascarados em logs, UI administrativa e erros.
- PDFs não devem incluir identificadores sensíveis sem necessidade operacional.
- Códigos de acesso devem expirar/rodar e ser validados server-side.
- O portal público deve usar rate limiting e mensagens neutras para falhas de identificação.

### Evidência esperada
- Testes unitários para masking e validade/expiração de códigos.
- Verificação manual de logs estruturados e PDFs.
- Métricas/alertas para falhas de identificação e corridas da última vaga.

## Gate 4 — Auditabilidade
- Reservas manuais, overrides, finalização, redistribuições e arquivo geram audit log.
- O audit log deve incluir autor, timestamp, tipo de evento e payload mínimo necessário.
- Repetições inevitáveis na distribuição precisam de uma razão explícita.

### Evidência esperada
- Eventos estruturados para `reservation_created`, `campaign_opened`, `placement_committed` e `campaign_archived`.
- Cobertura de integração validando persistência de audit logs críticos.

## Gate 5 — Testes mínimos antes de release

### Unit
- `capacity-service`
- `eligibility-service`
- `enrollment-service`
- `allocation-service`
- `archive-service`
- `security.ts`

### Integration
- Importação com rejeições.
- Identificação pública com identificador + código.
- Submissão concorrente para última vaga.
- Dry-run e commit da distribuição.
- Finalização com geração de snapshots/PDFs.
- Arquivo com transporte correto do histórico.

### E2E
- Fluxo completo admin → abertura → submissão pública → distribuição → PDFs → finalização.

## Gate 6 — Observabilidade
### Métricas obrigatórias
- `campaign_identification_failures_total`
- `campaign_last_seat_race_total`
- `allocation_repeat_override_total`
- `pdf_generation_failures_total`

### Logs/eventos obrigatórios
- `reservation_created`
- `campaign_opened`
- `placement_committed`
- `campaign_archived`

### Alertas mínimos
- Aluno sem colocação após commit final.
- Falhas repetidas de identificação acima do limiar definido.
- Erros de geração de PDFs.

## Gate 7 — Documentação que deve existir no código final
- Instruções de setup local.
- Explicação do modelo de dados central.
- Processo operacional para abrir, fechar e arquivar campanhas.
- Guia de troubleshooting para importação, disputa de vagas e geração de PDFs.

## Checklist de revisão de PR
- O diff mantém a separação entre camadas pública/admin/domínio?
- Há qualquer caminho que exponha CC/NIF completos?
- Existe alguma escrita de placements fora dos serviços centrais?
- Os testes cobrem concorrência, distribuição e arquivo?
- O diff introduz duplicação evitável em validação, masking ou geração de documentos?
- Existem logs/telemetria suficientes para investigar falhas operacionais?

## Critérios para bloquear merge
- Qualquer oversubscription reproduzível.
- Finalização sem proteção contra alunos não colocados.
- Repetição automática de clubes sem explicação auditável.
- Exposição indevida de CC/NIF em UI, logs ou PDFs.
- Ausência dos testes críticos de domínio ou do cenário E2E principal.
