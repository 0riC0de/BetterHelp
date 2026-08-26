export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return phone;
  return `+${digits.match(/.{1,3}/g)?.join(" ") ?? digits}`;
}
