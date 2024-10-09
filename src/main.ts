import { NestFactory } from '@nestjs/core'
import * as cookieParser from 'cookie-parser'
import { AppModule } from './app.module'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)

	app.setGlobalPrefix('api')

	app.use(cookieParser())
	app.enableCors({
		origin: ['http://localhost:3000', 'http://176.124.218.145:2223'],
		credentials: true,
		exposedHeaders: 'set-cookie'
	})

	await app.listen(process.env.MODE === 'production' ? process.env.PORT : 4200)
}
bootstrap()
