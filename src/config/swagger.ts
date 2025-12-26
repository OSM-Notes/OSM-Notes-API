/**
 * Swagger/OpenAPI configuration
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { getAppConfig } from './app';

const config = getAppConfig();

/**
 * Swagger definition options
 */
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'OSM Notes API',
    version: process.env.npm_package_version || '0.1.0',
    description:
      'REST API for OSM Notes Analytics and Ingestion. Provides programmatic access to user profiles, country analytics, notes, and real-time metrics.',
    contact: {
      name: 'OSM Notes Team',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}`,
      description: 'Development server',
    },
    {
      url: 'https://api.osm-notes.org',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      UserAgent: {
        type: 'apiKey',
        in: 'header',
        name: 'User-Agent',
        description:
          'User-Agent header required for all requests. Format: AppName/Version (Contact)',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error type name',
            example: 'Bad Request',
          },
          message: {
            type: 'string',
            description: 'Human-readable error message',
            example: 'Invalid note ID',
          },
          statusCode: {
            type: 'integer',
            description: 'HTTP status code',
            example: 400,
          },
        },
        required: ['error', 'message', 'statusCode'],
      },
      Note: {
        type: 'object',
        properties: {
          note_id: {
            type: 'integer',
            description: 'OSM note ID',
            example: 12345,
          },
          latitude: {
            type: 'number',
            format: 'float',
            description: 'Latitude coordinate',
            example: 4.6097,
          },
          longitude: {
            type: 'number',
            format: 'float',
            description: 'Longitude coordinate',
            example: -74.0817,
          },
          status: {
            type: 'string',
            enum: ['open', 'closed', 'reopened'],
            description: 'Note status',
            example: 'open',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp',
            example: '2024-01-15T10:30:00Z',
          },
          closed_at: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Closing timestamp',
            example: null,
          },
          id_user: {
            type: 'integer',
            nullable: true,
            description: 'User ID who created the note',
            example: 67890,
          },
          id_country: {
            type: 'integer',
            nullable: true,
            description: 'Country ID',
            example: 42,
          },
          comments_count: {
            type: 'integer',
            description: 'Number of comments',
            example: 3,
          },
        },
        required: ['note_id', 'latitude', 'longitude', 'status', 'created_at'],
      },
      NoteComment: {
        type: 'object',
        properties: {
          comment_id: {
            type: 'integer',
            example: 1,
          },
          note_id: {
            type: 'integer',
            example: 12345,
          },
          user_id: {
            type: 'integer',
            nullable: true,
            example: 67890,
          },
          username: {
            type: 'string',
            nullable: true,
            example: 'test_user',
          },
          action: {
            type: 'string',
            example: 'opened',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:30:00Z',
          },
          text: {
            type: 'string',
            nullable: true,
            example: 'This is a test note',
          },
        },
      },
      UserProfile: {
        type: 'object',
        properties: {
          dimension_user_id: {
            type: 'integer',
            example: 123,
          },
          user_id: {
            type: 'integer',
            example: 12345,
          },
          username: {
            type: 'string',
            nullable: true,
            example: 'test_user',
          },
          history_whole_open: {
            type: 'integer',
            example: 100,
          },
          history_whole_closed: {
            type: 'integer',
            example: 50,
          },
          history_whole_commented: {
            type: 'integer',
            example: 75,
          },
          avg_days_to_resolution: {
            type: 'number',
            format: 'float',
            nullable: true,
            example: 5.5,
          },
          resolution_rate: {
            type: 'number',
            format: 'float',
            nullable: true,
            example: 50.0,
          },
        },
      },
      CountryProfile: {
        type: 'object',
        properties: {
          dimension_country_id: {
            type: 'integer',
            example: 45,
          },
          country_id: {
            type: 'integer',
            example: 42,
          },
          country_name: {
            type: 'string',
            nullable: true,
            example: 'Colombia',
          },
          iso_alpha2: {
            type: 'string',
            nullable: true,
            example: 'CO',
          },
          history_whole_open: {
            type: 'integer',
            example: 1000,
          },
          history_whole_closed: {
            type: 'integer',
            example: 800,
          },
          resolution_rate: {
            type: 'number',
            format: 'float',
            nullable: true,
            example: 80.0,
          },
        },
      },
      GlobalAnalytics: {
        type: 'object',
        properties: {
          dimension_global_id: {
            type: 'integer',
            example: 1,
          },
          history_whole_open: {
            type: 'integer',
            example: 1000000,
          },
          history_whole_closed: {
            type: 'integer',
            example: 800000,
          },
          currently_open_count: {
            type: 'integer',
            nullable: true,
            example: 200000,
          },
          resolution_rate: {
            type: 'number',
            format: 'float',
            nullable: true,
            example: 80.0,
          },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            example: 1,
          },
          limit: {
            type: 'integer',
            example: 20,
          },
          total: {
            type: 'integer',
            example: 250,
          },
          total_pages: {
            type: 'integer',
            example: 13,
          },
        },
      },
    },
  },
  security: [
    {
      UserAgent: [],
    },
  ],
};

/**
 * Swagger options
 */
const swaggerOptions: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

/**
 * Generate Swagger specification
 */
export const swaggerSpec = swaggerJsdoc(swaggerOptions);
