import { HttpException, HttpStatus } from '@nestjs/common';

export class OrderNotFoundException extends HttpException {
  constructor(message: string = 'Order not found') {
    super(message, HttpStatus.NOT_FOUND);
    this.name = 'OrderNotFoundException';
  }
}

export class RefundWindowExpiredException extends HttpException {
  constructor(message: string = 'Refund window expired') {
    super(message, HttpStatus.BAD_REQUEST);
    this.name = 'RefundWindowExpiredException';
  }
}
