import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Article } from './entities/article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticleDto, SortOrder } from './dto/query-article.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { UsersService } from '../users/users.service';
import { Role } from '../users/enums/role.enum';

@Injectable()
export class ArticlesService {
  private readonly cacheTtl: number;

  constructor(
    @InjectRepository(Article)
    private articlesRepository: Repository<Article>,
    @Inject('REDIS_CLIENT') private redisClient: Redis,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {
    this.cacheTtl = this.configService.get('redis.ttl') || 3600;
  }

  async create(createArticleDto: CreateArticleDto, userId: string): Promise<Article> {
    const article = this.articlesRepository.create({
      ...createArticleDto,
      authorId: userId,
    });

    const savedArticle = await this.articlesRepository.save(article);
    await this.invalidateCache();
    return savedArticle;
  }

  async findAll(queryDto: QueryArticleDto): Promise<PaginatedResult<Article>> {
    const { page = 1, limit = 10, authorId, startDate, endDate, sortOrder } = queryDto;

    // Build cache key
    const cacheKey = `articles:${page}:${limit}:${authorId || 'all'}:${startDate || 'none'}:${endDate || 'none'}:${sortOrder}`;

    // Try to get from cache
    const cached = await this.redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Build query
    const queryBuilder = this.articlesRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .select([
        'article.id',
        'article.title',
        'article.description',
        'article.content',
        'article.createdAt',
        'article.updatedAt',
        'author.id',
        'author.email',
      ]);

    const conditions: string[] = [];
    const params: Record<string, any> = {};

    if (authorId) {
      conditions.push('article.authorId = :authorId');
      params.authorId = authorId;
    }

    if (startDate && endDate) {
      conditions.push('article.createdAt BETWEEN :startDate AND :endDate');
      params.startDate = startDate;
      params.endDate = endDate;
    } else if (startDate) {
      conditions.push('article.createdAt >= :startDate');
      params.startDate = startDate;
    } else if (endDate) {
      conditions.push('article.createdAt <= :endDate');
      params.endDate = endDate;
    }

    if (conditions.length > 0) {
      queryBuilder.where(conditions.join(' AND '), params);
    }

    queryBuilder.orderBy('article.createdAt', sortOrder || SortOrder.DESC);

    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const result: PaginatedResult<Article> = {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    // Cache the result
    await this.redisClient.setex(cacheKey, this.cacheTtl, JSON.stringify(result));

    return result;
  }

  async findOne(id: string): Promise<Article> {
    const cacheKey = `article:${id}`;

    // Try to get from cache
    const cached = await this.redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const article = await this.articlesRepository.findOne({
      where: { id },
      relations: ['author'],
      select: {
        author: {
          id: true,
          email: true,
        },
      },
    });

    if (!article) {
      throw new NotFoundException(`Article with ID ${id} not found`);
    }

    // Cache the result
    await this.redisClient.setex(cacheKey, this.cacheTtl, JSON.stringify(article));

    return article;
  }

  async update(id: string, updateArticleDto: UpdateArticleDto, userId: string): Promise<Article> {
    const article = await this.findOne(id);
    const user = await this.usersService.findOne(userId);

    // Check ownership
    if (article.authorId !== userId && user.role !== Role.ADMIN) {
      throw new ForbiddenException('You do not have permission to update this article');
    }

    Object.assign(article, updateArticleDto);
    const updatedArticle = await this.articlesRepository.save(article);

    // Invalidate cache
    await this.invalidateArticleCache(id);
    await this.invalidateCache();

    return updatedArticle;
  }

  async remove(id: string, userId: string): Promise<void> {
    const article = await this.findOne(id);
    const user = await this.usersService.findOne(userId);

    // Check ownership
    if (article.authorId !== userId && user.role !== Role.ADMIN) {
      throw new ForbiddenException('You do not have permission to delete this article');
    }

    await this.articlesRepository.remove(article);

    // Invalidate cache
    await this.invalidateArticleCache(id);
    await this.invalidateCache();
  }

  private async invalidateArticleCache(id: string): Promise<void> {
    await this.redisClient.del(`article:${id}`);
  }

  private async invalidateCache(): Promise<void> {
    const keys = await this.redisClient.keys('articles:*');
    if (keys.length > 0) {
      await this.redisClient.del(...keys);
    }
  }
}
