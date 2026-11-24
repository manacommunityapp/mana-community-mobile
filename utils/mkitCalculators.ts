/**
 * MKit Utility Calculation Engine
 * Pure TypeScript, zero external dependencies, 100% offline & portable for React Native.
 */

// --- 1. EMI CALCULATOR ---

export interface EmiResult {
  monthlyEmi: number;
  totalPayment: number;
  totalInterest: number;
  principal: number;
  interestRatioPercent: number;
  principalRatioPercent: number;
  yearlySchedule: {
    year: number;
    principalPaid: number;
    interestPaid: number;
    balance: number;
  }[];
}

export function calculateEmi(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number
): EmiResult {
  const p = Math.max(0, principal);
  const n = Math.max(1, Math.round(tenureMonths));
  const r = annualRatePercent / 12 / 100;

  if (p === 0) {
    return {
      monthlyEmi: 0,
      totalPayment: 0,
      totalInterest: 0,
      principal: 0,
      interestRatioPercent: 0,
      principalRatioPercent: 100,
      yearlySchedule: [],
    };
  }

  let monthlyEmi: number;
  if (r === 0) {
    monthlyEmi = p / n;
  } else {
    const factor = Math.pow(1 + r, n);
    monthlyEmi = (p * r * factor) / (factor - 1);
  }

  const totalPayment = monthlyEmi * n;
  const totalInterest = Math.max(0, totalPayment - p);

  const yearlySchedule: EmiResult['yearlySchedule'] = [];
  let balance = p;
  let currentYearPrincipal = 0;
  let currentYearInterest = 0;

  for (let m = 1; m <= n; m++) {
    const interestForMonth = r > 0 ? balance * r : 0;
    const principalForMonth = monthlyEmi - interestForMonth;
    balance = Math.max(0, balance - principalForMonth);

    currentYearPrincipal += principalForMonth;
    currentYearInterest += interestForMonth;

    if (m % 12 === 0 || m === n) {
      yearlySchedule.push({
        year: Math.ceil(m / 12),
        principalPaid: Math.round(currentYearPrincipal),
        interestPaid: Math.round(currentYearInterest),
        balance: Math.round(balance),
      });
      currentYearPrincipal = 0;
      currentYearInterest = 0;
    }
  }

  const total = totalPayment || 1;
  return {
    monthlyEmi: Math.round(monthlyEmi),
    totalPayment: Math.round(totalPayment),
    totalInterest: Math.round(totalInterest),
    principal: Math.round(p),
    interestRatioPercent: Math.round((totalInterest / total) * 100),
    principalRatioPercent: Math.round((p / total) * 100),
    yearlySchedule,
  };
}

// --- 2. SIP & LUMPSUM CALCULATOR ---

export interface SipResult {
  investedAmount: number;
  estimatedReturns: number;
  totalMaturityValue: number;
  yearlyBreakdown: {
    year: number;
    invested: number;
    value: number;
  }[];
}

export function calculateSip(
  monthlyInvestment: number,
  expectedReturnRatePercent: number,
  tenureYears: number
): SipResult {
  const p = Math.max(0, monthlyInvestment);
  const years = Math.max(1, tenureYears);
  const totalMonths = years * 12;
  const i = expectedReturnRatePercent / 12 / 100;
  const investedAmount = p * totalMonths;

  if (p === 0) {
    return {
      investedAmount: 0,
      estimatedReturns: 0,
      totalMaturityValue: 0,
      yearlyBreakdown: [],
    };
  }

  let totalMaturityValue: number;
  if (i === 0) {
    totalMaturityValue = investedAmount;
  } else {
    totalMaturityValue = p * ((Math.pow(1 + i, totalMonths) - 1) / i) * (1 + i);
  }

  const estimatedReturns = Math.max(0, totalMaturityValue - investedAmount);

  const yearlyBreakdown: SipResult['yearlyBreakdown'] = [];
  for (let y = 1; y <= years; y++) {
    const months = y * 12;
    const inv = p * months;
    const val =
      i === 0
        ? inv
        : p * ((Math.pow(1 + i, months) - 1) / i) * (1 + i);
    yearlyBreakdown.push({
      year: y,
      invested: Math.round(inv),
      value: Math.round(val),
    });
  }

  return {
    investedAmount: Math.round(investedAmount),
    estimatedReturns: Math.round(estimatedReturns),
    totalMaturityValue: Math.round(totalMaturityValue),
    yearlyBreakdown,
  };
}

