import { Controller, Get } from '@nestjs/common'
import { AirportsService } from './airports.service'
import { Auth } from '@/auth/decorators/auth.decorator'

@Controller('airports')
export class AirportsController {
	constructor(private readonly airportsService: AirportsService) {}

	@Get()
	// @Auth(['Administrator'])
	async getAllAirports() {
		return await this.airportsService.getAllAirports()
	}

	@Get('countries')
	// @Auth(['Administrator'])
	async getAllCountries() {
		return await this.airportsService.getAllCountries()
	}
}
