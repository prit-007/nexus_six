const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CalcNote API',
      version: '1.0.0',
      description: 'A comprehensive API for CalcNote application with user management, notes, tags, and groups',
      contact: {
        name: 'API Support',
        email: 'support@calcnote.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: 'Development server',
      },
      {
        url: 'https://api.calcnote.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token in format: Bearer <token>',
        },
      },
      schemas: {
        User: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            _id: {
              type: 'string',
              description: 'User ID',
              example: '60d0fe4f5311236168a109ca',
            },
            name: {
              type: 'string',
              description: 'User full name',
              example: 'John Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john@example.com',
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              description: 'User role',
              example: 'user',
            },
            avatar: {
              type: 'string',
              description: 'User avatar URL',
              example: 'https://example.com/avatar.jpg',
            },
            isActive: {
              type: 'boolean',
              description: 'User account status',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation date',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'User last update date',
            },
          },
        },
        Note: {
          type: 'object',
          required: ['title', 'content', 'user'],
          properties: {
            _id: {
              type: 'string',
              description: 'Note ID',
              example: '60d0fe4f5311236168a109cb',
            },
            title: {
              type: 'string',
              description: 'Note title',
              example: 'My First Note',
            },
            content: {
              type: 'string',
              description: 'Note content',
              example: 'This is the content of my note',
            },
            user: {
              type: 'string',
              description: 'User ID who created the note',
              example: '60d0fe4f5311236168a109ca',
            },
            tags: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Array of tag IDs',
              example: ['60d0fe4f5311236168a109cc'],
            },
            groups: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Array of group IDs',
              example: ['60d0fe4f5311236168a109cd'],
            },
            isPublic: {
              type: 'boolean',
              description: 'Whether the note is public',
              example: false,
            },
            isPinned: {
              type: 'boolean',
              description: 'Whether the note is pinned',
              example: false,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Note creation date',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Note last update date',
            },
          },
        },
        Tag: {
          type: 'object',
          required: ['name', 'user'],
          properties: {
            _id: {
              type: 'string',
              description: 'Tag ID',
              example: '60d0fe4f5311236168a109cc',
            },
            name: {
              type: 'string',
              description: 'Tag name',
              example: 'Important',
            },
            color: {
              type: 'string',
              description: 'Tag color in hex format',
              example: '#ff0000',
            },
            description: {
              type: 'string',
              description: 'Tag description',
              example: 'Important notes',
            },
            user: {
              type: 'string',
              description: 'User ID who created the tag',
              example: '60d0fe4f5311236168a109ca',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Tag creation date',
            },
          },
        },
        Group: {
          type: 'object',
          required: ['name', 'user'],
          properties: {
            _id: {
              type: 'string',
              description: 'Group ID',
              example: '60d0fe4f5311236168a109cd',
            },
            name: {
              type: 'string',
              description: 'Group name',
              example: 'Work Notes',
            },
            description: {
              type: 'string',
              description: 'Group description',
              example: 'Notes related to work',
            },
            user: {
              type: 'string',
              description: 'User ID who created the group',
              example: '60d0fe4f5311236168a109ca',
            },
            members: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Array of user IDs who are members',
              example: ['60d0fe4f5311236168a109ca'],
            },
            isPublic: {
              type: 'boolean',
              description: 'Whether the group is public',
              example: false,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Group creation date',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
            stack: {
              type: 'string',
              description: 'Error stack trace (development only)',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operation successful',
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
          },
        },
      },
      responses: {
        400: {
          description: 'Bad Request',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        401: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        403: {
          description: 'Forbidden',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        404: {
          description: 'Not Found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        500: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/routes/*.js', 
    './src/models/*.js',
    './src/app.js'
  ], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

// Custom CSS for Swagger UI
const customCss = `
  .swagger-ui .topbar { 
    display: none; 
  }
  .swagger-ui .info {
    margin: 50px 0;
  }
  .swagger-ui .info .title {
    color: #3b82f6;
  }
`;

const swaggerOptions = {
  explorer: true,
  customCss,
  customSiteTitle: 'CalcNote API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
  },
};

module.exports = {
  specs,
  swaggerUi,
  swaggerOptions,
};
