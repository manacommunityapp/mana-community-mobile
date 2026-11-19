import api from './apiClient';

export interface GeneratorAsset {
  id: number;
  communityId: number;
  name: string;
  makeModel: string;
  kvaRating: number;
  location: string;
  fuelCapacityLiters: number;
  currentFuelLiters: number;
  totalRunHours: number;
  hoursSinceLastService: number;
  batteryVoltage: number;
  coolantTempC: number;
  status: 'RUNNING' | 'STANDBY' | 'MAINTENANCE' | 'FAULT';
  lastStartedAt?: string;
  lastStoppedAt?: string;
  serviceDueHours: number;
}

export interface GeneratorRunLog {
  id: number;
  generatorId: number;
  generatorName?: string;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  startFuelLiters: number;
  endFuelLiters?: number;
  fuelConsumedLiters?: number;
  kwhGenerated?: number;
  gridOutageReason?: string;
  operatorName: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
}

export interface FuelRefillLog {
  id: number;
  generatorId: number;
  refillDate: string;
  quantityLiters: number;
  pricePerLiter: number;
  totalCost: number;
  vendorName: string;
  invoiceNumber: string;
  receivedBy: string;
}

export interface GeneratorMaintenanceRecord {
  id: number;
  generatorId: number;
  maintenanceDate: string;
  serviceType: 'A_CHECK' | 'B_CHECK' | 'C_CHECK' | 'BREAKDOWN' | 'GENERAL';
  runHoursAtService: number;
  technicianName: string;
  vendorName: string;
  engineOilReplaced: boolean;
  oilFilterReplaced: boolean;
  fuelFilterReplaced: boolean;
  airFilterReplaced: boolean;
  cost: number;
  notes: string;
}

export interface GeneratorOverviewSummary {
  totalGenerators: number;
  runningGenerators: number;
  standbyGenerators: number;
  faultGenerators: number;
  totalFuelLiters: number;
  totalFuelCapacity: number;
  fuelPercentage: number;
  totalRunHoursMonth: number;
  fuelConsumedMonthLiters: number;
  estimatedBackupHoursRemaining: number;
}

const MOCK_GENERATORS: GeneratorAsset[] = [
  {
    id: 1,
    communityId: 1,
    name: 'DG-1 (Tower A & Clubhouse)',
    makeModel: 'Cummins QSK23-G3 (250 kVA)',
    kvaRating: 250,
    location: 'Basement 1 - Utility Room A',
    fuelCapacityLiters: 450,
    currentFuelLiters: 340,
    totalRunHours: 1482.5,
    hoursSinceLastService: 195.0,
    batteryVoltage: 26.4,
    coolantTempC: 68,
    status: 'STANDBY',
    serviceDueHours: 250,
    lastStartedAt: '2026-11-18T14:30:00Z',
    lastStoppedAt: '2026-11-18T16:45:00Z',
  },
  {
    id: 2,
    communityId: 1,
    name: 'DG-2 (Tower B & Pumping Station)',
    makeModel: 'Kirloskar KG200WS (200 kVA)',
    kvaRating: 200,
    location: 'Basement 2 - Pump House Annex',
    fuelCapacityLiters: 380,
    currentFuelLiters: 290,
    totalRunHours: 924.0,
    hoursSinceLastService: 48.0,
    batteryVoltage: 25.8,
    coolantTempC: 62,
    status: 'STANDBY',
    serviceDueHours: 250,
    lastStartedAt: '2026-11-15T09:00:00Z',
    lastStoppedAt: '2026-11-15T11:15:00Z',
  },
];

const MOCK_RUN_LOGS: GeneratorRunLog[] = [
  {
    id: 101,
    generatorId: 1,
    generatorName: 'DG-1 (Tower A & Clubhouse)',
    startTime: '2026-11-18T14:30:00',
    endTime: '2026-11-18T16:45:00',
    durationMinutes: 135,
    startFuelLiters: 385,
    endFuelLiters: 340,
    fuelConsumedLiters: 45,
    kwhGenerated: 320,
    gridOutageReason: 'BESCOM 11kV Feeder Tripping',
    operatorName: 'Suresh Kumar (Shift Electrician)',
    status: 'COMPLETED',
  },
  {
    id: 102,
    generatorId: 1,
    generatorName: 'DG-1 (Tower A & Clubhouse)',
    startTime: '2026-11-12T10:15:00',
    endTime: '2026-11-12T11:45:00',
    durationMinutes: 90,
    startFuelLiters: 415,
    endFuelLiters: 385,
    fuelConsumedLiters: 30,
    kwhGenerated: 210,
    gridOutageReason: 'Scheduled Transformer Maintenance',
    operatorName: 'Ramesh Gowda',
    status: 'COMPLETED',
  },
];

