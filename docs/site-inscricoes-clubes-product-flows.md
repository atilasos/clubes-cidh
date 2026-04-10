# Portal de Inscrição nos Clubes — Fluxos do Produto

## Objetivo
Este documento traduz o PRD em fluxos operacionais claros para implementação, validação manual e revisão funcional.

## Superfícies do sistema
- **Portal público**: identificação do aluno e submissão de escolhas.
- **Painel administrativo**: importação, configuração da campanha, revisão, distribuição, finalização e arquivo.
- **Serviços de domínio**: elegibilidade, cálculo de vagas, auditoria, PDFs, distribuição automática e arquivo.

## Fluxo administrativo

### 1. Importar alunos
1. A administração envia CSV/XLSX com nome, ano, turma, CC, NIF e número de aluno.
2. O sistema valida linhas obrigatórias, duplicados e inconsistências.
3. O sistema persiste apenas linhas válidas.
4. O sistema devolve um relatório de rejeições legível.

**Regras obrigatórias**
- Não aceitar importação silenciosa com erros parciais não reportados.
- Não expor CC/NIF completos em logs ou erros visíveis.
- Guardar trilho de auditoria para importação e correções posteriores.

### 2. Preparar campanha
1. A administração cria a campanha, por defeito, em estado `draft` com nome, semestre, período e identificador público.
2. A administração revê a campanha no detalhe usando os dados reais já persistidos.
3. A administração ajusta regras por horário (anos elegíveis, divisor, mínimo por clube).
4. A administração ajusta professor, descrição e capacidade manual por clube.
5. A administração regista e remove reservas manuais antes da abertura.
6. O sistema calcula vagas pela regra predefinida e aplica os ajustes auditados.
7. O sistema gera o pacote de acesso da campanha (ligação + códigos) a partir da URL pública canónica.

**Regras obrigatórias**
- Reservas consomem capacidade antes da abertura ao público.
- Os ajustes manuais devem guardar autor, data/hora e motivo.
- O pacote de acesso deve poder ser regenerado/rotacionado sem alterar o resto da campanha.

### 3. Abrir campanha
1. A administração confirma que a campanha está pronta.
2. O sistema passa a campanha para estado aberto.
3. O portal público fica disponível na ligação gerada.

**Checklist de abertura**
- Alunos importados com sucesso.
- Horários e clubes configurados e revistos no detalhe administrativo.
- Vagas revistas.
- Reservas aplicadas.
- Códigos de acesso gerados.

### 4. Rever listas e distribuição final
1. Após o prazo, a administração visualiza listas por clube e alunos sem colocação.
2. A administração executa a simulação da distribuição automática.
3. O sistema mostra a pré-visualização, o impacto e as razões para repetições inevitáveis.
4. A administração confirma a distribuição final.
5. O sistema persiste as colocações finais, os instantâneos e os registos de auditoria.

**Regras obrigatórias**
- A simulação nunca deve persistir colocações finais.
- Cada repetição inevitável deve ter razão explícita.
- A administração deve conseguir distinguir alunos colocados, reservados e exceções.

### 5. Finalizar e arquivar
1. A administração tenta concluir a campanha.
2. O sistema bloqueia finalização se ainda existirem alunos sem colocação e sem exceção explícita.
3. O sistema gera PDFs finais a partir de colocações congeladas.
4. O sistema arquiva a campanha consoante o semestre.

**Regras obrigatórias**
- 1.º semestre: manter histórico utilizável para o 2.º semestre.
- 2.º semestre: congelar para consulta.
- Os PDFs devem sair de instantâneos imutáveis da finalização.

## Fluxo público (pais/alunos)

### 1. Entrada e identificação
1. O utilizador acede à ligação pública da campanha.
2. Introduz identificador do aluno (CC, NIF ou número de aluno).
3. Introduz código de acesso da campanha.
4. O sistema valida campanha aberta, identificador e código.
5. O sistema autentica a sessão temporária da campanha.

**Regras obrigatórias**
- Limitação de tentativas por IP e/ou impressão digital do navegador.
- Mensagens de erro sem revelar se o identificador existe.
- Expiração e rotação de códigos de acesso.
- Sessão temporária limpa quando o contexto do aluno deixa de ser válido.

### 2. Escolha de clubes
1. O sistema mostra apenas horários e clubes elegíveis para aquele aluno.
2. O sistema oculta clubes esgotados.
3. O utilizador escolhe, no máximo, uma opção válida por horário.
4. O sistema apresenta resumo antes da submissão.

**Regras obrigatórias**
- Nunca mostrar clubes incompatíveis para o mesmo horário.
- Nunca permitir duplicação do mesmo aluno no mesmo horário.
- Atualizar a disponibilidade a partir do estado do servidor, e não apenas da interface.

### 3. Submissão
1. O utilizador confirma a inscrição.
2. O servidor valida novamente a elegibilidade e a disponibilidade dentro de transação.
3. O sistema grava a submissão com marca temporal atómica.
4. O sistema devolve confirmação ou indisponibilidade atualizada.

**Regras obrigatórias**
- Em disputa pela última vaga, apenas uma submissão pode confirmar.
- A segunda submissão deve falhar de forma controlada, sem sobreocupação.
- A submissão confirmada deve ficar auditada.

## Fluxo da distribuição automática
1. Identificar alunos ainda sem colocação após fecho.
2. Recolher horários elegíveis e vagas restantes.
3. Aplicar uma pontuação que prefira clubes não frequentados no ano letivo.
4. Penalizar fortemente repetição em semestres consecutivos.
5. Permitir repetição apenas quando não existir alternativa válida.
6. Guardar razão auditável para cada exceção.

## Estados mínimos recomendados
- `draft` (rascunho)
- `scheduled` (agendada)
- `open` (aberta)
- `closed` (fechada)
- `allocation_previewed` (distribuição simulada)
- `finalized` (finalizada)
- `archived` (arquivada)

## Outputs operacionais
- Relatório de importação com linhas rejeitadas.
- Exportação do pacote de acesso da campanha.
- Lista por clube para professores.
- Horário individual por aluno.
- Instantâneo da campanha finalizada.
- Registo de auditoria das reservas, dos ajustes manuais, das colocações e do arquivo.

## Checklist manual de revisão funcional
- A interface de configuração permite criar em rascunho, rever dados reais e ajustar horários, clubes e reservas antes da abertura.
- O portal mostra indisponibilidade sem estados ambíguos.
- O desaparecimento de clubes esgotados é coerente após submissões reais.
- A simulação é distinguível da confirmação final.
- PDFs são legíveis e não incluem identificadores desnecessários.
- O arquivo semestral é explicável por um operador não técnico.
