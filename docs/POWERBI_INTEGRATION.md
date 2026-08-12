# Conectando o Power BI ao FinTrack API

Este guia mostra como usar o Power BI Desktop para consumir os endpoints de analytics da API e montar um dashboard financeiro completo.

## 1. Suba a API e gere dados de demonstração

```bash
npm install
npm run seed     # cria o usuário demo@fintrack.com com 1 ano de transações
npm start
```

O comando `seed` imprime no terminal a **API key** do usuário demo — é ela que o Power BI vai usar (nada de login interativo: a `api_key` é uma credencial de longa duração pensada exatamente para ferramentas de BI e automação).

Se preferir criar sua própria conta, registre-se em `POST /api/auth/register` e pegue a `api_key` retornada, ou chame `POST /api/auth/api-key/regenerate` (com o token JWT) a qualquer momento.

## 2. Conectar via "Obter Dados > Web"

1. Abra o **Power BI Desktop**
2. **Página Inicial > Obter Dados > Web**
3. Cole a URL do endpoint desejado, incluindo a `api_key` como query string, por exemplo:

   ```
   http://localhost:3000/api/analytics/summary?api_key=SUA_API_KEY_AQUI
   ```

4. O Power BI detecta o JSON automaticamente. Clique em **Editar** para abrir o Power Query.

## 3. Endpoints prontos para os principais visuais

| Endpoint | Uso sugerido no Power BI |
|---|---|
| `GET /api/analytics/summary` | Cartões (Card) com Receita Total, Despesa Total e Saldo |
| `GET /api/analytics/by-category` | Gráfico de barras/pizza — gasto por categoria |
| `GET /api/analytics/monthly-trend?months=12` | Gráfico de linhas — receita vs. despesa por mês |
| `GET /api/analytics/cash-flow` | Gráfico de área — fluxo de caixa diário |
| `GET /api/analytics/export/csv` | Importação direta via conector "Web" ou "Texto/CSV" |

Todos aceitam `startDate`/`endDate` (formato `YYYY-MM-DD`) como query string, exceto o `monthly-trend`, que aceita `months` (padrão 12).

## 4. Transformando a resposta no Power Query

A resposta vem no formato:

```json
{ "success": true, "data": [ { "categoryName": "Alimentação", "total": 1180.4, ... } ] }
```

No editor do Power Query:

1. Clique com o botão direito na coluna `data` (tipo *Record* ou *List*) → **Para Tabela** (se for lista) ou **Expandir** (se for record)
2. Expanda as colunas internas (`categoryName`, `total`, `transactionCount`, etc.)
3. Ajuste os tipos de dados (a coluna `total` deve virar *Decimal Number*, `date`/`month` deve virar *Date*)
4. Clique em **Fechar e Aplicar**

Repita para cada endpoint que você quiser usar — cada um vira uma tabela independente no seu modelo.

## 5. Sugestão de dashboard

- **Cartões** no topo: Receita, Despesa, Saldo (a partir de `/summary`)
- **Gráfico de pizza**: distribuição de gastos por categoria (`/by-category`)
- **Gráfico de linhas**: evolução de receita/despesa nos últimos 12 meses (`/monthly-trend`)
- **Gráfico de área empilhada**: fluxo de caixa diário (`/cash-flow`)
- **Tabela detalhada**: transações completas via `/export/csv`

## 6. Atualização automática (Power BI Service)

A conexão via `localhost` só funciona com o Power BI Desktop rodando na mesma máquina. Para publicar no **Power BI Service** com atualização agendada:

- Hospede a API publicamente (Render, Railway, um VPS, Azure App Service etc.)
- Troque `http://localhost:3000` pela URL pública nos seus queries
- Configure um **Gateway de Dados Local** apenas se optar por manter a API on-premises

## 7. Autenticação alternativa (Bearer token)

Se preferir não expor a `api_key` na URL, o conector Web do Power BI permite adicionar cabeçalhos customizados em **Configurações avançadas** → adicione `Authorization: Bearer SEU_TOKEN_JWT`. Nesse caso, use a URL sem `?api_key=...`.
