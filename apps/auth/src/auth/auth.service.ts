import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ITokenPayload } from './auth.interface';
import * as bcrypt from 'bcrypt';
import { UserRepository } from 'src/users/user.repository';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService,
  ) {}

  async signUp(
    name: string,
    password: string,
  ): Promise<{ accessToken: string }> {
    const userExists = await this.userRepository.findOne({ name });

    if (userExists) {
      throw new HttpException('User already exists', HttpStatus.BAD_REQUEST);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const createUser = await this.userRepository.create({
      name: name,
      password_hash: passwordHash,
      role: 'user',
    });

    const payload: ITokenPayload = {
      name: createUser.name,
      sub: createUser._id?.toString(),
      role: createUser.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRATION', '1h'),
    });

    return { accessToken };
  }

  async signIn(
    name: string,
    password: string,
  ): Promise<{ accessToken: string }> {
    const user = await this.userRepository.findOne({ name });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    const payload: ITokenPayload = {
      name: user.name,
      sub: user._id?.toString(),
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRATION', '1h'),
    });

    return { accessToken };
  }

  async webhookCheck(
    token: string,
  ): Promise<{ statusCode: number; role: string; userId: string }> {
    try {
      const decodedToken = await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });

      if (!decodedToken || !decodedToken.name) {
        throw new HttpException(
          'Invalid token payload',
          HttpStatus.UNAUTHORIZED,
        );
      }

      return {
        statusCode: HttpStatus.OK,
        role: decodedToken.role || 'user',
        userId: decodedToken.sub || '',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error.name === 'JsonWebTokenError') {
        throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
      } else if (error.name === 'TokenExpiredError') {
        throw new HttpException('Token expired', HttpStatus.UNAUTHORIZED);
      }

      throw new HttpException('Authentication failed', HttpStatus.FORBIDDEN);
    }
  }
}