export function calculateLumpsum(
  investmentAmount: number,
  expectedReturnRatePercent: number,
  tenureYears: number
): SipResult {
  const p = Math.max(0, investmentAmount);
  const years = Math.max(1, tenureYears);
  const r = expectedReturnRatePercent / 100;
  const totalMaturityValue = p * Math.pow(1 + r, years);
  const estimatedReturns = Math.max(0, totalMaturityValue - p);

  const yearlyBreakdown: SipResult['yearlyBreakdown'] = [];
  for (let y = 1; y <= years; y++) {
    yearlyBreakdown.push({
      year: y,
      invested: Math.round(p),
      value: Math.round(p * Math.pow(1 + r, y)),
    });
  }

  return {
    investedAmount: Math.round(p),
    estimatedReturns: Math.round(estimatedReturns),
    totalMaturityValue: Math.round(totalMaturityValue),
    yearlyBreakdown,
  };
}

// --- 3. FUEL & MILEAGE CALCULATOR ---

export interface FuelTripResult {
  fuelNeededLiters: number;
  totalCost: number;
  costPerPerson: number;
  costPerKm: number;
}

export function calculateFuelTrip(
  distanceKm: number,
  mileageKmpl: number,
  fuelPricePerLiter: number,
  passengers: number = 1
): FuelTripResult {
  const dist = Math.max(0, distanceKm);
  const mileage = Math.max(0.1, mileageKmpl);
  const price = Math.max(0, fuelPricePerLiter);
  const people = Math.max(1, passengers);

  const fuelNeededLiters = dist / mileage;
  const totalCost = fuelNeededLiters * price;
  const costPerPerson = totalCost / people;
  const costPerKm = dist > 0 ? totalCost / dist : 0;

  return {
    fuelNeededLiters: Number(fuelNeededLiters.toFixed(2)),
    totalCost: Math.round(totalCost),
    costPerPerson: Math.round(costPerPerson),
    costPerKm: Number(costPerKm.toFixed(2)),
  };
}

export function calculateMileage(
  distanceKm: number,
  fuelConsumedLiters: number
): number {
  if (fuelConsumedLiters <= 0 || distanceKm <= 0) return 0;
  return Number((distanceKm / fuelConsumedLiters).toFixed(2));
}

// --- 4. BILL SPLITTER & TIP CALCULATOR ---

export interface BillSplitItem {
  name: string;
  amount: number;
  sharePercent?: number;
}

export interface BillSplitResult {
  baseAmount: number;
  tipAmount: number;
  taxAmount: number;
  grandTotal: number;
  equalSplitPerPerson: number;
  members: {
    name: string;
    amount: number;
  }[];
  shareableSummary: string;
}

export function calculateBillSplit(params: {
  billAmount: number;
  tipPercent?: number;
  tipAmount?: number;
  taxPercent?: number;
  taxAmount?: number;
  passengersOrPeopleCount?: number;
  roundUp?: boolean;
  customMembers?: { name: string; customShare?: number }[];
}): BillSplitResult {
  const base = Math.max(0, params.billAmount);
  const tip =
    params.tipAmount !== undefined
      ? Math.max(0, params.tipAmount)
      : (base * Math.max(0, params.tipPercent || 0)) / 100;

  const tax =
    params.taxAmount !== undefined
      ? Math.max(0, params.taxAmount)
      : (base * Math.max(0, params.taxPercent || 0)) / 100;

  let grandTotal = base + tip + tax;
  if (params.roundUp) {
    grandTotal = Math.ceil(grandTotal);
  }

  const peopleCount = Math.max(
    1,
    params.customMembers?.length || params.passengersOrPeopleCount || 1
  );

  const equalPerPerson = grandTotal / peopleCount;

  let members: { name: string; amount: number }[] = [];
  if (params.customMembers && params.customMembers.length > 0) {
    const totalCustomShares = params.customMembers.reduce(
      (acc, m) => acc + (m.customShare || 0),
      0
    );

    if (totalCustomShares > 0) {
      members = params.customMembers.map((m) => {
        const shareRatio = (m.customShare || 0) / totalCustomShares;
        return {
          name: m.name || 'Member',
          amount: Math.round(grandTotal * shareRatio),
        };
      });
    } else {
      members = params.customMembers.map((m) => ({
        name: m.name || 'Member',
        amount: Math.round(equalPerPerson),
      }));
    }
  } else {
    for (let i = 1; i <= peopleCount; i++) {
      members.push({
        name: `Person ${i}`,
        amount: Math.round(equalPerPerson),
      });
    }
  }

  const lines = [
    `🧾 *ManaKit Bill Breakdown*`,
    `Subtotal: ₹${base.toFixed(2)}`,
    tip > 0 ? `Tip: ₹${tip.toFixed(2)}` : null,
    tax > 0 ? `Tax/GST: ₹${tax.toFixed(2)}` : null,
    `*Grand Total: ₹${grandTotal.toFixed(2)}*`,
    `--------------------------`,
    `👥 Split (${peopleCount} people):`,
    ...members.map((m) => `• ${m.name}: ₹${m.amount}`),
    `--------------------------`,
    `Generated via ManaKit • Everyday Tools`,
  ].filter(Boolean);

  return {
    baseAmount: Math.round(base),
    tipAmount: Math.round(tip),
    taxAmount: Math.round(tax),
    grandTotal: Math.round(grandTotal),
    equalSplitPerPerson: Math.round(equalPerPerson),
    members,
    shareableSummary: lines.join('\n'),
  };
}

