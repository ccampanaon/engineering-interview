import { Migration } from '@mikro-orm/migrations';

export class Migration20260506031559 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table "some_entity" ("id" uuid not null, "some_col" text not null, constraint "some_entity_pkey" primary key ("id"));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "some_entity" cascade;`);
  }

}