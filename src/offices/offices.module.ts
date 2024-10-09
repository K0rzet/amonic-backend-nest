import { Module } from '@nestjs/common';
import { OfficesService } from './offices.service';
import { OfficesController } from './offices.controller';
import { PrismaService } from '@/prisma.service';
import { RoleService } from '@/role/role.service';

@Module({
  controllers: [OfficesController],
  providers: [OfficesService, PrismaService, RoleService],
})
export class OfficesModule {}
