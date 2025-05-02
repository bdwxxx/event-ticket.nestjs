import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';


  // This is a workaround to get the correct type for amqp.Connection and amqp.Channel 
  type AmqpConnection = ReturnType<typeof amqp.connect> extends Promise<infer T> ? T : never;
  type AmqpChannel = ReturnType<AmqpConnection['createChannel']> extends Promise<infer T> ? T : never;

@Injectable()
export class RmqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RmqService.name);
  protected connection: AmqpConnection | null = null;
  protected channel: AmqpChannel | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.closeConnection();
  }

  async connect(): Promise<void> {
    try {
      const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL');
      if (!rabbitmqUrl) {
        throw new Error('RABBITMQ_URL is not defined in the configuration');
      }
      this.logger.log(`Connecting to RabbitMQ at ${rabbitmqUrl}`);
      this.connection = await amqp.connect(rabbitmqUrl);
      if (!this.connection) {
        throw new Error('Failed to establish connection');
      }

      this.channel = await this.connection.createChannel();
      if (!this.channel) {
        throw new Error('Failed to create channel');
      }

      this.connection.on('error', (err) => {
        this.logger.error(`Connection error: ${err.message}`);
        this.reconnect();
      });

      this.connection.on('close', () => {
        this.logger.warn('Connection closed');
        this.reconnect();
      });

      this.logger.log('Connected to RabbitMQ');
    } catch (error) {
      this.logger.error(`Failed to connect: ${error.message}`);
      await this.reconnect();
    }
  }

  private async reconnect() {
    this.logger.log('Attempting to reconnect to RabbitMQ...');
    await this.closeConnection();
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await this.connect();
}

  async sendToQueue(queue: string, message: any): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel is not initialized');
    }
    try {
      await this.channel.assertQueue(queue, { durable: true });
      this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
        persistent: true,
      });
      this.logger.log(`Message sent to queue ${queue}`);
    } catch (error) {
      this.logger.error(
        `Failed to send message to queue ${queue}: ${error.message}`,
      );
      throw error;
    }
  }

  async closeConnection(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
    this.logger.log('RabbitMQ connection closed');
  }

  async consume(
    queue: string,
    callback: (msg: amqp.ConsumeMessage | null) => void,
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel is not initialized');
    }
    try {
      await this.channel.assertQueue(queue, { durable: true });
      this.channel.consume(queue, (msg) => {
        if (msg) {
          callback(msg);
          this.channel?.ack(msg);
        }
      });
      this.logger.log(`Started consuming from queue ${queue}`);
    } catch (error) {
      this.logger.error(
        `Failed to consume from queue ${queue}: ${error.message}`,
      );
      throw error;
    }
  }
}
