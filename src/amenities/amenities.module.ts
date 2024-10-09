import { Module } from '@nestjs/common';
import { AmenitiesService } from './amenities.service';
import { AmenitiesController } from './amenities.controller';
import { PrismaService } from '@/prisma.service';

@Module({
  controllers: [AmenitiesController],
  providers: [AmenitiesService, PrismaService],
})
export class AmenitiesModule {}
