import { createClient, type ClickHouseClient } from '@clickhouse/client';
import { logger } from '../../middleware/logger.middleware';

export class ClickHouseService {
  private client: ClickHouseClient;
  private isInitialized = false;

  constructor() {
    this.client = createClient({
      url: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
      database: 'default',
    });
  }

  public async initializeSchema(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.client.command({
        query: `CREATE DATABASE IF NOT EXISTS featureos_analytics`,
      });

      // 1. Exposures table
      await this.client.command({
        query: `
          CREATE TABLE IF NOT EXISTS featureos_analytics.exposures (
            timestamp DateTime64(3),
            flag_key LowCardinality(String),
            variant_key LowCardinality(String),
            user_id String,
            environment_key LowCardinality(String),
            enabled UInt8,
            reason LowCardinality(String),
            metadata String
          ) ENGINE = MergeTree()
          ORDER BY (environment_key, flag_key, timestamp);
        `,
      });

      // 2. Events table
      await this.client.command({
        query: `
          CREATE TABLE IF NOT EXISTS featureos_analytics.events (
            timestamp DateTime64(3),
            event_type LowCardinality(String),
            event_name LowCardinality(String),
            user_id String,
            environment_key LowCardinality(String),
            flag_key LowCardinality(String),
            numeric_value Float64,
            duration_ms Float64,
            properties String
          ) ENGINE = MergeTree()
          ORDER BY (environment_key, event_type, timestamp);
        `,
      });

      // 3. Errors table
      await this.client.command({
        query: `
          CREATE TABLE IF NOT EXISTS featureos_analytics.errors (
            timestamp DateTime64(3),
            environment_key LowCardinality(String),
            flag_key LowCardinality(String),
            user_id String,
            error_message String,
            stack_trace String
          ) ENGINE = MergeTree()
          ORDER BY (environment_key, flag_key, timestamp);
        `,
      });

      this.isInitialized = true;
      logger.info('ClickHouse schema and MergeTree tables initialized successfully');
    } catch (err) {
      logger.error({ err }, 'Failed to initialize ClickHouse tables');
    }
  }

  public async insertExposures(
    rows: Array<{
      timestamp: string;
      flag_key: string;
      variant_key: string;
      user_id: string;
      environment_key: string;
      enabled: number;
      reason: string;
      metadata: string;
    }>
  ): Promise<void> {
    if (rows.length === 0) return;
    await this.initializeSchema();

    await this.client.insert({
      table: 'featureos_analytics.exposures',
      values: rows,
      format: 'JSONEachRow',
    });
  }

  public async insertEvents(
    rows: Array<{
      timestamp: string;
      event_type: string;
      event_name: string;
      user_id: string;
      environment_key: string;
      flag_key: string;
      numeric_value: number;
      duration_ms: number;
      properties: string;
    }>
  ): Promise<void> {
    if (rows.length === 0) return;
    await this.initializeSchema();

    await this.client.insert({
      table: 'featureos_analytics.events',
      values: rows,
      format: 'JSONEachRow',
    });
  }

  public async insertErrors(
    rows: Array<{
      timestamp: string;
      environment_key: string;
      flag_key: string;
      user_id: string;
      error_message: string;
      stack_trace: string;
    }>
  ): Promise<void> {
    if (rows.length === 0) return;
    await this.initializeSchema();

    await this.client.insert({
      table: 'featureos_analytics.errors',
      values: rows,
      format: 'JSONEachRow',
    });
  }

  public async getSummary(environmentKey = 'development') {
    await this.initializeSchema();

    const exposuresQuery = await this.client.query({
      query: `
        SELECT
          count() as total_exposures,
          countDistinct(user_id) as unique_users,
          flag_key,
          variant_key,
          enabled
        FROM featureos_analytics.exposures
        WHERE environment_key = {env:String}
        GROUP BY flag_key, variant_key, enabled
      `,
      query_params: { env: environmentKey },
      format: 'JSONEachRow',
    });

    const latencyQuery = await this.client.query({
      query: `
        SELECT
          quantile(0.50)(duration_ms) as p50,
          quantile(0.95)(duration_ms) as p95,
          quantile(0.99)(duration_ms) as p99,
          avg(duration_ms) as avg_latency
        FROM featureos_analytics.events
        WHERE environment_key = {env:String} AND duration_ms > 0
      `,
      query_params: { env: environmentKey },
      format: 'JSONEachRow',
    });

    const errorsQuery = await this.client.query({
      query: `
        SELECT count() as error_count
        FROM featureos_analytics.errors
        WHERE environment_key = {env:String}
      `,
      query_params: { env: environmentKey },
      format: 'JSONEachRow',
    });

    const exposures = (await exposuresQuery.json()) as Array<Record<string, unknown>>;
    const latency = (await latencyQuery.json()) as Array<{
      p50: number;
      p95: number;
      p99: number;
      avg_latency: number;
    }>;
    const errors = (await errorsQuery.json()) as Array<{ error_count: number }>;

    return {
      environment: environmentKey,
      exposures,
      latency: latency[0] || { p50: 0, p95: 0, p99: 0, avg_latency: 0 },
      errors: errors[0]?.error_count || 0,
    };
  }

  public async getTimeseries(environmentKey = 'development') {
    await this.initializeSchema();

    const query = await this.client.query({
      query: `
        SELECT
          toStartOfInterval(timestamp, INTERVAL 5 MINUTE) as bucket,
          flag_key,
          count() as count
        FROM featureos_analytics.exposures
        WHERE environment_key = {env:String}
        GROUP BY bucket, flag_key
        ORDER BY bucket ASC
      `,
      query_params: { env: environmentKey },
      format: 'JSONEachRow',
    });

    return query.json();
  }
}

export const clickhouseService = new ClickHouseService();
