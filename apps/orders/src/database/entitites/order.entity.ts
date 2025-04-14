import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Ticket } from "./ticket.entity";

@Entity({
    name: 'order',
})
export class Order {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    order_status: string;

    @Column()
    user_id: number;

    @OneToMany(() => Ticket, (ticket) => ticket.order)
    tickets: Ticket[];
}