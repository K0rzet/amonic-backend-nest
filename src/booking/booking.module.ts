import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { PrismaService } from '@/prisma.service';
import { RoleService } from '@/role/role.service';
import { UserService } from '@/user/user.service';

@Module({
  controllers: [BookingController],
  providers: [BookingService, PrismaService, RoleService, UserService],
})
export class BookingModule {}
