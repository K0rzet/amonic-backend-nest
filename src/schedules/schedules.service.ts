import {
	ConflictException,
	Injectable,
	NotFoundException
} from '@nestjs/common'
import { PrismaService } from '@/prisma.service'
import { CreateScheduleDto } from './dto/create-schedule.dto'
import { Prisma } from '@prisma/client'

@Injectable()
export class SchedulesService {
	constructor(private prisma: PrismaService) {}

	async searchSchedules(
		id?: number,
		departureAirportCode?: string,
		arrivalAirportCode?: string,
		flightDate?: string,
		returnFlightDate?: string,
		ticketClass: 'economy' | 'business' | 'first' = 'economy',
		flexibleDates: string = 'false',
		flexibleReturnDates: string = 'false',
		flightNumber?: string,
		sortBy: 'date' | 'economyprice' | 'confirmed' | 'undefined' = 'date',
		maxConnections: number = 1
	) {
		if (
			departureAirportCode &&
			departureAirportCode.length !== 0 &&
			departureAirportCode !== 'undefined' &&
			arrivalAirportCode &&
			arrivalAirportCode.length !== 0 &&
			arrivalAirportCode !== 'undefined' &&
			departureAirportCode === arrivalAirportCode
		) {
			throw new ConflictException(
				'Departure and arrival airports cannot be the same'
			)
		}

		let where: any = {}
		if (flightNumber !== 'undefined' && flightNumber ) {
			where.flightnumber = flightNumber
		}
		if (id && String(id) !== 'undefined' && id !== undefined) {
			where.id = id
		}

		const routesConditions: any = {}

		if (
			departureAirportCode &&
			departureAirportCode.length !== 0 &&
			departureAirportCode !== 'undefined'
		) {
			routesConditions.airports_routes_departureairportidToairports = {
				iatacode: departureAirportCode
			}
		}

		if (
			arrivalAirportCode &&
			arrivalAirportCode.length !== 0 &&
			arrivalAirportCode !== 'undefined'
		) {
			routesConditions.airports_routes_arrivalairportidToairports = {
				iatacode: arrivalAirportCode
			}
		}

		if (Object.keys(routesConditions).length > 0) {
			where.routes = routesConditions
		}

		if (flightDate !== 'undefined' && flightDate !== 'date' && flightDate) {
			if (flexibleDates !== 'false') {
				const parsedDate = new Date(flightDate)
				const startDate = new Date(parsedDate)
				startDate.setDate(parsedDate.getDate() - 3)

				const endDate = new Date(parsedDate)
				endDate.setDate(parsedDate.getDate() + 3)

				where = {
					...where,
					date: {
						gte: startDate.toISOString(),
						lte: endDate.toISOString()
					}
				}
			} else {
				where.date = new Date(flightDate).toISOString()
			}
		}


		if (
			returnFlightDate !== 'undefined' &&
			returnFlightDate &&
			flightDate !== 'undefined' &&
			flightDate
		) {
			if (new Date(returnFlightDate) <= new Date(flightDate)) {
				throw new ConflictException(
					'Обратный рейс должен быть позже даты вылета'
				)
			}
		}
		let orderBy = {}
		if (sortBy !== 'undefined' && sortBy) {
			orderBy = {
				[sortBy]: Prisma.SortOrder.asc
			}
		} else {
			orderBy = { date: Prisma.SortOrder.asc }
		}

		let schedules = await this.prisma.schedules.findMany({
			where: where,
			orderBy,
			include: {
				aircrafts: true,
				routes: {
					include: {
						airports_routes_departureairportidToairports: true,
						airports_routes_arrivalairportidToairports: true
					}
				}
			}
		})
		schedules = schedules.filter(
			(schedule, index, self) =>
				index === self.findIndex(t => t.id === schedule.id)
		)

		if (maxConnections > 0 && departureAirportCode && arrivalAirportCode && flightDate) {
			try {
				const connectingFlights = await this.findConnectingFlights(
					departureAirportCode,
					arrivalAirportCode,
					maxConnections,
					flightDate
				);
				
				// Проверяем, является ли connectingFlights массивом
				if (Array.isArray(connectingFlights)) {
					schedules = [...schedules, ...connectingFlights];
				} else {
					console.error('connectingFlights is not an array:', connectingFlights);
				}
			} catch (error) {
				console.error('Error finding connecting flights:', error);
			}
		}

		schedules = schedules.filter(
			(schedule, index, self) =>
				index === self.findIndex(t => t.id === schedule.id)
		)


		let returnSchedules = []

		if (
			returnFlightDate &&
			returnFlightDate !== 'undefined' &&
			arrivalAirportCode &&
			departureAirportCode
		) {
			const returnWhere = {
				...where,
				routes: {
					airports_routes_departureairportidToairports: {
						iatacode: arrivalAirportCode
					},
					airports_routes_arrivalairportidToairports: {
						iatacode: departureAirportCode
					}
				}
			}

			if (flexibleReturnDates !== 'false') {
				const parsedReturnDate = new Date(returnFlightDate)
				const startReturnDate = new Date(parsedReturnDate)
				startReturnDate.setDate(parsedReturnDate.getDate() - 3)

				const endReturnDate = new Date(parsedReturnDate)
				endReturnDate.setDate(parsedReturnDate.getDate() + 3)

				returnWhere.date = {
					gte: startReturnDate.toISOString(),
					lte: endReturnDate.toISOString()
				}
			} else {
				returnWhere.date = new Date(returnFlightDate).toISOString()
			}

			returnSchedules = await this.prisma.schedules.findMany({
				where: returnWhere,
				orderBy,
				include: {
					aircrafts: true,
					routes: {
						include: {
							airports_routes_departureairportidToairports: true,
							airports_routes_arrivalairportidToairports: true
						}
					}
				}
			})
		}

		returnSchedules = returnSchedules.filter(
			(schedule, index, self) =>
				index === self.findIndex(t => t.id === schedule.id)
		)

		const applyPricing = scheduleList => {
			return scheduleList.map(schedule => {
				let priceMultiplier = 1

				if (ticketClass === 'business') {
					priceMultiplier = 1.35
				} else if (ticketClass === 'first') {
					priceMultiplier = 1.35 * 1.3
				}

				const finalPrice = Math.floor(
					schedule.economyprice.toNumber() * priceMultiplier
				)
				return {
					...schedule,
					finalPrice,
					connections: schedule.connections || 0,
					flightNumber: schedule.connections
						? schedule.flightNumbers.join('-')
						: schedule.flightnumber
				}
			})
		}

		schedules = applyPricing(schedules)

		returnSchedules = applyPricing(returnSchedules)

		return { schedules, returnSchedules }
	}

