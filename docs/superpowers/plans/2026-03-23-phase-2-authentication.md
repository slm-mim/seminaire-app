# Phase 2 — Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement complete authentication system with JWT (access + refresh tokens), role-based guards, user CRUD (admin only), and password reset via email.

**Architecture:** NestJS Passport.js strategy with JWT. Access tokens (15min) in response body, refresh tokens (7 days) in httpOnly cookies. Role-based guards protect routes. Password reset sends a tokenized link via Brevo API (or console log in dev). Prisma v7 with `@prisma/adapter-pg` driver adapter for all database access.

**Tech Stack:** NestJS, Passport.js, @nestjs/jwt, @nestjs/passport, bcrypt, Prisma v7, @prisma/adapter-pg, Zod (from validation package), shared-types

**Spec:** `docs/superpowers/specs/2026-03-23-seminaire-app-design.md` — Section 4 (Security) + Module 1 (Auth & Roles)

**IMPORTANT Prisma v7 note:** PrismaClient must be instantiated with a driver adapter:

```typescript
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! });
const prisma = new PrismaClient({ adapter });
```

Never use `datasourceUrl` or `datasources` in the constructor — they are removed in v7.

---

### Task 1: Create Prisma service module

**Files:**

- Create: `apps/api/src/prisma/prisma.service.ts`
- Create: `apps/api/src/prisma/prisma.module.ts`
- Create: `apps/api/src/prisma/prisma.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/prisma/prisma.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have user model', () => {
    expect(service.user).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api jest -- src/prisma/prisma.service.spec.ts`
Expected: FAIL — cannot find module `./prisma.service`

- [ ] **Step 3: Implement PrismaService**

Create `apps/api/src/prisma/prisma.service.ts`:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env['DATABASE_URL']!,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 4: Create PrismaModule**

Create `apps/api/src/prisma/prisma.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter api jest -- src/prisma/prisma.service.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/prisma/
git commit -m "feat(auth): add global Prisma service module"
```

---

### Task 2: Create config module for environment variables

**Files:**

- Create: `apps/api/src/config/config.module.ts`
- Create: `apps/api/src/config/env.validation.ts`

- [ ] **Step 1: Install @nestjs/config**

```bash
pnpm --filter api add @nestjs/config
```

- [ ] **Step 2: Create env validation schema**

Create `apps/api/src/config/env.validation.ts`:

```typescript
import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().min(10),
  BREVO_API_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().url().default('http://localhost:3001'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type EnvConfig = z.infer<typeof envSchema>;
```

- [ ] **Step 3: Create config module**

Create `apps/api/src/config/config.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { envSchema } from './env.validation';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => envSchema.parse(config),
    }),
  ],
})
export class AppConfigModule {}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/config/
git commit -m "feat(auth): add config module with env validation"
```

---

### Task 3: Create auth module — JWT strategy + login

**Files:**

- Create: `apps/api/src/modules/auth/auth.module.ts`
- Create: `apps/api/src/modules/auth/auth.service.ts`
- Create: `apps/api/src/modules/auth/auth.controller.ts`
- Create: `apps/api/src/modules/auth/strategies/jwt.strategy.ts`
- Create: `apps/api/src/modules/auth/strategies/jwt-refresh.strategy.ts`
- Create: `apps/api/src/modules/auth/dto/login.dto.ts`
- Create: `apps/api/src/modules/auth/dto/auth-response.dto.ts`
- Create: `apps/api/src/modules/auth/auth.service.spec.ts`
- Create: `apps/api/src/modules/auth/auth.controller.spec.ts`

- [ ] **Step 1: Install auth dependencies**

```bash
pnpm --filter api add @nestjs/jwt @nestjs/passport passport passport-jwt
pnpm --filter api add -D @types/passport-jwt
```

- [ ] **Step 2: Write failing test for AuthService**

Create `apps/api/src/modules/auth/auth.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockJwtService = {
  signAsync: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
    };
    return config[key];
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return null if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      const result = await service.validateUser('test@test.com', 'password');
      expect(result).toBeNull();
    });

    it('should return null if password is invalid', async () => {
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash('correct-password', 12);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        role: 'ADMIN',
      });
      const result = await service.validateUser('test@test.com', 'wrong-password');
      expect(result).toBeNull();
    });

    it('should return user data if credentials are valid', async () => {
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash('correct-password', 12);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        role: 'ADMIN',
      });
      const result = await service.validateUser('test@test.com', 'correct-password');
      expect(result).not.toBeNull();
      expect(result?.email).toBe('test@test.com');
    });
  });

  describe('login', () => {
    it('should return access and refresh tokens', async () => {
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login({
        id: '1',
        email: 'test@test.com',
        role: 'ADMIN',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter api jest -- src/modules/auth/auth.service.spec.ts`
