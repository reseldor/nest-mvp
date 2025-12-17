import { Entity, Column, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../enums/role.enum';
import { Article } from '../../articles/entities/article.entity';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('users')
export class User extends BaseEntity {
  @ApiProperty({ example: 'user@example.com' })
  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER,
  })
  role: Role;

  @OneToMany(() => Article, (article) => article.author)
  articles: Article[];
}
