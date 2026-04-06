# SPEC — Barraca do João (Controle de Comandas)

## Contexto do Negócio

O dono da barraca chama-se João. Ele vende produtos em uma barraca de praia no Guarujá.
Hoje ele controla tudo em um caderno: anota o nome do cliente e vai somando o que ele consome ao longo do dia ou de vários dias. Quando o cliente decide pagar, João soma tudo manualmente.
O sistema deve substituir esse caderno.

Produtos atuais:
- Coca-Cola
- Guaraná
- Água de coco
- Milho verde
- Sanduíche

---

## Stack

- **Electron** (app desktop Windows)
- **React** (frontend)
- **SQLite** via `better-sqlite3` (banco local)

Requisitos da stack:
- Desktop, funciona offline
- Banco local real, sem mock
- Sem serviços em nuvem

---

## Banco de Dados

### Tabela: `produtos`
| Campo | Tipo | Notas |
|---|---|---|
| id | INTEGER PK | autoincrement |
| nome | TEXT | obrigatório |
| preco | REAL | obrigatório |
| categoria | TEXT | opcional |
| ativo | INTEGER | boolean (0/1), default 1 |
| criado_em | TEXT | ISO 8601 |

### Tabela: `comandas`
| Campo | Tipo | Notas |
|---|---|---|
| id | INTEGER PK | autoincrement |
| nome_cliente | TEXT | obrigatório |
| observacao | TEXT | opcional (ex: guarda-sol 8) |
| status | TEXT | "aberta" ou "fechada" |
| total | REAL | recalculado automaticamente |
| forma_pagamento | TEXT | null, "pix" ou "dinheiro" |
| criada_em | TEXT | ISO 8601 |
| fechada_em | TEXT | null quando aberta |

### Tabela: `itens_comanda`
| Campo | Tipo | Notas |
|---|---|---|
| id | INTEGER PK | autoincrement |
| comanda_id | INTEGER | FK → comandas.id |
| produto_id | INTEGER | FK → produtos.id |
| nome_produto_snapshot | TEXT | snapshot no momento do lançamento |
| preco_unitario_snapshot | REAL | snapshot no momento do lançamento |
| quantidade | INTEGER | mínimo 1 |
| subtotal | REAL | preco_unitario_snapshot × quantidade |
| criado_em | TEXT | ISO 8601 |

---

## Seed Inicial

Inserir os seguintes produtos ao inicializar o banco (se ainda não existirem):

| Nome | Preço sugerido |
|---|---|
| Coca-Cola | R$ 6,00 |
| Guaraná | R$ 5,00 |
| Água de coco | R$ 8,00 |
| Milho verde | R$ 7,00 |
| Sanduíche | R$ 12,00 |

---

## Regras de Negócio

- Cada cliente pode ter apenas uma comanda com status "aberta" por vez (comparação por nome exato).
- A comanda acumula consumo até ser fechada.
- Ao adicionar ou remover item, recalcular e salvar o total da comanda automaticamente.
- Comanda fechada não pode receber novos itens nem ser alterada.
- No fechamento, a forma de pagamento é obrigatória (pix ou dinheiro).
- Não implementar controle de estoque nesta versão.
- Não implementar login nesta versão.
- Não exigir CPF, telefone nem dados adicionais do cliente.

---

## Funcionalidades

### 1. Dashboard (Tela Inicial)
Botões grandes para navegação:
- Nova comanda
- Comandas em aberto
- Fechar conta
- Produtos
- Resumo do dia
- Histórico

Indicadores visíveis:
- Quantidade de comandas abertas
- Total vendido hoje
- Total recebido em Pix hoje
- Total recebido em dinheiro hoje

---

### 2. Cadastro de Produtos
- Listar todos os produtos
- Criar produto (nome, preço, categoria opcional)
- Editar produto
- Ativar / inativar produto

---

### 3. Nova Comanda
Campos:
- Nome do cliente (obrigatório)
- Observação (opcional — ex: guarda-sol 8, cadeira azul)

Ao salvar:
- Criar comanda com status "aberta"
- Navegar automaticamente para a tela da comanda

---

### 4. Tela da Comanda
Exibir:
- Nome do cliente
- Observação
- Status
- Lista de itens com quantidade, preço unitário e subtotal
- Total parcial atualizado

Ações:
- Adicionar produto por botão rápido (clicar já adiciona 1 unidade)
- Opção para aumentar/diminuir quantidade
- Remover item (com confirmação)
- Voltar para lista de comandas

---

### 5. Lista de Comandas em Aberto
Cards ou linhas com:
- Nome do cliente
- Observação
- Horário/data de abertura
- Valor acumulado
- Botão para abrir a comanda
- Botão para fechar conta

---

### 6. Fechamento de Conta
Exibir:
- Nome do cliente
- Itens consumidos com quantidade, valor unitário e subtotal
- Total geral

Seleção de forma de pagamento (obrigatória):
- Pix
- Dinheiro

Botão: **Confirmar Recebimento**

Ao confirmar:
- Status → "fechada"
- Salvar forma_pagamento
- Salvar fechada_em (timestamp atual)
- Bloquear qualquer alteração

---

### 7. Histórico
Lista de comandas fechadas com:
- Nome do cliente
- Data/hora de fechamento
- Valor total
- Forma de pagamento
- Opção para ver detalhes

---

### 8. Resumo do Dia
Indicadores com base nas comandas do dia corrente:
- Total vendido no dia
- Total recebido em Pix
- Total recebido em dinheiro
- Número de comandas fechadas
- Número de comandas abertas
- Produtos mais vendidos (ranking por quantidade)

---

## Validações

- Não permitir criar comanda sem nome do cliente
- Não permitir fechar conta sem forma de pagamento selecionada
- Não permitir adicionar item em comanda fechada
- Não permitir quantidade zero ou negativa
- Exibir mensagem amigável em caso de erro de banco ou aplicação
- Confirmar antes de remover item

---

## UX / UI

- Interface em português do Brasil
- Moeda: Real brasileiro (R$)
- Botões grandes, fonte legível, design limpo
- Poucas cores, sem excesso de popups
- Mensagens de sucesso e erro claras
- Fluxo rápido para operação em tempo real
- Voltado para usuário com baixa familiaridade com tecnologia

---

## Entrega Esperada

- Frontend completo e conectado ao banco
- Backend/lógica local completa
- SQLite configurado com migrations e seed
- Todas as telas implementadas e navegáveis
- Fluxo funcional ponta a ponta

Documentar no README:
- Instruções para rodar no Windows
- Instruções para instalar dependências
- Instruções para gerar executável (electron-builder)
- Estrutura das tabelas
- Arquitetura resumida
- Sugestões de melhorias futuras

---

## Restrições

- Não adicionar funcionalidades além do especificado
- Não transformar em sistema complexo de restaurante
- MVP simples e prático
- Foco em clareza, velocidade, funcionamento real e persistência local
