import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { hash } from 'argon2'
import {
	CreateUserDto,
	UpdateUserDto,
	UpdateUserSessionDto
} from '@/auth/dto/auth.dto'
import { users } from '@prisma/client'

@Injectable()
export class UserService {
	constructor(private prisma: PrismaService) {}

	async getUsers(officeId?: number) {
		const whereClause = officeId ? { offices: { id: officeId } } : {}
		return this.prisma.users.findMany({
			where: whereClause,
			select: {
				id: true,
				firstname: true,
				lastname: true,
				email: true,
				active: true,
				roles: true,
				offices: true,
				birthdate: true
			},
			orderBy: { id: 'asc' }
		})
	}

	async getById(id: number) {
		const user = await this.prisma.users.findUnique({
			where: {
				id
			}
		})

		if (!user) {
			throw new NotFoundException(`Пользователь с ID ${id} не найден`)
		}

		return user
	}

	async getSessionsByUserId(userId: number) {
		const user = await this.prisma.user_sessions.findMany({
			where: {
				userId: userId
			},
			orderBy: { id: 'asc' }
		})

		if (!user) {
			throw new NotFoundException(`Пользователь с ID ${userId} не найден`)
		}

		return user
	}
	async getAllSessions(id?: number, errorOccurred?: boolean) {
		const whereClause: any = {}
		if (id) {
			whereClause.id = id
		}

		if (typeof errorOccurred === 'boolean') {
			whereClause.errorOccurred = errorOccurred
		}
		const sessions = await this.prisma.user_sessions.findMany({
			where: whereClause,
			orderBy: { id: 'asc' },
			include: {
				users: {
					select: { firstname: true }
				}
			}
		})

		return sessions
	}

	async countCrashes(userId: number) {
		let count = await this.prisma.user_sessions.count({
			where: {
				userId: userId,
				errorOccurred: true
			}
		})

		if (!count) {
			count = 0
		}

		return count
	}

	async calculateTotalTimeSpent(userId: number): Promise<number> {
		const thirtyDaysAgo = new Date()
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

		const sessions = await this.prisma.user_sessions.findMany({
			where: {
				userId: userId,
				errorOccurred: false,
				loginTime: {
					gte: thirtyDaysAgo
				}
			}
		})

		let totalTimeSpent = 0

		sessions.forEach(session => {
			const loginTime = new Date(session.loginTime)
			const logoutTime = session.logoutTime
				? new Date(session.logoutTime)
				: new Date()

			const timeSpent = logoutTime.getTime() - loginTime.getTime()

			totalTimeSpent += timeSpent
		})

		return totalTimeSpent
	}

	async getByEmail(email: string) {
		const user = await this.prisma.users.findFirst({
			where: {
				email
			}
		})

		// if (!user) {
		//   throw new NotFoundException(`Пользователь с email ${email} не найден`);
		// }

		return user
	}

	async create(dto: CreateUserDto) {
		const hashedPassword = await hash(dto.password)

		return this.prisma.users.create({
			data: {
				email: dto.email,
				password: hashedPassword,
				firstname: dto.firstname,
				lastname: dto.lastname,
				birthdate: dto.birthdate,
				active: dto.active ?? true,
				roleid: dto.roleId,
				officeid: dto.officeId
			}
		})
	}

	async update(id: number, dto: UpdateUserDto) {
		const existingUser = await this.prisma.users.findUnique({
			where: { id }
		})

		if (!existingUser) {
			throw new NotFoundException(`Пользователь с ID ${id} не найден`)
		}

		const hashedPassword = dto.password ? await hash(dto.password) : undefined

		return this.prisma.users.update({
			where: {
				id
			},
			data: {
				email: dto.email ?? existingUser.email,
				password: hashedPassword ?? existingUser.password,
				firstname: dto.firstname ?? existingUser.firstname,
				lastname: dto.lastname ?? existingUser.lastname,
				birthdate: dto.birthdate ?? existingUser.birthdate,
				active: dto.active ?? existingUser.active,
				roleid: dto.roleid ?? existingUser.roleid,
				officeid: dto.officeid ?? existingUser.officeid
			}
		})
	}
	async updateUserSession(id: number, dto: UpdateUserSessionDto) {
		const existingUserSession = await this.prisma.user_sessions.findUnique({
			where: { id }
		})

		if (!existingUserSession) {
			throw new NotFoundException(`Сессия с ID ${id} не найдена`)
		}

		return this.prisma.user_sessions.update({
			where: {
				id
			},
			data: {
				errorMessage: dto.errorMessage,
				crashType: dto.crashType
			}
		})
	}
	async changeUserActive(id: number) {
		const existingUser = await this.prisma.users.findUnique({
			where: { id }
		})

		if (!existingUser) {
			throw new NotFoundException(`Пользователь с ID ${id} не найден`)
		}
		return this.prisma.users.update({
			where: {
				id
			},
			data: {
				active: !existingUser.active
			}
		})
	}

	async getUserByEmail(email: string): Promise<users> {
		const user = await this.prisma.users.findFirst({
			where: {
				email
			}
		})
		return user
	}
}
