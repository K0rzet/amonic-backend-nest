import { PrismaService } from '@/prisma.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class AmenitiesService {
	constructor(private prisma: PrismaService) {}

	async getAvailableAmenities(ticketId: number) {
		const ticket = await this.prisma.tickets.findUnique({
			where: { id: ticketId },
			include: {
				cabintypes: {
					include: {
						amenitiescabintype: {
							include: {
								amenities: true
							}
						}
					}
				},
				amenitiestickets: {
					include: {
						amenities: true
					}
				}
			}
		})

		const allAmenities = await this.prisma.amenities.findMany()
		const selectedAmenities = ticket.amenitiestickets.map(at => at.amenityid)
		const includedAmenities = ticket.cabintypes.amenitiescabintype.map(act => act.amenities)
		const includedAmenityIds = includedAmenities.map(a => a.id)

		return {
			passenger: {
				firstname: ticket.firstname,
				lastname: ticket.lastname,
				passport: ticket.passportnumber,
				cabinType: ticket.cabintypes.name
			},
			amenities: allAmenities
				.filter(amenity => !includedAmenityIds.includes(amenity.id))
				.map(amenity => ({
					...amenity,
					selected: selectedAmenities.includes(amenity.id)
				})),
			includedAmenities: includedAmenities
		}
	}
}
