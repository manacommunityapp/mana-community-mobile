import api from './apiClient';

export interface WaterStorageTank {
  id: number;
  name: string;
  tankType: 'UG_RAW' | 'UG_TREATED' | 'UG_SOFT' | 'UG_FIRE_RESERVE' | 'OHT_TOWER_A' | 'OHT_TOWER_B' | 'RAINWATER_HARVEST';
  capacityLiters: number;
  currentLevelLiters: number;
  percentageFull: number;
  lowLevelThresholdLiters: number;
  isLowLevel: boolean;
  sensorStatus: 'ONLINE' | 'OFFLINE' | 'WARNING';
  lastTelemetryAt: string;
}

export interface WaterTankerDelivery {
  id: number;
  deliveryDate: string;
  vendorName: string;
  tankerRegNumber: string;
  volumeLiters: number;
  cost: number;
  invoiceNumber: string;
  driverPhone: string;
  gateGuardName: string;
  targetTankId: number;
  targetTankName: string;
  waterSource: 'PRIVATE_BOREWELL' | 'MUNICIPAL' | 'LAKE_TREATED';
  tdsPpm?: number;
  status: 'RECEIVED' | 'PENDING_VERIFICATION' | 'REJECTED';
}

export interface WaterPump {
  id: number;
  name: string;
  pumpType: 'HYPN_DOMESTIC' | 'HYPN_FLUSHING' | 'TRANSFER_SUMP_OHT' | 'BOREWELL' | 'STP_BLOWER' | 'FIRE_JOCKEY';
  ratingKw: number;
  location: string;
  status: 'RUNNING' | 'STANDBY' | 'MAINTENANCE' | 'FAULT';
  isDuty: boolean;
  runHoursTotal: number;
  lastStartedAt?: string;
  dryRunTripped: boolean;
}

export interface WaterTreatmentLog {
  id: number;
  logDate: string;
  treatmentUnit: 'WTP_CARBON_FILTER' | 'WTP_SAND_FILTER' | 'WTP_SOFTENER' | 'STP_AERATION' | 'CHLORINATION_PLANT';
  operationType: 'BACKWASH' | 'SALT_RECHARGE' | 'CHLORINE_DOSING' | 'SLUDGE_DISPOSAL';
  quantity?: number;
  unit?: string;
  performedBy: string;
  remarks: string;
}

export interface WaterQualityTest {
  id: number;
  testDate: string;
  sampleLocation: string;
  ph: number;
  tdsPpm: number;
  totalHardnessPpm: number;
  freeChlorinePpm: number;
  turbidityNtu: number;
  isCompliantIS10500: boolean;
  testedBy: string;
  notes: string;
}

export interface TankCleaningSchedule {
  id: number;
  tankId: number;
  tankName: string;
  lastCleanedDate: string;
  nextDueDate: string;
  vendorName: string;
  status: 'COMPLETED' | 'SCHEDULED' | 'OVERDUE';
  daysRemaining: number;
}

export interface WaterOverviewSummary {
  totalStorageCapacityLiters: number;
  currentStorageLiters: number;
  storagePercentage: number;
  hoursReserveRemaining: number;
  monthlyTankersCount: number;
  monthlyTankerLiters: number;
  monthlyTankerSpend: number;
  activePumpsCount: number;
  isQualitySafe: boolean;
  latestTds: number;
}

