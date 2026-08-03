export type DormStatus = 'pending_approval' | 'approved' | 'rejected' | 'suspended';
export type RoomType = 'air' | 'fan';
export type RoomStatus = 'available' | 'occupied';

export interface Dorm {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  address?: string | null;
  province: string;
  university?: string;
  lat: number;
  lng: number;
  waterRate: number;
  electricRate: number;
  deposit: number;
  amenities: string[];
  images: string[];
  documents?: string[];
  status: DormStatus;
  rejectionReason?: string | null;
  rejectionCount?: number;
  avgRating?: number | null;
  reviewCount?: number;
  autoApproveRooms?: boolean;
  owner?: { name: string };
}

export interface Review {
  id: string;
  dormId: string;
  tenantId: string;
  rating: number;
  comment?: string | null;
  reply?: string | null;
  repliedAt?: string | null;
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
  pricePerDay?: number; // ราคาต่อคืน (ใช้เมื่อ allowDaily = true)
  allowDaily?: boolean; // ห้องนี้เปิดให้เช่ารายวันหรือไม่
  status: RoomStatus;
  name?: string | null;
  description?: string | null;
  deposit?: number;
  waterRate?: number;
  electricRate?: number;
  amenities?: string[];
  images?: string[];
  approved?: boolean;
}
