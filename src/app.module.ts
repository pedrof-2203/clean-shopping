import { Module } from '@nestjs/common';
import { ConfigModule } from 'node_modules/@nestjs/config/dist/config.module';
import { MongoModule } from './shared/infrastructure/database/mongodb/mongo.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), MongoModule],
})
export class AppModule {}
