import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({
  name: 'events',
})
export class Event {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'int',
  })
  id: number;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  name: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: false,
  })
  description: string;

  @Column({
    name: 'event_date',
    type: 'timestamp',
    nullable: false,
  })
  eventDate: Date;

  @Column({
    name: 'available_tickets',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  availableTickets: string;

  @Column({
    name: 'ticket_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
  })
  ticketPrice: number;
}