Expected: FAIL — cannot find module `./auth.service`

- [ ] **Step 4: Create login DTO**

Create `apps/api/src/modules/auth/dto/login.dto.ts`:

```typescript
import { loginSchema, LoginInput } from 'validation';

export class LoginDto implements LoginInput {
  email: string;
  password: string;
}

export { loginSchema };
```

Create `apps/api/src/modules/auth/dto/auth-response.dto.ts`:

```typescript
export class AuthResponseDto {
  accessToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}
```

- [ ] **Step 5: Implement AuthService**

Create `apps/api/src/modules/auth/auth.service.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;

    const { password: _, ...result } = user;
    return result;
  }

  async login(user: { id: string; email: string; role: string }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async refreshTokens(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    return this.login({ id: user.id, email: user.email, role: user.role });
  }
}
```

- [ ] **Step 6: Create JWT strategy**

Create `apps/api/src/modules/auth/strategies/jwt.strategy.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_ACCESS_SECRET'),
    });
  }

  validate(payload: { sub: string; email: string; role: string }) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
```

- [ ] **Step 7: Create JWT refresh strategy**

Create `apps/api/src/modules/auth/strategies/jwt-refresh.strategy.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request?.cookies?.refreshToken,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_REFRESH_SECRET'),
    });
  }

  validate(payload: { sub: string; email: string; role: string }) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
```

- [ ] **Step 8: Create AuthController**

Create `apps/api/src/modules/auth/auth.controller.ts`:

```typescript
import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import { loginSchema } from 'validation';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const parsed = loginSchema.parse(body);
    const user = await this.authService.validateUser(parsed.email, parsed.password);
    if (!user) throw new UnauthorizedException('Email ou mot de passe incorrect');

    const tokens = await this.authService.login(user);

    response.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request & { user: { id: string } },
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.authService.refreshTokens(req.user.id);

    response.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('refreshToken');
    return { message: 'Déconnexion réussie' };
  }
}
```

- [ ] **Step 9: Create AuthModule**

Create `apps/api/src/modules/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 10: Run tests**

Run: `pnpm --filter api jest -- src/modules/auth/auth.service.spec.ts`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add apps/api/src/modules/auth/ apps/api/package.json pnpm-lock.yaml
git commit -m "feat(auth): add JWT authentication with login, refresh, and logout"
```

---

### Task 4: Create role-based guards

**Files:**

- Create: `apps/api/src/common/guards/jwt-auth.guard.ts`
- Create: `apps/api/src/common/guards/roles.guard.ts`
- Create: `apps/api/src/common/decorators/roles.decorator.ts`
- Create: `apps/api/src/common/decorators/current-user.decorator.ts`
- Create: `apps/api/src/common/guards/roles.guard.spec.ts`

- [ ] **Step 1: Write failing test for RolesGuard**

Create `apps/api/src/common/guards/roles.guard.spec.ts`:

```typescript
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow access when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext({ role: 'ORGANIZER' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const context = createMockContext({ role: 'ADMIN' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user lacks required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const context = createMockContext({ role: 'MODERATOR' });
    expect(guard.canActivate(context)).toBe(false);
  });

  it('should allow access when user has one of multiple required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN', 'ORGANIZER']);
    const context = createMockContext({ role: 'ORGANIZER' });
    expect(guard.canActivate(context)).toBe(true);
  });
});

function createMockContext(user: { role: string }): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api jest -- src/common/guards/roles.guard.spec.ts`
Expected: FAIL

- [ ] **Step 3: Create JwtAuthGuard**

Create `apps/api/src/common/guards/jwt-auth.guard.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 4: Create Roles decorator**

Create `apps/api/src/common/decorators/roles.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';
import { UserRole } from 'shared-types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 5: Create CurrentUser decorator**

Create `apps/api/src/common/decorators/current-user.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
```

- [ ] **Step 6: Implement RolesGuard**

