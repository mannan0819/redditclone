import { Field, ObjectType } from "type-graphql";
import {
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  CreateDateColumn,
  Column,
  Entity,
  BaseEntity,
  ManyToOne,
} from "typeorm";
import { User } from "./User";

@ObjectType()
@Entity()
export class Post extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column()
  title!: string;

  @Field()
  @Column()
  text!: string;

  @Field()
  @Column({ default: 0 })
  points!: number;

  @Field()
  @Column()
  creatorId!: number;

  @ManyToOne(() => User, (user) => user.posts)
  creator!: User;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
