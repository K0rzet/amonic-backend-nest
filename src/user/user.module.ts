import { PrismaService } from '@/prisma.service'
import { Module } from '@nestjs/common'
import { UserController } from './user.controller'
import { UserService } from './user.service'
import { RoleService } from '@/role/role.service'

@Module({
	controllers: [UserController],
	providers: [UserService, PrismaService, RoleService],
	exports: [UserService]
})
export class UserModule {}
