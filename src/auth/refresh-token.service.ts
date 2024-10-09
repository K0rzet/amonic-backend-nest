import { Injectable } from '@nestjs/common'
import type { Response } from 'express'

@Injectable()
export class RefreshTokenService {
	readonly EXPIRE_DAY_REFRESH_TOKEN = 1
	readonly REFRESH_TOKEN_NAME = 'refreshToken'

	addRefreshTokenToResponse(res: Response, refreshToken: string) {
		const expiresIn = new Date()
		expiresIn.setDate(expiresIn.getDate() + this.EXPIRE_DAY_REFRESH_TOKEN)

		res.cookie(this.REFRESH_TOKEN_NAME, refreshToken, {
			httpOnly: true,
			domain: process.env.MODE === 'production' ? process.env.URL : 'localhost',
			expires: expiresIn,
			secure: false, // true if production
			sameSite: 'none' // lax if production
		})
	}

	removeRefreshTokenFromResponse(res: Response) {
		res.cookie(this.REFRESH_TOKEN_NAME, '', {
			httpOnly: true,
			domain: process.env.MODE === 'production' ? process.env.URL : 'localhost',
			expires: new Date(0),
			secure: false, // true if production
			sameSite: 'none' // lax if production
		})
	}
}
