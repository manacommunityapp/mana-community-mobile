import api from './apiClient';
import { secureLog } from '@/security';

export type BillerCategory =
  | 'ELECTRICITY' | 'WATER' | 'GAS' | 'BROADBAND' | 'DTH'
  | 'FASTAG' | 'MUNICIPAL_TAX' | 'CREDIT_CARD'
  | 'EDUCATION' | 'LPG' | 'LANDLINE';

export interface BillerDto {
  id: string;
  name: string;
  shortName: string;
  category: BillerCategory;
  icon: string;
  state: string;
  consumerIdLabel: string;
  consumerIdHint: string;
  consumerIdLength?: number;
}

export interface FetchedBillDto {
  billerId: string;
  billerName: string;
  consumerId: string;
  customerName: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  amount: number;
  overdueAmount?: number;
  units?: number;
  periodFrom?: string;
  periodTo?: string;
  status: 'DUE' | 'OVERDUE' | 'PAID';
}

export interface BillPaymentResponse {
  upiIntentUrl: string;
  phonePeUrl: string;
  transactionRef: string;
  amount: number;
}

// ── Electricity ───────────────────────────────────────────────────────────────
const FALLBACK_ELECTRICITY_BILLERS: BillerDto[] = [
  { id: 'BESCOM',       name: 'BESCOM – Bangalore Electricity Supply Company', shortName: 'BESCOM',       category: 'ELECTRICITY', icon: '⚡', state: 'Karnataka',    consumerIdLabel: 'RR Number (Consumer Account No.)', consumerIdHint: 'e.g. 9123456789',   consumerIdLength: 10 },
  { id: 'TSSPDCL',      name: 'TSSPDCL – Telangana Southern Power Distribution', shortName: 'TSSPDCL',    category: 'ELECTRICITY', icon: '⚡', state: 'Telangana',    consumerIdLabel: 'Service Number (CA Number)',       consumerIdHint: 'e.g. 0012345678',   consumerIdLength: 10 },
  { id: 'TATA_POWER_MUMBAI', name: 'Tata Power – Mumbai Distribution',          shortName: 'Tata Power', category: 'ELECTRICITY', icon: '⚡', state: 'Maharashtra',  consumerIdLabel: 'Consumer Number',                 consumerIdHint: 'e.g. 4001234567',   consumerIdLength: 10 },
  { id: 'ADANI_ELECTRICITY', name: 'Adani Electricity – Mumbai',                shortName: 'Adani',      category: 'ELECTRICITY', icon: '⚡', state: 'Maharashtra',  consumerIdLabel: 'Consumer Account Number',         consumerIdHint: 'e.g. 100023456' },
  { id: 'MSEDCL',       name: 'MSEDCL – Maharashtra State Electricity',         shortName: 'MSEDCL',     category: 'ELECTRICITY', icon: '⚡', state: 'Maharashtra',  consumerIdLabel: 'Consumer Number',                 consumerIdHint: 'e.g. 020012345678' },
  { id: 'TNEB',         name: 'TNEB – Tamil Nadu Electricity Board',            shortName: 'TNEB',       category: 'ELECTRICITY', icon: '⚡', state: 'Tamil Nadu',   consumerIdLabel: 'Consumer Number (EB No.)',        consumerIdHint: 'e.g. 001234567890' },
  { id: 'BSES_RAJDHANI',name: 'BSES Rajdhani – South & West Delhi',             shortName: 'BSES Rajdhani', category: 'ELECTRICITY', icon: '⚡', state: 'Delhi',    consumerIdLabel: 'Consumer Account Number (CA)',    consumerIdHint: 'e.g. 50012345678' },
  { id: 'BSES_YAMUNA',  name: 'BSES Yamuna – East & Central Delhi',             shortName: 'BSES Yamuna',  category: 'ELECTRICITY', icon: '⚡', state: 'Delhi',    consumerIdLabel: 'Consumer Account Number (CA)',    consumerIdHint: 'e.g. 30012345678' },
];

// ── Gas ───────────────────────────────────────────────────────────────────────
const FALLBACK_GAS_BILLERS: BillerDto[] = [
  { id: 'MGL', name: 'MGL – Mahanagar Gas Limited',     shortName: 'MGL', category: 'GAS', icon: '🔥', state: 'Maharashtra', consumerIdLabel: 'Business Partner (BP) Number', consumerIdHint: 'e.g. 200012345' },
  { id: 'IGL', name: 'IGL – Indraprastha Gas Limited',  shortName: 'IGL', category: 'GAS', icon: '🔥', state: 'Delhi',       consumerIdLabel: 'BP Number',                    consumerIdHint: 'e.g. 100009876' },
];

