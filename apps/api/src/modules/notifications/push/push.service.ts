import { Injectable } from '@nestjs/common';

@Injectable()
export class PushService {
  async send(expoPushToken: string, title: string, body: string) {
    return fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ to: expoPushToken, title, body }),
    });
  }
}
