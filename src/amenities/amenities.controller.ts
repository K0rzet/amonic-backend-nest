import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { AmenitiesService } from './amenities.service';

@Controller('amenities')
export class AmenitiesController {
  constructor(private readonly amenitiesService: AmenitiesService) {}

  @Get(':ticketId')
  async getAvailableAmenities(@Param('ticketId', ParseIntPipe) ticketId: number) {
    const amenities = await this.amenitiesService.getAvailableAmenities(ticketId);

    if (!amenities) {
      throw new NotFoundException('Ticket not found.');
    }

    return amenities;
  }
}
