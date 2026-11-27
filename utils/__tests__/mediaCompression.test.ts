import { estimateCompressedBytes, getCompressionProfile, selectOptimalS3Tier } from '../mediaCompression';

describe('mediaCompression FinOps helpers', () => {
  it('plans WebP q75 compression for visitor snapshots and avoids 128KB IA trap', () => {
    const profile = getCompressionProfile('VISITOR_SNAPSHOT');
    expect(profile.format).toBe('WEBP');
    expect(profile.maxWidthPx).toBe(960);

    const compressed = estimateCompressedBytes(2_800_000, 'VISITOR_SNAPSHOT');
    expect(compressed).toBeLessThan(128 * 1024);
    expect(selectOptimalS3Tier(compressed)).toBe('S3_STANDARD_EXPIRE_180D');
  });

  it('routes larger PDFs (> 128 KB) to Glacier Instant Retrieval lifecycle', () => {
    const compressedPdf = estimateCompressedBytes(400_000, 'STATUTORY_PDF_INVOICE');
    expect(compressedPdf).toBeGreaterThanOrEqual(128 * 1024);
    expect(selectOptimalS3Tier(compressedPdf)).toBe('S3_STANDARD_TO_GLACIER_IR');
  });
});
