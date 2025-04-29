export class OrderNotFoundException extends Error {
  constructor(message: string = 'Order not found') {
    super(message);
    this.name = 'OrderNotFoundException';
  }
}

export class RefundWindowExpiredException extends Error {
  constructor(message: string = 'Refund window expired') {
    super(message);
    this.name = 'RefundWindowExpiredException';
  }
}