import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrismaService = {
  contact: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('ContactsService', () => {
  let service: ContactsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return contacts ordered by lastName', async () => {
      const mockContacts = [
        {
          id: '1',
          email: 'alice@test.com',
          firstName: 'Alice',
          lastName: 'DUPONT',
          city: 'Paris',
          phone: null,
          brevoId: null,
          source: 'MANUAL',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          email: 'bob@test.com',
          firstName: 'Bob',
          lastName: 'MARTIN',
          city: 'Lyon',
          phone: null,
          brevoId: null,
          source: 'MANUAL',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrismaService.contact.findMany.mockResolvedValue(mockContacts);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(mockPrismaService.contact.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { lastName: 'asc' },
      });
    });

    it('should filter contacts by search term', async () => {
      mockPrismaService.contact.findMany.mockResolvedValue([]);

      await service.findAll('dupont');

      expect(mockPrismaService.contact.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { firstName: { contains: 'dupont', mode: 'insensitive' } },
            { lastName: { contains: 'dupont', mode: 'insensitive' } },
            { email: { contains: 'dupont', mode: 'insensitive' } },
          ],
        },
        orderBy: { lastName: 'asc' },
      });
    });
  });

  describe('create', () => {
    it('should create a contact and format the name', async () => {
      mockPrismaService.contact.findUnique.mockResolvedValue(null);
      mockPrismaService.contact.create.mockResolvedValue({
        id: '1',
        email: 'alice@test.com',
        firstName: 'Alice',
        lastName: 'DUPONT',
        city: 'Paris',
        phone: null,
        brevoId: null,
        source: 'MANUAL',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create({
        email: 'alice@test.com',
        firstName: 'alice',
        lastName: 'dupont',
        city: 'Paris',
      });

      expect(mockPrismaService.contact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'alice@test.com',
          firstName: 'Alice',
          lastName: 'DUPONT',
          city: 'Paris',
          source: 'MANUAL',
        }),
      });
      expect(result.firstName).toBe('Alice');
      expect(result.lastName).toBe('DUPONT');
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.contact.findUnique.mockResolvedValue({ id: '1' });

      await expect(
        service.create({
          email: 'existing@test.com',
          firstName: 'Test',
          lastName: 'User',
          city: 'Paris',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('formatName', () => {
    it('should capitalize first letter of firstName and uppercase lastName', () => {
      const result = service.formatName('alice', 'dupont');
      expect(result.firstName).toBe('Alice');
      expect(result.lastName).toBe('DUPONT');
    });

    it('should handle already uppercase firstName correctly', () => {
      const result = service.formatName('MARIE', 'MARTIN');
      expect(result.firstName).toBe('Marie');
      expect(result.lastName).toBe('MARTIN');
    });

    it('should handle mixed case inputs', () => {
      const result = service.formatName('jEaN-pIeRrE', 'lE gAlL');
      expect(result.firstName).toBe('Jean-pierre');
      expect(result.lastName).toBe('LE GALL');
    });
  });

  describe('findByEmail', () => {
    it('should return a contact when found', async () => {
      const mockContact = {
        id: '1',
        email: 'alice@test.com',
        firstName: 'Alice',
        lastName: 'DUPONT',
        city: 'Paris',
        phone: null,
        brevoId: null,
        source: 'MANUAL',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.contact.findUnique.mockResolvedValue(mockContact);

      const result = await service.findByEmail('alice@test.com');

      expect(result).toEqual(mockContact);
      expect(mockPrismaService.contact.findUnique).toHaveBeenCalledWith({
        where: { email: 'alice@test.com' },
      });
    });

    it('should return null when contact not found', async () => {
      mockPrismaService.contact.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('unknown@test.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException if contact not found', async () => {
      mockPrismaService.contact.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return contact when found', async () => {
      const mockContact = {
        id: '1',
        email: 'alice@test.com',
        firstName: 'Alice',
        lastName: 'DUPONT',
        city: 'Paris',
        phone: null,
        brevoId: null,
        source: 'MANUAL',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.contact.findUnique.mockResolvedValue(mockContact);

      const result = await service.findById('1');

      expect(result).toEqual(mockContact);
    });
  });
});
