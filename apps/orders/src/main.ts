import { NestFactory } from '@nestjs/core';
import { OrdersModule } from './orders.module';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const app = await NestFactory.create(OrdersModule);
  app.useWebSocketAdapter(new WsAdapter(app));

  await app.listen(process.env.port ?? 3002);
}
bootstrap();
