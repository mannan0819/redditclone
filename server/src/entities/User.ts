import { Field, ObjectType } from "type-graphql";
import {
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  CreateDateColumn,
  Column,
  Entity,
  BaseEntity,
  OneToMany,
} from "typeorm";
import { Post } from "./post";

@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column({ unique: true })
  username!: string;

  @Field()
  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @OneToMany(() => Post, (post) => post.creator)
  posts: Post[];

  @Field(() => String)
  @CreateDateColumn()
  createdAt = new Date();

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;
}