const MOCK_TANKS: WaterStorageTank[] = [
  {
    id: 1,
    name: 'Domestic Fresh Water Sump',
    tankType: 'UG_TREATED',
    capacityLiters: 150000,
    currentLevelLiters: 118000,
    percentageFull: 79,
    lowLevelThresholdLiters: 35000,
    isLowLevel: false,
    sensorStatus: 'ONLINE',
    lastTelemetryAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Flushing & Treated Water Sump',
    tankType: 'UG_SOFT',
    capacityLiters: 100000,
    currentLevelLiters: 74000,
    percentageFull: 74,
    lowLevelThresholdLiters: 25000,
    isLowLevel: false,
    sensorStatus: 'ONLINE',
    lastTelemetryAt: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Overhead Tank - Tower A',
    tankType: 'OHT_TOWER_A',
    capacityLiters: 50000,
    currentLevelLiters: 42000,
    percentageFull: 84,
    lowLevelThresholdLiters: 12000,
    isLowLevel: false,
    sensorStatus: 'ONLINE',
    lastTelemetryAt: new Date().toISOString(),
  },
  {
    id: 4,
    name: 'Overhead Tank - Tower B',
    tankType: 'OHT_TOWER_B',
    capacityLiters: 50000,
    currentLevelLiters: 38500,
    percentageFull: 77,
    lowLevelThresholdLiters: 12000,
    isLowLevel: false,
    sensorStatus: 'ONLINE',
    lastTelemetryAt: new Date().toISOString(),
  },
  {
    id: 5,
    name: 'Dedicated Fire Water Reserve Sump',
    tankType: 'UG_FIRE_RESERVE',
    capacityLiters: 200000,
    currentLevelLiters: 198000,
    percentageFull: 99,
    lowLevelThresholdLiters: 180000,
    isLowLevel: false,
    sensorStatus: 'ONLINE',
    lastTelemetryAt: new Date().toISOString(),
  },
];

const MOCK_TANKERS: WaterTankerDelivery[] = [
  {
    id: 501,
    deliveryDate: '2026-11-19T09:30:00',
    vendorName: 'Sri Balaji Water Suppliers',
    tankerRegNumber: 'KA-01-AJ-8492',
    volumeLiters: 12000,
    cost: 1100,
    invoiceNumber: 'SBW-2026-891',
    driverPhone: '9845012345',
    gateGuardName: 'Bahadur Thapa (Main Gate)',
    targetTankId: 1,
    targetTankName: 'Domestic Fresh Water Sump',
    waterSource: 'PRIVATE_BOREWELL',
    tdsPpm: 185,
    status: 'RECEIVED',
  },
  {
    id: 502,
    deliveryDate: '2026-11-18T16:15:00',
    vendorName: 'AquaFlow Express',
    tankerRegNumber: 'KA-03-D-4910',
    volumeLiters: 12000,
    cost: 1100,
    invoiceNumber: 'AF-4412',
    driverPhone: '9900112233',
    gateGuardName: 'Manoj Singh',
    targetTankId: 1,
    targetTankName: 'Domestic Fresh Water Sump',
    waterSource: 'PRIVATE_BOREWELL',
    tdsPpm: 192,
    status: 'RECEIVED',
  },
];

const MOCK_PUMPS: WaterPump[] = [
  {
    id: 1,
    name: 'HYPN Domestic Hydro-Pneumatic Pump #1',
    pumpType: 'HYPN_DOMESTIC',
    ratingKw: 7.5,
    location: 'Main Pump House - Bay 1',
    status: 'RUNNING',
    isDuty: true,
    runHoursTotal: 684.0,
    lastStartedAt: '2026-11-19T06:00:00Z',
    dryRunTripped: false,
  },
  {
    id: 2,
    name: 'HYPN Domestic Hydro-Pneumatic Pump #2',
    pumpType: 'HYPN_DOMESTIC',
    ratingKw: 7.5,
    location: 'Main Pump House - Bay 1',
    status: 'STANDBY',
    isDuty: false,
    runHoursTotal: 622.5,
    dryRunTripped: false,
  },
  {
    id: 3,
    name: 'OHT Tower A Transfer Pump Set #1',
    pumpType: 'TRANSFER_SUMP_OHT',
    ratingKw: 5.5,
    location: 'Basement 1 Transfer Station',
    status: 'STANDBY',
    isDuty: true,
    runHoursTotal: 412.0,
    dryRunTripped: false,
  },
];

const MOCK_QUALITY_TESTS: WaterQualityTest[] = [
  {
    id: 1,
    testDate: '2026-11-19',
    sampleLocation: 'Clubhouse RO Tap & Sump Outlet',
    ph: 7.3,
    tdsPpm: 148,
    totalHardnessPpm: 120,
    freeChlorinePpm: 0.35,
    turbidityNtu: 0.8,
    isCompliantIS10500: true,
    testedBy: 'AquaLab Bangalore (Daily QA Tech)',
    notes: 'All potable parameters within IS:10500 permissible drinking limits.',
  },
  {
    id: 2,
    testDate: '2026-11-18',
    sampleLocation: 'Tower A Overhead Tank Outlet',
    ph: 7.4,
    tdsPpm: 154,
    totalHardnessPpm: 125,
    freeChlorinePpm: 0.30,
    turbidityNtu: 0.9,
    isCompliantIS10500: true,
    testedBy: 'Facility Team (Digital Tester)',
    notes: 'Good mineral balance; chlorine residual adequate to prevent bio-film.',
  },
];

