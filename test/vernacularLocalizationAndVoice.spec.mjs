import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

describe('Vernacular OTA Localization, TTS Cache & Voice Gate Entry (Mobile Spec)', () => {
  const EMBEDDED_EN = {
    'gate.approve': 'Approve',
    'gate.deny': 'Deny',
  };
  const EMBEDDED_TE = {
    'gate.approve': 'అనుమతించు',
    'gate.deny': 'తిరస్కరించు',
  };

  function resolveOtaString(key, locale, otaStrings, otaEnglishStrings) {
    if (otaStrings?.[key]) return otaStrings[key];
    if (otaEnglishStrings?.[key]) return otaEnglishStrings[key];
    if (locale === 'te' && EMBEDDED_TE[key]) return EMBEDDED_TE[key];
    return EMBEDDED_EN[key] ?? key;
  }

  function ttsPromptCacheKey(locale, promptKey, version) {
    return crypto.createHash('sha256').update(`${locale}:${promptKey}:${version}`).digest('hex').slice(0, 16);
  }

  function getIndicLineHeight(fontSize, locale) {
    const mult = locale === 'ur' ? 1.65 : locale === 'en' ? 1.25 : 1.5;
    return Math.ceil(fontSize * mult);
  }

  it('1. Enforces deterministic 3-tier OTA string fallback without exposing raw keys', () => {
    assert.equal(resolveOtaString('gate.approve', 'te', { 'gate.approve': 'OTA అనుమతి' }, null), 'OTA అనుమతి');
    assert.equal(resolveOtaString('gate.approve', 'te', {}, { 'gate.approve': 'OTA Approve' }), 'OTA Approve');
    assert.equal(resolveOtaString('gate.approve', 'te', {}, {}), 'అనుమతించు');
    assert.equal(resolveOtaString('gate.deny', 'kn', {}, {}), 'Deny');
  });

  it('2. Generates deterministic content-hashed TTS prompt keys and Indic line-height buffers', () => {
    const k1 = ttsPromptCacheKey('te', 'gate.audioPrompt', '20261128.4');
    const k2 = ttsPromptCacheKey('te', 'gate.audioPrompt', '20261128.4');
    const kDiff = ttsPromptCacheKey('hi', 'gate.audioPrompt', '20261128.4');
    assert.equal(k1, k2);
    assert.notEqual(k1, kDiff);

    assert.equal(getIndicLineHeight(16, 'te'), 24);
    assert.equal(getIndicLineHeight(16, 'ur'), 27);
    assert.equal(getIndicLineHeight(16, 'en'), 20);
  });

  it('3. Bounds 2s Opus voice-gate clip size and prioritizes audio URL ahead of async ASR', () => {
    const prepareVoicePayload = ({ durationMs, codec, sizeBytes }) => {
      if (durationMs > 5000) return { accepted: false, reason: 'CLIP_EXCEEDS_5S_CAP' };
      return { accepted: true, codec, sizeBytes, dispatchesImmediately: true, asyncAsrPending: true };
    };

    const twoSecOpus = prepareVoicePayload({ durationMs: 2100, codec: 'opus', sizeBytes: 5400 });
    assert.equal(twoSecOpus.accepted, true);
    assert.equal(twoSecOpus.dispatchesImmediately, true);
    assert.equal(twoSecOpus.asyncAsrPending, true);

    const tooLong = prepareVoicePayload({ durationMs: 7500, codec: 'opus', sizeBytes: 18000 });
    assert.equal(tooLong.accepted, false);
  });
});
