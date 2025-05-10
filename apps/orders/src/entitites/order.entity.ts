import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';

export enum OrderStatus {
  CART = 'cart', // Заказ находится в корзине пользователя, еще не оформлен
  CREATED = 'created', // Заказ создан, но не оплачен
  PENDING = 'pending', // Заказ в очереди на обработку
  PAYMENT_PENDING = 'payment_pending', // Ожидание оплаты (20-минутное окно)
  PAID = 'paid', // Заказ успешно оплачен
  PAID_WITH_TRANSFER = 'paid_with_transfer', // Заказ оплачен через перевод
  DONE = 'done', // Заказ выполнен и доставлен
  REFUND_PENDING = 'refund_pending', // Ожидание обработки возврата
  REFUNDED = 'refunded', // Полный возврат средств выполнен
  PARTIAL_REFUNDED = 'partial_refunded', // Частичный возврат средств выполнен
}

@Entity({
  name: 'order',
})
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.CART,
    nullable: false,
  })
  order_status: string;

  @Column()
  user_id: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Ticket, (ticket) => ticket.order)
  tickets: Ticket[];
}
