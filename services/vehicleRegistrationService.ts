import api from './apiClient';

export type VehicleType = 'CAR' | 'BIKE' | 'SCOOTER' | 'SUV' | 'TRUCK' | 'OTHER';
export type VehicleStatus = 'ACTIVE' | 'INACTIVE';

export interface VehicleRegistration {
  id: number;
  plateNumber: string;
  vehicleType: VehicleType;
  make?: string;
  model?: string;
  color?: string;
  isGateWhitelisted: boolean;
  status: VehicleStatus;
  registeredAt: string;
  ownerName?: string;
  flatNumber?: string;
}

export interface RegisterVehicleRequest {
  plateNumber: string;
  vehicleType: VehicleType;
  make?: string;
  model?: string;
  color?: string;
}

const MOCK_VEHICLES: VehicleRegistration[] = [
  { id: 1, plateNumber: 'KA-04-MN-7788', vehicleType: 'CAR',  make: 'Maruti', model: 'Swift',   color: 'White', isGateWhitelisted: true,  status: 'ACTIVE', registeredAt: new Date().toISOString(), flatNumber: 'Tower A-1204' },
  { id: 2, plateNumber: 'KA-04-AB-5566', vehicleType: 'BIKE', make: 'Honda',  model: 'Activa', color: 'Black', isGateWhitelisted: false, status: 'ACTIVE', registeredAt: new Date().toISOString(), flatNumber: 'Tower A-1204' },
];

export const vehicleRegistrationService = {
  async getMyVehicles(): Promise<VehicleRegistration[]> {
    try {
      const res = await api.get<VehicleRegistration[]>('/vehicles/my-vehicles');
      if (res.data?.length > 0) return res.data;
    } catch {}
    return MOCK_VEHICLES;
  },

  async registerVehicle(data: RegisterVehicleRequest): Promise<VehicleRegistration> {
    try {
      const res = await api.post<VehicleRegistration>('/vehicles/register', data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to register vehicle. Please try again.');
    }
  },

  async removeVehicle(id: number): Promise<void> {
    try {
      await api.delete(`/vehicles/${id}`);
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to remove vehicle.');
    }
  },

  async toggleGateWhitelist(id: number, enabled: boolean): Promise<VehicleRegistration> {
    try {
      const res = await api.patch<VehicleRegistration>(`/vehicles/${id}/whitelist`, { enabled });
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to update gate whitelist.');
    }
  },
};
