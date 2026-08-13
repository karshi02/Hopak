import { Logger, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma.service';

// ต้องตรงกับ JwtStrategy — session ที่ไม่ได้ใช้งานเกิน 30 นาทีถือว่าหมดอายุ
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

// ตรวจซ้ำ socket ที่เชื่อมค้างอยู่ทุก 1 นาที — WebSocket เปิดยาว ถ้าตรวจแค่ตอนเชื่อมต่อ
// คนที่ logout / โดนระงับ / โดนลดสิทธิ์ จะยังค้างอยู่ในห้อง role:admin และรับ PII ต่อได้เรื่อยๆ
const REVALIDATE_INTERVAL_MS = 60 * 1000;

@WebSocketGateway({ cors: true })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer()
  server!: Server;

  private logger = new Logger(RealtimeGateway.name);
  // socket ที่ผ่านการตรวจแล้ว เก็บ token ไว้ตรวจซ้ำเป็นระยะ
  private connections = new Map<string, { token: string; userId: string; role: string }>();
  private revalidateTimer?: ReturnType<typeof setInterval>;

  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {
    this.revalidateTimer = setInterval(() => void this.revalidateAll(), REVALIDATE_INTERVAL_MS);
    this.revalidateTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.revalidateTimer) clearInterval(this.revalidateTimer);
  }

  /**
   * ตรวจ token แบบเดียวกับ HTTP (JwtStrategy) ไม่ใช่แค่ verify ลายเซ็น
   * เพราะ event ที่ส่งเข้าห้อง role:admin มี PII ผู้เช่า (ชื่อ/เบอร์/ยอดเงิน)
   * คืน { userId, role } เมื่อใช้ได้ · โยน error เมื่อใช้ไม่ได้
   */
  private async validateToken(token: string | undefined): Promise<{ userId: string; role: string }> {
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

    return { userId: user.id, role };
  }

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    try {
      const { userId, role } = await this.validateToken(token);
      client.join(`user:${userId}`);
      client.join(`role:${role}`);
      this.connections.set(client.id, { token: token!, userId, role });
    } catch {
      this.logger.warn(`Socket ${client.id} ปฏิเสธการเชื่อมต่อ (token/เซสชันใช้ไม่ได้)`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connections.delete(client.id);
  }

  /**
   * ตรวจ socket ที่ยังเชื่อมอยู่ซ้ำ — ตัดทิ้งทันทีเมื่อ session โดน revoke, บัญชีโดนระงับ,
   * หรือบทบาทเปลี่ยน (เช่น ถูกถอดสิทธิ์แอดมิน) ไม่ต้องรอ JWT หมดอายุ
   */
  private async revalidateAll() {
    for (const [socketId, info] of this.connections) {
      const socket = this.server?.sockets?.sockets?.get(socketId);
      if (!socket) {
        this.connections.delete(socketId);
        continue;
      }
      try {
        const { role } = await this.validateToken(info.token);
        if (role !== info.role) throw new Error('role changed');
      } catch {
        this.logger.warn(`Socket ${socketId} ถูกตัด (เซสชัน/สิทธิ์เปลี่ยนหลังเชื่อมต่อ)`);
        this.connections.delete(socketId);
        socket.disconnect(true);
      }
    }
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  emitToRole(role: string, event: string, payload: unknown) {
    this.server.to(`role:${role}`).emit(event, payload);
  }
}
