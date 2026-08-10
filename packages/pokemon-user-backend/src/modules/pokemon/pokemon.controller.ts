import { Controller, Get } from '@nestjs/common';
import { PokemonService, type PokemonDto } from './pokemon.service.js';

@Controller('pokemon')
export class PokemonController {
  constructor(private readonly pokemonService: PokemonService) {}

  @Get()
  findAll(): Promise<PokemonDto[]> {
    return this.pokemonService.findAll();
  }
}
