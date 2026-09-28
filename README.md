# 💊 VarejoPro ERP - Sistema de Gestão comercial & Emissão Fiscal SEFAZ

![NodeJS](https://img.shields.io/badge/Node.js-20.x-green?style=for-the-badge&logo=nodedotjs)
![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql)
![SEFAZ SP](https://img.shields.io/badge/SEFAZ_SP-NFC--e_4.00-blue?style=for-the-badge)

**VarejoPro ERP** é um sistema completo de gestão de lojas e drogarias projetado para operar com alta performance, controle rigoroso de estoque, emissão fiscal em tempo real com a **SEFAZ SP (NFC-e / NF-e)**, suporte ao programa **Desconto Promocional (PBM)** e conformidade com a lei de **Transparência Fiscal (Lei Federal 12.741/2012 - IBPT/Empresômetro)**.

---

## ✨ Principais Funcionalidades

### 🛒 Ponto de Venda (PDV) & Frente de Caixa
- Interface intuitiva otimizada para terminais touch e leitores de código de barras.
- Controle de sangria, suprimento e fechamento de caixa por operador.
- Integração com impressoras térmicas ESC/POS (cupons térmicos DANFE NFC-e).
- Suporte a múltiplas formas de pagamento (Dinheiro, PIX, Cartão de Crédito/Débito, Convênio e PBM).

### 📜 Módulo Fiscal (SEFAZ SP - NFC-e 4.00)
- Assinatura digital XML com Certificado Digital A1 (PFX/PKCS12).
- Comunicação direta via WebService SOAP HTTPS da SEFAZ SP.
- **Tratamento de Contingência Offline (TPEMIS 9)**: Transmissão automática com contingência síncrona.
- **QR Code V2 com Assinatura Hash**: Leitura instantânea por câmera de celular com abertura direta na página da SEFAZ SP.
- **Transparência Fiscal (IBPT / Lei 12.741/2012)**: Cálculo automático de tributos incidentes (Federais/Estaduais) por item e no totalizador.

### 📦 Controle de Estoque & Lotes
- Rastreabilidade por Lote e Validade para produtos.
- Ajuste de estoque automático pós-venda e controle de devoluções.
- Suporte ao SNGPC (Produtos Controlados / Portaria 344/98).

---

## 🛠️ Arquitetura e Tecnologias

[ Frontend: React + Vite ] ──(HTTP/REST)──> [ Backend: Node.js + Express ] │ ┌──────────────┴──────────────┐ ▼ ▼ [ Banco MySQL ] [ WebService SEFAZ SP ]


- **Backend**: Node.js, Express, Sequelize ORM, Axios, XML-Crypto, Node-Forge.
- **Frontend**: React.js, Vite, Lucide Icons, Vanilla CSS Design System.
- **Banco de Dados**: MySQL com índices otimizados para rápida resposta em PDV.
- **Infraestrutura**: VPS Linux (Ubuntu), Nginx, PM2, Certbot SSL.
---
## 🚀 Como Executar o Projeto
### Pré-requisitos
- Node.js >= 20.x
- MySQL >= 8.0
### Configuração do Backend
```bash
cd backend
npm install
cp .env.example .env
# Edite as credenciais do banco MySQL e SEFAZ no .env
npm run dev
Configuração do Frontend
bash

cd frontend
npm install
npm run dev
📄 Licença
Desenvolvido por Omar. Todos os direitos reservados.


---

