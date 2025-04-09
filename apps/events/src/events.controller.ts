import { Controller, Delete, Get, Post, Put, Query } from '@nestjs/common';
import { EventsService } from './events.service';
import { GetEventsDto } from './dto/get-events.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  createEvent() {
    return this.eventsService.createEvent();
  }

  @Put(':id')
  updateEvent() {
    return this.eventsService.updateEvent();
  }

  @Delete(':id')
  deleteEvent() {
    return this.eventsService.deleteEvent();
  }

  @Get(':id')
  getEvent() {
    return this.eventsService.getEvent();
  }

  @Get()
  getEvents(@Query() query: GetEventsDto) {
    return this.eventsService.getEvents(query); 
  }
}
