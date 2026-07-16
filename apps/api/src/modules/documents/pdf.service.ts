import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

@Injectable()
export class PdfService {
  private render(templateName: string, data: Record<string, unknown>): string {
    const file = fs.readFileSync(path.join(__dirname, 'templates', templateName), 'utf-8');
    return Handlebars.compile(file)(data);
  }

  renderBookingSlip(data: Record<string, unknown>): string {
    return this.render('booking-slip.hbs', data);
  }

  renderReceipt(data: Record<string, unknown>): string {
    return this.render('receipt.hbs', data);
  }
}
