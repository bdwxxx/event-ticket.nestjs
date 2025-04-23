import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  eventDate?: Date;

  @IsOptional()
  @IsString()
  availableTickets?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  ticketPrice?: number;
}