// --- 5. PASSWORD GENERATOR & STRENGTH METER ---

export interface PasswordGenOptions {
  length?: number;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
  avoidAmbiguous?: boolean;
}

export interface PasswordResult {
  password: string;
  strength: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  entropyBits: number;
  score: number; // 0 to 4
}

export function generatePassword(options: PasswordGenOptions = {}): PasswordResult {
  const {
    length = 16,
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
    avoidAmbiguous = true,
  } = options;

  let upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let lower = 'abcdefghijklmnopqrstuvwxyz';
  let numbers = '0123456789';
  let symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (avoidAmbiguous) {
    upper = upper.replace(/[IO]/g, '');
    lower = lower.replace(/[lo]/g, '');
    numbers = numbers.replace(/[01]/g, '');
    symbols = symbols.replace(/[|;:.]/g, '');
  }

  let charset = '';
  const mandatoryChars: string[] = [];

  if (includeUppercase && upper) {
    charset += upper;
    mandatoryChars.push(upper[Math.floor(Math.random() * upper.length)]);
  }
  if (includeLowercase && lower) {
    charset += lower;
    mandatoryChars.push(lower[Math.floor(Math.random() * lower.length)]);
  }
  if (includeNumbers && numbers) {
    charset += numbers;
    mandatoryChars.push(numbers[Math.floor(Math.random() * numbers.length)]);
  }
  if (includeSymbols && symbols) {
    charset += symbols;
    mandatoryChars.push(symbols[Math.floor(Math.random() * symbols.length)]);
  }

  if (!charset) {
    charset = lower;
    mandatoryChars.push(lower[0]);
  }

  const passLen = Math.max(4, Math.min(64, length));
  const result: string[] = [...mandatoryChars];

  const getRandomByte = (): number => {
    if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      globalThis.crypto.getRandomValues(arr);
      return arr[0];
    }
    return Math.floor(Math.random() * 1000000);
  };

  while (result.length < passLen) {
    const idx = getRandomByte() % charset.length;
    result.push(charset[idx]);
  }

  for (let i = result.length - 1; i > 0; i--) {
    const j = getRandomByte() % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  const password = result.join('');
  const poolSize = charset.length;
  const entropyBits = Math.round(passLen * Math.log2(poolSize || 1));

  let score = 0;
  let strength: PasswordResult['strength'] = 'Very Weak';

  if (entropyBits >= 80) {
    score = 4;
    strength = 'Very Strong';
  } else if (entropyBits >= 60) {
    score = 3;
    strength = 'Strong';
  } else if (entropyBits >= 40) {
    score = 2;
    strength = 'Fair';
  } else if (entropyBits >= 25) {
    score = 1;
    strength = 'Weak';
  } else {
    score = 0;
    strength = 'Very Weak';
  }

  return {
    password,
    strength,
    entropyBits,
    score,
  };
}

// --- 6. PAINT & WALL AREA ESTIMATOR ---

export interface PaintEstimatorParams {
  lengthFeet: number;
  widthFeet: number;
  heightFeet: number;
  doorsCount?: number;
  windowsCount?: number;
  includeCeiling?: boolean;
  coatsCount?: number;
  coverageSqFtPerLiter?: number;
  costPerLiter?: number;
}

export interface PaintEstimatorResult {
  grossWallAreaSqFt: number;
  ceilingAreaSqFt: number;
  deductionsSqFt: number;
  netAreaSqFt: number;
  totalPaintAreaSqFt: number;
  litersRequired: number;
  recommendedCans: {
    can20L: number;
    can10L: number;
    can4L: number;
    can1L: number;
  };
  estimatedCost: number;
}

