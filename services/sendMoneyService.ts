import { Linking } from 'react-native';

export interface RecentContact {
  id: string;
  name: string;
  initials: string;
  upi_id: string;
  avatar_color: string;
  last_amount?: number;
  last_date?: string;
}

const AVATAR_COLORS = ['#1D4ED8', '#7C3AED', '#DC2626', '#0F766E', '#D97706', '#0284C7', '#16A34A', '#DB2777'];

export const RECENT_CONTACTS: RecentContact[] = [
  { id: 'rc-1', name: 'Rohit Sharma',   initials: 'RS', upi_id: 'rohit@okaxis',    avatar_color: AVATAR_COLORS[0], last_amount: 500,  last_date: '2 days ago' },
  { id: 'rc-2', name: 'Priya Nair',     initials: 'PN', upi_id: 'priya@paytm',     avatar_color: AVATAR_COLORS[1], last_amount: 350,  last_date: '4 days ago' },
  { id: 'rc-3', name: 'Arjun Reddy',    initials: 'AR', upi_id: 'arjun@ybl',       avatar_color: AVATAR_COLORS[2], last_amount: 480,  last_date: '10 days ago' },
  { id: 'rc-4', name: 'Deepa Krishnan', initials: 'DK', upi_id: 'deepa@okicici',   avatar_color: AVATAR_COLORS[3], last_amount: 1000, last_date: '15 days ago' },
  { id: 'rc-5', name: 'Suresh Kumar',   initials: 'SK', upi_id: 'suresh@oksbi',    avatar_color: AVATAR_COLORS[4], last_amount: 200,  last_date: '18 days ago' },
];

export interface SendPayload {
  upi_id: string;
  name: string;
  amount: number;
  note: string;
}

export const sendMoneyService = {
  buildUpiIntent(payload: SendPayload): string {
    const tr = `MANA-SEND-${Date.now()}`;
    const pn = encodeURIComponent('Mana Community Pay');
    const pa = encodeURIComponent(payload.upi_id);
    const tn = payload.note ? `&tn=${encodeURIComponent(payload.note)}` : '';
    return `upi://pay?pa=${pa}&pn=${pn}&am=${payload.amount.toFixed(2)}&cu=INR&tr=${tr}${tn}`;
  },

  buildPhonePeUrl(payload: SendPayload): string {
    const tr = `MANA-SEND-${Date.now()}`;
    const pn = encodeURIComponent('Mana Community Pay');
    const pa = encodeURIComponent(payload.upi_id);
    return `phonepe://pay?pa=${pa}&pn=${pn}&am=${payload.amount.toFixed(2)}&cu=INR&tr=${tr}`;
  },

  async pay(payload: SendPayload): Promise<void> {
    const apps = [
      sendMoneyService.buildPhonePeUrl(payload),
      `tez://upi/pay?pa=${encodeURIComponent(payload.upi_id)}&pn=${encodeURIComponent(payload.name)}&am=${payload.amount}&cu=INR`,
      `paytmmp://pay?pa=${encodeURIComponent(payload.upi_id)}&am=${payload.amount}`,
      sendMoneyService.buildUpiIntent(payload),
    ];
    for (const url of apps) {
      try {
        if (await Linking.canOpenURL(url)) {
          await Linking.openURL(url);
          return;
        }
      } catch { /* try next */ }
    }
    // Final fallback — generic UPI always works on Android
    await Linking.openURL(sendMoneyService.buildUpiIntent(payload));
  },

  extractInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  },

  avatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  },
};
