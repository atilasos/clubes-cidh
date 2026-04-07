# Guião de demonstração para o diretor

## Objetivo da demonstração

Mostrar, em 10 a 15 minutos, que o produto ajuda a escola a:
- preparar uma campanha de inscrições sem folhas dispersas;
- garantir justiça na atribuição das vagas;
- reduzir erros administrativos e conflitos de horário;
- concluir o processo com listas e horários prontos para impressão.

## Preparação antes da reunião

### 1. Garantir um estado limpo

Se estiver a usar o modo local com ficheiro JSON, remova os dados antigos antes da demo:

```bash
rm -f .data/clubes-db.json
```

### 2. Arrancar a aplicação

```bash
npm install
cp .env.example .env
npm run dev
```

No `.env`, defina uma palavra-passe simples de recordar durante a reunião:

```bash
ADMIN_PASSWORD=demo-escola-2026
```

### 3. Ficheiros a ter prontos

- `demo/director-demo-students.csv`
- `demo/director-demo-campaign.md`
- `demo/director-demo-slots.txt`
- `demo/director-demo-clubs.txt`
- `demo/director-demo-reservations.txt`
- `demo/show-latest-access-package.mjs`

## Estrutura recomendada da apresentação

### Parte 1 — O problema que a escola vive hoje

Abra a demonstração com uma mensagem simples:

> Hoje a escola precisa de preparar clubes, recolher escolhas, evitar duplicados, gerir casos excecionais e fechar tudo com listas finais. O objetivo deste produto é tornar esse processo justo, rastreável e muito mais rápido.

Duração recomendada: **1 minuto**.

### Parte 2 — Preparação da campanha no painel administrativo

1. Entre em `http://localhost:3000/admin`.
2. Inicie sessão com a palavra-passe definida em `ADMIN_PASSWORD`.
3. Na secção **Importar alunos**, carregue `demo/director-demo-students.csv`.
4. Explique:
   - que a importação valida campos obrigatórios;
   - que o sistema rejeita dados inválidos;
   - que existe relatório de rejeições visível no painel.
5. Na secção **Criar campanha**, copie os valores de `demo/director-demo-campaign.md`.
6. Cole os ficheiros de horários, clubes e reservas nos campos adequados.
7. Crie a campanha.

Mensagem sugerida:

> Em poucos minutos, a escola passa de uma folha de alunos para uma campanha pronta, com horários, clubes, capacidade e reservas manuais já registadas.

Duração recomendada: **3 minutos**.

### Parte 3 — Mostrar controlo, justiça e operação

Abra a página da campanha criada em **Campanhas** e destaque:

1. **Resumo da campanha**
   - estado;
   - semestre;
   - horários pendentes;
   - documentos gerados quando a campanha termina.

2. **Horários e clubes**
   - cada clube está associado a um horário;
   - as vagas são visíveis;
   - os ajustes manuais e as reservas ficam controlados.

3. **Reservas e listas**
   - mostre que já existem casos especiais tratados antes da abertura;
   - sublinhe que isso evita trabalho manual de última hora.

Mensagem sugerida:

> O painel não serve apenas para “registar dados”. Ele mostra o estado operacional da campanha e dá confiança à escola antes de abrir o portal aos pais.

Duração recomendada: **2 minutos**.

### Parte 4 — Experiência dos pais

1. Use **Gerar pacote de acesso**.
2. No terminal, execute `node demo/show-latest-access-package.mjs` para ver imediatamente os códigos e a ligação pública da campanha.
3. Abra a ligação pública da campanha.
4. Faça a identificação de um aluno usando um número de aluno e o código exportado.
   - Para esta demonstração, use primeiro `2026001` e depois `2026002`.
   - Evite `2026003` e `2026008`, porque esses alunos já entram com reservas manuais e não servem bem para mostrar o efeito de esgotamento.
5. Mostre que o portal só apresenta opções elegíveis e disponíveis.
6. Submeta uma inscrição escolhendo **Robótica** ou **Música** para evidenciar rapidamente o efeito de esgotamento.

Se quiser reforçar a lógica de justiça, faça uma segunda identificação com outro aluno e mostre que um clube já cheio deixa de aparecer como opção disponível.

Mensagem sugerida:

> Para os pais, o processo é simples. Para a escola, continua a ser controlado e validado no servidor para impedir conflitos e respostas inválidas.

Duração recomendada: **3 minutos**.

### Parte 5 — Fecho, distribuição e documentos finais

1. Volte ao detalhe da campanha.
2. Feche a campanha.
3. Execute a **simulação** da distribuição automática.
4. Explique que os alunos ainda não colocados podem ser distribuídos automaticamente sem repetir trabalho manual.
5. Confirme a distribuição.
6. Finalize a campanha.
7. Abra um dos PDFs gerados.

Com os dados fictícios fornecidos nesta pasta, a campanha fica dimensionada para permitir a finalização sem exigir uma sequência longa de exceções manuais.

Mensagem sugerida:

> Aqui é onde a direção ganha mais tempo: o sistema ajuda a fechar o processo, reduz pendências e gera os documentos operacionais finais para professores e alunos.

Duração recomendada: **3 minutos**.

## Mensagens-chave para reforçar perante o diretor

### Valor para a escola

- menos trabalho administrativo repetitivo;
- menos erros humanos;
- visão centralizada de toda a campanha;
- auditoria das decisões importantes.

### Valor para as famílias

- processo mais simples;
- menos ambiguidades;
- escolhas coerentes com horários e disponibilidade.

### Valor para a direção

- previsibilidade operacional;
- rastreabilidade;
- fecho do processo com documentação pronta.

## Sequência curta, se tiver apenas 5 minutos

Se a reunião ficar mais curta, use esta versão resumida:

1. entrar na administração;
2. mostrar importação concluída e campanha criada;
3. abrir detalhe da campanha e mostrar reservas/vagas;
4. abrir portal público e fazer uma inscrição;
5. voltar à administração, fechar, distribuir e abrir um PDF.

## Plano B se algo falhar durante a reunião

- Se a importação falhar, mostre o ficheiro CSV e explique que o sistema valida erros logo à entrada.
- Se não quiser fazer submissões em direto, mostre a campanha já preparada e explique o fluxo usando os códigos obtidos com `node demo/show-latest-access-package.mjs`.
- Se faltar tempo, vá diretamente ao detalhe da campanha e aos PDFs finais.

## Resultado esperado no fim da demonstração

O diretor deve sair da reunião com esta ideia clara:

> O produto cobre o ciclo completo da campanha, desde a preparação até ao fecho, com mais justiça, menos trabalho manual e maior controlo para a escola.
