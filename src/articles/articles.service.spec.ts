import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { Article } from './entities/article.entity';
import { UsersService } from '../users/users.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticleDto, SortOrder } from './dto/query-article.dto';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/enums/role.enum';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let repository: Repository<Article>;
  let usersService: UsersService;
  let redisClient: any;

  const mockUser: User = {
    id: 'user-id',
    email: 'test@example.com',
    password: 'hashed',
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    articles: [],
  };

  const mockArticle: Article = {
    id: 'article-id',
    title: 'Test Article',
    description: 'Test Description',
    content: 'Test Content',
    authorId: 'user-id',
    author: mockUser,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
  };

  const mockRedisClient = {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'redis.ttl') return 3600;
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        {
          provide: getRepositoryToken(Article),
          useValue: mockRepository,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedisClient,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
    repository = module.get<Repository<Article>>(getRepositoryToken(Article));
    usersService = module.get<UsersService>(UsersService);
    redisClient = module.get('REDIS_CLIENT');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an article', async () => {
      const createDto: CreateArticleDto = {
        title: 'New Article',
        description: 'Description',
        content: 'Content',
      };

      mockRepository.create.mockReturnValue(mockArticle);
      mockRepository.save.mockResolvedValue(mockArticle);
      mockRedisClient.keys.mockResolvedValue([]);

      const result = await service.create(createDto, 'user-id');

      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        authorId: 'user-id',
      });
      expect(result).toEqual(mockArticle);
    });
  });

  describe('findOne', () => {
    it('should return article from cache', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockArticle));

      const result = await service.findOne('article-id');

      expect(result).toEqual(mockArticle);
      expect(repository.findOne).not.toHaveBeenCalled();
    });

    it('should return article from database and cache it', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValue(mockArticle);
      mockRedisClient.setex.mockResolvedValue('OK');

      const result = await service.findOne('article-id');

      expect(result).toEqual(mockArticle);
      expect(repository.findOne).toHaveBeenCalled();
      expect(redisClient.setex).toHaveBeenCalled();
    });

    it('should throw NotFoundException if article not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update article if user is owner', async () => {
      const updateDto: UpdateArticleDto = {
        title: 'Updated Title',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockArticle);
      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockRepository.save.mockResolvedValue({ ...mockArticle, ...updateDto });
      mockRedisClient.keys.mockResolvedValue([]);

      const result = await service.update('article-id', updateDto, 'user-id');

      expect(result.title).toBe('Updated Title');
    });

    it('should throw ForbiddenException if user is not owner', async () => {
      const updateDto: UpdateArticleDto = {
        title: 'Updated Title',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockArticle);
      mockUsersService.findOne.mockResolvedValue({
        ...mockUser,
        id: 'other-user-id',
      });

      await expect(
        service.update('article-id', updateDto, 'other-user-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to update any article', async () => {
      const updateDto: UpdateArticleDto = {
        title: 'Updated Title',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockArticle);
      mockUsersService.findOne.mockResolvedValue({
        ...mockUser,
        role: Role.ADMIN,
      });
      mockRepository.save.mockResolvedValue({ ...mockArticle, ...updateDto });
      mockRedisClient.keys.mockResolvedValue([]);

      const result = await service.update('article-id', updateDto, 'admin-id');

      expect(result.title).toBe('Updated Title');
    });
  });

  describe('remove', () => {
    it('should remove article if user is owner', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockArticle);
      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockRepository.remove.mockResolvedValue(mockArticle);
      mockRedisClient.keys.mockResolvedValue([]);

      await service.remove('article-id', 'user-id');

      expect(repository.remove).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not owner', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockArticle);
      mockUsersService.findOne.mockResolvedValue({
        ...mockUser,
        id: 'other-user-id',
      });

      await expect(
        service.remove('article-id', 'other-user-id'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

