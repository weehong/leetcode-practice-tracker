import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import logger from './logger.js';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Max cache size in bytes
  compress?: boolean;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  size: number;
  key: string;
}

export interface NamespaceCacheStatus {
  totalEntries: number;
  validEntries: number;
  totalSize: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

export interface CacheStatusReport {
  memoryCache: {
    entries: number;
    size: number;
    maxSize: number;
  };
  fileCache: Record<string, NamespaceCacheStatus>;
}

export interface CacheMetadata {
  key: string;
  timestamp: number;
  ttl: number;
  size: number;
  fingerprint: string;
  accessed: number;
}

class CacheManager {
  private static instance: CacheManager;
  private cacheDir: string;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private maxMemorySize: number = 100 * 1024 * 1024; // 100MB
  private currentMemorySize: number = 0;

  private constructor() {
    this.cacheDir = path.resolve(process.cwd(), 'cache');
    this.ensureCacheDirectory();
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  private ensureCacheDirectory(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }

    // Create subdirectories
    const subdirs = ['grind75', 'leetcode', 'companies'];
    subdirs.forEach(dir => {
      const fullPath = path.join(this.cacheDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  private generateKey(namespace: string, identifier: string): string {
    const hash = crypto.createHash('md5').update(identifier).digest('hex');
    return `${namespace}_${hash}`;
  }

  private generateFingerprint(data: any): string {
    return crypto.createHash('md5').update(this.safeStringify(data)).digest('hex');
  }

  private safeStringify(obj: any, visited = new Set()): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }

    if (visited.has(obj)) {
      return '"[Circular]"';
    }

    visited.add(obj);

    try {
      if (Array.isArray(obj)) {
        const items = obj.map(item => this.safeStringify(item, visited));
        visited.delete(obj);
        return `[${items.join(',')}]`;
      }

      const entries = Object.entries(obj)
        .map(([key, value]) => `"${key}":${this.safeStringify(value, visited)}`);

      visited.delete(obj);
      return `{${entries.join(',')}}`;
    } catch (error) {
      visited.delete(obj);
      return '"[Error serializing object]"';
    }
  }

  private getFilePath(key: string, namespace: string): string {
    return path.join(this.cacheDir, namespace, `${key}.json`);
  }

  private getMetadataPath(namespace: string): string {
    return path.join(this.cacheDir, namespace, 'metadata.json');
  }

  private loadMetadata(namespace: string): Record<string, CacheMetadata> {
    const metadataPath = this.getMetadataPath(namespace);
    try {
      if (fs.existsSync(metadataPath)) {
        const content = fs.readFileSync(metadataPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      logger.warn('Failed to load cache metadata', { namespace, error });
    }
    return {};
  }

  private saveMetadata(namespace: string, metadata: Record<string, CacheMetadata>): void {
    const metadataPath = this.getMetadataPath(namespace);
    try {
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      logger.error('Failed to save cache metadata', { namespace, error });
    }
  }

  private isExpired(timestamp: number, ttl: number): boolean {
    return Date.now() - timestamp > ttl;
  }

  private evictMemoryCache(): void {
    // Simple LRU eviction - remove oldest entries
    const entries = Array.from(this.memoryCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    while (this.currentMemorySize > this.maxMemorySize * 0.8 && entries.length > 0) {
      const [key, entry] = entries.shift()!;
      this.memoryCache.delete(key);
      this.currentMemorySize -= entry.size;
      logger.debug('Evicted from memory cache', { key, size: entry.size });
    }
  }

  public async get<T>(
    namespace: string,
    identifier: string,
    options?: { acceptExpired?: boolean }
  ): Promise<T | null> {
    const key = this.generateKey(namespace, identifier);
    const now = Date.now();

    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      if (!this.isExpired(memoryEntry.timestamp, memoryEntry.ttl) || options?.acceptExpired) {
        logger.debug('Cache hit (memory)', { key, namespace });
        return memoryEntry.data;
      } else {
        this.memoryCache.delete(key);
        this.currentMemorySize -= memoryEntry.size;
      }
    }

    // Check file cache
    const filePath = this.getFilePath(key, namespace);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const entry: CacheEntry<T> = JSON.parse(content);

        if (!this.isExpired(entry.timestamp, entry.ttl) || options?.acceptExpired) {
          // Load into memory cache
          const size = Buffer.byteLength(content, 'utf8');
          this.memoryCache.set(key, { ...entry, size });
          this.currentMemorySize += size;

          if (this.currentMemorySize > this.maxMemorySize) {
            this.evictMemoryCache();
          }

          // Update access time in metadata
          const metadata = this.loadMetadata(namespace);
          if (metadata[key]) {
            metadata[key].accessed = now;
            this.saveMetadata(namespace, metadata);
          }

          logger.debug('Cache hit (file)', { key, namespace, age: now - entry.timestamp });
          return entry.data;
        } else {
          // Expired, remove file
          fs.unlinkSync(filePath);
          logger.debug('Cache expired and removed', { key, namespace });
        }
      } catch (error) {
        logger.warn('Failed to read cache file', { key, namespace, error });
      }
    }

    logger.debug('Cache miss', { key, namespace });
    return null;
  }

  public async set<T>(
    namespace: string,
    identifier: string,
    data: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const key = this.generateKey(namespace, identifier);
    const now = Date.now();
    const ttl = options.ttl || 24 * 60 * 60 * 1000; // Default 24 hours
    const fingerprint = this.generateFingerprint(data);

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl,
      size: 0,
      key
    };

    const content = JSON.stringify(entry, null, 2);
    const size = Buffer.byteLength(content, 'utf8');
    entry.size = size;

    try {
      // Save to file
      const filePath = this.getFilePath(key, namespace);
      fs.writeFileSync(filePath, content);

      // Update metadata
      const metadata = this.loadMetadata(namespace);
      metadata[key] = {
        key,
        timestamp: now,
        ttl,
        size,
        fingerprint,
        accessed: now
      };
      this.saveMetadata(namespace, metadata);

      // Add to memory cache
      this.memoryCache.set(key, entry);
      this.currentMemorySize += size;

      if (this.currentMemorySize > this.maxMemorySize) {
        this.evictMemoryCache();
      }

      logger.debug('Cache stored', { key, namespace, size });
    } catch (error) {
      logger.error('Failed to store cache', { key, namespace, error });
    }
  }

  public async invalidate(namespace: string, identifier?: string): Promise<void> {
    if (identifier) {
      // Invalidate specific key
      const key = this.generateKey(namespace, identifier);
      const filePath = this.getFilePath(key, namespace);

      // Remove from memory
      this.memoryCache.delete(key);

      // Remove file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Update metadata
      const metadata = this.loadMetadata(namespace);
      delete metadata[key];
      this.saveMetadata(namespace, metadata);

      logger.info('Cache invalidated', { key, namespace });
    } else {
      // Invalidate entire namespace
      const namespacePath = path.join(this.cacheDir, namespace);
      if (fs.existsSync(namespacePath)) {
        fs.rmSync(namespacePath, { recursive: true });
        fs.mkdirSync(namespacePath, { recursive: true });
      }

      // Remove from memory cache
      for (const [key] of Array.from(this.memoryCache.keys())) {
        if (key.startsWith(namespace)) {
          this.memoryCache.delete(key);
        }
      }

      logger.info('Cache namespace cleared', { namespace });
    }
  }

  public getCacheStatus(namespace?: string): CacheStatusReport {
    const status: CacheStatusReport = {
      memoryCache: {
        entries: this.memoryCache.size,
        size: this.currentMemorySize,
        maxSize: this.maxMemorySize
      },
      fileCache: {}
    };

    const namespaces = namespace ? [namespace] : ['grind75', 'leetcode', 'companies'];

    for (const ns of namespaces) {
      const metadata = this.loadMetadata(ns);
      const entries = Object.values(metadata);
      const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
      const validEntries = entries.filter(entry => !this.isExpired(entry.timestamp, entry.ttl));

      status.fileCache[ns] = {
        totalEntries: entries.length,
        validEntries: validEntries.length,
        totalSize,
        oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : null,
        newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : null
      };
    }

    return status;
  }

  public async cleanup(): Promise<void> {
    const namespaces = ['grind75', 'leetcode', 'companies'];

    for (const namespace of namespaces) {
      const metadata = this.loadMetadata(namespace);
      const updated: Record<string, CacheMetadata> = {};
      let removedCount = 0;

      for (const [key, entry] of Object.entries(metadata)) {
        if (this.isExpired(entry.timestamp, entry.ttl)) {
          const filePath = this.getFilePath(key, namespace);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          removedCount++;
        } else {
          updated[key] = entry;
        }
      }

      if (removedCount > 0) {
        this.saveMetadata(namespace, updated);
        logger.info('Cache cleanup completed', { namespace, removed: removedCount });
      }
    }
  }
}

export default CacheManager.getInstance();