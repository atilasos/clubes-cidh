# Portal de Inscrição nos Clubes — Critérios de Qualidade

## Contexto
O repositório foi iniciado de raiz. Este documento define critérios de revisão técnica e de disponibilização para a implementação do PRD e da especificação de testes.

## Critério 1 — Estrutura e isolamento
- Separar claramente superfícies **pública**, **administrativa** e **domínio**.
- Evitar colocar regras de negócio críticas apenas em componentes/interface.
- Centralizar mascaramento, validação de acesso, limitação de tentativas e registo de segurança.
- Garantir que PDFs, exportações e tarefas automáticas usam serviços partilhados, e não lógica duplicada.

### Sinais de alerta
- Queries ou regras críticas espalhadas por rotas e componentes.
- Helpers de segurança copiados para múltiplos ficheiros.
- Mistura de autenticação administrativa com autenticação da campanha pública.

## Critério 2 — Integridade e concorrência
- Submissões para a última vaga devem ser protegidas por transação/bloqueio no servidor.
- A disponibilidade apresentada ao utilizador não substitui a revalidação no servidor.
- A simulação de distribuição não persiste colocações finais.
- A finalização exige colocações completas ou exceções explícitas aprovadas.

### Evidência esperada
- Teste de concorrência cobrindo disputa pela última vaga.
- Serviço de submissão com caminho explícito de erro para indisponibilidade.
- Distinção clara entre simulação e confirmação no motor de distribuição.

## Critério 3 — Privacidade e segurança
- CC/NIF mascarados em registos, interface administrativa e erros.
- PDFs não devem incluir identificadores sensíveis sem necessidade operacional.
- Os códigos de acesso devem expirar/rodar e ser validados no servidor.
- O portal público deve usar limitação de tentativas e mensagens neutras para falhas de identificação.

### Evidência esperada
- Testes unitários para mascaramento e validade/expiração de códigos.
- Verificação manual de logs estruturados e PDFs.
- Métricas/alertas para falhas de identificação e corridas da última vaga.

## Critério 4 — Auditabilidade
- Reservas manuais, ajustes manuais, finalização, redistribuições e arquivo geram registo de auditoria.
- O registo de auditoria deve incluir autor, data/hora, tipo de evento e carga mínima necessária.
- Repetições inevitáveis na distribuição precisam de uma razão explícita.

### Evidência esperada
- Eventos estruturados para `reservation_created`, `campaign_opened`, `placement_committed` e `campaign_archived`.
- Cobertura de integração a validar a persistência dos registos críticos de auditoria.

## Critério 5 — Testes mínimos antes da disponibilização

### Testes unitários
- `capacity-service`
- `eligibility-service`
- `enrollment-service`
- `allocation-service`
- `archive-service`
- `security.ts`

### Testes de integração
- Importação com rejeições.
- Identificação pública com identificador + código.
- Submissão concorrente para última vaga.
- Simulação e confirmação da distribuição.
- Finalização com geração de instantâneos/PDFs.
- Arquivo com transporte correto do histórico.

### Testes ponta a ponta
- Fluxo completo da administração → abertura → submissão pública → distribuição → PDFs → finalização.

## Critério 6 — Observabilidade
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
- Aluno sem colocação após confirmação final.
- Falhas repetidas de identificação acima do limiar definido.
- Erros de geração de PDFs.

## Critério 7 — Documentação que deve existir no código final
- Instruções de configuração local.
- Explicação do modelo de dados central.
- Processo operacional para abrir, fechar e arquivar campanhas.
- Guia de resolução de problemas para importação, disputa de vagas e geração de PDFs.

## Lista de verificação para revisão do pedido de integração
- As alterações mantêm a separação entre camadas pública/administrativa/domínio?
- Há qualquer caminho que exponha CC/NIF completos?
- Existe alguma escrita de placements fora dos serviços centrais?
- Os testes cobrem concorrência, distribuição e arquivo?
- O diff introduz duplicação evitável em validação, mascaramento ou geração de documentos?
- Existem logs/telemetria suficientes para investigar falhas operacionais?

## Critérios para bloquear a integração
- Qualquer sobreocupação reproduzível.
- Finalização sem proteção contra alunos não colocados.
- Repetição automática de clubes sem explicação auditável.
- Exposição indevida de CC/NIF na interface, em registos ou em PDFs.
- Ausência dos testes críticos de domínio ou do cenário principal ponta a ponta.
