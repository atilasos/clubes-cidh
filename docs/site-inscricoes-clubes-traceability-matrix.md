# Portal de Inscrição nos Clubes — Matriz de Rastreabilidade

## Objetivo
Ligar requisitos do PRD a evidência técnica, testes e revisão para reduzir lacunas entre implementação e validação.

| Área | Requisito / comportamento | Evidência esperada | Testes mínimos |
| --- | --- | --- | --- |
| Importação | Importar alunos válidos e rejeitar linhas inválidas com relatório | Serviço de importação com relatório estruturado | Integração: importação com rejeições |
| Campanha | Criar campanha com horários, clubes, vagas e reservas | Interface administrativa + serviços com registo de auditoria | Integração: criação de campanha |
| Vagas | Calcular a regra predefinida e permitir ajuste manual | `capacity-service` + evento auditado | Teste unitário: `capacity-service` |
| Acesso público | Identificação com CC/NIF/número + código de acesso | Validação no servidor, mensagens neutras, limitação de tentativas | Integração: identificação pública |
| Elegibilidade | Mostrar apenas clubes elegíveis e disponíveis | Serviço dedicado de elegibilidade | Teste unitário: `eligibility-service` |
| Duplicação | Impedir duas escolhas válidas no mesmo horário | Guardas no serviço de submissão | Teste unitário: `enrollment-service` |
| Concorrência | A última vaga nunca gera sobreocupação | Transação/bloqueio + erro controlado | Integração: submissões concorrentes |
| Revisão | A administração revê listas antes da finalização | Ecrã/lista com estados coerentes | Teste ponta a ponta: revisão pós-prazo |
| Distribuição | Alocar alunos sem colocação evitando repetições | `allocation-service` com razões auditáveis | Teste unitário + integração: distribuição |
| PDFs | Gerar listas por clube e horário por aluno | Serviço de instantâneo + geração de documentos | Integração: finalização/PDFs |
| Finalização | Bloquear conclusão com alunos por colocar sem exceção | Proteção de finalização | Teste ponta a ponta: finalização bloqueada/desbloqueada |
| Arquivo | Reutilizar histórico no 1.º semestre e congelar no 2.º | `archive-service` + instantâneos imutáveis | Teste unitário + integração: arquivo |
| Privacidade | Não expor CC/NIF em registos/interface/PDFs | Mascaramento centralizado + revisão manual | Teste unitário: `security.ts` + verificação manual |
| Observabilidade | Expor métricas e eventos essenciais | Métricas, logs estruturados, alertas | Verificação manual + integração quando aplicável |

## Critérios de pronto por área

### Importação e dados
- Fixtures inválidas cobertas.
- Não existem caminhos silenciosos para erros parciais.
- Logs não incluem PII completo.

### Portal público
- A identificação falha sem revelar existência do aluno.
- A disponibilidade é revalidada no servidor.
- A interface reflete corretamente clubes esgotados.

### Distribuição e finalização
- Simulação e confirmação são claramente distintas.
- Repetições inevitáveis têm razão persistida.
- A finalização gera um instantâneo antes dos PDFs.

### Arquivo e histórico
- O histórico do 1.º semestre alimenta o 2.º.
- O 2.º semestre fica apenas para consulta.
- O histórico é consultável sem reabrir a campanha.

## Checklist para revisão final
- Cada requisito do PRD tem pelo menos uma peça de evidência técnica.
- Cada risco crítico (PII, sobreocupação, arquivo) tem cobertura explícita.
- O cenário principal ponta a ponta percorre o ciclo completo da campanha.
- A documentação operacional acompanha a implementação real e não apenas o plano.
