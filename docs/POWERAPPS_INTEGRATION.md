# Conectando o Power Apps / Power Automate ao FinTrack API

A API expõe sua própria especificação **OpenAPI 3.0** (gerada com `swagger-jsdoc`) em `/api-docs.json`. Esse arquivo é exatamente o que o Power Apps e o Power Automate esperam para criar um **Custom Connector** — ou seja, toda rota documentada nos arquivos `src/routes/*.js` já nasce pronta para virar uma ação de baixo código, sem escrever nenhum conector do zero.

## 1. Obtenha a especificação OpenAPI

Com a API rodando (`npm start`), a especificação fica disponível em:

```
http://localhost:3000/api-docs.json
```

Também dá pra explorar visualmente (Swagger UI) em `http://localhost:3000/api-docs`.

## 2. Criar o Custom Connector

1. Acesse [make.powerapps.com](https://make.powerapps.com) ou [make.powerautomate.com](https://make.powerautomate.com)
2. **Dados > Conectores personalizados > Novo conector personalizado > Importar um arquivo OpenAPI**
3. Dê um nome (ex.: "FinTrack API") e envie o `api-docs.json` baixado, ou cole a URL diretamente
4. Na aba **Segurança**, escolha **API Key**:
   - *Parameter label*: `API Key`
   - *Parameter name*: `api_key`
   - *Parameter location*: **Query**

   Essa é a mesma `api_key` usada na integração com o Power BI — uma única credencial serve para os dois.

5. Revise as ações importadas (uma para cada rota documentada: criar transação, listar categorias, criar orçamento, endpoints de analytics etc.) e clique em **Criar conector**
6. Em **Testar**, informe sua `api_key` e teste qualquer ação diretamente no navegador

## 3. Exemplo de uso — App Canvas para lançar despesas rapidamente

Um cenário real: um app de celular simples com um formulário (categoria, valor, descrição) e um botão "Salvar", chamando a ação `Create a new income or expense transaction` do conector. Como a rota de transações aceita tanto JWT quanto `api_key`, o Power Apps consegue **gravar dados de verdade** na mesma base usada pelo Power BI — não é só leitura.

```
FinTrackAPI.CreateTransaction(
  { categoryId: Dropdown_Categoria.Selected.Id,
    type: "expense",
    amount: Value(TextInput_Valor.Text),
    description: TextInput_Descricao.Text,
    date: Text(Today(), "yyyy-mm-dd") }
)
```

## 4. Exemplo de uso — Power Automate: Microsoft Forms → FinTrack

Fluxo sugerido para registrar gastos a partir de um formulário do Microsoft Forms (ex.: reembolso de despesas da equipe):

1. **Gatilho**: "Quando uma nova resposta é enviada" (Microsoft Forms)
2. **Ação**: "Obter detalhes da resposta" (Microsoft Forms)
3. **Ação**: a ação personalizada do conector FinTrack — `POST /api/transactions` — mapeando os campos do formulário (valor, categoria, descrição, data) para o corpo da requisição
4. (Opcional) **Ação**: enviar uma notificação por e-mail/Teams confirmando o lançamento

Esse fluxo mostra o valor prático de expor a API via OpenAPI: qualquer ferramenta do ecossistema Power Platform (Power Apps, Power Automate, e até o Copilot Studio) consegue ler *e escrever* dados sem nenhuma integração customizada — o contrato já está descrito na especificação.

## 5. Rotina de recorrências via Power Automate (opcional)

Em vez de depender apenas do cron job interno (`src/jobs/recurringTransactions.job.js`), um fluxo agendado no Power Automate pode chamar `POST /api/transactions/process-recurring` diariamente — útil se você hospedar a API em um ambiente sem processos de longa duração (ex.: serverless), onde `node-cron` não teria como rodar continuamente.

## 6. Segurança

- A `api_key` tem o mesmo nível de acesso do usuário dono dela (leitura e escrita). Trate-a como uma senha.
- Use `POST /api/auth/api-key/regenerate` para invalidar uma chave comprometida e gerar outra na hora.
- Para produção, prefira hospedar a API atrás de HTTPS — o Power Apps/Power Automate exige TLS para conectores personalizados públicos.
