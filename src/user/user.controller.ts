import { Auth } from '@/auth/decorators/auth.decorator'
import { CurrentUser } from '@/auth/decorators/user.decorator'
import {
	Body,
	Controller,
	Get,
	Param,
	ParseIntPipe,
	Put,
	Query
} from '@nestjs/common'
import { UserService } from './user.service'
import { UpdateUserDto, UpdateUserSessionDto } from '@/auth/dto/auth.dto'

@Controller('users')
export class UserController {
	constructor(private readonly userService: UserService) {}

	@Auth(['Administrator', 'User'])
	@Get('profile')
	async getProfile(@CurrentUser('id') id: number) {
		return this.userService.getById(id)
	}
	@Auth(['Administrator', 'User'])
	@Get('by-id/:id')
	async getById(@Param('id', ParseIntPipe) id: number) {
		return this.userService.getById(id)
	}
	@Auth(['Administrator', 'User'])
	@Put(':id')
	async update(
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: UpdateUserDto
	) {
		return this.userService.update(id, dto)
	}
	@Auth(['Administrator', 'User'])
	@Put('sessions/:id')
	async updateUserSession(
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: UpdateUserSessionDto
	) {
		return this.userService.updateUserSession(id, dto)
	}

	@Get('sessions')
	@Auth(['User', 'Administrator'])
	async getSessionsByUserId(@CurrentUser('id') id: number) {
		return await this.userService.getSessionsByUserId(id)
	}

	@Get('sessions/all')
	@Auth(['User', 'Administrator'])
	async getAllSessions(@Query('id') id?: number, @Query('errorOccured') errorOccured?: boolean) {
		return await this.userService.getAllSessions(Number(id), Boolean(errorOccured))
	}
	@Get('sessions/crashes')
	@Auth(['User', 'Administrator'])
	async countCrashes(@CurrentUser('id') id: number) {
		return await this.userService.countCrashes(id)
	}

	@Auth(['premium'])
	@Get('premium')
	async getpremium() {
		return { text: 'premium content' }
	}

	@Auth(['admin', 'manager'])
	@Get('manager')
	async getManagerContent() {
		return { text: 'Manager content' }
	}

	@Auth(['Administrator'])
	@Get('list')
	async getList(@Query('officeId') officeId?: string) {
		return this.userService.getUsers(Number(officeId))
	}

	@Auth(['Administrator'])
	@Put(':id/activate')
	async changeUserActive(@Param('id', ParseIntPipe) id: number) {
		return this.userService.changeUserActive(id)
	}

	@Auth(['Administrator', 'User'])
	@Get('/sessions/total-time')
	async getTotalTimeSpent(@CurrentUser('id') id: string) {
		const totalTimeSpent = await this.userService.calculateTotalTimeSpent(
			Number(id)
		)

		const hours = Math.floor(totalTimeSpent / (1000 * 60 * 60))
		const minutes = Math.floor(
			(totalTimeSpent % (1000 * 60 * 60)) / (1000 * 60)
		)
		const seconds = Math.floor((totalTimeSpent % (1000 * 60)) / 1000)

		return { hours, minutes, seconds }
	}
}
