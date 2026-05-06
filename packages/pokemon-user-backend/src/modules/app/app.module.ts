import { Module } from '@nestjs/common';
import { DbModule } from '../database/db.module.js';
import { AppController } from './app.controller.js';

@Module({
  imports: [DbModule],
  controllers: [AppController],
})
export class AppModule {}
