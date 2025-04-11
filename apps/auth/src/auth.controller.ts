import {
  Body,
  Controller,
  Headers,
  Post,
  HttpException,
  HttpStatus,
  HttpCode,
  Get,
  Res
} from '@nestjs/common';
import { AuthService } from './auth/auth.service';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/signup')
  async signup(@Body() body: { name: string; password: string }) {
    return this.authService.signUp(body.name, body.password);
  }

  @Post('/signin')
  async singin(@Body() body: { name: string; password: string }) {
    return this.authService.signIn(body.name, body.password);
  }

  @Get('/webhook-check')
  async webhookCheck(
    @Headers('authorization') authorization: string,
    @Res() response: Response,
  ) {
    if (!authorization) {
      throw new HttpException(
        'Authorization header is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const token = authorization.startsWith('Bearer ')
      ? (authorization.split(' ').at(1) ??
        (() => {
          throw new Error('Invalid authorization token format');
        })())
      : authorization;

    const result = await this.authService.webhookCheck(token);
    
    // Add the X-USER-ROLE header to the response
    response.setHeader('X-USER-ROLE', result.role);
    response.status(HttpStatus.OK).send();
  }
}
