import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { mockUsers } from './mockUsers';
import { ITokenPayload, IUser } from './auth.interface';

@Injectable()
export class AuthService {
  private readonly mockUsers = mockUsers; // This should be replaced with a real database in production

  constructor(private readonly jwtService: JwtService) {}

  async signUp(
    name: string,
    password: string,
  ): Promise<{ access_token: string }> {
    const userExists = this.mockUsers.find((user) => user.name === name); // In real apps, this should be a database query

    if (userExists) {
      // for future use
      throw new Error('User already exists');
    }

    const newUser: IUser = {
      id: this.mockUsers.length + 1,
      name,
      password_hash: password, // In a real app, this would be hashed
      role: 'user',
    };

    this.mockUsers.push(newUser); // In a real app, this would be a database operation

    const payload: ITokenPayload = {
      name: newUser.name,
      sub: newUser.id,
      role: newUser.role,
    };

    const access_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRATION || '1h',
    });

    return { access_token };
  }

  async signIn(
    name: string,
    password: string,
  ): Promise<{ access_token: string }> {
    const user = this.mockUsers.find(
      (user) => user.name === name && user.password_hash === password,
    ); // In a real app, this should be a database query

    if (!user) {
      // for future use
      throw new Error('Invalid credentials');
    }

    const payload: ITokenPayload = {
      name: user.name,
      sub: user.id,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRATION || '1h',
    });

    return { access_token };
  }

  async webhookCheck(token: string): Promise<{ statusCode: number }> {
    try {
      if (!token) {
        throw new HttpException('Token is required', HttpStatus.BAD_REQUEST);
      }

      const decodedToken = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      if (!decodedToken || !decodedToken.sub || !decodedToken.name) {
        throw new HttpException(
          'Invalid token payload',
          HttpStatus.UNAUTHORIZED,
        );
      }

      return {
        statusCode: HttpStatus.OK,
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
