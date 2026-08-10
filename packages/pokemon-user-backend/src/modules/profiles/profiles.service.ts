import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { Profile } from '../database/entities/profile.entity.js';

export interface ProfileDto {
  id: string;
  name: string;
  pokemon: string[];
}

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
}
