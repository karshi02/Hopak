import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentsService } from './payments.service';

@Injectable()
export class PaymentsCron {
  constructor(private paymentsService: PaymentsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleMidnightSettlement() {
    await this.paymentsService.settleDuePayments();
  }
}
