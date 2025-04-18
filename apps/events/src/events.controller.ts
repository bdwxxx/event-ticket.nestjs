import { Controller, Delete, Get, Post, Put, Query, Param, Body } from '@nestjs/common';
import { EventsService } from './events.service';
import { GetEventsDto } from './dto/get-events.dto';
import { Roles } from './guards/roles.decorator';
import { Role } from './guards/role.enum';
import { Event } from './db/entities/events.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles(Role.ADMIN)
  createEvent(@Body() eventData: CreateEventDto) {
    return this.eventsService.createEvent(eventData);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  updateEvent(@Param('id') id: string, @Body() eventData: UpdateEventDto) {
    return this.eventsService.updateEvent(id, eventData);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async deleteEvent(@Param('id') id: string): Promise<{ success: boolean }> {
    const result = await this.eventsService.deleteEvent(id);
    return { success: result };
  }

  @Get(':id')
  @Roles(Role.USER, Role.ADMIN)
  getEvent(@Param('id') id: string) {
    return this.eventsService.getEvent(id);
  }

  @Get()
  @Roles(Role.USER, Role.ADMIN)
  getEvents(@Query() query: GetEventsDto) {
    return this.eventsService.getEvents(query);
  }
}
