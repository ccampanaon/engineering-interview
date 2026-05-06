import { Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { AppController } from './app.controller';

@Module({
  imports: [DbModule],
  controllers: [AppController],
})
export class AppModule {}
