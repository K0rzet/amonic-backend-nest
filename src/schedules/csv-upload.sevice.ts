import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma.service';
import { parse } from 'csv-parse/sync';

interface CsvRow {
  action: 'ADD' | 'EDIT';
  departureDate: string;
  departureTime: string;
  flightNumber: string;
  departureIataCode: string;
  arrivalIataCode: string;
  aircraftid: string; // Change this to string
  economyPrice: string;
  status: 'OK' | 'CANCELLED';
}

@Injectable()
export class CsvUploadService {
  constructor(private prisma: PrismaService) {}

  async processCsvFile(fileBuffer: Buffer) {
    let rawRecords;
    try {
      rawRecords = parse(fileBuffer, {
        skip_empty_lines: true,
        relax_column_count: true, // Позволяет обрабатывать строки с неправильным количеством полей
      }) as string[][];
    } catch (error) {
      throw new BadRequestException('Invalid CSV format');
    }

    const headers = ['action', 'departureDate', 'departureTime', 'flightNumber', 'departureIataCode', 'arrivalIataCode', 'aircraftid', 'economyPrice', 'status'];
    
    const records = rawRecords.map(row => {
      const record = {} as CsvRow;
      headers.forEach((header, index) => {
        record[header] = row[index] || ''; // Используем пустую строку для отсутствующих полей
      });
      return record;
    });

    console.log(records)

    const results = [];
    const response = {
      successful: 0,
      duplicates: 0,
      missing: 0,
      errors: 0
    };

    for (const record of records) {
      try {
        await this.validateAndProcessRecord(record);
        results.push({ success: true, record });
        response.successful++;
      } catch (error) {
        results.push({ success: false, record, error: error.message });
        if (error instanceof ConflictException) {
          response.duplicates++;
        } else if (error instanceof BadRequestException) {
          // Теперь все BadRequestException считаются как missing
          response.missing++;
        } else {
          response.errors++;
        }
      }
    }

    return { results, response };
  }

  private async validateAndProcessRecord(record: CsvRow) {
    this.validateRecord(record);

    const { action, departureDate, departureTime, flightNumber, ...rest } = record;

    const combinedDateTime = new Date(`${departureDate}T${departureTime}`);
    console.log(combinedDateTime)

    const existingSchedule = await this.prisma.schedules.findFirst({
      where: {
        date: combinedDateTime,
        flightnumber: flightNumber,
      },
    });

    if (action === 'ADD' && existingSchedule) {
      throw new ConflictException('Schedule with this date and flight number already exists');
    }

    if (action === 'EDIT' && !existingSchedule) {
      throw new BadRequestException('Schedule not found for editing');
    }

    const data = {
      date: combinedDateTime,
      time: combinedDateTime,
      flightnumber: flightNumber,
      economyprice: parseFloat(rest.economyPrice),
      confirmed: rest.status === 'OK',
      aircraftid: parseInt(rest.aircraftid, 10), // Convert to integer
      routeid: await this.getRouteId(rest.departureIataCode, rest.arrivalIataCode),
    };

    if (action === 'ADD') {
      await this.prisma.schedules.create({ data });
    } else {
      await this.prisma.schedules.update({
        where: { id: existingSchedule.id },
        data,
      });
    }
  }

  private validateRecord(record: CsvRow) {
    const requiredFields = [
      'action', 'departureDate', 'departureTime', 'flightNumber',
      'departureIataCode', 'arrivalIataCode', 'aircraftid', 'economyPrice', 'status'
    ];

    for (const field of requiredFields) {
      if (!record[field]) {
        throw new BadRequestException(`Missing required field: ${field}`);
      }
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(record.departureDate)) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(record.departureTime)) {
      throw new BadRequestException('Invalid time format. Use HH:MM (24-hour format)');
    }
    for (const field of requiredFields) {
      if (!record[field]) {
        throw new BadRequestException(`Missing required field: ${field}`);
      }
    }

    if (!['ADD', 'EDIT'].includes(record.action)) {
      throw new BadRequestException('Invalid action');
    }

    if (!['OK', 'CANCELED'].includes(record.status)) {
      throw new BadRequestException('Invalid status');
    }

    if (isNaN(parseInt(record.aircraftid, 10))) {
      throw new BadRequestException('Invalid aircraftid: must be a number');
    }
  }

  private async getRouteId(departureIataCode: string, arrivalIataCode: string): Promise<number> {
    const route = await this.prisma.routes.findFirst({
      where: {
        airports_routes_departureairportidToairports: { iatacode: departureIataCode },
        airports_routes_arrivalairportidToairports: { iatacode: arrivalIataCode },
      },
    });
    if (!route) {
      throw new BadRequestException(`Route not found: ${departureIataCode} to ${arrivalIataCode}`);
    }
    return route.id;
  }
}
