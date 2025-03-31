import {
  Body,
  Controller,
  Headers,
  Post,
  HttpException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { AuthService } from './auth/auth.service';

@Controller()
export class AppController {
  constructor(private readonly authService: AuthService) {}

  @Post('/signup')
  async signup(@Body() body: { name: string; password: string }) {
    return this.authService.signUp(body.name, body.password);
  }

  @Post('/signin')
  async singin(@Body() body: { name: string; password: string }) {
    return this.authService.signIn(body.name, body.password);
  }

  @Post('/webhook-check')
  async webhookCheck(@Headers('authorization') authorization: string) {
    if (!authorization) {
      throw new HttpException(
        'Authorization header is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const token = authorization.startsWith('Bearer ')
      ? authorization.split(' ')[1]
      : authorization;

    await this.authService.webhookCheck(token);

    return;
  }
}
