import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma.service';
import { roles } from '@prisma/client';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  async getUserRoles(userId: number): Promise<roles[]> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    return user?.roles ? [user.roles] : [];
  }
}
