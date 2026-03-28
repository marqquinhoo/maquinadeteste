# 🛡️ AutoTesteAI (Generic Testing Platform)

Uma plataforma de automação e descoberta de testes ponta-a-ponta, utilizando o **MCP Playwright** como motor inteligente. Desenvolvida para ser flexível, permitindo testar tanto aplicações web públicas quanto projetos locais através de uma interface moderna e intuitiva.

## 🚀 Funcionalidades Principais

- **Configuração Dinâmica**: Insira URLs ou caminhos de diretórios locais (convertidos automaticamente para `file://`).
- **Navegação Inteligente**: O motor Playwright executa fluxos baseados em objetivos (Goals) definidos pelo usuário.
- **Logs em Tempo Real**: Acompanhamento detalhado de cada clique, navegação e ação via WebSockets.
- **Galeria de Evidências**: Captura de screenshots automáticos (inicial e final) para auditoria visual.
- **Dashboard Premium**: Interface em React com modo escuro, animações suaves e design responsivo.
- **Isolamento de Execução**: Cada teste roda em um contexto de navegador limpo, garantindo integridade dos resultados.

---

## 📂 Estrutura do Projeto

```text
testes-dev/
├── backend/                    # Backend (Executor Core)
│   ├── index.js                # API Express + Socket.io
│   ├── runner.js               # Lógica do motor Playwright
│   └── public/screenshots/     # Armazenamento de evidências visuais
├── frontend/                   # Frontend (Painel de Controle)
│   ├── src/App.jsx             # Dashbord em React
│   └── src/index.css           # Design System & Estilização
└── start-platform.ps1          # Script de Inicialização Automática (Windows)
```

---

## 🛠️ Requisitos

- **Node.js**: Versão 18 ou superior.
- **MySQL**: Servidor rodando com banco `banco_testes_devs`.
- **NPM**: Gerenciador de pacotes.

---

## 📦 Instalação e Configuração

### 1. Preparar o Banco de Dados (MySQL)
Crie o banco de dados manualmente antes de prosseguir:
```sql
CREATE DATABASE banco_testes_devs;
```

### 2. Configurar o Backend
```bash
cd backend
npm install
npx playwright install chromium --with-deps
```

### 3. Rodar Migrações
Execute as migrações para criar as tabelas no MySQL:
```bash
npx knex migrate:latest
```

---

### 3. Configurar o Frontend
```bash
cd ../frontend
npm install
```

---

## ▶️ Como Executar

O sistema requer que ambos o Backend e o Frontend estejam rodando simultaneamente.

### Tutorial Rápido
1.  **Terminal 1 (Backend):**
    ```bash
    cd backend
    npm start
    ```
2.  **Terminal 2 (Frontend):**
    ```bash
    cd frontend
    npm run dev
    ```
3.  **Acesso:** Abra **http://localhost:5173** no seu navegador. Os logs apontam para **http://localhost:8091/maquinadeteste**.

---

### Opção via PowerShell (Windows)
Se preferir, você pode usar o script de automação corrigido:
```powershell
./start-platform.ps1
```

---

## 🧪 Como Usar

1. **URL/Diretório**: Insira um endereço web (ex: `https://playwright.dev`) ou um caminho local (ex: `C:\Users\User\Project`).
2. **Objetivo**: Defina o que o motor deve fazer (ex: *"Ache o formulário de busca e tente digitar Playwright"*).
3. **Contexto**: (Opcional) Passe strings de autenticação ou seletores CSS específicos.
4. **Executar**: Clique em "Iniciar Automação" e acompanhe os logs e prints no painel.

---

## 🔧 Tecnologias Utilizadas

- **Playwright**: Engine de automação cross-browser.
- **Express / Node.js**: API REST para gerenciamento de testes.
- **Socket.io**: Comunicação bidirecional para logs em tempo real.
- **React 19**: Frontend moderno e reativo.
- **Framer Motion**: Animações de interface.
- **Lucide Icons**: Conjunto de ícones premium.

---

## 📞 Suporte e Contribuição

Para bugs ou sugestões, entre em contato com a equipe de engenharia de QA ou abra uma Issue no repositório do projeto.
