import { Module } from '@nestjs/common';
import { ConfigModule } from 'node_modules/@nestjs/config/dist/config.module';
import { MongoModule } from './shared/infrastructure/database/mongodb/mongo.module';
import { DrizzleModule } from './shared/infrastructure/database/postgres/drizzle.module';
import { CqrsModule } from '@nestjs/cqrs';
import { ProductModule } from './product/product.module';

@Module({
  imports: [
    CqrsModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    ProductModule,
    MongoModule,
    DrizzleModule,
  ],
})
export class AppModule {}
