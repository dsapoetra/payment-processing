import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { 
  HealthCheckService, 
  HealthCheck, 
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @ApiOperation({ 
    summary: 'Health check',
    description: 'Returns the health status of the application and its dependencies',
  })
  @ApiOkResponse({
    description: 'Health check results',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok', 'error', 'shutting_down'] },
        info: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['up', 'down'] },
              },
            },
            memory_heap: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['up', 'down'] },
              },
            },
            memory_rss: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['up', 'down'] },
              },
            },
            storage: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['up', 'down'] },
              },
            },
          },
        },
        error: { type: 'object' },
        details: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['up', 'down'] },
              },
            },
            memory_heap: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['up', 'down'] },
              },
            },
            memory_rss: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['up', 'down'] },
              },
            },
            storage: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['up', 'down'] },
              },
            },
          },
        },
      },
    },
  })
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
      () => this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.9 }),
    ]);
  }

  @Get('simple')
  @ApiOperation({ 
    summary: 'Simple health check',
    description: 'Returns a simple OK status for basic connectivity testing',
  })
  @ApiOkResponse({
    description: 'Simple health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'OK' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number', description: 'Application uptime in seconds' },
        version: { type: 'string', example: '1.0.0' },
        environment: { type: 'string', example: 'development' },
      },
    },
  })
  simpleCheck() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
