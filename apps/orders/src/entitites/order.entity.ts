import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Ticket } from "./ticket.entity";

export enum OrderStatus {
    CART = 'cart',
    CREATED = 'created',
    DONE = 'done',
    REFUND_PENDING = 'refund_pending',
    REFUNDED = 'refunded',
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
    user_id: number;

    @CreateDateColumn()
    created_at: Date;

    @OneToMany(() => Ticket, (ticket) => ticket.order)
    tickets: Ticket[];
}