import { Controller, Get, Query } from '@nestjs/common'
import { ReportService } from './report.service'

@Controller('reports')
export class ReportController {
	constructor(private readonly reportService: ReportService) {}

	@Get('amenities')
	async getAmenitiesReport(
		@Query('startDate') startDate?: string,
		@Query('endDate') endDate?: string,
		@Query('flightNumber') flightNumber?: string,
		@Query('flightDate') flightDate?: string
	) {
		const filter: any = {}

		if (startDate && endDate) {
			filter.startDate = new Date(startDate)
			filter.endDate = new Date(endDate)
		} else if (flightNumber && flightDate) {
			filter.flightNumber = flightNumber
			filter.flightDate = new Date(flightDate)
		}

		return this.reportService.getAmenitiesReport(filter)
	}
}