	private async findConnectingFlights(
		departureAirportCode: string,
		arrivalAirportCode: string,
		maxConnections: number,
		flightDate: string
	): Promise<any[]> {
		const connectingFlights: any[] = [];

		const findNextLeg = async (
			currentAirport: string,
			visitedAirports: string[],
			connections: number,
			previousSchedule: any,
			remainingTime: number
		) => {
			if (connections > maxConnections) return

			const nextLegs = await this.prisma.schedules.findMany({
				where: {
					routes: {
						airports_routes_departureairportidToairports: {
							iatacode: currentAirport
						}
					},
					date: {
						gte: new Date(previousSchedule.date),
						lte: new Date(new Date(flightDate).getTime() + remainingTime)
					}
				},
				include: {
					aircrafts: true,
					routes: {
						include: {
							airports_routes_departureairportidToairports: true,
							airports_routes_arrivalairportidToairports: true
						}
					}
				}
			})

			for (const leg of nextLegs) {
				const arrivalAirport =
					leg.routes.airports_routes_arrivalairportidToairports.iatacode
				const legTime = leg.routes.flighttime * 60 * 1000 // Преобразуем время полета в миллисекунды

				if (arrivalAirport === arrivalAirportCode && remainingTime >= legTime) {
					connectingFlights.push({
						...leg,
						connections,
						flightNumbers: [
							...previousSchedule.flightNumbers,
							leg.flightnumber
						],
						economyprice: new Prisma.Decimal(
							previousSchedule.economyprice.toNumber() +
								leg.economyprice.toNumber()
						)
					})
				} else if (!visitedAirports.includes(arrivalAirport) && remainingTime >= legTime) {
					await findNextLeg(
						arrivalAirport,
						[...visitedAirports, arrivalAirport],
						connections + 1,
						{
							...leg,
							flightNumbers: [
								...previousSchedule.flightNumbers,
								leg.flightnumber
							],
							economyprice: new Prisma.Decimal(
								previousSchedule.economyprice.toNumber() +
									leg.economyprice.toNumber()
							)
						},
						remainingTime - legTime
					)
				}
			}
		}

		const flightDateObj = new Date(flightDate);
		if (isNaN(flightDateObj.getTime())) {
			return [];
		}

		const initialFlights = await this.prisma.schedules.findMany({
			where: {
				routes: {
					airports_routes_departureairportidToairports: {
						iatacode: departureAirportCode
					}
				},
				date: {
					gte: flightDateObj,
					lt: new Date(flightDateObj.getTime() + 24 * 60 * 60 * 1000)
				}
			},
			include: {
				aircrafts: true,
				routes: {
					include: {
						airports_routes_departureairportidToairports: true,
						airports_routes_arrivalairportidToairports: true
					}
				}
			}
		})

		for (const flight of initialFlights) {
			const arrivalAirport =
				flight.routes.airports_routes_arrivalairportidToairports.iatacode
			if (arrivalAirport === arrivalAirportCode) {
				connectingFlights.push({
					...flight,
					connections: 0,
					flightNumbers: [flight.flightnumber]
				})
			} else {
				const remainingTime = 24 * 60 * 60 * 1000 - (new Date(flight.date).getTime() - new Date(flightDate).getTime())
				await findNextLeg(
					arrivalAirport,
					[departureAirportCode, arrivalAirport],
					1,
					{ ...flight, flightNumbers: [flight.flightnumber] },
					remainingTime
				)
			}
		}

		return connectingFlights;
	}