export function calculatePaintEstimator(params: PaintEstimatorParams): PaintEstimatorResult {
  const l = Math.max(0, params.lengthFeet);
  const w = Math.max(0, params.widthFeet);
  const h = Math.max(0, params.heightFeet);
  const doors = Math.max(0, params.doorsCount || 0);
  const windows = Math.max(0, params.windowsCount || 0);
  const coats = Math.max(1, params.coatsCount || 2);
  const coverage = Math.max(10, params.coverageSqFtPerLiter || 120);
  const costPerL = Math.max(0, params.costPerLiter || 350);

  const grossWallAreaSqFt = 2 * (l + w) * h;
  const ceilingAreaSqFt = params.includeCeiling ? l * w : 0;

  const deductionsSqFt = doors * 21 + windows * 12;
  const netAreaSqFt = Math.max(0, grossWallAreaSqFt + ceilingAreaSqFt - deductionsSqFt);
  const totalPaintAreaSqFt = netAreaSqFt * coats;

  const rawLiters = totalPaintAreaSqFt / coverage;
  const litersRequired = Math.ceil(rawLiters * 10) / 10;

  let remaining = Math.ceil(litersRequired);
  const can20L = Math.floor(remaining / 20);
  remaining %= 20;
  const can10L = Math.floor(remaining / 10);
  remaining %= 10;
  const can4L = Math.floor(remaining / 4);
  remaining %= 4;
  const can1L = remaining;

  const estimatedCost = Math.round(litersRequired * costPerL);

  return {
    grossWallAreaSqFt: Math.round(grossWallAreaSqFt),
    ceilingAreaSqFt: Math.round(ceilingAreaSqFt),
    deductionsSqFt: Math.round(deductionsSqFt),
    netAreaSqFt: Math.round(netAreaSqFt),
    totalPaintAreaSqFt: Math.round(totalPaintAreaSqFt),
    litersRequired,
    recommendedCans: { can20L, can10L, can4L, can1L },
    estimatedCost,
  };
}

// --- 7. ELECTRICITY & APPLIANCE POWER COST ---

export interface ApplianceItem {
  id: string;
  name: string;
  powerWatts: number;
  hoursPerDay: number;
  quantity: number;
}

export interface ElectricityCostResult {
  dailyUnitsKwh: number;
  monthlyUnitsKwh: number;
  annualUnitsKwh: number;
  dailyCost: number;
  monthlyBill: number;
  annualBill: number;
  applianceBreakdown: {
    id: string;
    name: string;
    monthlyUnits: number;
    monthlyCost: number;
    percentage: number;
  }[];
}

export function calculateElectricityCost(
  appliances: ApplianceItem[],
  tariffPerKwh: number = 7.5
): ElectricityCostResult {
  const rate = Math.max(0, tariffPerKwh);

  let totalDailyKwh = 0;
  const details = appliances.map((a) => {
    const dailyKwh = (Math.max(0, a.powerWatts) * Math.max(0, a.hoursPerDay) * Math.max(0, a.quantity)) / 1000;
    totalDailyKwh += dailyKwh;
    const monthlyUnits = dailyKwh * 30;
    return {
      id: a.id,
      name: a.name,
      monthlyUnits: Number(monthlyUnits.toFixed(1)),
      monthlyCost: Math.round(monthlyUnits * rate),
    };
  });

  const monthlyUnitsKwh = Number((totalDailyKwh * 30).toFixed(1));
  const annualUnitsKwh = Number((totalDailyKwh * 365).toFixed(1));

  const dailyCost = Number((totalDailyKwh * rate).toFixed(2));
  const monthlyBill = Math.round(monthlyUnitsKwh * rate);
  const annualBill = Math.round(annualUnitsKwh * rate);

  const totalMonthlyUnits = monthlyUnitsKwh || 1;
  const applianceBreakdown = details.map((d) => ({
    ...d,
    percentage: Math.round((d.monthlyUnits / totalMonthlyUnits) * 100),
  }));

  return {
    dailyUnitsKwh: Number(totalDailyKwh.toFixed(2)),
    monthlyUnitsKwh,
    annualUnitsKwh,
    dailyCost,
    monthlyBill,
    annualBill,
    applianceBreakdown,
  };
}

// --- 8. DOMESTIC STAFF / MAID SALARY & LEAVE CALCULATOR ---

export interface StaffSalaryParams {
  staffName?: string;
  role?: string;
  monthlySalary: number;
  totalDaysInMonth?: number;
  paidLeavesAllowed?: number;
  leavesTaken?: number;
  advancePaid?: number;
  bonusOrExtra?: number;
  monthName?: string;
}

