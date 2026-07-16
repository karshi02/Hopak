import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
export class RealtimeGateway {
  @WebSocketServer()
  server!: Server;

  emitNewBookingRequest(ownerId: string, booking: unknown) {
    this.server.to(`owner:${ownerId}`).emit('booking:new', booking);
  }
}
