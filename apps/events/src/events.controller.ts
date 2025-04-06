import { Controller, Get, Post } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  getHello(): string {
    return this.eventsService.getHello();
  }

  @Post('events')
  createEvent(): string {
    return 'Event created'
  }
}
