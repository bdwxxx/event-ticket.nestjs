import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongo } from 'mongoose';
import { User, UserSchema } from './user.schema';
import { UserRepository } from './user.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],
  providers: [UserRepository],
  exports: [UserRepository],
})
export class UserModule {}
