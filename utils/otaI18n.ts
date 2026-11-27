import type { SupportedLocale } from '@/types/localization';

export const EMBEDDED_FALLBACK_STRINGS: Record<SupportedLocale, Record<string, string>> = {
  en: {
    'gate.approve': 'Approve',
    'gate.deny': 'Deny',
    'gate.holdToSpeak': 'Hold to record visitor name (2s)',
    'gate.audioPrompt': 'Tap green button to approve visitor entry',
  },
  te: {
    'gate.approve': 'అనుమతించు',
    'gate.deny': 'తిరస్కరించు',
    'gate.holdToSpeak': 'పేరు చెప్పడానికి నొక్కి పట్టుకోండి (2 సెకన్లు)',
    'gate.audioPrompt': 'సందర్శకుడిని అనుమతించడానికి ఆకుపచ్చ బటన్ నొక్కండి',
  },
  kn: {
    'gate.approve': 'ಅನುಮತಿಸಿ',
    'gate.deny': 'ನಿರಾಕರಿಸಿ',
    'gate.holdToSpeak': 'ಹೆಸರು ಹೇಳಲು ಒತ್ತಿ ಹಿಡಿಯಿರಿ (2 ಸೆಕೆಂಡ್)',
    'gate.audioPrompt': 'ಸಂದರ್ಶಕರನ್ನು ಅನುಮತಿಸಲು ಹಸಿರು ಬಟನ್ ಒತ್ತಿ',
  },
  ta: {
    'gate.approve': 'அனுமதி',
    'gate.deny': 'நிராகரி',
    'gate.holdToSpeak': 'பெயர் சொல்ல அழுத்திப் பிடிக்கவும் (2 வினாடிகள்)',
    'gate.audioPrompt': 'பார்வையாளரை அனுமதிக்க பச்சை பொத்தானை அழுத்தவும்',
  },
  hi: {
    'gate.approve': 'अनुमति दें',
    'gate.deny': 'अस्वीकार करें',
    'gate.holdToSpeak': 'नाम बोलने के लिए दबाकर रखें (2 सेकंड)',
    'gate.audioPrompt': 'विज़िटर को अनुमति देने के लिए हरा बटन दबाएं',
  },
  mr: {
    'gate.approve': 'परवानगी द्या',
    'gate.deny': 'नाकारा',
    'gate.holdToSpeak': 'नाव सांगण्यासाठी दाबून धरा (2 सेकंद)',
    'gate.audioPrompt': 'अभ्यागताला परवानगी देण्यासाठी हिरवे बटण दाबा',
  },
  ur: {
    'gate.approve': 'منظور کریں',
    'gate.deny': 'مسترد کریں',
    'gate.holdToSpeak': 'نام بولنے کے لیے دبا کر رکھیں',
    'gate.audioPrompt': 'ملاقاتی کو اندر آنے دینے کے لیے سبز بٹن دبائیں',
  },
};

export function isRtlLocale(locale: string): boolean {
  return locale === 'ur' || locale === 'ar';
}

export function getIndicLineHeight(fontSize: number, locale: string): number {
  const mult = locale === 'ur' ? 1.65 : locale === 'en' ? 1.25 : 1.5;
  return Math.ceil(fontSize * mult);
}

/**
 * 3-tier deterministic resolver:
 * 1) Active OTA bundle for requested locale
 * 2) Active OTA English bundle
 * 3) Embedded compiled-in fallback (never renders raw key unless missing everywhere)
 */
export function resolveOtaString(
  key: string,
  locale: SupportedLocale,
  otaStrings?: Record<string, string> | null,
  otaEnglishStrings?: Record<string, string> | null,
): string {
  if (otaStrings && otaStrings[key]) return otaStrings[key];
  if (otaEnglishStrings && otaEnglishStrings[key]) return otaEnglishStrings[key];
  return EMBEDDED_FALLBACK_STRINGS[locale]?.[key] ?? EMBEDDED_FALLBACK_STRINGS.en[key] ?? key;
}
