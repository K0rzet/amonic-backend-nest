import { PrismaService } from '@/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AirportsService {
    constructor(private readonly prisma: PrismaService) {}

    async getAllAirports() {
        return await this.prisma.airports.findMany()
    }
    async getAllCountries() {
        return await this.prisma.countries.findMany()
    }
}