export interface StaffSalaryResult {
  dailyWage: number;
  unpaidLeaves: number;
  leaveDeduction: number;
  grossPayable: number;
  netPayable: number;
  advanceDeducted: number;
  bonusAdded: number;
  shareableSalarySlip: string;
}

export function calculateStaffSalary(params: StaffSalaryParams): StaffSalaryResult {
  const salary = Math.max(0, params.monthlySalary);
  const totalDays = Math.max(1, params.totalDaysInMonth || 30);
  const allowedLeaves = Math.max(0, params.paidLeavesAllowed ?? 2);
  const takenLeaves = Math.max(0, params.leavesTaken || 0);
  const advance = Math.max(0, params.advancePaid || 0);
  const bonus = Math.max(0, params.bonusOrExtra || 0);

  const dailyWage = salary / totalDays;
  const unpaidLeaves = Math.max(0, takenLeaves - allowedLeaves);
  const leaveDeduction = Math.round(unpaidLeaves * dailyWage);
  const grossPayable = Math.max(0, salary - leaveDeduction + bonus);
  const netPayable = Math.max(0, grossPayable - advance);

  const staff = params.staffName || 'Domestic Staff';
  const role = params.role ? ` (${params.role})` : '';
  const month = params.monthName || new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  const slipLines = [
    `🧾 *ManaKit Staff Salary Slip*`,
    `Staff: *${staff}*${role}`,
    `Month: ${month}`,
    `--------------------------`,
    `Base Monthly Salary: ₹${salary.toLocaleString('en-IN')}`,
    `Leaves Taken: ${takenLeaves} days (${allowedLeaves} paid, ${unpaidLeaves} unpaid)`,
    leaveDeduction > 0 ? `Leave Deduction: -₹${leaveDeduction.toLocaleString('en-IN')}` : null,
    bonus > 0 ? `Bonus / Extra Work: +₹${bonus.toLocaleString('en-IN')}` : null,
    advance > 0 ? `Advance Paid: -₹${advance.toLocaleString('en-IN')}` : null,
    `--------------------------`,
    `*Net Payout Payable: ₹${netPayable.toLocaleString('en-IN')}*`,
    `--------------------------`,
    `Generated via ManaKit • Everyday Tools`,
  ].filter(Boolean);

  return {
    dailyWage: Math.round(dailyWage),
    unpaidLeaves,
    leaveDeduction,
    grossPayable,
    netPayable,
    advanceDeducted: advance,
    bonusAdded: bonus,
    shareableSalarySlip: slipLines.join('\n'),
  };
}

// --- 9. INDIAN LAND & REAL ESTATE AREA CONVERTER ---

export type AreaUnit =
  | 'sqft'
  | 'sqyd'
  | 'sqm'
  | 'ankanam'
  | 'cent'
  | 'guntha'
  | 'ground'
  | 'acre'
  | 'hectare';

export const AREA_UNITS_META: { id: AreaUnit; name: string; region: string; toSqFt: number }[] = [
  { id: 'sqft', name: 'Square Feet (sq ft)', region: 'National / Standard', toSqFt: 1 },
  { id: 'sqyd', name: 'Square Yards / Gaj', region: 'North India & Plots', toSqFt: 9 },
  { id: 'sqm', name: 'Square Meters (sq m)', region: 'International / RERA', toSqFt: 10.7639 },
  { id: 'ankanam', name: 'Ankanam', region: 'Andhra Pradesh & Rayalaseema', toSqFt: 72 },
  { id: 'cent', name: 'Cent', region: 'Tamil Nadu & Kerala', toSqFt: 435.6 },
  { id: 'guntha', name: 'Guntha', region: 'Karnataka, Telangana, Maharashtra', toSqFt: 1089 },
  { id: 'ground', name: 'Ground', region: 'Tamil Nadu (Chennai)', toSqFt: 2400 },
  { id: 'acre', name: 'Acre', region: 'National / Agriculture', toSqFt: 43560 },
  { id: 'hectare', name: 'Hectare', region: 'Metric / Survey', toSqFt: 107639 },
];

export function convertArea(
  value: number,
  fromUnit: AreaUnit
): Record<AreaUnit, number> {
  const meta = AREA_UNITS_META.find((u) => u.id === fromUnit);
  const factor = meta ? meta.toSqFt : 1;
  const sqft = Math.max(0, value) * factor;

  const result = {} as Record<AreaUnit, number>;
  AREA_UNITS_META.forEach((u) => {
    const converted = sqft / u.toSqFt;
    result[u.id] = Number(converted.toFixed(converted >= 100 ? 2 : 4));
  });

  return result;
}


