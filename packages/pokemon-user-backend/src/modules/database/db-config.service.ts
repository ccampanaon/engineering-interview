import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SomeEntity } from './entities/some.entity';

@Injectable()
export class DbConfigService {
  async createTypeOrmOptions(): Promise<TypeOrmModuleOptions> {
    return {
      type: 'postgres',
      host: process.env['DB_HOST'] ?? 'localhost',
      port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
      username: process.env['DB_USERNAME'] ?? 'admin',
      password: process.env['DB_PASSWORD'] ?? 'admin',
      database: process.env['DB_NAME'] ?? 'pokemon',
      entities: [SomeEntity],
      synchronize: true,
    };
  }
}
