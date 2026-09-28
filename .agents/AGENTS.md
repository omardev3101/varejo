# Diretrizes e Instruções do Agente - VarejoPro

Este arquivo contém as instruções e regras de comportamento para os assistentes de IA que operam no projeto VarejoPro.

## Regras de Resposta e Idioma
- Responda sempre no idioma Português do Brasil (pt-BR).

## Tecnologias e Frameworks
- **Banco de Dados**: Utilizar sempre o banco MySQL configurado a partir das credenciais do arquivo `.env`.
- **Mobile & Frontend**: O design do frontend deve priorizar layouts otimizados para dispositivos móveis, utilizando os componentes e padrões do `stich`.
- **Deploy**: O deploy na VPS é realizado executando o script `./deploy.ps1`.

## Otimização e Controle de Recursos
- Economize recursos da VPS ativamente (compactação de banco de dados, compactação de arquivos e uso estratégico de cache).
- Verifique constantemente o uso de memória e processamento da VPS. Caso identifique picos de carga ou ameaça de esgotamento de memória, planeje e execute otimizações preventivas no backend e serviços locais.