// ── Water ─────────────────────────────────────────────────────────────────────
const FALLBACK_WATER_BILLERS: BillerDto[] = [
  { id: 'BWSSB',      name: 'BWSSB – Bangalore Water Supply',         shortName: 'BWSSB',      category: 'WATER', icon: '💧', state: 'Karnataka',   consumerIdLabel: 'Consumer ID',          consumerIdHint: 'e.g. 1234567890',  consumerIdLength: 10 },
  { id: 'MCGM_WATER', name: 'MCGM – Mumbai Water Supply',             shortName: 'MCGM',       category: 'WATER', icon: '💧', state: 'Maharashtra', consumerIdLabel: 'Consumer Number',      consumerIdHint: 'e.g. 010123456789' },
  { id: 'HMWSSB',     name: 'HMWSSB – Hyderabad Metro Water',         shortName: 'HMWSSB',     category: 'WATER', icon: '💧', state: 'Telangana',   consumerIdLabel: 'Service Connection No.', consumerIdHint: 'e.g. HYD2012345' },
  { id: 'DJB',        name: 'DJB – Delhi Jal Board',                  shortName: 'DJB',        category: 'WATER', icon: '💧', state: 'Delhi',       consumerIdLabel: 'K Number',             consumerIdHint: 'e.g. K-1234567' },
  { id: 'CMWSSB',     name: 'CMWSSB – Chennai Metro Water',           shortName: 'CMWSSB',     category: 'WATER', icon: '💧', state: 'Tamil Nadu',  consumerIdLabel: 'Consumer ID',          consumerIdHint: 'e.g. 12345678' },
];

// ── Broadband ─────────────────────────────────────────────────────────────────
const FALLBACK_BROADBAND_BILLERS: BillerDto[] = [
  { id: 'JIO_FIBER',         name: 'Jio Fiber – Reliance Jio',            shortName: 'Jio Fiber',  category: 'BROADBAND', icon: '📡', state: 'All India', consumerIdLabel: 'Account Number / Mobile',  consumerIdHint: 'e.g. 10-digit Jio number' },
  { id: 'AIRTEL_BROADBAND',  name: 'Airtel Xstream Fiber',                shortName: 'Airtel',     category: 'BROADBAND', icon: '📡', state: 'All India', consumerIdLabel: 'Airtel Account Number',     consumerIdHint: 'e.g. 123456789012' },
  { id: 'ACT_BROADBAND',     name: 'ACT Fibernet',                        shortName: 'ACT',        category: 'BROADBAND', icon: '📡', state: 'Multi',     consumerIdLabel: 'Subscriber ID',             consumerIdHint: 'e.g. ACT12345678' },
  { id: 'BSNL_BROADBAND',    name: 'BSNL Bharat Fiber / FTTH',            shortName: 'BSNL',       category: 'BROADBAND', icon: '📡', state: 'All India', consumerIdLabel: 'CA Number / Landline Number', consumerIdHint: 'e.g. 01112345678' },
  { id: 'HATHWAY_BROADBAND', name: 'Hathway Broadband',                   shortName: 'Hathway',    category: 'BROADBAND', icon: '📡', state: 'Multi',     consumerIdLabel: 'Subscriber ID',             consumerIdHint: 'e.g. 1234567890' },
];