Create `apps/api/src/common/guards/roles.guard.ts`:

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm --filter api jest -- src/common/guards/roles.guard.spec.ts`
Expected: PASS — all 4 tests pass

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/common/
git commit -m "feat(auth): add role-based guards and decorators"
```

---

### Task 5: Create users module (admin CRUD)

**Files:**

- Create: `apps/api/src/modules/users/users.module.ts`
- Create: `apps/api/src/modules/users/users.service.ts`
- Create: `apps/api/src/modules/users/users.controller.ts`
- Create: `apps/api/src/modules/users/users.service.spec.ts`

- [ ] **Step 1: Write failing test for UsersService**

Create `apps/api/src/modules/users/users.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrismaService = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return users without passwords', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: '1',
          email: 'test@test.com',
          password: 'hashed',
          firstName: 'A',
          lastName: 'B',
          role: 'ADMIN',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('password');
    });
  });

  describe('create', () => {
    it('should hash password and create user', async () => {
      mockPrismaService.user.create.mockResolvedValue({
        id: '1',
        email: 'new@test.com',
        password: 'hashed',
        firstName: 'New',
        lastName: 'User',
        role: 'ORGANIZER',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create({
        email: 'new@test.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
        role: 'ORGANIZER',
      });

      expect(result).not.toHaveProperty('password');
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'new@test.com',
          firstName: 'New',
          lastName: 'User',
          role: 'ORGANIZER',
        }),
      });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api jest -- src/modules/users/users.service.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement UsersService**

Create `apps/api/src/modules/users/users.service.ts`:

```typescript
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
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
    return Object.fromEntries(Object.entries(obj).filter(([key]) => !keys.includes(key)));
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
    await this.findById(id); // throws if not found

    const user = await this.prisma.user.update({
      where: { id },
      data,
    });

    return this.exclude(user, ['password']);
  }

  async remove(id: string) {
    await this.findById(id); // throws if not found
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Utilisateur supprimé' };
  }
}
```

- [ ] **Step 4: Create UsersController**

Create `apps/api/src/modules/users/users.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UserRole } from 'shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  create(
    @Body()
    body: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: string;
    },
  ) {
    return this.usersService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { email?: string; firstName?: string; lastName?: string; role?: string },
  ) {
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}
```

- [ ] **Step 5: Create UsersModule**

Create `apps/api/src/modules/users/users.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 6: Run tests**

Run: `pnpm --filter api jest -- src/modules/users/users.service.spec.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/users/
git commit -m "feat(auth): add users module with admin CRUD"
```

---

### Task 6: Create password reset flow

**Files:**

- Create: `apps/api/src/modules/auth/auth.service.ts` (modify — add resetPasswordRequest + resetPassword methods)
- Create: `apps/api/src/modules/auth/auth.controller.ts` (modify — add reset endpoints)
- Modify: `apps/api/prisma/schema.prisma` (add PasswordReset model)

- [ ] **Step 1: Add PasswordReset model to schema**

Add to `apps/api/prisma/schema.prisma`:

```prisma
model PasswordReset {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("password_resets")
}
```

Also add the relation to the User model:

```prisma
model User {
  // ... existing fields ...
  passwordResets PasswordReset[]
}
```

- [ ] **Step 2: Run migration**

```bash
pnpm --filter api exec prisma migrate dev --name add-password-reset
```

- [ ] **Step 3: Add reset methods to AuthService**

Add to `apps/api/src/modules/auth/auth.service.ts`:

```typescript
import { randomBytes } from 'crypto';

// Add these methods to the AuthService class:

async requestPasswordReset(email: string) {
  const user = await this.prisma.user.findUnique({ where: { email } });
  if (!user) return; // Don't reveal if email exists

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await this.prisma.passwordReset.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  // TODO: Send email via Brevo in Phase 6
  // For now, log the token in development
  if (this.configService.get('NODE_ENV') === 'development') {
    console.log(`[DEV] Password reset token for ${email}: ${token}`);
  }
}

async resetPassword(token: string, newPassword: string) {
  const resetRecord = await this.prisma.passwordReset.findUnique({
    where: { token },
  });

  if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
    throw new UnauthorizedException('Token invalide ou expiré');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await this.prisma.$transaction([
    this.prisma.user.update({
      where: { id: resetRecord.userId },
      data: { password: hashedPassword },
    }),
    this.prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    }),
  ]);
}
```

- [ ] **Step 4: Add reset endpoints to AuthController**

Add to `apps/api/src/modules/auth/auth.controller.ts`:

