import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppLoggerService } from './logger.service';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface LogCleanupConfig {
  logDir: string;
  retentionPolicies: {
    [logType: string]: {
      maxAge: number; // days
      maxSize: string; // e.g., '100MB'
      maxFiles: number;
    };
  };
}

@Injectable()
export class LogCleanupService {
  private readonly config: LogCleanupConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.config = {
      logDir: this.configService.get('LOG_DIR', 'logs'),
      retentionPolicies: {
        app: {
          maxAge: 30, // 30 days
          maxSize: '500MB',
          maxFiles: 30,
        },
        error: {
          maxAge: 90, // 90 days
          maxSize: '200MB',
          maxFiles: 90,
        },
        transactions: {
          maxAge: 2555, // 7 years for PCI compliance
          maxSize: '1GB',
          maxFiles: 2555,
        },
        security: {
          maxAge: 2555, // 7 years for compliance
          maxSize: '500MB',
          maxFiles: 2555,
        },
        performance: {
          maxAge: 30, // 30 days
          maxSize: '300MB',
          maxFiles: 30,
        },
      },
    };
  }

  /**
   * Scheduled log cleanup - runs daily at 2 AM
   */
  @Cron('0 2 * * *')
  async scheduledCleanup(): Promise<void> {
    this.logger.log('Starting scheduled log cleanup', 'LogCleanup');
    
    try {
      const cleanupResults = await this.performCleanup();
      
      this.logger.log(
        'Log cleanup completed successfully',
        'LogCleanup',
        {
          filesRemoved: cleanupResults.totalFilesRemoved,
          spaceFreed: cleanupResults.totalSpaceFreed,
          duration: cleanupResults.duration,
        }
      );
    } catch (error) {
      this.logger.error(
        `Log cleanup failed: ${error.message}`,
        error.stack,
        'LogCleanup'
      );
    }
  }

  /**
   * Perform log cleanup based on retention policies
   */
  async performCleanup(): Promise<{
    totalFilesRemoved: number;
    totalSpaceFreed: number;
    duration: number;
    details: { [logType: string]: { filesRemoved: number; spaceFreed: number } };
  }> {
    const startTime = Date.now();
    let totalFilesRemoved = 0;
    let totalSpaceFreed = 0;
    const details: { [logType: string]: { filesRemoved: number; spaceFreed: number } } = {};

    try {
      // Ensure log directory exists
      await fs.mkdir(this.config.logDir, { recursive: true });

      // Get all log files
      const files = await fs.readdir(this.config.logDir);
      
      for (const [logType, policy] of Object.entries(this.config.retentionPolicies)) {
        const logFiles = files.filter(file => file.startsWith(logType));
        const cleanupResult = await this.cleanupLogType(logType, logFiles, policy);
        
        details[logType] = cleanupResult;
        totalFilesRemoved += cleanupResult.filesRemoved;
        totalSpaceFreed += cleanupResult.spaceFreed;
      }

      // Clean up any orphaned or unknown log files older than 30 days
      await this.cleanupOrphanedFiles(files);

    } catch (error) {
      this.logger.error(
        `Error during log cleanup: ${error.message}`,
        error.stack,
        'LogCleanup'
      );
      throw error;
    }

    return {
      totalFilesRemoved,
      totalSpaceFreed,
      duration: Date.now() - startTime,
      details,
    };
  }

  /**
   * Clean up logs for a specific log type
   */
  private async cleanupLogType(
    logType: string,
    logFiles: string[],
    policy: LogCleanupConfig['retentionPolicies'][string]
  ): Promise<{ filesRemoved: number; spaceFreed: number }> {
    let filesRemoved = 0;
    let spaceFreed = 0;

    // Sort files by modification time (oldest first)
    const fileStats = await Promise.all(
      logFiles.map(async (file) => {
        const filePath = path.join(this.config.logDir, file);
        const stats = await fs.stat(filePath);
        return { file, filePath, stats };
      })
    );

    fileStats.sort((a, b) => a.stats.mtime.getTime() - b.stats.mtime.getTime());

    const now = new Date();
    const maxAgeMs = policy.maxAge * 24 * 60 * 60 * 1000;

    for (const { file, filePath, stats } of fileStats) {
      const fileAge = now.getTime() - stats.mtime.getTime();
      let shouldDelete = false;

      // Check age-based retention
      if (fileAge > maxAgeMs) {
        shouldDelete = true;
        this.logger.debug(
          `Marking ${file} for deletion: exceeds max age (${policy.maxAge} days)`,
          'LogCleanup'
        );
      }

      // Check count-based retention (keep only the newest N files)
      const fileIndex = fileStats.findIndex(f => f.file === file);
      if (fileIndex < fileStats.length - policy.maxFiles) {
        shouldDelete = true;
        this.logger.debug(
          `Marking ${file} for deletion: exceeds max file count (${policy.maxFiles})`,
          'LogCleanup'
        );
      }

      if (shouldDelete) {
        try {
          await fs.unlink(filePath);
          filesRemoved++;
          spaceFreed += stats.size;
          
          this.logger.debug(
            `Deleted log file: ${file} (${this.formatBytes(stats.size)})`,
            'LogCleanup'
          );
        } catch (error) {
          this.logger.error(
            `Failed to delete log file ${file}: ${error.message}`,
            error.stack,
            'LogCleanup'
          );
        }
      }
    }

    return { filesRemoved, spaceFreed };
  }

  /**
   * Clean up orphaned files that don't match any log type
   */
  private async cleanupOrphanedFiles(allFiles: string[]): Promise<void> {
    const knownPrefixes = Object.keys(this.config.retentionPolicies);
    const orphanedFiles = allFiles.filter(file => {
      return !knownPrefixes.some(prefix => file.startsWith(prefix)) && 
             file.endsWith('.log');
    });

    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    const now = new Date();

    for (const file of orphanedFiles) {
      try {
        const filePath = path.join(this.config.logDir, file);
        const stats = await fs.stat(filePath);
        const fileAge = now.getTime() - stats.mtime.getTime();

        if (fileAge > maxAge) {
          await fs.unlink(filePath);
          this.logger.debug(
            `Deleted orphaned log file: ${file} (${this.formatBytes(stats.size)})`,
            'LogCleanup'
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to process orphaned file ${file}: ${error.message}`,
          error.stack,
          'LogCleanup'
        );
      }
    }
  }

  /**
   * Get current log directory statistics
   */
  async getLogDirectoryStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: { [logType: string]: { count: number; size: number } };
    oldestFile: { name: string; age: number };
    newestFile: { name: string; age: number };
  }> {
    try {
      const files = await fs.readdir(this.config.logDir);
      const logFiles = files.filter(file => file.endsWith('.log'));
      
      let totalSize = 0;
      const filesByType: { [logType: string]: { count: number; size: number } } = {};
      let oldestFile: { name: string; age: number } | null = null;
      let newestFile: { name: string; age: number } | null = null;
      
      const now = new Date();

      for (const file of logFiles) {
        const filePath = path.join(this.config.logDir, file);
        const stats = await fs.stat(filePath);
        const age = now.getTime() - stats.mtime.getTime();
        
        totalSize += stats.size;
        
        // Categorize by log type
        const logType = Object.keys(this.config.retentionPolicies).find(type => 
          file.startsWith(type)
        ) || 'other';
        
        if (!filesByType[logType]) {
          filesByType[logType] = { count: 0, size: 0 };
        }
        filesByType[logType].count++;
        filesByType[logType].size += stats.size;
        
        // Track oldest and newest files
        if (!oldestFile || age > oldestFile.age) {
          oldestFile = { name: file, age };
        }
        if (!newestFile || age < newestFile.age) {
          newestFile = { name: file, age };
        }
      }

      return {
        totalFiles: logFiles.length,
        totalSize,
        filesByType,
        oldestFile: oldestFile || { name: '', age: 0 },
        newestFile: newestFile || { name: '', age: 0 },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get log directory stats: ${error.message}`,
        error.stack,
        'LogCleanup'
      );
      throw error;
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
