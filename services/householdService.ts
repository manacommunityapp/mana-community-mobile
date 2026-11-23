import api from './apiClient';
import { profileService } from './profileService';
import { familyService, FamilyMember, AddFamilyMemberRequest } from './familyService';
import {
  vehicleRegistrationService,
  VehicleRegistration,
  RegisterVehicleRequest,
} from './vehicleRegistrationService';
import type { UserProfileResponse } from '@/types/api';

export interface HouseholdUnit {
  unitNumber: string;
  block?: string;
  ownershipType: 'OWNER' | 'TENANT' | 'UNKNOWN';
  residentName: string;
  phone?: string;
  email?: string;
}

export interface HouseholdSnapshot {
  unit: HouseholdUnit;
  members: FamilyMember[];
  vehicles: VehicleRegistration[];
}

function extractUnit(profile: UserProfileResponse): HouseholdUnit {
  return {
    unitNumber: (profile as any).flatNumber || (profile as any).unitNumber || '—',
    block: (profile as any).tower || (profile as any).block,
    ownershipType:
      (profile as any).ownershipType === 'TENANT'
        ? 'TENANT'
        : (profile as any).ownershipType === 'OWNER'
          ? 'OWNER'
          : 'UNKNOWN',
    residentName: profile.fullName ?? profile.name ?? '',
    phone: (profile as any).mobile || (profile as any).phone,
    email: profile.email,
  };
}

export const householdService = {
  async getSnapshot(): Promise<HouseholdSnapshot> {
    const [profile, members, vehicles] = await Promise.allSettled([
      profileService.getProfile(),
      familyService.getMyFamily(),
      vehicleRegistrationService.getMyVehicles(),
    ]);
    return {
      unit: extractUnit(
        profile.status === 'fulfilled' ? profile.value : ({} as UserProfileResponse),
      ),
      members: members.status === 'fulfilled' ? members.value : [],
      vehicles: vehicles.status === 'fulfilled' ? vehicles.value : [],
    };
  },

  addMember: (data: AddFamilyMemberRequest) => familyService.addFamilyMember(data),
  removeMember: (id: number) => familyService.removeFamilyMember(id),
  addVehicle: (data: RegisterVehicleRequest) => vehicleRegistrationService.registerVehicle(data),
  removeVehicle: (id: number) => vehicleRegistrationService.removeVehicle(id),
};
