import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from 'shared-types';
import { PrismaService } from '../../prisma/prisma.service';

interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private exclude<T extends Record<string, unknown>>(obj: T, keys: string[]) {
    return Object.fromEntries(
      Object.entries(obj).filter(([key]) => !keys.includes(key)),
    );
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return users.map((user) => this.exclude(user, ['password']));
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    return this.exclude(user, ['password']);
  }

  async create(data: CreateUserData) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) throw new ConflictException('Cet email est déjà utilisé');

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role as UserRole,
      },
    });

    return this.exclude(user, ['password']);
  }

  async update(id: string, data: UpdateUserData) {
    await this.findById(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: data as Parameters<typeof this.prisma.user.update>[0]['data'],
    });

    return this.exclude(user, ['password']);
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Utilisateur supprimé' };
  }
}
