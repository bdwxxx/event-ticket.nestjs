import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CreateOrderUseCase } from '../usecases/create-order.usecase';
import { GetOrderUseCase } from '../usecases/get-order.usecase';
import { UpdateOrderUseCase } from '../usecases/update-order.usecase';
import { DeleteOrderUseCase } from '../usecases/delete-order.usecase';
import { GetAllOrdersUseCase } from '../usecases/get-all-orders.usecase';
import { GetCurrentOrderUseCase } from '../usecases/get-current-order.usecase';
import { CheckoutOrderUseCase } from '../usecases/checkout-order.usecase';
import { RequestRefundUseCase } from '../usecases/request-refund.usecase';
import { RemoveTicketUseCase } from '../usecases/remove-ticket.usecase';
import { CreatePaymentDto } from 'src/dto/createPayment.dto';

@Controller('order')
export class OrdersController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly getOrderUseCase: GetOrderUseCase,
    private readonly updateOrderUseCase: UpdateOrderUseCase,
    private readonly deleteOrderUseCase: DeleteOrderUseCase,
    private readonly getAllOrdersUseCase: GetAllOrdersUseCase,
    private readonly getCurrentOrderUseCase: GetCurrentOrderUseCase,
    private readonly checkoutOrderUseCase: CheckoutOrderUseCase,
    private readonly requestRefundUseCase: RequestRefundUseCase,
    private readonly removeTicketUseCase: RemoveTicketUseCase,
  ) {}

  @Post()
  async createOrder(@Headers('X-USER-ID') userId: string) {
    return this.createOrderUseCase.execute(userId);
  }

  @Put()
  async updateOrder(
    @Body('orderId') orderId: number,
    @Body('eventId') eventId: number,
    @Body('price') price: number,
  ) {
    return this.updateOrderUseCase.execute(orderId, eventId, price);
  }

  @Delete(':id')
  async deleteOrder(
    @Param('id') id: number,
    @Headers('X-USER-ID') userId: string,
  ) {
    return this.deleteOrderUseCase.execute(id, userId);
  }

  @Get(':id')
  async getOrder(
    @Param('id') id: number,
    @Headers('X-USER-ID') userId: string,
  ) {
    return this.getOrderUseCase.execute(id, userId);
  }

  @Get()
  async getAllOrders(@Headers('X-USER-ID') userId: string) {
    return this.getAllOrdersUseCase.execute(userId);
  }

  @Get('current')
  async getCurrentOrder(@Headers('X-USER-ID') userId: string) {
    return this.getCurrentOrderUseCase.execute(userId);
  }

  @Post(':id/checkout')
  async checkoutOrder(@Param('id') orderId: number, @Body() paymentData: CreatePaymentDto) {
    return this.checkoutOrderUseCase.execute(orderId, paymentData);
  }

  @Post(':id/refund')
  async requestRefund(
    @Param('id') orderId: number,
    @Headers('X-USER-ID') userId: string,
  ) {
    return this.requestRefundUseCase.execute(orderId, userId);
  }

  @Delete(':id/ticket/:ticketId')
  async removeTicketFromOrder(
    @Param('id') orderId: number,
    @Param('ticketId') ticketId: number,
  ) {
    return this.removeTicketUseCase.execute(orderId, ticketId);
  }
}