// ── DTH ───────────────────────────────────────────────────────────────────────
const FALLBACK_DTH_BILLERS: BillerDto[] = [
  { id: 'TATA_PLAY',  name: 'Tata Play (formerly Tata Sky)',    shortName: 'Tata Play',  category: 'DTH', icon: '📺', state: 'All India', consumerIdLabel: 'Subscriber ID (RM ID)', consumerIdHint: 'e.g. 1234567890',  consumerIdLength: 10 },
  { id: 'DISH_TV',    name: 'Dish TV',                          shortName: 'Dish TV',    category: 'DTH', icon: '📺', state: 'All India', consumerIdLabel: 'VC Number',             consumerIdHint: 'e.g. 01234567890', consumerIdLength: 11 },
  { id: 'AIRTEL_DTH', name: 'Airtel Digital TV',                shortName: 'Airtel DTH', category: 'DTH', icon: '📺', state: 'All India', consumerIdLabel: 'Customer ID',           consumerIdHint: 'e.g. 3012345678',  consumerIdLength: 10 },
  { id: 'SUN_DIRECT', name: 'Sun Direct DTH',                   shortName: 'Sun Direct', category: 'DTH', icon: '📺', state: 'South',     consumerIdLabel: 'Smart Card Number',     consumerIdHint: 'e.g. 1234567890123', consumerIdLength: 13 },
  { id: 'D2H',        name: 'D2H (Videocon D2H)',               shortName: 'D2H',        category: 'DTH', icon: '📺', state: 'All India', consumerIdLabel: 'Customer ID',           consumerIdHint: 'e.g. 123456789' },
];

// ── FASTag ────────────────────────────────────────────────────────────────────
const FALLBACK_FASTAG_BILLERS: BillerDto[] = [
  { id: 'NHAI_ONE',       name: 'NHAI – National Highways Authority (One FASTag)', shortName: 'NHAI',         category: 'FASTAG', icon: '🚗', state: 'All India', consumerIdLabel: 'Vehicle Registration Number', consumerIdHint: 'e.g. KA01AB1234' },
  { id: 'HDFC_FASTAG',    name: 'HDFC Bank FASTag',                                shortName: 'HDFC FASTag',  category: 'FASTAG', icon: '🚗', state: 'All India', consumerIdLabel: 'Vehicle Registration Number', consumerIdHint: 'e.g. MH02CD5678' },
  { id: 'SBI_FASTAG',     name: 'SBI FASTag – State Bank of India',               shortName: 'SBI FASTag',   category: 'FASTAG', icon: '🚗', state: 'All India', consumerIdLabel: 'Vehicle Registration Number', consumerIdHint: 'e.g. DL03EF9012' },
  { id: 'ICICI_FASTAG',   name: 'ICICI Bank FASTag',                               shortName: 'ICICI FASTag', category: 'FASTAG', icon: '🚗', state: 'All India', consumerIdLabel: 'Vehicle Registration Number', consumerIdHint: 'e.g. TN04GH3456' },
  { id: 'PAYTM_FASTAG',   name: 'Paytm Payments Bank FASTag',                      shortName: 'Paytm FASTag', category: 'FASTAG', icon: '🚗', state: 'All India', consumerIdLabel: 'Vehicle Registration Number', consumerIdHint: 'e.g. KA05IJ7890' },
  { id: 'AXIS_FASTAG',    name: 'Axis Bank FASTag',                                shortName: 'Axis FASTag',  category: 'FASTAG', icon: '🚗', state: 'All India', consumerIdLabel: 'Vehicle Registration Number', consumerIdHint: 'e.g. GJ06KL2345' },
];

// ── Municipal Tax ─────────────────────────────────────────────────────────────
const FALLBACK_MUNICIPAL_TAX_BILLERS: BillerDto[] = [
  { id: 'GHMC',  name: 'GHMC – Greater Hyderabad Municipal Corporation', shortName: 'GHMC',  category: 'MUNICIPAL_TAX', icon: '🏛️', state: 'Telangana',   consumerIdLabel: 'PTIN (Property Tax ID No.)',  consumerIdHint: 'e.g. 123456789' },
  { id: 'BBMP',  name: 'BBMP – Bruhat Bengaluru Mahanagara Palike',      shortName: 'BBMP',  category: 'MUNICIPAL_TAX', icon: '🏛️', state: 'Karnataka',   consumerIdLabel: 'PID Number / Application ID', consumerIdHint: 'e.g. 1234567890' },
  { id: 'BMC',   name: 'BMC – Brihanmumbai Municipal Corporation',        shortName: 'BMC',   category: 'MUNICIPAL_TAX', icon: '🏛️', state: 'Maharashtra', consumerIdLabel: 'Property Account Number',    consumerIdHint: 'e.g. 0123456789' },
  { id: 'MCD',   name: 'MCD – Municipal Corporation of Delhi',            shortName: 'MCD',   category: 'MUNICIPAL_TAX', icon: '🏛️', state: 'Delhi',       consumerIdLabel: 'Property ID / UPIC No.',     consumerIdHint: 'e.g. D0123456' },
  { id: 'PCMC',  name: 'PCMC – Pimpri-Chinchwad Municipal Corporation',   shortName: 'PCMC',  category: 'MUNICIPAL_TAX', icon: '🏛️', state: 'Maharashtra', consumerIdLabel: 'Property Number',            consumerIdHint: 'e.g. PCM/1234/567' },
  { id: 'NMMC',  name: 'NMMC – Navi Mumbai Municipal Corporation',        shortName: 'NMMC',  category: 'MUNICIPAL_TAX', icon: '🏛️', state: 'Maharashtra', consumerIdLabel: 'Assessment Number',          consumerIdHint: 'e.g. 12345678' },
  { id: 'CMC_CHENNAI', name: 'Greater Chennai Corporation',               shortName: 'Chennai Corp', category: 'MUNICIPAL_TAX', icon: '🏛️', state: 'Tamil Nadu', consumerIdLabel: 'Zone-Division-Bill No.', consumerIdHint: 'e.g. 1-2-12345678' },
];

