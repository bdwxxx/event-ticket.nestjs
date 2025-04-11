import { NestFactory } from '@nestjs/core';
import { EventsModule } from './events.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(EventsModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  const port = process.env.PORT || 3001;
  await app.listen(port);
}
bootstrap();