	async toggleFlightStatus(id: number) {
		const schedule = await this.prisma.schedules.findUnique({
			where: { id }
		})

		const newStatus = !schedule.confirmed

		return this.prisma.schedules.update({
			where: { id },
			data: { confirmed: newStatus }
		})
	}

	async create(createScheduleDto: CreateScheduleDto) {
		return this.prisma.schedules.create({
			data: createScheduleDto
		})
	}

	async findAll() {
		return this.prisma.schedules.findMany({
			include: {
				aircrafts: true,
				routes: {
					include: {
						airports_routes_departureairportidToairports: true,
						airports_routes_arrivalairportidToairports: true
					}
				}
			}
		})
	}

	async findOne(id: number) {
		return this.prisma.schedules.findUnique({
			where: { id },
			include: {
				aircrafts: true,
				routes: {
					include: {
						airports_routes_departureairportidToairports: true,
						airports_routes_arrivalairportidToairports: true
					}
				}
			}
		})
	}

	async update(id: number, updateScheduleDto: CreateScheduleDto) {
		const { date, time, ...otherData } = updateScheduleDto

		let combinedDateTime: string | undefined
		if (date && time) {
			const [hours, minutes] = time.split(':')
			const dateTime = new Date(date)
			dateTime.setUTCHours(parseInt(hours, 10), parseInt(minutes, 10))
			combinedDateTime = dateTime.toISOString()
		}

		return this.prisma.schedules.update({
			where: { id },
			data: {
				...otherData,
				...(combinedDateTime && { date: combinedDateTime })
			}
		})
	}

	async remove(id: number) {
		return this.prisma.schedules.delete({
			where: { id }
		})
	}

	async checkSeatAvailability(
		scheduleId: number,
		numberOfPassengers: number
	): Promise<boolean> {
		const { schedules } = await this.searchSchedules(scheduleId)

		if (schedules.length === 0) {
			throw new NotFoundException('Schedule not found')
		}

		const schedule = schedules[0] as any

		// Check if this is a connecting flight
		if (schedule.connections > 0) {
			const flightNumbers = schedule.flightNumber.split('-')
			for (const flightNumber of flightNumbers) {
				const { schedules: legSchedules } = await this.searchSchedules(
					undefined,
					undefined,
					undefined,
					undefined,
					undefined,
					'economy',
					'false',
					'false',
					flightNumber
				)

				if (legSchedules.length === 0) {
					throw new NotFoundException(`Flight leg ${flightNumber} not found`)
				}

				const legSchedule = legSchedules[0]
				const availableSeats = await this.getAvailableSeats(legSchedule.id)
				if (availableSeats < numberOfPassengers) {
					return false
				}
			}
			return true
		} else {
			const availableSeats = await this.getAvailableSeats(schedule.id)
			return availableSeats >= numberOfPassengers
		}
	}

	private async getAvailableSeats(scheduleId: number): Promise<number> {
		const schedule = await this.prisma.schedules.findUnique({
			where: { id: scheduleId },
			include: {
				aircrafts: true,
				tickets: true
			}
		})

		if (!schedule) {
			throw new NotFoundException('Schedule not found')
		}

		const totalSeats = schedule.aircrafts.totalseats
		const bookedSeats = schedule.tickets.length
		return totalSeats - bookedSeats
	}
}