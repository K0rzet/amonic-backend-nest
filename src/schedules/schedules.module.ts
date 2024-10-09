import { Module } from '@nestjs/common'
import { SchedulesService } from './schedules.service'
import { SchedulesController } from './schedules.controller'
import { PrismaService } from '@/prisma.service'
import { RoleService } from '@/role/role.service'
import { CsvUploadService } from './csv-upload.sevice'
import { CsvUploadController } from './csv-upload.controller'

@Module({
	controllers: [SchedulesController, CsvUploadController],
	providers: [SchedulesService, PrismaService, RoleService, CsvUploadService]
})
export class SchedulesModule {}
