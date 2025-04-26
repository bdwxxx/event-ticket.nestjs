import { Body, Controller, Delete, Get, Head, Headers, Param, Post, Put } from '@nestjs/common';
import { OrdersRepository } from 'src/adapters/repositories/orders.repository';
import { OrdersService } from 'src/services/orders.service';


@Controller('order')
export class OrdersController {
  constructor(
    private readonly orderService: OrdersService,
  ) {}

  @Post()
  async createOrder(@Headers('X_USER_ID') userId: number) {
    return this.orderService.createOrder(userId); 
  }

  @Put()
  async updateOrder(
    @Body('orderId') orderId: number,
    @Body('eventId') eventId: number,
    @Body('price') price: number,
  ) {
    return this.orderService.updateOrder(orderId, eventId, price);
  }

  @Delete(':id')
  async deleteOrder(@Param('id') id: number, @Headers('X_USER_ID') userId: number) {
    return this.orderService.deleteOrder(id, userId);
  }

  @Get(':id')
  async getOrder(@Param('id') id: number, @Headers('X_USER_ID') userId: number) {
    return this.orderService.getOrder(id, userId);
  }

  @Get()
  async getAllOrders(@Headers('X_USER_ID') userId: number) {
    return this.orderService.getAllOrders(userId);
  }

  @Get('current')
  async getCurrentOrder(@Headers('X_USER_ID') userId: number) {
    return this.orderService.getCurrentOrder(userId);
  }  

  @Post(':id/checkout')
  async checkoutOrder(
    @Param('id') orderId: number,
    ) {
    return this.orderService.checkoutOrder(orderId);
  }

  @Post(':id/refund')
  async requestRefund(
    @Param('id') orderId: number,
    @Headers('X_USER_ID') userId: number
    ) {
    return this.orderService.requestRefund(orderId, userId);
  }

  @Delete(':id/ticket/:ticketId')
  async removeTicketFromOrder(
    @Param('id') orderId: number,
    @Param('ticketId') ticketId: number,
  ) {
    return this.orderService.removeTicketFromOrder(orderId, ticketId);
  }
}
