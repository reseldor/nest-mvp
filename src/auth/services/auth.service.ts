import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/services/users.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { LoginResponseDto } from '../dto/login.response.dto';
import { Role } from '@/users/enums/role.enum';
import { Article } from '@/articles/entities/article.entity';
import { BcryptService } from './bcrypt.service';

type ValidatedPayload = {
  email: string;
  password: string;
};

type ValidatedUserResult = {
  email: string;
  role: Role;
  articles: Article[];
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly bcryptService: BcryptService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<LoginResponseDto> {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }
    dto.password = await this.bcryptService.hash(dto.password);
    const user = await this.usersService.create({
      ...dto,
      role: undefined, // Default role will be set in entity (UserEntity)
    });

    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.validateUser({ email: dto.email, password: dto.password });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  async refresh(userId: string): Promise<{ accessToken: string }> {
    const user = await this.usersService.findOne(userId);
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload, {
        secret: this.configService.get('jwt.accessTokenSecret'),
        expiresIn: this.configService.get('jwt.accessTokenExpiresIn'),
      }),
    };
  }

  async logout(userId: string): Promise<void> {
    //this.redisService.delete(`user-${userId}`);
    console.log(`User with ID ${userId} logged out`); //temp console log
  }

  async validateUser(payload: ValidatedPayload): Promise<ValidatedUserResult | null> {
    const user = await this.usersService.findByEmail(payload.email);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const isMatch = await this.bcryptService.compare(payload.password, user.password);
    if (!isMatch) {
      throw new BadRequestException('Password does not match');
    }
    return user;
  }

  private issueTokens(userId: string, email: string, role: string): LoginResponseDto {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.accessTokenSecret'),
      expiresIn: this.configService.get('jwt.accessTokenExpiresIn'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.refreshTokenSecret'),
      expiresIn: this.configService.get('jwt.refreshTokenExpiresIn'),
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
