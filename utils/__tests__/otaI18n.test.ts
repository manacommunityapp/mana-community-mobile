import { getIndicLineHeight, isRtlLocale, resolveOtaString } from '../otaI18n';

describe('otaI18n 3-tier fallback, Indic shaping & RTL helpers', () => {
  it('resolves OTA locale -> OTA English -> embedded compiled fallback', () => {
    expect(resolveOtaString('gate.approve', 'te', { 'gate.approve': 'OTA అనుమతి' }, null)).toBe('OTA అనుమతి');
    expect(resolveOtaString('gate.approve', 'te', {}, { 'gate.approve': 'OTA English Approve' })).toBe(
      'OTA English Approve',
    );
    expect(resolveOtaString('gate.approve', 'te', {}, {})).toBe('అనుమతించు');
  });

  it('computes Indic line-height buffers and detects RTL locales', () => {
    expect(isRtlLocale('ur')).toBe(true);
    expect(isRtlLocale('te')).toBe(false);
    expect(getIndicLineHeight(16, 'te')).toBe(24);
    expect(getIndicLineHeight(16, 'en')).toBe(20);
  });
});
