import { PrismaService } from '@/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  async getAmenitiesReport(filter: { startDate?: Date; endDate?: Date; flightNumber?: string; flightDate?: Date }) {
    const { startDate, endDate, flightNumber, flightDate } = filter;

    let scheduleQuery = {};

    if (startDate && endDate) {
      scheduleQuery = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };
    } else if (flightNumber && flightDate) {
      scheduleQuery = {
        flightnumber: flightNumber,
        date: flightDate,
      };
    }

    const amenitiesReport = await this.prisma.amenities.findMany({
      select: {
        id: true,
        service: true,
        amenitiestickets: {
          where: {
            tickets: {
              schedules: scheduleQuery,
            },
          },
        },
      },
    });

    return amenitiesReport.map((amenity) => ({
      service: amenity.service,
      count: amenity.amenitiestickets.length,
    }));
  }
}