// ── Education ────────────────────────────────────────────────────────────────
const FALLBACK_EDUCATION_BILLERS: BillerDto[] = [
  { id: 'CBSE_FEES',   name: 'CBSE – Board Examination Fees',        shortName: 'CBSE',        category: 'EDUCATION', icon: '🎓', state: 'All India', consumerIdLabel: 'Roll Number / Registration No.', consumerIdHint: 'e.g. 2024012345' },
  { id: 'DU_FEES',     name: 'Delhi University – Fee Payment',        shortName: 'Delhi Univ', category: 'EDUCATION', icon: '🎓', state: 'Delhi',     consumerIdLabel: 'Student ID / Enrollment No.',   consumerIdHint: 'e.g. 22DU01234' },
  { id: 'BITS_FEES',   name: 'BITS Pilani – Fee Portal',              shortName: 'BITS',        category: 'EDUCATION', icon: '🎓', state: 'All India', consumerIdLabel: 'Student ID',                    consumerIdHint: 'e.g. 2022A1PS1234P' },
  { id: 'AMITY_FEES',  name: 'Amity University – Online Fee',         shortName: 'Amity',       category: 'EDUCATION', icon: '🎓', state: 'All India', consumerIdLabel: 'Enrollment Number',             consumerIdHint: 'e.g. A2022-123456' },
  { id: 'VTU_FEES',    name: 'VTU – Visvesvaraya Technological',      shortName: 'VTU',         category: 'EDUCATION', icon: '🎓', state: 'Karnataka', consumerIdLabel: 'USN (University Seat Number)',  consumerIdHint: 'e.g. 1AB22CS001' },
  { id: 'SCHOOL_FEES', name: 'School Fee Payment (Generic)',           shortName: 'School Fees', category: 'EDUCATION', icon: '🎓', state: 'All India', consumerIdLabel: 'Admission / Student Roll No.',  consumerIdHint: 'e.g. 2024-1234' },
];

// ── LPG ───────────────────────────────────────────────────────────────────────
const FALLBACK_LPG_BILLERS: BillerDto[] = [
  { id: 'HP_GAS',      name: 'HP Gas – Hindustan Petroleum LPG',      shortName: 'HP Gas',   category: 'LPG', icon: '🟢', state: 'All India', consumerIdLabel: 'Consumer Number / HP Gas ID', consumerIdHint: 'e.g. 123456789' },
  { id: 'BHARAT_GAS',  name: 'Bharat Gas – BPCL LPG',                 shortName: 'Bharat',  category: 'LPG', icon: '🔵', state: 'All India', consumerIdLabel: 'Consumer Number (17-digit)', consumerIdHint: 'e.g. 12345678901234567' },
  { id: 'INDANE_GAS',  name: 'Indane Gas – Indian Oil LPG',            shortName: 'Indane',  category: 'LPG', icon: '🔴', state: 'All India', consumerIdLabel: 'Consumer Number / IOCL ID', consumerIdHint: 'e.g. 1234567890' },
];

