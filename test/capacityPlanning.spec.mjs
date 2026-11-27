import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Back-of-the-Envelope Capacity Planning (Mobile Spec)', () => {
  it('1. Computes 30k-society morning rush QPS, Redis TTL RAM, and S3 daily growth', () => {
    const totalFlats = 30_000 * 350;
    const morningEntries = totalFlats * 4 * 0.4;
    const sustainedEntryQps = morningEntries / 7200;
    const burstEntryQps = sustainedEntryQps * 3.5;
    const redisSessions = Math.round(burstEntryQps * 300);
    const redisGb = (redisSessions * 1024) / (1024 ** 3);
    const dailyS3Tb = ((totalFlats * 4 * 0.5) * 150) / 1e9;

    assert.equal(totalFlats, 10_500_000);
    assert.ok(sustainedEntryQps > 2330 && sustainedEntryQps < 2335);
    assert.ok(burstEntryQps > 8000);
    assert.ok(redisGb > 2.2 && redisGb < 2.5);
    assert.equal(dailyS3Tb, 3.15);
  });

  it('2. Computes 10M PDF overnight billing blast vCPUs, concurrency, and Kafka partitions', () => {
    const targetRate = 10_000_000 / (3 * 3600);
    const requiredVcpus = Math.ceil((targetRate * 0.025) / 0.6);
    const workerConcurrency = Math.ceil(targetRate * 0.05 * 2.5);
    let partitions = 1;
    while (partitions < workerConcurrency) partitions *= 2;

    assert.ok(targetRate > 925 && targetRate < 926.5);
    assert.ok(requiredVcpus >= 38 && requiredVcpus <= 42);
    assert.equal(partitions, 128);
  });
});
