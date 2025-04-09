import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventsRepositoryService } from './events-repository/events-repositories.service';
import { Event } from './db/entities/events.entity';

@Module({
  imports: [],
  controllers: [EventsController],
  providers: [EventsService, EventsRepositoryService],
})
export class EventsModule {}
