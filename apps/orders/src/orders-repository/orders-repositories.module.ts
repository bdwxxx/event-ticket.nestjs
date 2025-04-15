import { Module } from "@nestjs/common";
import { OrdersRepositoriesService } from "./orders-repositories.service";

@Module({
    imports: [],
    controllers: [],
    providers: [OrdersRepositoriesService],
    exports: [],
})

export class OrdersRepositoriesModule {}