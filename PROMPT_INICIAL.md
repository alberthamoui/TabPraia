# Prompt inicial — colar no chat do Claude Code

Crie um app desktop para Windows de controle de comandas de barraca de praia.

Leia o arquivo `SPEC.md` antes de começar — ele contém todos os detalhes: contexto de negócio, stack, schema do banco, regras, funcionalidades e requisitos de entrega.

**Stack:** Electron + React + SQLite (via `better-sqlite3`)

**Ordem de execução:**
1. Estrutura de pastas e configuração do projeto (Electron + React + Vite ou CRA)
2. Banco de dados: migrations das 3 tabelas + seed inicial dos produtos
3. Camada de acesso a dados (IPC handlers no main process)
4. Telas na ordem: Dashboard → Nova Comanda → Tela da Comanda → Lista de Abertas → Fechamento → Histórico → Resumo do Dia → Produtos
5. README com instruções para rodar e gerar executável no Windows

Não invente funcionalidades extras. Siga o SPEC.md à risca.
