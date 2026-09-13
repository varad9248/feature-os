CREATE DATABASE IF NOT EXISTS featureos_analytics;

CREATE TABLE IF NOT EXISTS featureos_analytics.exposures (
    timestamp DateTime64(3, 'UTC'),
    organization_id UUID,
    project_id UUID,
    environment_id UUID,
    flag_key LowCardinality(String),
    variant_key LowCardinality(String),
    user_id String,
    device LowCardinality(String),
    browser LowCardinality(String),
    country LowCardinality(String),
    app_version String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (organization_id, project_id, flag_key, timestamp);

CREATE TABLE IF NOT EXISTS featureos_analytics.telemetry_events (
    timestamp DateTime64(3, 'UTC'),
    organization_id UUID,
    project_id UUID,
    environment_id UUID,
    user_id String,
    event_name LowCardinality(String),
    numeric_value Float64,
    properties String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (organization_id, event_name, timestamp);

CREATE TABLE IF NOT EXISTS featureos_analytics.telemetry_errors (
    timestamp DateTime64(3, 'UTC'),
    organization_id UUID,
    flag_key LowCardinality(String),
    user_id String,
    error_message String,
    stack_trace String,
    duration_ms Float32
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (organization_id, flag_key, timestamp);
