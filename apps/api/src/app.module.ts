import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DormsModule } from './modules/dorms/dorms.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AdminModule } from './modules/admin/admin.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { SettingsModule } from './modules/settings/settings.module';
import { LandmarksModule } from './modules/landmarks/landmarks.module';
import { OwnerApplicationsModule } from './modules/owner-applications/owner-applications.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    DormsModule,
    RoomsModule,
    BookingsModule,
    PaymentsModule,
    DocumentsModule,
    NotificationsModule,
    RealtimeModule,
    PromotionsModule,
    UploadsModule,
    AdminModule,
    ReviewsModule,
    FavoritesModule,
    SettingsModule,
    LandmarksModule,
    OwnerApplicationsModule,
  ],
})
export class AppModule {}
