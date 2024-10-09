import {
	Injectable,
	CanActivate,
	ExecutionContext,
	ForbiddenException
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { RoleService } from '@/role/role.service'

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		private roleService: RoleService
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const roles = this.reflector.get<string[]>('roles', context.getHandler())
		if (!roles) {
			return true
		}

		const request = context.switchToHttp().getRequest()
		const user = request.user

		if (!user) {
			throw new ForbiddenException('Access denied')
		}

		const userRoles = await this.roleService.getUserRoles(user.id) 

		const hasRole = userRoles.some(role => roles.includes(role.title))

		if (!hasRole) {
			throw new ForbiddenException('Access denied')
		}

		return true
	}
}
