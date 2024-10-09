import { UserService } from '@/user/user.service'
import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	InternalServerErrorException,
	UnauthorizedException
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { verify } from 'argon2'
import { omit } from 'lodash'
import { AuthDto, CreateUserDto } from './dto/auth.dto'
import { users } from '@prisma/client'
import { PrismaService } from '@/prisma.service'

@Injectable()
export class AuthService {
	constructor(
		private jwt: JwtService,
		private userService: UserService,
		private prisma: PrismaService
	) { }

	private readonly TOKEN_EXPIRATION_ACCESS = '1h'
	private readonly TOKEN_EXPIRATION_REFRESH = '7d'

	async login(dto: AuthDto) {
		try {
			const user = await this.validateUser(dto)

			await this.prisma.user_sessions.create({
				data: {
					userId: user.id,
					loginTime: new Date(),
					errorOccurred: false,
				},
			})

			return this.buildResponseObject(user)
		}

		catch (error) {
			const user = await this.validateUser(dto)

			await this.prisma.user_sessions.create({
				data: {
					userId: user.id,
					loginTime: new Date(),
					errorOccurred: true,
					errorMessage: `${error}`
				},
			})
			throw new InternalServerErrorException(`Error: ${error}`)
		}
	}

	async logout(userId: number) {
		await this.prisma.user_sessions.updateMany({
			where: {
				userId,
				logoutTime: null
			},
			data: {
				logoutTime: new Date()
			}
		})
	}


	async register(dto: CreateUserDto) {
		const userExists = await this.userService.getByEmail(dto.email)
		if (userExists) {
			throw new BadRequestException('User already exists')
		}

		const user = await this.userService.create(dto)

		return this.buildResponseObject(user)
	}

	async getNewTokens(refreshToken: string) {
		try {
			const result = await this.jwt.verifyAsync(refreshToken)
			if (!result) {
				throw new UnauthorizedException('Invalid refresh token')
			}

			const user = await this.userService.getById(result.id)
			if (!user) {
				throw new UnauthorizedException('User not found')
			}

			return this.buildResponseObject(user)
		} catch (error) {
			throw new UnauthorizedException('Invalid refresh token')
		}
	}

	private async buildResponseObject(user: users) {
		const tokens = await this.issueTokens(user.id, user.roleid)
		return { user: this.omitPassword(user), ...tokens }
	}

	private async issueTokens(userId: number, roleid: number) {
		const payload = { id: userId, roleid }
		const accessToken = this.jwt.sign(payload, {
			expiresIn: this.TOKEN_EXPIRATION_ACCESS
		})
		const refreshToken = this.jwt.sign(payload, {
			expiresIn: this.TOKEN_EXPIRATION_REFRESH
		})
		return { accessToken, refreshToken }
	}

	private async validateUser(dto: AuthDto) {
		const user = await this.userService.getByEmail(dto.email)
		if (!user) {
			throw new UnauthorizedException('Email or password invalid')
		}

		if (!user.active) {
			throw new ForbiddenException('You are not allowed to login!')
		}
		const isValid = await verify(user.password, dto.password)
		if (!isValid) {
			throw new UnauthorizedException('Email or password invalid')
		}
		return user
	}

	private omitPassword(user: users) {
		return omit(user, ['password'])
	}
}
