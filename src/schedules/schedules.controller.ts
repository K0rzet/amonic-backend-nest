import {
	Controller,
	Get,
	Post,
	Body,
	Param,
	Delete,
	Query,
	Put,
	BadRequestException,
	NotFoundException
} from '@nestjs/common'
import { SchedulesService } from './schedules.service'
import { CreateScheduleDto } from './dto/create-schedule.dto'
import { UpdateScheduleDto } from './dto/update-schedule.dto'
import { Auth } from '@/auth/decorators/auth.decorator'

@Controller('schedules')
export class SchedulesController {
	constructor(private readonly schedulesService: SchedulesService) {}

	@Post()
	@Auth(['Administrator'])
	create(@Body() createScheduleDto: CreateScheduleDto) {
		return this.schedulesService.create(createScheduleDto)
	}

	@Get()
	@Auth(['Administrator', 'User'])
	searchSchedules(
		@Query('id') id?: string,
		@Query('departureAirportCode') departureAirportCode?: string,
		@Query('arrivalAirportCode') arrivalAirportCode?: string,
		@Query('flightDate') flightDate?: string,
		@Query('returnFlightDate') returnFlightDate?: string,
		@Query('ticketClass') ticketClass?: 'economy' | 'business' | 'first',
		@Query('flexibleDates') flexibleDates?: string,
		@Query('flexibleReturnDates') flexibleReturnDates?: string,
		@Query('flightNumber') flightNumber?: string,
		@Query('sortBy') sortBy: 'date' | 'economyprice' | 'confirmed' = 'date'
	) {
		return this.schedulesService.searchSchedules(
			Number(id),
			departureAirportCode,
			arrivalAirportCode,
			flightDate,
			returnFlightDate,
			ticketClass,
			flexibleDates,
			flexibleReturnDates,
			flightNumber,
			sortBy
		)
	}

	@Auth(['Administrator', 'User'])
	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.schedulesService.findOne(+id)
	}

	@Auth(['Administrator'])
	@Put(':id')
	update(
		@Param('id') id: string,
		@Body() updateScheduleDto: UpdateScheduleDto
	) {
		return this.schedulesService.update(+id, updateScheduleDto)
	}

	@Auth(['Administrator'])
	@Put(':id/status')
	toggleFlightStatus(@Param('id') id: string) {
		return this.schedulesService.toggleFlightStatus(+id)
	}

	@Auth(['Administrator'])
	@Delete(':id')
	remove(@Param('id') id: string) {
		return this.schedulesService.remove(+id)
	}

	@Get(':id/check-availability')
	async checkAvailability(
		@Param('id') id: string,
		@Query('passengerCount') passengers: string
	) {
		const scheduleId = parseInt(id, 10);
		const numberOfPassengers = parseInt(passengers, 10);

		if (isNaN(scheduleId) || isNaN(numberOfPassengers)) {
			throw new BadRequestException('Invalid schedule ID or number of passengers');
		}

		if (numberOfPassengers <= 0) {
			throw new BadRequestException('Number of passengers must be greater than 0');
		}

		try {
			const isAvailable = await this.schedulesService.checkSeatAvailability(scheduleId, numberOfPassengers);
			return { available: isAvailable };
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error;
			}
			throw new BadRequestException('Error checking seat availability');
		}
	}

	
}
