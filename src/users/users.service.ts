import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { UserCreateInput } from './user.types';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async findByUsername(username: string): Promise<User | undefined> {
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) {
      throw new Error(`User with username ${username} not found`);
    }
    return user;
  }

  async update(id: number, user: Partial<User>): Promise<User> {
    const existingUser = await this.userRepository.findOne({ where: { id } });
    if (!existingUser) {
      throw new Error(`User with id ${id} not found`);
    }
    const updatedUser = {...existingUser, ...user};
    return await this.userRepository.save(updatedUser);
  }

  async create(user: UserCreateInput): Promise<User> {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(user.password, salt);
    const newUser = {...user, password: hashedPassword};
    return await this.userRepository.save(newUser);
  }
}
