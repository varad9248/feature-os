import { Kafka, type Producer, Partitioners } from 'kafkajs';
import type { TelemetryEvent } from '@feature-os/types';
import { clickhouseService } from './clickhouse';
import { logger } from '../../middleware/logger.middleware';

export class TelemetryPipelineManager {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private isConnected = false;
  private eventBuffer: Array<{ envKey: string; event: TelemetryEvent }> = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    this.kafka = new Kafka({
      clientId: 'featureos-telemetry-producer',
      brokers,
      retry: {
        initialRetryTime: 300,
        retries: 5,
      },
    });

    this.startBatchFlusher();
    void this.connectProducer();
  }

  private async connectProducer(): Promise<void> {
    try {
      this.producer = this.kafka.producer({
        createPartitioner: Partitioners.DefaultPartitioner,
      });
      await this.producer.connect();
      this.isConnected = true;
      logger.info('Kafka Telemetry Producer connected to brokers');
    } catch (err) {
      logger.warn({ err }, 'Kafka connection failed, using direct in-memory ClickHouse buffering');
    }
  }

  private startBatchFlusher(): void {
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, 1000);
  }

  public enqueueEvents(envKey: string, events: TelemetryEvent[]): void {
    for (const event of events) {
      this.eventBuffer.push({ envKey, event });
    }

    if (this.eventBuffer.length >= 50) {
      void this.flush();
    }
  }

  public async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const batch = [...this.eventBuffer];
    this.eventBuffer = [];

    // 1. If Kafka producer is connected, publish to Kafka topics
    if (this.isConnected && this.producer) {
      try {
        const exposureMessages: Array<{ key: string; value: string }> = [];
        const eventMessages: Array<{ key: string; value: string }> = [];

        for (const item of batch) {
          const stringified = JSON.stringify(item.event);
          if (item.event.eventType === 'EXPOSURE') {
            exposureMessages.push({ key: item.event.userId, value: stringified });
          } else {
            eventMessages.push({ key: item.event.userId, value: stringified });
          }
        }

        if (exposureMessages.length > 0) {
          await this.producer.send({
            topic: 'featureos.telemetry.exposures',
            messages: exposureMessages,
          });
        }

        if (eventMessages.length > 0) {
          await this.producer.send({
            topic: 'featureos.telemetry.events',
            messages: eventMessages,
          });
        }
      } catch (err) {
        logger.error({ err }, 'Error sending batch to Kafka');
      }
    }

    // 2. Micro-batch direct ingest into ClickHouse MergeTree tables
    try {
      const exposuresToInsert = [];
      const eventsToInsert = [];
      const errorsToInsert = [];

      for (const item of batch) {
        const { envKey, event } = item;
        const ts = new Date(event.timestamp);
        const timestampStr = ts.toISOString().replace('T', ' ').replace('Z', '');

        if (event.eventType === 'EXPOSURE') {
          exposuresToInsert.push({
            timestamp: timestampStr,
            flag_key: event.flagKey || 'unknown',
            variant_key: event.variantKey || 'default',
            user_id: event.userId,
            environment_key: envKey,
            enabled: event.variantKey ? 1 : 0,
            reason: 'EVALUATE',
            metadata: JSON.stringify(event.metadata || {}),
          });
        } else if (event.eventType === 'ERROR') {
          errorsToInsert.push({
            timestamp: timestampStr,
            environment_key: envKey,
            flag_key: event.flagKey || '',
            user_id: event.userId,
            error_message: event.errorMessage || 'Unknown error',
            stack_trace: event.stackTrace || '',
          });
        } else {
          eventsToInsert.push({
            timestamp: timestampStr,
            event_type: event.eventType,
            event_name: event.eventType.toLowerCase(),
            user_id: event.userId,
            environment_key: envKey,
            flag_key: event.flagKey || '',
            numeric_value: event.numericValue || 0,
            duration_ms: event.durationMs || 0,
            properties: JSON.stringify(event.metadata || {}),
          });
        }
      }

      await Promise.all([
        clickhouseService.insertExposures(exposuresToInsert),
        clickhouseService.insertEvents(eventsToInsert),
        clickhouseService.insertErrors(errorsToInsert),
      ]);
    } catch (err) {
      logger.error({ err }, 'Error persisting telemetry batch to ClickHouse');
    }
  }

  public async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
    if (this.producer) {
      await this.producer.disconnect();
    }
  }
}

export const telemetryPipeline = new TelemetryPipelineManager();
