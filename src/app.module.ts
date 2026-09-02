import { Module } from '@nestjs/common';
import { MongoModule } from './shared/infrastructure/database/mongodb/mongo.module';
import { DrizzleModule } from './shared/infrastructure/database/postgres/drizzle.module';
import { CqrsModule } from '@nestjs/cqrs';
import { ProductModule } from './product/product.module';
import { ConfigModule } from '@nestjs/config';
import { CustomerModule } from './customer/customer.module';

@Module({
  imports: [
    CqrsModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    ProductModule,
    CustomerModule,
    MongoModule,
    DrizzleModule,
  ],
})
export class AppModule {}
