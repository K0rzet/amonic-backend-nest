import { SetMetadata } from '@nestjs/common';

// Измените тип на string[]
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
