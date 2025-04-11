import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Event } from "../db/entities/events.entity";
import { Repository } from "typeorm";
import { IEventRepository } from "./events.interface";

@Injectable()
export class EventsRepositoryService implements IEventRepository {
    constructor(        
        @InjectRepository(Event)
        private readonly repositoriesService: Repository<Event>) 
    {}

    async create(eventData: Partial<Event>): Promise<Event> {
        const event = this.repositoriesService.create(eventData);
        return this.repositoriesService.save(event);
    }

    async findOne(filter: Partial<Event>): Promise<Event | null> {
        return this.repositoriesService.findOne({ where: filter });
    }

    async findById(id: string): Promise<Event | null> {
        return this.repositoriesService.findOne({ where: { id: Number(id) } });
    }

    async update(id: string, data: Partial<Event>): Promise<Event | null> {
        await this.repositoriesService.update(id, data);
        return this.findById(id);
    }

    async delete(id: string): Promise<boolean> {
        const result = await this.repositoriesService.delete(id);
        return (result.affected ?? 0) > 0;
    }
}