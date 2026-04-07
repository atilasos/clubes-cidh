# Portal de Inscrição nos Clubes — Fluxos do Produto

## Objetivo
Este documento traduz o PRD em fluxos operacionais claros para implementação, QA manual e revisão funcional.

## Superfícies do sistema
- **Portal público**: identificação do aluno e submissão de escolhas.
- **Painel administrativo**: importação, configuração da campanha, revisão, distribuição, finalização e arquivo.
- **Serviços de domínio**: elegibilidade, cálculo de vagas, auditoria, PDFs, distribuição automática e arquivo.

## Fluxo administrativo

### 1. Importar alunos
1. Admin envia CSV/XLSX com nome, ano, turma, CC, NIF e número de aluno.
2. O sistema valida linhas obrigatórias, duplicados e inconsistências.
3. O sistema persiste apenas linhas válidas.
4. O sistema devolve um relatório de rejeições legível.

**Regras obrigatórias**
- Não aceitar importação silenciosa com erros parciais não reportados.
- Não expor CC/NIF completos em logs ou erros visíveis.
- Guardar trilho de auditoria para importação e correções posteriores.

### 2. Preparar campanha
1. Admin cria campanha com nome, semestre, período e slug público.
2. Admin configura slots horários.
3. Admin associa clubes a cada slot.
4. O sistema calcula vagas por regra default.
5. Admin pode aplicar override manual auditado por clube/slot.
6. Admin regista reservas manuais antes da abertura.
7. O sistema gera o pacote de acesso da campanha (link + códigos) para envio externo.

**Regras obrigatórias**
- Reservas consomem capacidade antes da abertura ao público.
- Overrides devem guardar autor, timestamp e motivo.
- O pacote de acesso deve poder ser regenerado/rotacionado sem alterar o resto da campanha.

### 3. Abrir campanha
1. Admin confirma que campanha está pronta.
2. O sistema passa a campanha para estado aberto.
3. O portal público fica disponível no link gerado.

**Checklist de abertura**
- Alunos importados com sucesso.
- Slots e clubes configurados.
- Vagas revistas.
- Reservas aplicadas.
- Códigos de acesso gerados.

### 4. Rever listas e distribuição final
1. Após o prazo, o admin visualiza listas por clube e alunos sem colocação.
2. Admin executa dry-run da distribuição automática.
3. O sistema mostra preview, impacto e razões para repetições inevitáveis.
4. Admin confirma commit da distribuição final.
5. O sistema persiste placements finais, snapshots e audit logs.

**Regras obrigatórias**
- Dry-run nunca deve persistir placements finais.
- Cada repetição inevitável deve ter razão explícita.
- O admin deve conseguir distinguir alunos colocados, reservados e exceções.

### 5. Finalizar e arquivar
1. Admin tenta concluir a campanha.
2. O sistema bloqueia finalização se ainda existirem alunos sem colocação e sem exceção explícita.
3. O sistema gera PDFs finais a partir de placements congelados.
4. O sistema arquiva a campanha consoante o semestre.

**Regras obrigatórias**
- 1.º semestre: manter histórico utilizável para o 2.º semestre.
- 2.º semestre: congelar para consulta.
- PDFs devem sair de snapshots imutáveis da finalização.

## Fluxo público (pais/alunos)

### 1. Entrada e identificação
1. Utilizador acede ao link público da campanha.
2. Introduz identificador do aluno (CC, NIF ou número de aluno).
3. Introduz código de acesso da campanha.
4. O sistema valida campanha aberta, identificador e código.
5. O sistema autentica a sessão temporária da campanha.

**Regras obrigatórias**
- Rate limiting por IP e/ou fingerprint.
- Mensagens de erro sem revelar se o identificador existe.
- Expiração e rotação de códigos de acesso.

### 2. Escolha de clubes
1. O sistema mostra apenas slots e clubes elegíveis para aquele aluno.
2. O sistema oculta clubes esgotados.
3. O utilizador escolhe no máximo uma opção válida por slot.
4. O sistema apresenta resumo antes da submissão.

**Regras obrigatórias**
- Nunca mostrar clubes incompatíveis para o mesmo slot.
- Nunca permitir duplicação do mesmo aluno no mesmo slot.
- Atualizar disponibilidade a partir do estado servidor, não apenas da UI.

### 3. Submissão
1. O utilizador confirma a inscrição.
2. O backend valida novamente elegibilidade e disponibilidade dentro de transação.
3. O sistema grava a submissão com timestamp atómico.
4. O sistema devolve confirmação ou indisponibilidade atualizada.

**Regras obrigatórias**
- Em disputa pela última vaga, apenas uma submissão pode confirmar.
- A segunda submissão deve falhar de forma controlada, sem oversubscription.
- A submissão confirmada deve ficar auditada.

## Fluxo da distribuição automática
1. Identificar alunos ainda sem colocação após fecho.
2. Recolher slots elegíveis e vagas restantes.
3. Aplicar scoring que prefira clubes não frequentados no ano letivo.
4. Penalizar fortemente repetição em semestres consecutivos.
5. Permitir repetição apenas quando não existir alternativa válida.
6. Guardar razão auditável para cada exceção.

## Estados mínimos recomendados
- `draft`
- `scheduled`
- `open`
- `closed`
- `allocation_previewed`
- `finalized`
- `archived`

## Outputs operacionais
- Relatório de importação com linhas rejeitadas.
- Exportação do pacote de acesso da campanha.
- Lista por clube para professores.
- Horário individual por aluno.
- Snapshot da campanha finalizada.
- Audit trail de reservas, overrides, placements e arquivo.

## Checklist manual de revisão funcional
- A UI de configuração permite perceber claramente slots, vagas e reservas.
- O portal mostra indisponibilidade sem estados ambíguos.
- O desaparecimento de clubes esgotados é coerente após submissões reais.
- O dry-run é distinguível do commit final.
- PDFs são legíveis e não incluem identificadores desnecessários.
- O arquivo semestral é explicável por um operador não técnico.
