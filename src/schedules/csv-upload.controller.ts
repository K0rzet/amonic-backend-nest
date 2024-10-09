import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { CsvUploadService } from './csv-upload.sevice'
import { Auth } from '@/auth/decorators/auth.decorator'

@Controller('csv-upload')
export class CsvUploadController {
	constructor(private readonly csvUploadService: CsvUploadService) {}

	@Post('schedules')
	@Auth(['Administrator', 'User'])
	@UseInterceptors(FileInterceptor('file'))
	async uploadCsv(@UploadedFile() file: Express.Multer.File) {
		if (!file) {
			return { success: false, message: 'No file uploaded' }
		}

		const results = await this.csvUploadService.processCsvFile(file.buffer)
		return { success: true, results }
	}
}