```typescript
import { resetPasswordRequestSchema, resetPasswordSchema } from 'validation';

// Add these endpoints:

@Post('forgot-password')
@HttpCode(HttpStatus.OK)
async forgotPassword(@Body() body: { email: string }) {
  const parsed = resetPasswordRequestSchema.parse(body);
  await this.authService.requestPasswordReset(parsed.email);
  return { message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé' };
}

@Post('reset-password')
@HttpCode(HttpStatus.OK)
async resetPassword(@Body() body: { token: string; password: string }) {
  const parsed = resetPasswordSchema.parse(body);
  await this.authService.resetPassword(parsed.token, parsed.password);
  return { message: 'Mot de passe réinitialisé avec succès' };
}
```

- [ ] **Step 5: Run all auth tests**

Run: `pnpm --filter api jest -- src/modules/auth/`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/ apps/api/src/modules/auth/
git commit -m "feat(auth): add password reset flow with token expiration"
```

---

### Task 7: Wire everything into AppModule + add security middleware

**Files:**

- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/main.ts`
- Install: `helmet`, `@nestjs/throttler`, `cookie-parser`

- [ ] **Step 1: Install security packages**

```bash
pnpm --filter api add helmet cookie-parser @nestjs/throttler
pnpm --filter api add -D @types/cookie-parser
```

- [ ] **Step 2: Update AppModule**

Modify `apps/api/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AppConfigModule } from './config/config.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
    AuthModule,
    UsersModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

- [ ] **Step 3: Update main.ts**

Modify `apps/api/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}

bootstrap();
```

- [ ] **Step 4: Run full test suite**

```bash
pnpm --filter api test
```

Expected: All tests pass.

- [ ] **Step 5: Start the API and test manually**

```bash
pnpm --filter api run dev
```

Test login with curl:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seminaire.mf.idf@gmail.com","password":"Admin@2026!"}'
```

Expected: Returns `{ accessToken: "...", user: { ... } }` with a `Set-Cookie` header for the refresh token.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/app.module.ts apps/api/src/main.ts apps/api/package.json pnpm-lock.yaml
git commit -m "feat(auth): wire auth modules into app with security middleware"
```

---

### Task 8: Remove scaffold files + final cleanup

**Files:**

- Delete: `apps/api/src/app.controller.ts`
- Delete: `apps/api/src/app.service.ts`
- Delete: `apps/api/src/app.controller.spec.ts`

- [ ] **Step 1: Remove scaffold files**

```bash
rm apps/api/src/app.controller.ts apps/api/src/app.service.ts apps/api/src/app.controller.spec.ts
```

- [ ] **Step 2: Run full test suite**

```bash
pnpm --filter api test
```

Expected: All tests pass (the default controller test is removed).

- [ ] **Step 3: Run build**

```bash
pnpm run build
```

Expected: Build passes.

- [ ] **Step 4: Commit and push**

```bash
git add -A
git commit -m "chore(auth): remove NestJS scaffold files, cleanup"
git push origin main
```

---

## Summary

After completing all 8 tasks, you will have:

- ✅ Global PrismaService with Prisma v7 driver adapter
- ✅ Config module with Zod-validated environment variables
- ✅ JWT authentication (access + refresh tokens)
- ✅ httpOnly cookie for refresh tokens
- ✅ Login / Refresh / Logout endpoints
- ✅ Role-based guards (ADMIN, ORGANIZER, MODERATOR)
- ✅ `@Roles()` and `@CurrentUser()` decorators
- ✅ Users CRUD (admin only)
- ✅ Password reset with token expiration
- ✅ Security: Helmet, CORS, rate limiting, cookie-parser
- ✅ Unit tests for services and guards

**API Endpoints:**
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/auth/login` | Public | Login |
| POST | `/auth/refresh` | Cookie | Refresh access token |
| POST | `/auth/logout` | Public | Clear refresh cookie |
| POST | `/auth/forgot-password` | Public | Request password reset |
| POST | `/auth/reset-password` | Public | Reset password with token |
| GET | `/users` | Admin | List all users |
| GET | `/users/:id` | Admin | Get user by ID |
| POST | `/users` | Admin | Create user |
| PATCH | `/users/:id` | Admin | Update user |
| DELETE | `/users/:id` | Admin | Delete user |

**Next phase:** Phase 3 — Seminars (CRUD, statuts, page publique)
