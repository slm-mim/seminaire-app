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
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
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
      mockPrismaService.user.findUnique.mockResolvedValue(null);
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

    it('should throw ConflictException if email exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: '1' });
      await expect(
        service.create({
          email: 'existing@test.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'ORGANIZER',
        }),
      ).rejects.toThrow('Cet email est déjà utilisé');
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.findById('nonexistent-id')).rejects.toThrow(
        'Utilisateur non trouvé',
      );
    });
  });
});
