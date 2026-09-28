---
name: security-audit
description: Analisa o projeto em busca de credenciais expostas no código, dependências desatualizadas no package.json ou caminhos rígidos (hardcoded) para gravação de arquivos.
---
# Instruções de Auditoria de Segurança
Sempre que esta skill for invocada, o agente deve:
1. Buscar por strings estáticas de chaves de API, senhas ou tokens em arquivos `.js`, `.jsx` e `.env`.
2. Verificar se há dependências com vulnerabilidades conhecidas executando `npm audit` no backend e frontend.
3. Verificar se as conexões de banco de dados ou salvamento de arquivos locais utilizam caminhos rígidos como `C:\` em vez de usar caminhos baseados em variáveis de ambiente ou diretórios de perfil de usuário.
4. Gerar um relatório de análise de segurança em formato markdown.