// Use CommonJS require with explicit any type to avoid missing type declaration issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const swaggerJSDoc: any = require("swagger-jsdoc");

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "WhatsApp Multi-Session API",
      version: "1.0.0",
      description: "API para gestionar múltiples sesiones de WhatsApp con MongoDB y Socket.IO",
    },
    servers: [
      { url: "http://localhost:5001", description: "Local" },
    ],
    tags: [
      { name: "Auth", description: "Autenticación" },
      { name: "Users", description: "Gestión de usuarios" },
      { name: "Roles", description: "Gestión de roles" },
      { name: "Sessions", description: "Sesiones de WhatsApp" },
      { name: "Chats", description: "Chats de WhatsApp" },
      { name: "Messages", description: "Mensajes de WhatsApp" },
      { name: "Assignments", description: "Asignación de chats a usuarios" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Role: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
            active: { type: "boolean" },
          },
        },
        User: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            email: { type: "string" },
            role: { $ref: "#/components/schemas/Role" },
            active: { type: "boolean" },
          },
        },
        Assignment: {
          type: "object",
          properties: {
            _id: { type: "string" },
            sessionId: { type: "string" },
            chatId: { type: "string" },
            user: { $ref: "#/components/schemas/User" },
            active: { type: "boolean" },
            assignedAt: { type: "string", format: "date-time" },
            unassignedAt: { type: "string", format: "date-time", nullable: true },
          },
        },
        AuthLoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string" },
            password: { type: "string" },
          },
        },
        AuthRegisterRequest: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            password: { type: "string" },
            roleName: { type: "string" },
          },
        },
        AuthLoginResponse: {
          type: "object",
          properties: {
            token: { type: "string" },
            user: { $ref: "#/components/schemas/User" },
          },
        },
      },
    },
  },
  apis: [
    "./src/routes/*.ts",
  ],
});
