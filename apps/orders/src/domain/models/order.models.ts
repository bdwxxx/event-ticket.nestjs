export class Ticket {
  id: number;
  order_id: number;

  constructor(data: Partial<Ticket>) {
    Object.assign(this, data);
  }
}

export class Order {
  id: number;
  user_id: string;
  order_status: string;
  created_at: Date;
  tickets: Ticket[];

  constructor(data: Partial<Order>) {
    Object.assign(this, data);
  }

  canRequestRefund(): boolean {
    const now = new Date();
    const timeDiff =
      (now.getTime() - new Date(this.created_at).getTime()) / 1000 / 60;
    return timeDiff <= 20;
  }
}
