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
  avgRating?: number | null;
  reviewCount?: number;
}

export interface Review {
  id: string;
  dormId: string;
  tenantId: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  tenant?: { name: string; avatarUrl?: string | null };
}

export interface Campaign {
  id: string;
  dormId: string;
  kind: 'boost' | 'banner' | 'featured';
  startAt: string;
  endAt: string;
  price: number;
  dorm?: Dorm;
}

export interface Room {
  id: string;
  dormId: string;
  type: RoomType;
  pricePerMonth: number;
  status: RoomStatus;
}