// ── Landline ──────────────────────────────────────────────────────────────────
const FALLBACK_LANDLINE_BILLERS: BillerDto[] = [
  { id: 'BSNL_LAND',  name: 'BSNL Landline Bill Payment',             shortName: 'BSNL',    category: 'LANDLINE', icon: '☎️', state: 'All India', consumerIdLabel: 'Telephone Number (STD+Number)',  consumerIdHint: 'e.g. 01123456789' },
  { id: 'MTNL_DEL',   name: 'MTNL Delhi Landline',                    shortName: 'MTNL Delhi', category: 'LANDLINE', icon: '☎️', state: 'Delhi',  consumerIdLabel: 'Telephone Number',               consumerIdHint: 'e.g. 01123456789' },
  { id: 'MTNL_MUM',   name: 'MTNL Mumbai Landline',                   shortName: 'MTNL Mumbai', category: 'LANDLINE', icon: '☎️', state: 'Maharashtra', consumerIdLabel: 'Telephone Number',         consumerIdHint: 'e.g. 02223456789' },
  { id: 'AIRTEL_LAND',name: 'Airtel Landline / Fixed Line',            shortName: 'Airtel',  category: 'LANDLINE', icon: '☎️', state: 'All India', consumerIdLabel: 'Account Number / Phone No.',    consumerIdHint: 'e.g. 01123456789' },
  { id: 'ACT_LAND',   name: 'ACT Fibernet (Fixed Line)',               shortName: 'ACT',     category: 'LANDLINE', icon: '☎️', state: 'Multi',     consumerIdLabel: 'Subscriber ID',                 consumerIdHint: 'e.g. ACT12345678' },
];

// ── Credit Card ───────────────────────────────────────────────────────────────
const FALLBACK_CREDIT_CARD_BILLERS: BillerDto[] = [
  { id: 'HDFC_CC',    name: 'HDFC Bank Credit Card',         shortName: 'HDFC',     category: 'CREDIT_CARD', icon: '💳', state: 'All India', consumerIdLabel: 'Credit Card Number (16 digits)', consumerIdHint: 'e.g. 4111 1111 1111 1111', consumerIdLength: 16 },
  { id: 'SBI_CC',     name: 'SBI Card – State Bank Credit',  shortName: 'SBI Card', category: 'CREDIT_CARD', icon: '💳', state: 'All India', consumerIdLabel: 'Credit Card Number (16 digits)', consumerIdHint: 'e.g. 5425 2334 3010 9903', consumerIdLength: 16 },
  { id: 'ICICI_CC',   name: 'ICICI Bank Credit Card',        shortName: 'ICICI',    category: 'CREDIT_CARD', icon: '💳', state: 'All India', consumerIdLabel: 'Credit Card Number (16 digits)', consumerIdHint: 'e.g. 4000 0566 5566 5556', consumerIdLength: 16 },
  { id: 'AXIS_CC',    name: 'Axis Bank Credit Card',         shortName: 'Axis',     category: 'CREDIT_CARD', icon: '💳', state: 'All India', consumerIdLabel: 'Credit Card Number (16 digits)', consumerIdHint: 'e.g. 5425 2334 3010 9903', consumerIdLength: 16 },
  { id: 'KOTAK_CC',   name: 'Kotak Mahindra Bank Credit Card', shortName: 'Kotak', category: 'CREDIT_CARD', icon: '💳', state: 'All India', consumerIdLabel: 'Credit Card Number (16 digits)', consumerIdHint: 'e.g. 4111 1111 1111 1111', consumerIdLength: 16 },
  { id: 'AMEX_CC',    name: 'American Express India',         shortName: 'Amex',    category: 'CREDIT_CARD', icon: '💳', state: 'All India', consumerIdLabel: 'Card Number (15 digits)',        consumerIdHint: 'e.g. 3714 496353 98431',   consumerIdLength: 15 },
  { id: 'INDUSIND_CC',name: 'IndusInd Bank Credit Card',      shortName: 'IndusInd',category: 'CREDIT_CARD', icon: '💳', state: 'All India', consumerIdLabel: 'Credit Card Number (16 digits)', consumerIdHint: 'e.g. 4111 1111 1111 1111', consumerIdLength: 16 },
];

const FALLBACK_MAP: Partial<Record<BillerCategory, BillerDto[]>> = {
  ELECTRICITY:   FALLBACK_ELECTRICITY_BILLERS,
  GAS:           FALLBACK_GAS_BILLERS,
  WATER:         FALLBACK_WATER_BILLERS,
  BROADBAND:     FALLBACK_BROADBAND_BILLERS,
  DTH:           FALLBACK_DTH_BILLERS,
  FASTAG:        FALLBACK_FASTAG_BILLERS,
  MUNICIPAL_TAX: FALLBACK_MUNICIPAL_TAX_BILLERS,
  CREDIT_CARD:   FALLBACK_CREDIT_CARD_BILLERS,
  EDUCATION:     FALLBACK_EDUCATION_BILLERS,
  LPG:           FALLBACK_LPG_BILLERS,
  LANDLINE:      FALLBACK_LANDLINE_BILLERS,
};

