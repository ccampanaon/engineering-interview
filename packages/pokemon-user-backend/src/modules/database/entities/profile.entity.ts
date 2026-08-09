import { Collection } from '@mikro-orm/core';
import { Entity, ManyToMany, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';
// Extensionless on purpose: the MikroORM CLI's TS loader cannot resolve the
// `.js` → `.ts` extension alias used elsewhere in the backend, and it loads
// this file transitively via mikro-orm.config.ts; adding `.js` here breaks
// `pnpm mikro-orm migration:*`.
import { Pokemon } from './pokemon.entity';

@Entity()
export class Profile {
  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @Property({ type: 'text' })
  name!: string;

  @ManyToMany({ entity: () => Pokemon, pivotTable: 'profile_pokemon', owner: true })
  pokemon = new Collection<Pokemon>(this);
}
