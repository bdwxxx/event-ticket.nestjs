import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsRepositoryService } from './events-repositories.service';
import { Event } from '../db/entities/events.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Event])],
  controllers: [],
  providers: [EventsRepositoryService],
  exports: [EventsRepositoryService],
})
export class EventsRepositoryModule {}