const MOCK_REFILL_LOGS: FuelRefillLog[] = [
  {
    id: 201,
    generatorId: 1,
    refillDate: '2026-11-10',
    quantityLiters: 250,
    pricePerLiter: 89.50,
    totalCost: 22375,
    vendorName: 'Indian Oil Retail Outlet (Bellandur)',
    invoiceNumber: 'INV-IOCL-88492',
    receivedBy: 'Ramesh (Facility Manager)',
  },
];

export const generatorMaintenanceService = {
  async getGenerators(): Promise<GeneratorAsset[]> {
    try {
      const res = await api.get<GeneratorAsset[]>('/v1/generator-maintenance/generators');
      if (res.data && res.data.length > 0) return res.data;
    } catch {
      // offline fallback
    }
    return MOCK_GENERATORS;
  },

  async getRunLogs(generatorId?: number): Promise<GeneratorRunLog[]> {
    try {
      const url = generatorId
        ? `/v1/generator-maintenance/generators/${generatorId}/run-logs`
        : '/v1/generator-maintenance/run-logs';
      const res = await api.get<GeneratorRunLog[]>(url);
      if (res.data && res.data.length > 0) return res.data;
    } catch {
      // fallback
    }
    return generatorId ? MOCK_RUN_LOGS.filter(l => l.generatorId === generatorId) : MOCK_RUN_LOGS;
  },

  async startRunLog(generatorId: number, data: { gridOutageReason?: string; operatorName: string }): Promise<GeneratorRunLog> {
    try {
      const res = await api.post<GeneratorRunLog>(`/v1/generator-maintenance/generators/${generatorId}/run-logs/start`, data);
      return res.data;
    } catch {
      const newLog: GeneratorRunLog = {
        id: Date.now(),
        generatorId,
        generatorName: 'DG-1 (Tower A & Clubhouse)',
        startTime: new Date().toISOString(),
        startFuelLiters: 340,
        gridOutageReason: data.gridOutageReason || 'Grid Power Interruption',
        operatorName: data.operatorName,
        status: 'IN_PROGRESS',
      };
      MOCK_RUN_LOGS.unshift(newLog);
      return newLog;
    }
  },

  async stopRunLog(
    logId: number,
    data: { endFuelLiters?: number; kwhGenerated?: number; notes?: string }
  ): Promise<GeneratorRunLog> {
    try {
      const res = await api.post<GeneratorRunLog>(`/v1/generator-maintenance/run-logs/${logId}/stop`, data);
      return res.data;
    } catch {
      const idx = MOCK_RUN_LOGS.findIndex(l => l.id === logId);
      if (idx !== -1) {
        const item = MOCK_RUN_LOGS[idx];
        const endFuel = data.endFuelLiters ?? (item.startFuelLiters - 20);
        item.endTime = new Date().toISOString();
        item.durationMinutes = 60;
        item.endFuelLiters = endFuel;
        item.fuelConsumedLiters = Math.max(0, item.startFuelLiters - endFuel);
        item.kwhGenerated = data.kwhGenerated ?? 140;
        item.status = 'COMPLETED';
        return item;
      }
      throw new Error('Run log not found');
    }
  },

  async logFuelRefill(
    generatorId: number,
    data: {
      quantityLiters: number;
      pricePerLiter: number;
      vendorName: string;
      invoiceNumber: string;
      receivedBy: string;
    }
  ): Promise<FuelRefillLog> {
    try {
      const res = await api.post<FuelRefillLog>(`/v1/generator-maintenance/generators/${generatorId}/fuel-logs`, data);
      return res.data;
    } catch {
      const refill: FuelRefillLog = {
        id: Date.now(),
        generatorId,
        refillDate: new Date().toISOString().split('T')[0],
        quantityLiters: data.quantityLiters,
        pricePerLiter: data.pricePerLiter,
        totalCost: data.quantityLiters * data.pricePerLiter,
        vendorName: data.vendorName,
        invoiceNumber: data.invoiceNumber,
        receivedBy: data.receivedBy,
      };
      MOCK_REFILL_LOGS.unshift(refill);
      const targetDg = MOCK_GENERATORS.find(g => g.id === generatorId);
      if (targetDg) {
        targetDg.currentFuelLiters = Math.min(targetDg.fuelCapacityLiters, targetDg.currentFuelLiters + data.quantityLiters);
      }
      return refill;
    }
  },

  async getFuelRefillLogs(generatorId?: number): Promise<FuelRefillLog[]> {
    try {
      const url = generatorId
        ? `/v1/generator-maintenance/generators/${generatorId}/fuel-logs`
        : '/v1/generator-maintenance/fuel-logs';
      const res = await api.get<FuelRefillLog[]>(url);
      if (res.data && res.data.length > 0) return res.data;
    } catch {
      // fallback
    }
    return MOCK_REFILL_LOGS;
  },

  async updateGeneratorTelemetry(
    generatorId: number,
    data: {
      currentFuelLiters?: number;
      status?: 'RUNNING' | 'STANDBY' | 'MAINTENANCE' | 'FAULT';
      batteryVoltage?: number;
      coolantTempC?: number;
    }
  ): Promise<GeneratorAsset> {
    try {
      const res = await api.put<GeneratorAsset>(`/v1/generator-maintenance/generators/${generatorId}/telemetry`, data);
      return res.data;
    } catch {
      const target = MOCK_GENERATORS.find(g => g.id === generatorId);
      if (target) {
        if (data.currentFuelLiters !== undefined) target.currentFuelLiters = data.currentFuelLiters;
        if (data.status !== undefined) target.status = data.status;
        if (data.batteryVoltage !== undefined) target.batteryVoltage = data.batteryVoltage;
        if (data.coolantTempC !== undefined) target.coolantTempC = data.coolantTempC;
        return target;
      }
      throw new Error('Generator not found');
    }
  },

  async recordService(
    generatorId: number,
    data: {
      serviceType: GeneratorMaintenanceRecord['serviceType'];
      runHoursAtService: number;
      vendorName: string;
      technicianName: string;
      cost: number;
      notes: string;
      engineOilReplaced?: boolean;
      oilFilterReplaced?: boolean;
      fuelFilterReplaced?: boolean;
      airFilterReplaced?: boolean;
    }
  ): Promise<GeneratorMaintenanceRecord> {
    try {
      const res = await api.post<GeneratorMaintenanceRecord>('/v1/generator-maintenance/services', {
        generatorId,
        ...data,
      });
      return res.data;
    } catch {
      const record: GeneratorMaintenanceRecord = {
        id: Date.now(),
        generatorId,
        maintenanceDate: new Date().toISOString().split('T')[0],
        serviceType: data.serviceType,
        runHoursAtService: data.runHoursAtService,
        technicianName: data.technicianName,
        vendorName: data.vendorName,
        engineOilReplaced: data.engineOilReplaced ?? true,
        oilFilterReplaced: data.oilFilterReplaced ?? true,
        fuelFilterReplaced: data.fuelFilterReplaced ?? true,
        airFilterReplaced: data.airFilterReplaced ?? true,
        cost: data.cost,
        notes: data.notes,
      };
      const target = MOCK_GENERATORS.find(g => g.id === generatorId);
      if (target && (data.serviceType === 'B_CHECK' || data.serviceType === 'C_CHECK')) {
        target.hoursSinceLastService = 0;
      }
      return record;
    }
  },

  async getOverview(): Promise<GeneratorOverviewSummary> {
    try {
      const res = await api.get<GeneratorOverviewSummary>('/v1/generator-maintenance/overview');
      if (res.data) return res.data;
    } catch {
      // fallback
    }
    const totalGen = MOCK_GENERATORS.length;
    const running = MOCK_GENERATORS.filter(g => g.status === 'RUNNING').length;
    const standby = MOCK_GENERATORS.filter(g => g.status === 'STANDBY').length;
    const fault = MOCK_GENERATORS.filter(g => g.status === 'FAULT').length;
    const totalFuel = MOCK_GENERATORS.reduce((s, g) => s + g.currentFuelLiters, 0);
    const totalCap = MOCK_GENERATORS.reduce((s, g) => s + g.fuelCapacityLiters, 0);
    const fuelPct = totalCap > 0 ? (totalFuel / totalCap) * 100 : 0;

    return {
      totalGenerators: totalGen,
      runningGenerators: running,
      standbyGenerators: standby,
      faultGenerators: fault,
      totalFuelLiters: totalFuel,
      totalFuelCapacity: totalCap,
      fuelPercentage: Math.round(fuelPct),
      totalRunHoursMonth: 14.5,
      fuelConsumedMonthLiters: 195,
      estimatedBackupHoursRemaining: Math.round(totalFuel / 25), // ~25L/hr burn rate
    };
  },
};
