import type { EntityManager } from '@mikro-orm/postgresql';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Pokemon } from '../database/entities/pokemon.entity.js';
import { Profile } from '../database/entities/profile.entity.js';
import { ProfilesService } from './profiles.service.js';

function createPokemon(): Pokemon {
  const pokemon = new Pokemon();
  pokemon.id = crypto.randomUUID();
  pokemon.pokedexNumber = 1;
  pokemon.name = 'Bulbasaur';
  return pokemon;
}

// A real `Collection` requires the owning entity to have been hydrated by a
// live MikroORM instance (its `.set()`/`.remove()` reach for entity-helper
// metadata a bare `new Profile()` never gets). This fake models only the
// piece of the contract our service depends on and that the plan leans on:
// `set()` replaces the backing array wholesale rather than appending to it.
class FakeCollection<T> {
  #items: T[];
  constructor(items: T[] = []) {
    this.#items = items;
  }
  set(items: T[]): void {
    this.#items = [...items];
  }
  getItems(): T[] {
    return this.#items;
  }
}

function createProfile(id: string, pokemon: Pokemon[] = []): Profile {
  const profile = new Profile();
  profile.id = id;
  profile.name = 'Ash';
  profile.pokemon = new FakeCollection(pokemon) as unknown as Profile['pokemon'];
  return profile;
}

function createMockEm() {
  const em = {
    find: vi.fn(),
    findOne: vi.fn(),
    persist: vi.fn(),
    flush: vi.fn(),
    transactional: vi.fn(async (cb: (em: unknown) => unknown) => cb(em)),
  };
  return em as unknown as EntityManager & {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    persist: ReturnType<typeof vi.fn>;
    flush: ReturnType<typeof vi.fn>;
    transactional: ReturnType<typeof vi.fn>;
  };
}

