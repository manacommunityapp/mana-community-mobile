import api from './apiClient';
import { secureLog } from '@/security';

export interface PetDto {
  id: number;
  name: string;
  type: 'DOG' | 'CAT' | 'BIRD' | 'OTHER';
  breed: string;
  ownerName: string;
  ownerFlat: string;
  vaccinated: boolean;
  age: string;
  avatarUrl?: string;
  microchipId?: string;
}

export interface PetServiceDto {
  id: number;
  name: string;
  type: string;
  provider: string;
  flat: string;
  price: string;
  rating: number;
  phone?: string;
}

export interface LostFoundPetDto {
  id: number;
  title: string;
  petName: string;
  type: 'LOST' | 'FOUND';
  description: string;
  contactName: string;
  contactPhone: string;
  date: string;
  status: 'OPEN' | 'RESOLVED';
  lastSeenLocation?: string;
  lastSeenTime?: string;
}

export interface RegisterPetRequest {
  name: string;
  type: 'DOG' | 'CAT' | 'BIRD' | 'OTHER';
  breed: string;
  ownerName: string;
  ownerFlat: string;
  vaccinated: boolean;
  age: string;
}

const FALLBACK_PETS: PetDto[] = [
  { id: 1, name: 'Bruno', type: 'DOG', breed: 'Golden Retriever', ownerName: 'Sanjay R.', ownerFlat: 'A1-302', vaccinated: true, age: '3 years' },
  { id: 2, name: 'Whiskers', type: 'CAT', breed: 'Persian', ownerName: 'Priya M.', ownerFlat: 'B2-105', vaccinated: true, age: '2 years' },
  { id: 3, name: 'Buddy', type: 'DOG', breed: 'Labrador', ownerName: 'Amit K.', ownerFlat: 'C1-401', vaccinated: true, age: '5 years' },
  { id: 4, name: 'Coco', type: 'DOG', breed: 'Shih Tzu', ownerName: 'Neetha S.', ownerFlat: 'A2-201', vaccinated: false, age: '1 year' },
  { id: 5, name: 'Kiki', type: 'BIRD', breed: 'Cockatiel', ownerName: 'Rahul V.', ownerFlat: 'B1-304', vaccinated: true, age: '6 months' },
];

const FALLBACK_SERVICES: PetServiceDto[] = [
  { id: 1, name: 'Dog Walking & Exercise', type: 'Walking', provider: 'Suresh K.', flat: 'A3-GF', price: '₹200/walk', rating: 4.8 },
  { id: 2, name: 'Pet Grooming & Spa', type: 'Grooming', provider: 'PetCare Studio', flat: 'C2-102', price: '₹500-800', rating: 4.6 },
  { id: 3, name: 'Vet On-Call Clinic', type: 'Vet', provider: 'Dr. Meena', flat: 'B3-201', price: '₹300/visit', rating: 4.9 },
  { id: 4, name: 'Pet Sitting & Daycare', type: 'Sitting', provider: 'Deepa M.', flat: 'A1-105', price: '₹400/day', rating: 4.5 },
];

const FALLBACK_LOST_FOUND: LostFoundPetDto[] = [
  { id: 1, title: 'Lost Beagle near Block C Park', petName: 'Leo', type: 'LOST', description: 'Wearing red collar with bell. Last seen near Club House lawn.', contactName: 'Rajesh K.', contactPhone: '+91 98765 43210', date: 'Today, 8:30 AM', status: 'OPEN' },
];

export const petService = {
  async getPets(): Promise<PetDto[]> {
    try {
      const res = await api.get<PetDto[]>('/pets');
      return res.data && res.data.length > 0 ? res.data : FALLBACK_PETS;
    } catch (err) {
      secureLog.warn('PetService: Live /pets unavailable, using fallback', err);
      return FALLBACK_PETS;
    }
  },

  async registerPet(data: RegisterPetRequest): Promise<PetDto> {
    try {
      const res = await api.post<PetDto>('/pets', data);
      return res.data;
    } catch (err) {
      secureLog.warn('PetService: /pets post failed, using local registration', err);
      return {
        id: Date.now(),
        ...data,
      };
    }
  },

  async getPetServices(): Promise<PetServiceDto[]> {
    try {
      const res = await api.get<PetServiceDto[]>('/pets/services');
      return res.data && res.data.length > 0 ? res.data : FALLBACK_SERVICES;
    } catch (err) {
      secureLog.warn('PetService: Live /pets/services unavailable, using fallback', err);
      return FALLBACK_SERVICES;
    }
  },

  async getLostAndFound(): Promise<LostFoundPetDto[]> {
    try {
      const res = await api.get<LostFoundPetDto[]>('/pets/lost-found');
      return res.data && res.data.length > 0 ? res.data : FALLBACK_LOST_FOUND;
    } catch (err) {
      secureLog.warn('PetService: Live /pets/lost-found unavailable, using fallback', err);
      return FALLBACK_LOST_FOUND;
    }
  },

  async getLostFound(): Promise<LostFoundPetDto[]> {
    return this.getLostAndFound();
  },
};
