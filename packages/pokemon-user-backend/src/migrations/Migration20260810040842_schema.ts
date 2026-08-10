import { Migration } from '@mikro-orm/migrations';

// DDL below matches `mikro-orm schema:create --dump` output for the current
// entity metadata verbatim, so the hand-written schema never drifts from what
// the ORM expects. Not reversible by design: the dev reset path is a wiped
// volume + `migration:up`, and a faithful down() would have to recreate
// `some_entity` and cascade-wipe seeded data.
export class Migration20260810040842_schema extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`drop table if exists "some_entity" cascade;`);

    this.addSql(
      `create table "pokemon" ("id" uuid not null, "pokedex_number" int not null, "name" text not null, primary key ("id"));`
    );
    this.addSql(
      `alter table "pokemon" add constraint "pokemon_pokedex_number_unique" unique ("pokedex_number");`
    );

    this.addSql(`create table "profile" ("id" uuid not null, "name" text not null, primary key ("id"));`);

    this.addSql(
      `create table "profile_pokemon" ("profile_id" uuid not null, "pokemon_id" uuid not null, primary key ("profile_id", "pokemon_id"));`
    );

    this.addSql(
      `alter table "profile_pokemon" add constraint "profile_pokemon_profile_id_foreign" foreign key ("profile_id") references "profile" ("id") on update cascade on delete cascade;`
    );
    this.addSql(
      `alter table "profile_pokemon" add constraint "profile_pokemon_pokemon_id_foreign" foreign key ("pokemon_id") references "pokemon" ("id") on update cascade on delete cascade;`
    );
  }

}
