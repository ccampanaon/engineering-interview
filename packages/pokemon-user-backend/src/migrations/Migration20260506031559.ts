import { Migration } from '@mikro-orm/migrations';

export class Migration20260506031559 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`alter table "some_entity" alter column "id" drop default;`);

    this.addSql(`alter table "some_entity" drop column "someCol";`);
    this.addSql(`alter table "some_entity" add "some_col" text not null;`);
    this.addSql(`alter table "some_entity" alter column "id" type uuid using ("id"::text::uuid);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "some_entity" alter column "id" type text using ("id"::text);`);

    this.addSql(`alter table "some_entity" drop column "some_col";`);
    this.addSql(`alter table "some_entity" add "someCol" varchar not null;`);
    this.addSql(`alter table "some_entity" alter column "id" type int4 using ("id"::int4);`);

    this.addSql(`create sequence if not exists "some_entity_id_seq";`);
    this.addSql(`select setval('some_entity_id_seq', (select max("id") from "some_entity"));`);
    this.addSql(`alter table "some_entity" alter column "id" set default nextval('some_entity_id_seq');`);
  }

}
