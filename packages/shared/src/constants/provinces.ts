export const PROVINCES = ['มหาสารคาม', 'ขอนแก่น', 'เชียงใหม่'] as const;

export type Province = (typeof PROVINCES)[number];
