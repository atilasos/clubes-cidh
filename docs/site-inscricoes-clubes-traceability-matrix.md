# Portal de Inscrição nos Clubes — Matriz de Rastreabilidade

## Objetivo
Ligar requisitos do PRD a evidência técnica, testes e revisão para reduzir lacunas entre implementação e validação.

| Área | Requisito / comportamento | Evidência esperada | Testes mínimos |
| --- | --- | --- | --- |
| Importação | Importar alunos válidos e rejeitar linhas inválidas com relatório | Serviço de importação com relatório estruturado | Integração: importação com rejeições |
| Campanha | Criar campanha com slots, clubes, vagas e reservas | UI/admin + serviços com audit log | Integração: criação de campanha |
| Vagas | Calcular regra default e permitir override manual | `capacity-service` + evento auditado | Unit: `capacity-service` |
| Acesso público | Identificação com CC/NIF/número + código de acesso | Validação server-side, mensagens neutras, rate limit | Integração: identificação pública |
| Elegibilidade | Mostrar apenas clubes elegíveis e disponíveis | Serviço dedicado de elegibilidade | Unit: `eligibility-service` |
| Duplicação | Impedir duas escolhas válidas no mesmo slot | Guardas no serviço de submissão | Unit: `enrollment-service` |
| Concorrência | Última vaga nunca gera oversubscription | Transação/lock + erro controlado | Integração: submissões concorrentes |
| Revisão | Admin revê listas antes da finalização | Ecrã/lista com estados coerentes | E2E: revisão pós-prazo |
| Distribuição | Alocar alunos sem colocação evitando repetições | `allocation-service` com razões auditáveis | Unit + integração: distribuição |
| PDFs | Gerar listas por clube e horário por aluno | Serviço de snapshot + geração de documentos | Integração: finalização/PDFs |
| Finalização | Bloquear conclusão com alunos por colocar sem exceção | Guard de finalização | E2E: finalização bloqueada/desbloqueada |
| Arquivo | Reutilizar histórico no 1.º semestre e congelar no 2.º | `archive-service` + snapshots imutáveis | Unit + integração: arquivo |
| Privacidade | Não expor CC/NIF em logs/UI/PDFs | Masking centralizado + revisão manual | Unit: `security.ts` + QA manual |
| Observabilidade | Expor métricas e eventos essenciais | Métricas, logs estruturados, alertas | Verificação manual + integração quando aplicável |

## Critérios de pronto por área

### Importação e dados
- Fixtures inválidas cobertas.
- Não existem caminhos silenciosos para erros parciais.
- Logs não incluem PII completo.

### Portal público
- A identificação falha sem revelar existência do aluno.
- A disponibilidade é revalidada no backend.
- A UI reflete corretamente clubes esgotados.

### Distribuição e finalização
- Preview e commit são claramente distintos.
- Repetições inevitáveis têm razão persistida.
- Finalização gera snapshot antes dos PDFs.

### Arquivo e histórico
- O histórico do 1.º semestre alimenta o 2.º.
- O 2.º semestre fica apenas para consulta.
- O histórico é consultável sem reabrir a campanha.

## Checklist para revisão final
- Cada requisito do PRD tem pelo menos uma peça de evidência técnica.
- Cada risco crítico (PII, oversubscription, arquivo) tem cobertura explícita.
- O cenário E2E principal percorre o ciclo completo da campanha.
- A documentação operacional acompanha a implementação real e não apenas o plano.
