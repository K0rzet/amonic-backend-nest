import { Controller, Get } from '@nestjs/common'
import { OfficesService } from './offices.service'
import { Auth } from '@/auth/decorators/auth.decorator'

@Controller('offices')
export class OfficesController {
	constructor(private readonly officesService: OfficesService) {}

	@Get()
	@Auth(['Administrator'])
	async getAllOffices() {
		return await this.officesService.getAllOffices()
	}
}
