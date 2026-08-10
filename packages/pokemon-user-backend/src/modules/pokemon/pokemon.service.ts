import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { Pokemon } from '../database/entities/pokemon.entity.js';

export interface PokemonDto {
  id: string;
  pokedexNumber: number;
  name: string;
}

@Injectable()
export class PokemonService {
  constructor(private readonly em: EntityManager) {}

  async findAll(): Promise<PokemonDto[]> {
    const pokemon = await this.em.find(
      Pokemon,
      {},
      { orderBy: { pokedexNumber: 'asc' } }
    );
    return pokemon.map(({ id, pokedexNumber, name }) => ({
      id,
      pokedexNumber,
      name,
    }));
  }
}
