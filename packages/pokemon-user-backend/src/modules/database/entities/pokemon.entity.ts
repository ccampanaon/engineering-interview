import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

@Entity()
export class Pokemon {
  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @Property({ type: 'integer', unique: true })
  pokedexNumber!: number;

  @Property({ type: 'text' })
  name!: string;
}
