import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ProductsController } from './presentation/product.controller';
import { PRODUCT_REPOSITORY } from './application/ports/product.repository.port';
import { DrizzleProductRepository } from './infrastructure/adapters/drizzle-product.repository';
import { CommandHandlers } from './application';
import { QueryHandlers } from './application/queries';
import { ConfigService } from '@nestjs/config';
import { MongoProductRepository } from './infrastructure/adapters/mongo-product.repository';

@Module({
  imports: [CqrsModule],
  controllers: [ProductsController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    MongoProductRepository,
    DrizzleProductRepository,
    {
      provide: PRODUCT_REPOSITORY,
      useFactory: (
        configService: ConfigService,
        mongoRepo: MongoProductRepository,
        drizzleRepo: DrizzleProductRepository,
      ) => {
        return configService.get('DATABASE') === 'mongodb'
          ? mongoRepo
          : drizzleRepo;
      },
      inject: [ConfigService, MongoProductRepository, DrizzleProductRepository],
    },
  ],
})
export class ProductModule {}
