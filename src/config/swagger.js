const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FinTrack API',
      version: '1.0.0',
      description:
        'REST API for personal finance management — transactions, categories, budgets and analytics. ' +
        'Built with Node.js, Express and SQLite. The analytics endpoints are designed to be consumed ' +
        'directly by Power BI (Get Data > Web), and this entire OpenAPI document can be imported as a ' +
        'Power Apps / Power Automate Custom Connector to read or write data from a canvas app or a flow.',
      contact: { name: 'FinTrack API' },
      license: { name: 'MIT' },
    },
    servers: [{ url: `http://localhost:${process.env.PORT || 3000}`, description: 'Local server' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'query',
          name: 'api_key',
          description: 'Long-lived key issued at registration — the credential used by Power BI and Power Apps/Power Automate.',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
