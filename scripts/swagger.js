// Swagger/OpenAPI setup for Express API
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Repo Indexer API",
      version: "1.0.0",
      description: "API for automated GitHub repo indexing, management, and cloud integration."
    },
    servers: [
      { url: "http://localhost:3000", description: "Local server" }
    ]
  },
  apis: ["./scripts/api.js"]
};

export const swaggerSpec = swaggerJsdoc(options);
export const swaggerUiServe = swaggerUi.serve;
export const swaggerUiSetup = swaggerUi.setup(swaggerSpec);
