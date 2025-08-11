import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppLoggerService } from './logger.service';

export interface SystemMetrics {
  timestamp: Date;
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
  uptime: number;
  loadAverage: number[];
  freeMemory: number;
  totalMemory: number;
  platform: string;
  nodeVersion: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    [key: string]: {
      status: 'healthy' | 'unhealthy';
      message?: string;
      responseTime?: number;
      details?: any;
    };
  };
  timestamp: Date;
  uptime: number;
}

@Injectable()
export class HealthMonitorService {
  private lastCpuUsage: NodeJS.CpuUsage = process.cpuUsage();
  private healthHistory: HealthStatus[] = [];
  private readonly maxHistorySize = 100;

  constructor(private readonly logger: AppLoggerService) {}

  /**
   * Get current system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const memory = process.memoryUsage();
    const cpu = process.cpuUsage(this.lastCpuUsage);
    this.lastCpuUsage = process.cpuUsage();

    return {
      timestamp: new Date(),
      memory,
      cpu,
      uptime: process.uptime(),
      loadAverage: require('os').loadavg(),
      freeMemory: require('os').freemem(),
      totalMemory: require('os').totalmem(),
      platform: process.platform,
      nodeVersion: process.version,
    };
  }

  /**
   * Perform health check
   */
  async performHealthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    const checks: HealthStatus['checks'] = {};

    // Memory check
    const memoryCheck = this.checkMemoryHealth();
    checks.memory = memoryCheck;

    // CPU check
    const cpuCheck = this.checkCpuHealth();
    checks.cpu = cpuCheck;

    // Disk space check (simplified)
    const diskCheck = await this.checkDiskHealth();
    checks.disk = diskCheck;

    // Database connectivity check would go here
    // const dbCheck = await this.checkDatabaseHealth();
    // checks.database = dbCheck;

    // Determine overall status
    const unhealthyChecks = Object.values(checks).filter(check => check.status === 'unhealthy');
    let overallStatus: HealthStatus['status'] = 'healthy';
    
    if (unhealthyChecks.length > 0) {
      overallStatus = unhealthyChecks.length > 1 ? 'unhealthy' : 'degraded';
    }

    const healthStatus: HealthStatus = {
      status: overallStatus,
      checks,
      timestamp: new Date(),
      uptime: process.uptime(),
    };

    // Store in history
    this.addToHistory(healthStatus);

    // Log health status
    this.logger.logHealthCheck(
      `Health check completed - Status: ${overallStatus}`,
      'system',
      overallStatus === 'healthy' ? 'healthy' : 'unhealthy',
      {
        checks,
        responseTime: Date.now() - startTime,
        uptime: process.uptime(),
      }
    );

    return healthStatus;
  }

  /**
   * Check memory health
   */
  private checkMemoryHealth(): HealthStatus['checks'][string] {
    const memory = process.memoryUsage();
    const heapUsedMB = Math.round(memory.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memory.heapTotal / 1024 / 1024);
    const heapUsagePercent = (memory.heapUsed / memory.heapTotal) * 100;

    if (heapUsagePercent > 90) {
      return {
        status: 'unhealthy',
        message: `High memory usage: ${heapUsagePercent.toFixed(1)}%`,
        details: { heapUsedMB, heapTotalMB, heapUsagePercent },
      };
    }

    if (heapUsagePercent > 75) {
      return {
        status: 'unhealthy',
        message: `Elevated memory usage: ${heapUsagePercent.toFixed(1)}%`,
        details: { heapUsedMB, heapTotalMB, heapUsagePercent },
      };
    }

    return {
      status: 'healthy',
      message: `Memory usage: ${heapUsagePercent.toFixed(1)}%`,
      details: { heapUsedMB, heapTotalMB, heapUsagePercent },
    };
  }

  /**
   * Check CPU health
   */
  private checkCpuHealth(): HealthStatus['checks'][string] {
    const loadAvg = require('os').loadavg();
    const cpuCount = require('os').cpus().length;
    const loadPercent = (loadAvg[0] / cpuCount) * 100;

    if (loadPercent > 90) {
      return {
        status: 'unhealthy',
        message: `High CPU load: ${loadPercent.toFixed(1)}%`,
        details: { loadAverage: loadAvg, cpuCount, loadPercent },
      };
    }

    if (loadPercent > 75) {
      return {
        status: 'unhealthy',
        message: `Elevated CPU load: ${loadPercent.toFixed(1)}%`,
        details: { loadAverage: loadAvg, cpuCount, loadPercent },
      };
    }

    return {
      status: 'healthy',
      message: `CPU load: ${loadPercent.toFixed(1)}%`,
      details: { loadAverage: loadAvg, cpuCount, loadPercent },
    };
  }

  /**
   * Check disk health (simplified)
   */
  private async checkDiskHealth(): Promise<HealthStatus['checks'][string]> {
    try {
      const fs = require('fs').promises;
      const stats = await fs.stat(process.cwd());
      
      // This is a simplified check - in production you'd want to check actual disk space
      return {
        status: 'healthy',
        message: 'Disk accessible',
        details: { accessible: true },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Disk check failed: ${error.message}`,
        details: { error: error.message },
      };
    }
  }

  /**
   * Add health status to history
   */
  private addToHistory(status: HealthStatus): void {
    this.healthHistory.push(status);
    
    // Keep only the last N entries
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory = this.healthHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get health history
   */
  getHealthHistory(): HealthStatus[] {
    return [...this.healthHistory];
  }

  /**
   * Scheduled health monitoring
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async scheduledHealthCheck(): Promise<void> {
    try {
      await this.performHealthCheck();
    } catch (error) {
      this.logger.error(
        `Scheduled health check failed: ${error.message}`,
        error.stack,
        'HealthMonitor'
      );
    }
  }

  /**
   * Log system metrics periodically
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  logSystemMetrics(): void {
    const metrics = this.getSystemMetrics();
    
    this.logger.logPerformance(
      'System metrics snapshot',
      {
        operation: 'system_metrics',
        duration: 0,
        memoryUsage: metrics.memory,
        cpuUsage: metrics.cpu,
      },
      {
        uptime: metrics.uptime,
        loadAverage: metrics.loadAverage,
        freeMemory: metrics.freeMemory,
        totalMemory: metrics.totalMemory,
        platform: metrics.platform,
        nodeVersion: metrics.nodeVersion,
      }
    );

    // Log warnings for concerning metrics
    const heapUsagePercent = (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100;
    if (heapUsagePercent > 80) {
      this.logger.warn(
        `High memory usage detected: ${heapUsagePercent.toFixed(1)}%`,
        'HealthMonitor',
        {
          heapUsedMB: Math.round(metrics.memory.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(metrics.memory.heapTotal / 1024 / 1024),
          heapUsagePercent,
        }
      );
    }
  }
}
