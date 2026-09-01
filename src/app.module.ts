import { Module } from '@nestjs/common';
import { ConfigModule } from 'node_modules/@nestjs/config/dist/config.module';
import { MongoModule } from './shared/infrastructure/database/mongodb/mongo.module';
import { DrizzleModule } from './shared/infrastructure/database/postgres/drizzle.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongoModule,
    DrizzleModule,
  ],
})
export class AppModule {}
