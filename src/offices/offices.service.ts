import { PrismaService } from '@/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class OfficesService {
    constructor(private readonly prisma: PrismaService) {}

    async getAllOffices() {
        return await this.prisma.offices.findMany()
    }
}