describe('ProfilesService', () => {
  let em: ReturnType<typeof createMockEm>;
  let service: ProfilesService;

  beforeEach(() => {
    em = createMockEm();
    service = new ProfilesService(em);
  });

  describe('findAll', () => {
    it('maps profiles to DTOs with their pokemon ids', async () => {
      const pokemonA = createPokemon();
      const profile = createProfile(crypto.randomUUID(), [pokemonA]);
      em.find.mockResolvedValue([profile]);

      const result = await service.findAll();

      expect(em.find).toHaveBeenCalledWith(
        Profile,
        {},
        { populate: ['pokemon'], strategy: 'joined' }
      );
      expect(result).toEqual([{ id: profile.id, name: profile.name, pokemon: [pokemonA.id] }]);
    });
  });

  describe('create', () => {
    it.each([
      ['missing', undefined],
      ['non-string', 42],
      ['empty', ''],
      ['whitespace-only', '   '],
    ])('rejects a %s name with BadRequestException', async (_label, name) => {
      await expect(service.create(name)).rejects.toBeInstanceOf(BadRequestException);
      expect(em.persist).not.toHaveBeenCalled();
      expect(em.flush).not.toHaveBeenCalled();
    });

    it('persists and returns a profile for a valid name', async () => {
      const result = await service.create('Ash');

      expect(em.persist).toHaveBeenCalledTimes(1);
      expect(em.flush).toHaveBeenCalledTimes(1);
      const persisted = em.persist.mock.calls[0][0] as Profile;
      expect(persisted).toBeInstanceOf(Profile);
      expect(persisted.name).toBe('Ash');
      expect(result).toEqual({ id: persisted.id, name: 'Ash', pokemon: [] });
    });

    it('stores the name exactly as submitted, without trimming', async () => {
      const result = await service.create('  Ash  ');

      expect(result.name).toBe('  Ash  ');
      const persisted = em.persist.mock.calls[0][0] as Profile;
      expect(persisted.name).toBe('  Ash  ');
    });
  });

  describe('replaceTeam', () => {
    const profileId = crypto.randomUUID();

    it('rejects a non-array body', async () => {
      await expect(service.replaceTeam(profileId, { pokemon: [] })).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it('rejects an array containing a malformed uuid string', async () => {
      await expect(service.replaceTeam(profileId, ['not-a-uuid'])).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it('rejects an array containing a non-string element without throwing on the regex check', async () => {
      await expect(service.replaceTeam(profileId, [42, null, {}])).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it('rejects more than 6 ids', async () => {
      const ids = Array.from({ length: 7 }, () => crypto.randomUUID());
      await expect(service.replaceTeam(profileId, ids)).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it('rejects duplicate ids', async () => {
      const id = crypto.randomUUID();
      await expect(service.replaceTeam(profileId, [id, id])).rejects.toBeInstanceOf(
        BadRequestException
      );
    });

    it('returns 404 when the profile does not exist', async () => {
      em.findOne.mockResolvedValue(null);

      await expect(service.replaceTeam(profileId, [])).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns 404 for a malformed profileId without opening a transaction', async () => {
      await expect(service.replaceTeam('not-a-uuid', [])).rejects.toBeInstanceOf(
        NotFoundException
      );
      expect(em.transactional).not.toHaveBeenCalled();
      expect(em.findOne).not.toHaveBeenCalled();
    });

    it('rejects duplicate ids that differ only in case', async () => {
      const id = crypto.randomUUID();
      await expect(
        service.replaceTeam(profileId, [id.toLowerCase(), id.toUpperCase()])
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects ids that do not match an existing pokemon, naming the offending id', async () => {
      const known = createPokemon();
      const unknownId = crypto.randomUUID();
      em.findOne.mockResolvedValue(createProfile(profileId));
      em.find.mockResolvedValue([known]);

      await expect(service.replaceTeam(profileId, [known.id, unknownId])).rejects.toThrow(
        new RegExp(unknownId)
      );
    });

    it('replaces the team and returns the updated profile', async () => {
      const pokemonA = createPokemon();
      const pokemonB = createPokemon();
      const profile = createProfile(profileId);
      em.findOne.mockResolvedValue(profile);
      em.find.mockResolvedValue([pokemonA, pokemonB]);

      const result = await service.replaceTeam(profileId, [pokemonA.id, pokemonB.id]);

      expect(profile.pokemon.getItems()).toEqual([pokemonA, pokemonB]);
      expect(em.transactional).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        id: profileId,
        name: 'Ash',
        pokemon: [pokemonA.id, pokemonB.id],
      });
    });

    it('allows clearing the team with an empty array, skipping the pokemon lookup', async () => {
      const profile = createProfile(profileId, [createPokemon()]);
      em.findOne.mockResolvedValue(profile);

      const result = await service.replaceTeam(profileId, []);

      expect(em.find).not.toHaveBeenCalled();
      expect(profile.pokemon.getItems()).toEqual([]);
      expect(result.pokemon).toEqual([]);
    });

    // Full-replace semantics (the old team can't survive alongside the new
    // one) come from MikroORM's real Collection#set on an uninitialized
    // collection wiping the pivot table rather than diffing it — verified
    // against the installed source, not something FakeCollection can
    // exercise. What this test proves at the service boundary: the new list
    // handed to .set() is exactly the replacement, never the old + new union.
    it('passes only the new ids to the collection, not merged with the old team', async () => {
      const [pokemonA, pokemonB, pokemonC, pokemonD] = [
        createPokemon(),
        createPokemon(),
        createPokemon(),
        createPokemon(),
      ];
      const profile = createProfile(profileId, [pokemonA, pokemonB]);
      em.findOne.mockResolvedValue(profile);
      em.find.mockResolvedValue([pokemonC, pokemonD]);

      await service.replaceTeam(profileId, [pokemonC.id, pokemonD.id]);

      expect(profile.pokemon.getItems()).toEqual([pokemonC, pokemonD]);
    });
  });
});
