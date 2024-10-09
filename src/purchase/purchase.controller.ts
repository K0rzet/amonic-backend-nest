import { Body, Controller, Param, ParseIntPipe, Put } from '@nestjs/common';
import { PurchaseService } from './purchase.service';

@Controller('purchase')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Put(':ticketId/amenities')
  async updateAmenities(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Body('selectedAmenities') selectedAmenities: number[],
  ) {

    const result = await this.purchaseService.updateAmenities(ticketId, selectedAmenities);

    return result;
  }
}
