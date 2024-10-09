import { PrismaService } from "@/prisma.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class PurchaseService {
  constructor(private prisma: PrismaService) {}

  async updateAmenities(ticketId: number, selectedAmenities: number[]) {


    await this.prisma.amenitiestickets.deleteMany({
      where: { ticketid: ticketId },
    });

    const newAmenities = selectedAmenities.map(amenityId => ({
      ticketid: ticketId,
      amenityid: amenityId,
      price: 0,
    }));

    await this.prisma.amenitiestickets.createMany({ data: newAmenities });

    const totalPrice = await this.prisma.amenities
      .findMany({
        where: { id: { in: selectedAmenities } },
        select: { price: true },
      })
      .then(amenities => amenities.reduce((sum, a) => sum + parseFloat(a.price.toString()), 0));

    const totalWithTax = totalPrice * 1.05;

    return { totalPrice, totalWithTax };
  }
}
