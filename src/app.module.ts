import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { UserModule } from './user/user.module'
import { RoleModule } from './role/role.module'
import { SchedulesModule } from './schedules/schedules.module'
import { SurveyModule } from './survey/survey.module'
import { BookingModule } from './booking/booking.module'
import { AmenitiesModule } from './amenities/amenities.module'
import { PurchaseModule } from './purchase/purchase.module'
import { ReportModule } from './report/report.module'
import { OfficesModule } from './offices/offices.module'
import { AirportsModule } from './airports/airports.module'
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true
		}),
		AuthModule,
		UserModule,
		RoleModule,
		SchedulesModule,
		SurveyModule,
		BookingModule,
		AmenitiesModule,
		PurchaseModule,
		ReportModule,
		OfficesModule,
		AirportsModule,
		DashboardModule
	]
})
export class AppModule {}