const MOCK_TREATMENT_LOGS: WaterTreatmentLog[] = [
  {
    id: 1,
    logDate: '2026-11-19T07:30:00',
    treatmentUnit: 'WTP_SAND_FILTER',
    operationType: 'BACKWASH',
    quantity: 15,
    unit: 'Minutes',
    performedBy: 'Raghu (WTP Operator)',
    remarks: 'Routine morning backwash to clear suspended particles.',
  },
  {
    id: 2,
    logDate: '2026-11-17T11:00:00',
    treatmentUnit: 'WTP_SOFTENER',
    operationType: 'SALT_RECHARGE',
    quantity: 50,
    unit: 'kg NaCl',
    performedBy: 'Raghu (WTP Operator)',
    remarks: 'Added 50kg industrial grade salt tablet to brine tank.',
  },
];

const MOCK_CLEANING_SCHEDULES: TankCleaningSchedule[] = [
  {
    id: 1,
    tankId: 1,
    tankName: 'Domestic Fresh Water Sump (150 kL)',
    lastCleanedDate: '2026-08-15',
    nextDueDate: '2027-02-15',
    vendorName: 'CleanTank India Services',
    status: 'SCHEDULED',
    daysRemaining: 88,
  },
  {
    id: 2,
    tankId: 3,
    tankName: 'Overhead Tank - Tower A (50 kL)',
    lastCleanedDate: '2026-09-01',
    nextDueDate: '2027-03-01',
    vendorName: 'CleanTank India Services',
    status: 'SCHEDULED',
    daysRemaining: 102,
  },
];

