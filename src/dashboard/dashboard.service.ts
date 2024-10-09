import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma.service';
@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getConfirmedCancelledFlights() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const confirmedFlights = await this.prisma.schedules.count({
      where: {
        date: { gte: thirtyDaysAgo },
        confirmed: true,
      },
    });

    const cancelledFlights = await this.prisma.schedules.count({
      where: {
        date: { gte: thirtyDaysAgo },
        confirmed: false,
      },
    });

    return { confirmedFlights, cancelledFlights };
  }

  async getBusyAndFreeDay() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const flightsWithPassengers = await this.prisma.schedules.findMany({
      where: {
        date: { gte: thirtyDaysAgo },
        confirmed: true,
      },
      select: {
        date: true,
        tickets: {
          select: {
            id: true,
          },
        },
      },
    });

    const passengersByDay = flightsWithPassengers.reduce((acc, flight) => {
      const date = flight.date.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + flight.tickets.length;
      return acc;
    }, {} as Record<string, number>);

    const sortedDays = Object.entries(passengersByDay).sort((a, b) => b[1] - a[1]);
    const busiestDay = sortedDays[0];
    const quietestDay = sortedDays[sortedDays.length - 1];

    return { busiestDay, quietestDay };
  }

  async getTopPassengers() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topPassengers = await this.prisma.users.findMany({
      where: {
        tickets: {
          some: {
            schedules: {
              date: { gte: thirtyDaysAgo },
              confirmed: true,
            },
          },
        },
      },
      select: {
        firstname: true,
        lastname: true,
        tickets: {
          where: {
            schedules: {
              date: { gte: thirtyDaysAgo },
              confirmed: true,
            },
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        tickets: { _count: 'desc' },
      },
      take: 3,
    });

    return topPassengers.map(passenger => ({
      name: `${passenger.firstname} ${passenger.lastname}`,
      ticketCount: passenger.tickets.length,
    }));
  }

  async getTicketSalesRevenue() {
    const today = new Date();

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const revenueByDay = await Promise.all([
      this.getRevenueBetweenDates(yesterday, today),
      this.getRevenueBetweenDates(twoDaysAgo, yesterday),
      this.getRevenueBetweenDates(threeDaysAgo, twoDaysAgo),
    ]);

    return {
      yesterday: revenueByDay[0],
      twoDaysAgo: revenueByDay[1],
      threeDaysAgo: revenueByDay[2],
    };
  }

  private async getRevenueBetweenDates(startDate: Date, endDate: Date) {
    const tickets = await this.prisma.tickets.findMany({
      where: {
        schedules: {
          date: {
            gte: startDate,
            lt: endDate,
          },
          confirmed: true,
        },
      },
      select: {
        cabintypes: {
          select: {
            name: true,
          },
        },
        schedules: {
          select: {
            economyprice: true,
          },
        },
      },
    });

    return tickets.reduce((total, ticket) => {
      let price = Number(ticket.schedules.economyprice);
      if (ticket.cabintypes.name.toLowerCase() === 'business') {
        price *= 1.35;
      }
      return total + price;
    }, 0);
  }

  async getAverageFlightTime() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const flights = await this.prisma.schedules.findMany({
      where: {
        date: { gte: thirtyDaysAgo },
        confirmed: true,
      },
      select: {
        date: true,
        routes: {
          select: {
            flighttime: true,
          },
        },
      },
    });

    const flightTimeByDay = flights.reduce((acc, flight) => {
      const date = flight.date.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + (flight.routes.flighttime || 0);
      return acc;
    }, {} as Record<string, number>);

    const totalFlightTime = Object.values(flightTimeByDay).reduce((sum: number, time: number) => sum + time, 0);
    const averageFlightTime = totalFlightTime / Object.keys(flightTimeByDay).length || 0;

    return averageFlightTime;
  }

  async getWeeklyOccupancyRates() {
    const today = new Date();
    const startOfThisWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    const startOfTwoWeeksAgo = new Date(startOfLastWeek);
    startOfTwoWeeksAgo.setDate(startOfTwoWeeksAgo.getDate() - 7);

    const occupancyRates = await Promise.all([
      this.getOccupancyRateForWeek(startOfThisWeek),
      this.getOccupancyRateForWeek(startOfLastWeek),
      this.getOccupancyRateForWeek(startOfTwoWeeksAgo)
    ]);

    return {
      thisWeek: occupancyRates[0],
      lastWeek: occupancyRates[1],
      twoWeeksAgo: occupancyRates[2]
    };
  }

  private async getOccupancyRateForWeek(startDate: Date): Promise<number> {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const schedules = await this.prisma.schedules.findMany({
      where: {
        date: {
          gte: startDate,
          lt: endDate
        },
        confirmed: true
      },
      include: {
        aircrafts: true,
        tickets: true
      }
    });

    let totalSeats = 0;
    let occupiedSeats = 0;

    schedules.forEach(schedule => {
      totalSeats += schedule.aircrafts.totalseats;
      occupiedSeats += schedule.tickets.length;
    });

    const occupancyRate = totalSeats > 0 ? (occupiedSeats / totalSeats) * 100 : 0;
    return Math.round((100 - occupancyRate) * 100) / 100; // Return percentage of free seats rounded to 2 decimal places
  }

  async getTopOffices() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topOffices = await this.prisma.offices.findMany({
      select: {
        id: true,
        title: true,
        users: {
          select: {
            tickets: {
              where: {
                schedules: {
                  date: {
                    gte: thirtyDaysAgo
                  }
                }
              }
            }
          }
        }
      }
    });

    const officesWithTicketCount = topOffices.map(office => ({
      id: office.id,
      title: office.title,
      ticketCount: office.users.reduce((sum, user) => sum + user.tickets.length, 0)
    }));

    return officesWithTicketCount
      .sort((a, b) => b.ticketCount - a.ticketCount)
      .slice(0, 3);
  }
}
