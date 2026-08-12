import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma.service';

// ต้องตรงกับ JwtStrategy — session ที่ไม่ได้ใช้งานเกิน 30 นาทีถือว่าหมดอายุ
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

@WebSocketGateway({ cors: true })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private logger = new Logger(RealtimeGateway.name);

  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  /**
   * ตรวจ token แบบเดียวกับ HTTP (JwtStrategy) ไม่ใช่แค่ verify ลายเซ็น
   * เพราะ event ที่ส่งเข้าห้อง role:admin มี PII ผู้เช่า (ชื่อ/เบอร์/ยอดเงิน)
   * ถ้าเชื่อแค่ลายเซ็น token ของแอดมินที่ถูก logout/ลดสิทธิ์/ระงับ จะ reconnect มาดักฟังต่อได้จนกว่า JWT หมดอายุ
   */
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new Error('no token');
      const payload = this.jwt.verify(token) as { sub: string; role?: string; jti?: string };

      // 1) session ต้องยังไม่ถูก revoke และไม่ idle เกินกำหนด
      if (payload.jti) {
        const session = await this.prisma.session.findUnique({ where: { jti: payload.jti } });
        if (!session || session.revokedAt) throw new Error('session revoked');
        if (Date.now() - session.lastSeenAt.getTime() > IDLE_TIMEOUT_MS) throw new Error('session idle');
      }

      // 2) บทบาทต้องเอาจาก DB ปัจจุบัน ไม่ใช่ claim ใน token (โดนลดสิทธิ์แล้ว token เก่ายังอ้าง role เดิมได้)
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, suspended: true },
      });
      if (!user || user.suspended) throw new Error('user unavailable');

      const role = user.role.toLowerCase();
      // 3) แอดมินต้องมีแถว Admin จริง (สอดคล้องกับ JwtStrategy)
      if (role === 'admin') {
        const admin = await this.prisma.admin.findUnique({ where: { userId: user.id }, select: { userId: true } });
        if (!admin) throw new Error('admin record missing');
      }

      client.join(`user:${user.id}`);
      client.join(`role:${role}`);
    } catch {
      this.logger.warn(`Socket ${client.id} ปฏิเสธการเชื่อมต่อ (token/เซสชันใช้ไม่ได้)`);
      client.disconnect();
    }
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  emitToRole(role: string, event: string, payload: unknown) {
    this.server.to(`role:${role}`).emit(event, payload);
  }
}
