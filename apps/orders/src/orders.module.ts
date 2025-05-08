import { Module } from '@nestjs/common';
import { OrdersController } from './entrypoints/orders.controller';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Ticket } from './entitites/ticket.entity';
import { Order } from './entitites/order.entity';
import { OrdersRepository } from './adapters/repositories/orders.repository';
import { CreateOrderUseCase } from './usecases/create-order.usecase';
import { GetOrderUseCase } from './usecases/get-order.usecase';
import { UpdateOrderUseCase } from './usecases/update-order.usecase';
import { DeleteOrderUseCase } from './usecases/delete-order.usecase';
import { GetAllOrdersUseCase } from './usecases/get-all-orders.usecase';
import { GetCurrentOrderUseCase } from './usecases/get-current-order.usecase';
import { CheckoutOrderUseCase } from './usecases/checkout-order.usecase';
import { RequestRefundUseCase } from './usecases/request-refund.usecase';
import { RemoveTicketUseCase } from './usecases/remove-ticket.usecase';
import { RabbitMQModule } from './services/rmq/rmq.module';
import { OrderMapper } from './domain/order.mapper';
import { HttpModule } from '@nestjs/axios';
import { PaymentsAdapter } from './adapters/payments/payments.adapter';
import { JwtPaymentAdapter } from './adapters/payments/facades/jwtPayment.facades';
import { wsPaymentsAdapter } from './adapters/payments/ws/wsPayments.adapter';
import { PaymentTrackingService } from './services/payment-tracking/payment-tracking.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('POSTGRES_HOST', 'postgres'),
        port: configService.get('POSTGRES_PORT', 5432),
        username: configService.get('POSTGRES_USER'),
        password: configService.get('POSTGRES_PASSWORD'),
        database: configService.get('POSTGRES_DB'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        autoLoadEntities: true,
      }),
    }),
    TypeOrmModule.forFeature([Ticket, Order]),
    RabbitMQModule,
    HttpModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrderMapper,
    OrdersRepository,
    CreateOrderUseCase,
    GetOrderUseCase,
    UpdateOrderUseCase,
    DeleteOrderUseCase,
    GetAllOrdersUseCase,
    GetCurrentOrderUseCase,
    CheckoutOrderUseCase,
    RequestRefundUseCase,
    RemoveTicketUseCase,
    PaymentsAdapter,
    JwtPaymentAdapter,
    wsPaymentsAdapter,
    PaymentTrackingService
  ],
})
export class OrdersModule {}
