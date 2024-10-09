import { Module } from '@nestjs/common';
import { AirportsService } from './airports.service';
import { AirportsController } from './airports.controller';
import { RoleService } from '@/role/role.service';
import { PrismaService } from '@/prisma.service';

@Module({
  controllers: [AirportsController],
  providers: [AirportsService, RoleService, PrismaService],
})
export class AirportsModule {}
