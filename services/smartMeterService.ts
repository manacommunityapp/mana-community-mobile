import api from './apiClient';
import { secureLog } from '@/security';

export interface SmartMeterDto {
  id: number;
  societyId: number;
  unitId: number;
  unitNumber: string;
  meterNumber: string;
  meterType: 'ELECTRICITY' | 'WATER' | 'DG_BACKUP' | 'GAS';
  status: 'ACTIVE' | 'TAMPERED' | 'DISCONNECTED' | 'MAINTENANCE';
  currentReading: number;
  unitOfMeasure: 'kWh' | 'Liters' | 'm3';
  pulseMultiplier: number;
  lastReadingAt: string;
  burstLeakDetected?: boolean;
}

export interface UtilityConsumptionSummary {
  unitId: number;
  unitNumber: string;
  cycleMonth: string;
  electricityKWh: number;
  electricityAmount: number;
  waterLiters: number;
  waterAmount: number;
  dgBackupKWh: number;
  dgBackupAmount: number;
  totalUtilityAmount: number;
  cfbosSyncStatus: 'SYNCED' | 'PENDING' | 'OVERDUE';
}

const MOCK_METERS: SmartMeterDto[] = [
  {
    id: 101,
    societyId: 1,
    unitId: 504,
    unitNumber: 'Flat 504 (Tower B)',
    meterNumber: 'EM-BLR-504-A',
    meterType: 'ELECTRICITY',
    status: 'ACTIVE',
    currentReading: 1482.6,
    unitOfMeasure: 'kWh',
    pulseMultiplier: 1.0,
    lastReadingAt: new Date().toISOString(),
    burstLeakDetected: false,
  },
  {
    id: 102,
    societyId: 1,
    unitId: 504,
    unitNumber: 'Flat 504 (Tower B)',
    meterNumber: 'WM-BLR-504-B',
    meterType: 'WATER',
    status: 'ACTIVE',
    currentReading: 32450.0,
    unitOfMeasure: 'Liters',
    pulseMultiplier: 10.0,
    lastReadingAt: new Date().toISOString(),
    burstLeakDetected: false,
  },
  {
    id: 103,
    societyId: 1,
    unitId: 504,
    unitNumber: 'Flat 504 (Tower B)',
    meterNumber: 'DG-BLR-504-C',
    meterType: 'DG_BACKUP',
    status: 'ACTIVE',
    currentReading: 124.8,
    unitOfMeasure: 'kWh',
    pulseMultiplier: 1.0,
    lastReadingAt: new Date().toISOString(),
    burstLeakDetected: false,
  },
];

export const smartMeterService = {
  async getUnitMeters(unitId: number = 504): Promise<SmartMeterDto[]> {
    try {
      const res = await api.get<SmartMeterDto[]>(`/api/v1/iot/meters/unit/${unitId}`);
      if (res.data && res.data.length > 0) return res.data;
    } catch (err) {
      secureLog.warn('SmartMeter: fallback to mock meters', err);
    }
    return MOCK_METERS;
  },

  async getConsumptionSummary(unitId: number = 504): Promise<UtilityConsumptionSummary> {
    try {
      const res = await api.get<UtilityConsumptionSummary>(`/api/v1/iot/meters/summary/${unitId}`);
      if (res.data) return res.data;
    } catch {}
    return {
      unitId,
      unitNumber: 'Flat 504 (Tower B)',
      cycleMonth: 'October 2026',
      electricityKWh: 342.5,
      electricityAmount: 2397.50,
      waterLiters: 14200,
      waterAmount: 710.00,
      dgBackupKWh: 18.2,
      dgBackupAmount: 364.00,
      totalUtilityAmount: 3471.50,
      cfbosSyncStatus: 'SYNCED',
    };
  },

  async simulatePulseIngestion(meterId: number, pulseCount: number): Promise<{ success: boolean; newReading: number }> {
    try {
      const res = await api.post(`/api/v1/iot/meters/${meterId}/pulse`, { pulseCount });
      return res.data;
    } catch {
      return { success: true, newReading: 1520.4 };
    }
  },
};
