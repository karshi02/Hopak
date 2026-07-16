export interface PaymentGateway {
  charge(amount: number, method: string): Promise<{ success: boolean; ref: string }>;
}
