import {
	Body,
	Controller,
	Get,
	NotFoundException,
	Param,
	Post
} from '@nestjs/common'
import { BookingService } from './booking.service'
import { Auth } from '@/auth/decorators/auth.decorator'

@Controller('bookings')
export class BookingController {
	constructor(private readonly bookingService: BookingService) {}

	@Get(':bookingReference/details')
	async getBookingDetails(@Param('bookingReference') bookingReference: string) {
		const bookingDetails =
			await this.bookingService.getBookingDetails(bookingReference)

		if (!bookingDetails || bookingDetails.length === 0) {
			throw new NotFoundException(
				'No booking found or all flights are within 24 hours.'
			)
		}

		return bookingDetails
	}

	@Post('confirm-payment')
	@Auth(['User', 'Administrator'])
	async confirmPayment(
		@Body()
		paymentData: {
			passengers: Array<{
				firstname: string
				lastname: string
				email: string
				phone: string
				passportnumber: string
				passportcountry: string
				cabintypeid: number
				flightNumbers: string // формат: "номер1-номер2-номер3"
				date: string // формат: "YYYY-MM-DD"
			}>
			paymentMethod: 'credit_card' | 'cash' | 'voucher'
		},
	) {
		if (!paymentData.passengers || paymentData.passengers.length === 0) {
			throw new NotFoundException('No passengers provided for booking.')
		}
		const result = await this.bookingService.confirmPayment(paymentData)

		return result
	}
}
