export type AssetClass = 'VISITOR_SNAPSHOT' | 'ANPR_PLATE_CROP' | 'STATUTORY_PDF_INVOICE';

export interface CompressionTargetProfile {
  assetClass: AssetClass;
  format: 'WEBP' | 'AVIF' | 'PDF_STREAM_OPT';
  maxWidthPx: number;
  quality: number;
  estimatedRatio: number;
}

const PROFILES: Record<AssetClass, CompressionTargetProfile> = {
  VISITOR_SNAPSHOT: {
    assetClass: 'VISITOR_SNAPSHOT',
    format: 'WEBP',
    maxWidthPx: 960,
    quality: 0.75,
    estimatedRatio: 0.025,
  },
  ANPR_PLATE_CROP: {
    assetClass: 'ANPR_PLATE_CROP',
    format: 'WEBP',
    maxWidthPx: 1024,
    quality: 0.80,
    estimatedRatio: 0.035,
  },
  STATUTORY_PDF_INVOICE: {
    assetClass: 'STATUTORY_PDF_INVOICE',
    format: 'PDF_STREAM_OPT',
    maxWidthPx: 0,
    quality: 0.85,
    estimatedRatio: 0.45,
  },
};

export function getCompressionProfile(assetClass: AssetClass): CompressionTargetProfile {
  return PROFILES[assetClass];
}

/**
 * Recommends an S3 lifecycle target avoiding AWS's 128 KB minimum billable trap
 * on Standard-IA and Intelligent-Tiering for small WebP visitor snapshots.
 */
export function selectOptimalS3Tier(compressedBytes: number): 'S3_STANDARD_EXPIRE_180D' | 'S3_STANDARD_TO_GLACIER_IR' {
  return compressedBytes < 128 * 1024 ? 'S3_STANDARD_EXPIRE_180D' : 'S3_STANDARD_TO_GLACIER_IR';
}

export function estimateCompressedBytes(originalBytes: number, assetClass: AssetClass): number {
  const profile = PROFILES[assetClass];
  return Math.max(4096, Math.round(originalBytes * profile.estimatedRatio));
}
