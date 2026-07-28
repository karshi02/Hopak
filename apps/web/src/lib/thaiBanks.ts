export interface ThaiBank {
  code: string;
  name: string;
  logo: string;
}

// โลโก้จริงจาก https://github.com/casperstack/thai-banks-logo (เก็บไฟล์ไว้ที่ public/bank-icons/)
export const THAI_BANKS: ThaiBank[] = [
  { code: 'BBL', name: 'กรุงเทพ', logo: '/bank-icons/BBL.png' },
  { code: 'KBANK', name: 'กสิกรไทย', logo: '/bank-icons/KBANK.png' },
  { code: 'KTB', name: 'กรุงไทย', logo: '/bank-icons/KTB.png' },
  { code: 'SCB', name: 'ไทยพาณิชย์', logo: '/bank-icons/SCB.png' },
  { code: 'BAY', name: 'กรุงศรีอยุธยา', logo: '/bank-icons/BAY.png' },
  { code: 'TTB', name: 'ทีเอ็มบีธนชาต', logo: '/bank-icons/TTB.png' },
  { code: 'KKP', name: 'เกียรตินาคิน', logo: '/bank-icons/KKP.png' },
  { code: 'CIMB', name: 'ซีไอเอ็มบี', logo: '/bank-icons/CIMB.png' },
  { code: 'TISCO', name: 'ทิสโก้', logo: '/bank-icons/TISCO.png' },
  { code: 'UOB', name: 'ยูโอบี', logo: '/bank-icons/UOB.png' },
  { code: 'TCRB', name: 'ไทยเครดิต', logo: '/bank-icons/TCRB.png' },
  { code: 'LHB', name: 'แลนด์ แอนด์ เฮ้าส์', logo: '/bank-icons/LHB.png' },
  { code: 'GSB', name: 'ออมสิน', logo: '/bank-icons/GSB.png' },
  { code: 'GHB', name: 'ธ.อ.ส.', logo: '/bank-icons/GHB.png' },
  { code: 'BAAC', name: 'ธ.ก.ส.', logo: '/bank-icons/BAAC.png' },
  { code: 'IBANK', name: 'อิสลามแห่งประเทศไทย', logo: '/bank-icons/IBANK.png' },
  { code: 'CITI', name: 'ซิตี้แบงก์', logo: '/bank-icons/CITI.png' },
  { code: 'HSBC', name: 'เอชเอสบีซี', logo: '/bank-icons/HSBC.png' },
  { code: 'ICBC', name: 'ไอซีบีซี', logo: '/bank-icons/ICBC.png' },
];