const BILL_AMOUNT_MAP: Partial<Record<BillerCategory, () => number>> = {
  ELECTRICITY:   () => 1248 + Math.floor(Math.random() * 800),
  GAS:           () => 680 + Math.floor(Math.random() * 400),
  WATER:         () => 320 + Math.floor(Math.random() * 200),
  BROADBAND:     () => 699 + Math.floor(Math.random() * 400),
  DTH:           () => 299 + Math.floor(Math.random() * 300),
  FASTAG:        () => 200 + Math.floor(Math.random() * 300),
  MUNICIPAL_TAX: () => 4500 + Math.floor(Math.random() * 6000),
  CREDIT_CARD:   () => 3200 + Math.floor(Math.random() * 12000),
  EDUCATION:     () => 15000 + Math.floor(Math.random() * 25000),
  LPG:           () => 850 + Math.floor(Math.random() * 200),
  LANDLINE:      () => 320 + Math.floor(Math.random() * 300),
};

function getAllFallbackBillers(): BillerDto[] {
  return Object.values(FALLBACK_MAP).flat() as BillerDto[];
}

function generateFallbackBill(billerId: string, consumerId: string): FetchedBillDto {
  const all = getAllFallbackBillers();
  const biller = all.find(b => b.id === billerId);
  const category = biller?.category;
  const now = new Date();
  const due = new Date(now.getFullYear(), now.getMonth(), 20);
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 0);
  const amount = category ? (BILL_AMOUNT_MAP[category]?.() ?? 999) : 999;

  return {
    billerId,
    billerName: biller?.name || billerId,
    consumerId,
    customerName: 'Resident Account',
    billNumber: `BILL-${billerId.slice(0, 4)}-${Date.now().toString().slice(-6)}`,
    billDate: from.toISOString().slice(0, 10),
    dueDate: due.toISOString().slice(0, 10),
    amount,
    units: category === 'ELECTRICITY' ? 180 + Math.floor(Math.random() * 60) : undefined,
    periodFrom: from.toISOString().slice(0, 10),
    periodTo: to.toISOString().slice(0, 10),
    status: 'DUE',
  };
}

export const billerService = {
  async getBillersByCategory(category: BillerCategory): Promise<BillerDto[]> {
    try {
      const res = await api.get<BillerDto[]>(`/v1/bbps/billers?category=${category}`);
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch (err) {
      secureLog.warn(`[billerService] BBPS billers API unavailable for ${category}, using fallback`, err);
    }
    return FALLBACK_MAP[category] ?? [];
  },

  async fetchBill(billerId: string, consumerId: string): Promise<FetchedBillDto> {
    try {
      const res = await api.post<FetchedBillDto>('/v1/bbps/bill/fetch', { billerId, consumerId });
      if (res.data?.billNumber) return res.data;
    } catch (err) {
      secureLog.warn(`[billerService] BBPS fetchBill API unavailable for ${billerId}, using fallback`, err);
    }
    return generateFallbackBill(billerId, consumerId);
  },

  async payBill(billNumber: string, billerId: string, amount: number, method: 'UPI' | 'WALLET'): Promise<BillPaymentResponse> {
    try {
      const res = await api.post<BillPaymentResponse>('/v1/bbps/bill/pay', { billNumber, billerId, amount, method });
      if (res.data?.upiIntentUrl) return res.data;
    } catch (err) {
      secureLog.warn(`[billerService] BBPS payBill API unavailable, generating local UPI intent`, err);
    }
    const pa = 'bbps@setu';
    const pn = encodeURIComponent('Mana Pay BBPS');
    const tr = `MANA${Date.now()}`;
    return {
      upiIntentUrl: `upi://pay?pa=${pa}&pn=${pn}&am=${amount}&cu=INR&tr=${tr}&tn=${encodeURIComponent('BBPS Bill Payment')}`,
      phonePeUrl: `phonepe://pay?pa=${pa}&pn=${pn}&am=${amount}&cu=INR&tr=${tr}`,
      transactionRef: tr,
      amount,
    };
  },
};