export const waterMaintenanceService = {
  async getTanks(): Promise<WaterStorageTank[]> {
    try {
      const res = await api.get<WaterStorageTank[]>('/v1/water-maintenance/tanks');
      if (res.data && res.data.length > 0) return res.data;
    } catch {
      // offline fallback
    }
    return MOCK_TANKS;
  },

  async updateTankLevel(tankId: number, levelLiters: number): Promise<WaterStorageTank> {
    try {
      const res = await api.put<WaterStorageTank>(`/v1/water-maintenance/tanks/${tankId}/level`, null, {
        params: { levelLiters },
      });
      return res.data;
    } catch {
      const tank = MOCK_TANKS.find(t => t.id === tankId);
      if (tank) {
        tank.currentLevelLiters = Math.max(0, Math.min(tank.capacityLiters, levelLiters));
        tank.percentageFull = Math.round((tank.currentLevelLiters / tank.capacityLiters) * 100);
        tank.isLowLevel = tank.currentLevelLiters < tank.lowLevelThresholdLiters;
        tank.lastTelemetryAt = new Date().toISOString();
        return tank;
      }
      throw new Error('Tank not found');
    }
  },

  async recordCleaning(data: {
    tankId: number;
    lastCleanedDate: string;
    nextDueDate: string;
    vendorName: string;
    remarks?: string;
  }): Promise<TankCleaningSchedule> {
    try {
      const res = await api.post<TankCleaningSchedule>(`/v1/water-maintenance/tanks/${data.tankId}/cleaning`, data);
      return res.data;
    } catch {
      const tank = MOCK_TANKS.find(t => t.id === data.tankId);
      const schedule: TankCleaningSchedule = {
        id: Date.now(),
        tankId: data.tankId,
        tankName: tank ? tank.name : 'Storage Sump',
        lastCleanedDate: data.lastCleanedDate,
        nextDueDate: data.nextDueDate,
        vendorName: data.vendorName,
        status: 'SCHEDULED',
        daysRemaining: Math.ceil((new Date(data.nextDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      };
      MOCK_CLEANING_SCHEDULES.unshift(schedule);
      return schedule;
    }
  },

  async getTankers(): Promise<WaterTankerDelivery[]> {
    try {
      const res = await api.get<WaterTankerDelivery[]>('/v1/water-maintenance/tankers');
      if (res.data && res.data.length > 0) return res.data;
    } catch {
      // offline fallback
    }
    return MOCK_TANKERS;
  },

  async inwardTanker(data: {
    vendorName: string;
    tankerRegNumber: string;
    volumeLiters: number;
    cost: number;
    invoiceNumber: string;
    driverPhone?: string;
    gateGuardName: string;
    targetTankId?: number;
    waterSource?: 'PRIVATE_BOREWELL' | 'MUNICIPAL' | 'LAKE_TREATED';
    tdsPpm?: number;
  }): Promise<WaterTankerDelivery> {
    try {
      const res = await api.post<WaterTankerDelivery>('/v1/water-maintenance/tankers', data);
      return res.data;
    } catch {
      const targetTank = MOCK_TANKS.find(t => t.id === (data.targetTankId || 1)) || MOCK_TANKS[0];
      const newDelivery: WaterTankerDelivery = {
        id: Date.now(),
        deliveryDate: new Date().toISOString(),
        vendorName: data.vendorName,
        tankerRegNumber: data.tankerRegNumber.toUpperCase(),
        volumeLiters: data.volumeLiters,
        cost: data.cost,
        invoiceNumber: data.invoiceNumber || `TNK-${Date.now().toString().slice(-4)}`,
        driverPhone: data.driverPhone || '',
        gateGuardName: data.gateGuardName || 'Duty Guard',
        targetTankId: targetTank.id,
        targetTankName: targetTank.name,
        waterSource: data.waterSource || 'PRIVATE_BOREWELL',
        tdsPpm: data.tdsPpm || 180,
        status: 'RECEIVED',
      };
      MOCK_TANKERS.unshift(newDelivery);

      // Increase tank level atomically
      targetTank.currentLevelLiters = Math.min(
        targetTank.capacityLiters,
        targetTank.currentLevelLiters + data.volumeLiters
      );
      targetTank.percentageFull = Math.round((targetTank.currentLevelLiters / targetTank.capacityLiters) * 100);

      return newDelivery;
    }
  },

  async getPumps(): Promise<WaterPump[]> {
    try {
      const res = await api.get<WaterPump[]>('/v1/water-maintenance/pumps');
      if (res.data && res.data.length > 0) return res.data;
    } catch {
      // offline fallback
    }
    return MOCK_PUMPS;
  },

  async togglePumpDutyStandby(pumpId: number): Promise<WaterPump> {
    try {
      const res = await api.post<WaterPump>(`/v1/water-maintenance/pumps/${pumpId}/toggle-standby`, {});
      return res.data;
    } catch {
      const target = MOCK_PUMPS.find(p => p.id === pumpId);
      if (!target) throw new Error('Pump not found');

      // Toggle peer pumps of same type
      const peer = MOCK_PUMPS.find(p => p.id !== pumpId && p.pumpType === target.pumpType);
      if (peer) {
        peer.isDuty = !peer.isDuty;
        peer.status = peer.isDuty ? 'RUNNING' : 'STANDBY';
      }
      target.isDuty = !target.isDuty;
      target.status = target.isDuty ? 'RUNNING' : 'STANDBY';

      return target;
    }
  },

  async getQualityTests(): Promise<WaterQualityTest[]> {
    try {
      const res = await api.get<WaterQualityTest[]>('/v1/water-maintenance/quality-tests');
      if (res.data && res.data.length > 0) return res.data;
    } catch {
      // offline fallback
    }
    return MOCK_QUALITY_TESTS;
  },

  async recordQualityTest(data: {
    sampleLocation: string;
    ph: number;
    tdsPpm: number;
    totalHardnessPpm: number;
    freeChlorinePpm: number;
    turbidityNtu?: number;
    testedBy: string;
    notes?: string;
  }): Promise<WaterQualityTest> {
    try {
      const res = await api.post<WaterQualityTest>('/v1/water-maintenance/quality-tests', data);
      return res.data;
    } catch {
      // IS:10500 standards: pH 6.5-8.5, TDS <= 500, Hardness <= 300, Free Chlorine 0.2-1.0
      const isCompliant =
        data.ph >= 6.5 &&
        data.ph <= 8.5 &&
        data.tdsPpm <= 500 &&
        data.totalHardnessPpm <= 300 &&
        data.freeChlorinePpm >= 0.2;

      const record: WaterQualityTest = {
        id: Date.now(),
        testDate: new Date().toISOString().split('T')[0],
        sampleLocation: data.sampleLocation,
        ph: data.ph,
        tdsPpm: data.tdsPpm,
        totalHardnessPpm: data.totalHardnessPpm,
        freeChlorinePpm: data.freeChlorinePpm,
        turbidityNtu: data.turbidityNtu || 0.8,
        isCompliantIS10500: isCompliant,
        testedBy: data.testedBy,
        notes: data.notes || '',
      };
      MOCK_QUALITY_TESTS.unshift(record);
      return record;
    }
  },

  async getTreatmentLogs(): Promise<WaterTreatmentLog[]> {
    try {
      const res = await api.get<WaterTreatmentLog[]>('/v1/water-maintenance/treatment-logs');
      if (res.data && res.data.length > 0) return res.data;
    } catch {
      // offline fallback
    }
    return MOCK_TREATMENT_LOGS;
  },

  async addTreatmentLog(data: {
    treatmentUnit: WaterTreatmentLog['treatmentUnit'];
    operationType: WaterTreatmentLog['operationType'];
    quantity?: number;
    unit?: string;
    performedBy: string;
    remarks?: string;
  }): Promise<WaterTreatmentLog> {
    try {
      const res = await api.post<WaterTreatmentLog>('/v1/water-maintenance/treatment-logs', data);
      return res.data;
    } catch {
      const log: WaterTreatmentLog = {
        id: Date.now(),
        logDate: new Date().toISOString(),
        treatmentUnit: data.treatmentUnit,
        operationType: data.operationType,
        quantity: data.quantity,
        unit: data.unit,
        performedBy: data.performedBy,
        remarks: data.remarks || '',
      };
      MOCK_TREATMENT_LOGS.unshift(log);
      return log;
    }
  },

  async getCleaningSchedules(): Promise<TankCleaningSchedule[]> {
    try {
      const res = await api.get<TankCleaningSchedule[]>('/v1/water-maintenance/cleaning-schedules');
      if (res.data && res.data.length > 0) return res.data;
    } catch {
      // offline fallback
    }
    return MOCK_CLEANING_SCHEDULES;
  },

  async getOverview(): Promise<WaterOverviewSummary> {
    try {
      const res = await api.get<WaterOverviewSummary>('/v1/water-maintenance/overview');
      if (res.data) return res.data;
    } catch {
      // offline fallback
    }
    const totalCap = MOCK_TANKS.reduce((s, t) => s + t.capacityLiters, 0);
    const currentLev = MOCK_TANKS.reduce((s, t) => s + t.currentLevelLiters, 0);
    const storagePct = totalCap > 0 ? (currentLev / totalCap) * 100 : 0;
    const totalSpend = MOCK_TANKERS.reduce((s, t) => s + t.cost, 0);
    const totalTankerVol = MOCK_TANKERS.reduce((s, t) => s + t.volumeLiters, 0);
    const runningPumps = MOCK_PUMPS.filter(p => p.status === 'RUNNING').length;
    const latestTest = MOCK_QUALITY_TESTS[0];

    return {
      totalStorageCapacityLiters: totalCap,
      currentStorageLiters: currentLev,
      storagePercentage: Math.round(storagePct),
      hoursReserveRemaining: Math.round(currentLev / 22000), // ~22kL/hr community consumption
      monthlyTankersCount: MOCK_TANKERS.length,
      monthlyTankerLiters: totalTankerVol,
      monthlyTankerSpend: totalSpend,
      activePumpsCount: runningPumps,
      isQualitySafe: latestTest ? latestTest.isCompliantIS10500 : true,
      latestTds: latestTest ? latestTest.tdsPpm : 148,
    };
  },
};
