export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return phone;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-**-*`;
}

//make down  =+ (positions "i = 0 ")
 // i  = (reposistions "i = 0 ")
  //poera - make
  
  //  const digits = phone.replace(/\D/g, '');
//  if (digits.length < 10) return phone;
//rol  =   return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-**-*`;