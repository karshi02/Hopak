export type DormStatus = 'pending_approval' | 'approved' | 'rejected' | 'suspended';
export type RoomType = 'air' | 'fan';
export type RoomStatus = 'available' | 'occupied';

export interface Dorm {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  province: string;
  university?: string;
  lat: number;
  lng: number;
  waterRate: number;
  electricRate: number;
  deposit: number;
  amenities: string[];
  images: string[];
  status: DormStatus;
}

export interface Room {
  id: string;
  dormId: string;
  type: RoomType;
  pricePerMonth: number;
  status: RoomStatus;
}
