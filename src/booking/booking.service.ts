import { PrismaService } from '@/prisma.service'
import { UserService } from '@/user/user.service'
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'

@Injectable()
export class BookingService {
	constructor(
		private prisma: PrismaService,
		private userService: UserService
	) {}

	async getBookingDetails(bookingReference: string) {
		const tickets = await this.prisma.tickets.findMany({
			where: {
				bookingreference: bookingReference,
				confirmed: true,
				schedules: {
					date: {
						gte: new Date(Date.now() + 24 * 60 * 60 * 1000)
					}
				}
			},
			include: {
				schedules: {
					include: {
						routes: {
							include: {
								airports_routes_departureairportidToairports: true,
								airports_routes_arrivalairportidToairports: true
							}
						}
					}
				}
			}
		})

		return tickets.map(ticket => ({
			ticketId: ticket.id,
			flightNumber: ticket.schedules.flightnumber,
			flightDate: ticket.schedules.date,
			departure:
				ticket.schedules.routes.airports_routes_departureairportidToairports
					.name,
			arrival:
				ticket.schedules.routes.airports_routes_arrivalairportidToairports.name
		}))
	}

	async confirmPayment(bookingData: {
		passengers: Array<{
			firstname: string
			lastname: string
			email: string
			phone: string
			passportnumber: string
			passportcountry: string
			cabintypeid: number
			flightNumbers: string
			date: string
		}>
		paymentMethod: 'credit_card' | 'cash' | 'voucher'
	}) {
		const bookingReference = await this.generateUniqueBookingReference()

		const tickets = []

		for (const passenger of bookingData.passengers) {
			const flightNumbers = passenger.flightNumbers.split('-')
			for (const flightNumber of flightNumbers) {
				const schedule = await this.getScheduleByFlightNumberAndDate(flightNumber, passenger.date)
				if (!schedule) {
					throw new NotFoundException(`Schedule not found for flight ${flightNumber} on ${passenger.date}`)
				}

				tickets.push({
					scheduleid: schedule.id,
					cabintypeid: passenger.cabintypeid,
					firstname: this.truncate(passenger.firstname, 50),
					lastname: this.truncate(passenger.lastname, 50),
					email: this.truncate(passenger.email, 150),
					phone: this.truncate(passenger.phone, 14),
					userid: (await this.userService.getUserByEmail(passenger.email)).id,
					passportnumber: this.truncate(passenger.passportnumber, 9),
					passportcountryid: await this.getPassportCountryId(passenger.passportcountry),
					bookingreference: bookingReference,
					confirmed: true
				})
			}
		}

		const createdTickets = await this.prisma.tickets.createMany({
			data: tickets
		})

		const totalPrice = await this.calculateTotalPrice(bookingReference)

		return {
			bookingReference,
			totalPrice,
			ticketsIssued: createdTickets.count
		}
	}

	private async getScheduleByFlightNumberAndDate(flightNumber: string, date: string) {
		return await this.prisma.schedules.findFirst({
			where: {
				flightnumber: flightNumber,
				date: new Date(date)
			}
		})
	}

	private async generateUniqueBookingReference(): Promise<string> {
		let attempts = 0
		const maxAttempts = 10

		while (attempts < maxAttempts) {
			const reference = this.generateBookingReference()
			const existingBooking = await this.prisma.tickets.findFirst({
				where: { bookingreference: reference }
			})

			if (!existingBooking) {
				return reference
			}

			attempts++
		}

		throw new ConflictException('Unable to generate a unique booking reference')
	}

	private generateBookingReference(): string {
		const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
		let result = ''
		for (let i = 0; i < 6; i++) {
			result += characters.charAt(Math.floor(Math.random() * characters.length))
		}
		return result
	}

	private async calculateTotalPrice(bookingReference: string): Promise<number> {
		const tickets = await this.prisma.tickets.findMany({
			where: { bookingreference: bookingReference },
			include: {
				schedules: true,
				cabintypes: true,
				amenitiestickets: {
					include: { amenities: true }
				}
			}
		})

		return tickets.reduce((total, ticket) => {
			const basePrice = ticket.schedules.economyprice.toNumber()
			const cabinTypeMultiplier =
				ticket.cabintypes.name === 'Economy'
					? 1
					: ticket.cabintypes.name === 'Business'
						? 1.35
						: 1.75
			const amenitiesPrice = ticket.amenitiestickets.reduce(
				(sum, at) => sum + at.amenities.price.toNumber(),
				0
			)
			return total + basePrice * cabinTypeMultiplier + amenitiesPrice
		}, 0)
	}

	private async getPassportCountryId(passportcountry: string) {
		const country = await this.prisma.countries.findFirst({
			where: {
				name: passportcountry
			}
		})
		return country?.id || 0
	}

	private truncate(value: string, maxLength: number): string {
		return value.slice(0, maxLength);
	}
}
