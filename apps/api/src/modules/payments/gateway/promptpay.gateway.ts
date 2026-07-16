import { Injectable } from '@nestjs/common';
import { PaymentGateway } from './payment-gateway.interface';

@Injectable()
export class PromptPayGateway implements PaymentGateway {
  async charge(amount: number, _method: string) {
    return { success: true, ref: `promptpay_${Date.now()}_${amount}` };
  }
}
