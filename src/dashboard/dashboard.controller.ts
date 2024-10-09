import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('statistics')
  async getStatistics() {
    const [
      confirmedCancelledFlights,
      busyFreeDay,
      topPassengers,
      ticketSalesRevenue,
      averageFlightTime,
      weeklyOccupancyRates,
      topOffices
    ] = await Promise.all([
      this.dashboardService.getConfirmedCancelledFlights(),
      this.dashboardService.getBusyAndFreeDay(),
      this.dashboardService.getTopPassengers(),
      this.dashboardService.getTicketSalesRevenue(),
      this.dashboardService.getAverageFlightTime(),
      this.dashboardService.getWeeklyOccupancyRates(),
      this.dashboardService.getTopOffices()
    ]);

    return {
      confirmedCancelledFlights,
      busyFreeDay,
      topPassengers,
      ticketSalesRevenue,
      averageFlightTime,
      weeklyOccupancyRates,
      topOffices
    };
  }
}
