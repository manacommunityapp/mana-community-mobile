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

export const vehicleRegistrationService = {
  async getMyVehicles(): Promise<VehicleRegistration[]> {
    try {
      const res = await api.get<VehicleRegistration[]>('/vehicles/my-vehicles');
      return res.data ?? [];
    } catch {
      return [];
    }
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
