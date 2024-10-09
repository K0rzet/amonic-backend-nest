import { Module } from '@nestjs/common';
import { SurveyService } from './survey.service';
import { SurveyController } from './survey.controller';
import { PrismaService } from '@/prisma.service';

@Module({
  controllers: [SurveyController],
  providers: [SurveyService, PrismaService],
})
export class SurveyModule {}
