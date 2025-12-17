import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('articles')
export class Article extends BaseEntity {
  @ApiProperty({ example: 'My First Article' })
  @Column()
  title: string;

  @ApiProperty({ example: 'This is a short description', required: false })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({ example: 'Full article content goes here...' })
  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'author_id' })
  authorId: string;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, (user) => user.articles)
  @JoinColumn({ name: 'author_id' })
  author: User;
}
