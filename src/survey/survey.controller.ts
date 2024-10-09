import { Controller, Get, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SurveyService } from './survey.service';
import { diskStorage } from 'multer';

@Controller('survey')
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const filename = `${Date.now()}-${file.originalname}`;
          callback(null, filename);
        },
      }),
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const filePath = `./uploads/${file.filename}`;
    await this.surveyService.loadCsvData(filePath);
    return { message: 'File uploaded and data saved successfully' };
  }

  @Get('detailed-stats')
  async getDetailedSurveyStats(@Query('month') month: string, @Query('year') year: string, @Query('gender') gender: string, @Query('ageGroups') ageGroups: string[]) {
    const parsedMonth = parseInt(month);
    const parsedYear = parseInt(year);
    return this.surveyService.getDetailedSurveyStats({ month: parsedMonth, year: parsedYear, gender, ageGroups });
  }
}
