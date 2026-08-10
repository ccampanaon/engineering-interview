import { EntityManager } from '@mikro-orm/postgresql';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Pokemon } from '../database/entities/pokemon.entity.js';
import { Profile } from '../database/entities/profile.entity.js';

export interface ProfileDto {
  id: string;
  name: string;
  pokemon: string[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ProfilesService {
  constructor(private readonly em: EntityManager) {}

  async findAll(): Promise<ProfileDto[]> {
    // Joined strategy: one query (profiles left-joined through the pivot to
    // pokemon) regardless of profile count — no N+1.
    const profiles = await this.em.find(
      Profile,
      {},
      { populate: ['pokemon'], strategy: 'joined' }
    );
    return profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      pokemon: profile.pokemon.getItems().map((pokemon) => pokemon.id),
    }));
  }

  async create(name: unknown): Promise<ProfileDto> {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new BadRequestException('name must be a non-empty string');
    }

    const profile = new Profile();
    profile.name = name;
    this.em.persist(profile);
    await this.em.flush();

    return { id: profile.id, name: profile.name, pokemon: [] };
  }

  async replaceTeam(profileId: string, pokemonIds: unknown): Promise<ProfileDto> {
    const ids = this.validatePokemonIds(pokemonIds);

    // profileId comes from the route, not the body: a malformed value can't
    // match any row, so we treat it as "not found" rather than querying
    // Postgres with an invalid uuid literal (which would throw a raw DB
    // error instead of the 404 the API contract promises). Checked before
    // opening the transaction so a malformed id doesn't pay for a BEGIN it
    // has no use for.
    if (!UUID_RE.test(profileId)) {
      throw new NotFoundException('profile not found');
    }

    return this.em.transactional(async (em) => {
      const profile = await em.findOne(Profile, { id: profileId });
      if (!profile) {
        throw new NotFoundException('profile not found');
      }

      let pokemon: Pokemon[] = [];
      if (ids.length > 0) {
        pokemon = await em.find(Pokemon, { id: { $in: ids } });
        if (pokemon.length !== ids.length) {
          const found = new Set(pokemon.map((p) => p.id));
          const unknown = ids.filter((id) => !found.has(id));
          throw new BadRequestException(`unknown pokemon id(s): ${unknown.join(', ')}`);
        }
      }

      // profile.pokemon is left un-populated on purpose: Collection#set on an
      // uninitialized collection wipes and reinserts the pivot rows at flush
      // instead of diffing against a loaded snapshot, which both matches the
      // "full replace" contract and skips a join query we don't need.
      profile.pokemon.set(pokemon);

      return { id: profile.id, name: profile.name, pokemon: ids };
    });
  }

  private validatePokemonIds(pokemonIds: unknown): string[] {
    if (!Array.isArray(pokemonIds)) {
      throw new BadRequestException('pokemon must be an array');
    }
    // The typeof guard runs before the regex test so a non-string element
    // (number, null, object) is rejected outright rather than coerced to a
    // string by RegExp#test.
    const allValidUuids = pokemonIds.every(
      (id): id is string => typeof id === 'string' && UUID_RE.test(id)
    );
    if (!allValidUuids) {
      throw new BadRequestException('pokemon must contain only strings that are valid uuids');
    }
    if (pokemonIds.length > 6) {
      throw new BadRequestException('pokemon must contain at most 6 ids');
    }
    // Lower-cased before the duplicate check: Postgres's uuid type compares
    // case-insensitively, so two ids differing only in case are the same row
    // as far as the database (and the duplicate check) is concerned.
    const ids = pokemonIds.map((id) => id.toLowerCase());
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('pokemon must not contain duplicate ids');
    }
    return ids;
  }
}
