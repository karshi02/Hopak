export const UNIVERSITIES = ['มหาวิทยาลัยมหาสารคาม'] as const;

export type University = (typeof UNIVERSITIES)[number];
