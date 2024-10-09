export class UpdateScheduleDto {
    date: Date;
    time: string;
    aircraftid: number;
    routeid: number;
    economyprice: number;
    confirmed: boolean;
    flightnumber?: string;
  }
  