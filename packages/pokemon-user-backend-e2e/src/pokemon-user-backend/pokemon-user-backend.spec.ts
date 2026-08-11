import axios from 'axios';

// These assert against a live backend (real HTTP, real seeded Postgres) —
// run `tilt up`, or `pnpm pokemon-user-backend:serve` against a reachable
// Postgres, then `nx e2e pokemon-user-backend-e2e`. Not part of `pnpm verify`
// or CI (see CLAUDE.md): this project only has an `e2e` target, not `test`.
describe('GET /api/pokemon', () => {
  it('returns all 150 seeded pokemon', async () => {
    const res = await axios.get('/api/pokemon');

    expect(res.status).toBe(200);
    expect(res.data).toHaveLength(150);
    for (const pokemon of res.data) {
      expect(pokemon).toEqual({
        id: expect.any(String),
        pokedexNumber: expect.any(Number),
        name: expect.any(String),
      });
    }
  });
});

describe('GET /api/profiles', () => {
  it('returns an array of profiles', async () => {
    const res = await axios.get('/api/profiles');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    for (const profile of res.data) {
      expect(profile).toEqual({
        id: expect.any(String),
        name: expect.any(String),
        pokemon: expect.any(Array),
      });
    }
  });
});
