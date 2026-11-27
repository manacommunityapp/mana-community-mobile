import api from './apiClient';

export interface MorningRushInput {
  societies: number;
  avgFlatsPerSociety: number;
  dailyEntriesPerFlat: number;
  morningConcentrationPct: number;
  windowHours: number;
  burstMultiplier: number;
  callsPerEntry: number;
  realTimeAlertPct: number;
  avgDevicesPerFlat: number;
  ttlSeconds: number;
  bytesPerSession: number;
  photoCapturePct: number;
  avgPhotoKb: number;
}

export interface BillingBlastInput {
  totalInvoices: number;
  windowHours: number;
  slackHours: number;
  cpuMsPerPdf: number;
  wallMsPerInvoice: number;
  targetCpuUtilizationPct: number;
  avgPdfKb: number;
  batchedWriteOpsPerInvoice: number;
}

export function estimateMorningRushSizing(input: MorningRushInput) {
  const totalFlats = input.societies * input.avgFlatsPerSociety;
  const dailyEntries = totalFlats * input.dailyEntriesPerFlat;
  const morningEntries = dailyEntries * (input.morningConcentrationPct / 100);
  const sustainedEntryQps = morningEntries / (input.windowHours * 3600);
  const burstEntryQps = sustainedEntryQps * input.burstMultiplier;
  const peakApiQps = burstEntryQps * input.callsPerEntry;
  const redisActiveSessionsAtBurst = Math.round(burstEntryQps * input.ttlSeconds);
  const redisMemoryGb = (redisActiveSessionsAtBurst * input.bytesPerSession) / (1024 ** 3);
  const dailyS3GrowthTb = ((dailyEntries * (input.photoCapturePct / 100)) * input.avgPhotoKb) / 1e9;

  return {
    totalFlats,
    dailyEntries,
    morningEntries,
    sustainedEntryQps: Math.round(sustainedEntryQps * 100) / 100,
    burstEntryQps: Math.round(burstEntryQps * 100) / 100,
    peakApiQps: Math.round(peakApiQps * 100) / 100,
    redisActiveSessionsAtBurst,
    redisMemoryGb: Math.round(redisMemoryGb * 100) / 100,
    dailyS3GrowthTb: Math.round(dailyS3GrowthTb * 100) / 100,
  };
}

export function estimateBillingBlastSizing(input: BillingBlastInput) {
  const effectiveHours = Math.max(0.5, input.windowHours - Math.max(0, input.slackHours));
  const targetInvoicesPerSec = input.totalInvoices / (effectiveHours * 3600);
  const requiredVcpus = Math.ceil(
    (targetInvoicesPerSec * (input.cpuMsPerPdf / 1000)) / (input.targetCpuUtilizationPct / 100),
  );
  const recommendedWorkerConcurrency = Math.ceil(targetInvoicesPerSec * (input.wallMsPerInvoice / 1000) * 2.5);
  let recommendedKafkaPartitions = 1;
  while (recommendedKafkaPartitions < Math.max(16, recommendedWorkerConcurrency)) {
    recommendedKafkaPartitions *= 2;
  }
  return {
    effectiveHours,
    targetInvoicesPerSec: Math.round(targetInvoicesPerSec * 100) / 100,
    requiredVcpus,
    recommendedWorkerConcurrency,
    recommendedKafkaPartitions,
  };
}

export async function postMorningRushSizing(input: MorningRushInput) {
  const { data } = await api.post('/api/v1/capacity/morning-rush', input);
  return data;
}

export async function postBillingBlastSizing(input: BillingBlastInput) {
  const { data } = await api.post('/api/v1/capacity/billing-blast', input);
  return data;
}
