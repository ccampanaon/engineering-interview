import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './app';

interface Pokemon {
  id: string;
  pokedexNumber: number;
  name: string;
}

interface Profile {
  id: string;
  name: string;
  pokemon: string[];
}

const POKEMON: Pokemon[] = [
  { id: 'p1', pokedexNumber: 1, name: 'Bulbasaur' },
  { id: 'p2', pokedexNumber: 4, name: 'Charmander' },
];

const PROFILES: Profile[] = [{ id: 'pr1', name: 'Ash', pokemon: ['p1'] }];

// react-virtuoso relies on real browser layout (ResizeObserver, offsetParent)
// to decide what to render, none of which jsdom provides — it would render
// zero rows regardless of data. Virtualization behavior is react-virtuoso's
// concern, not this app's, so the grid is replaced with a plain list that
// renders every item it's given, letting the test target what App actually
// owns: wiring fetched data into that grid.
vi.mock('./virtualized-pokemon-grid.js', () => ({
  VirtualizedPokemonGrid: ({ pokemon }: { pokemon: Pokemon[] }) => (
    <ul>
      {pokemon.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  ),
}));

function mockFetchResponses(pokemon: Pokemon[], profiles: Profile[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/pokemon')) {
        return Promise.resolve(new Response(JSON.stringify(pokemon), { status: 200 }));
      }
      if (url.includes('/api/profiles')) {
        return Promise.resolve(new Response(JSON.stringify(profiles), { status: 200 }));
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    })
  );
}

describe('App', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the fetched pokemon list and profile section', async () => {
    mockFetchResponses(POKEMON, PROFILES);

    render(<App />);

    expect(await screen.findByText('Bulbasaur')).toBeTruthy();
    expect(screen.getByText('Charmander')).toBeTruthy();

    expect(screen.getByRole('heading', { name: 'Profiles' })).toBeTruthy();
    expect(screen.getByText('Ash')).toBeTruthy();
  });

  it('shows an error message when the pokemon request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/pokemon')) {
          return Promise.resolve(new Response(null, { status: 500 }));
        }
        if (url.includes('/api/profiles')) {
          return Promise.resolve(new Response(JSON.stringify(PROFILES), { status: 200 }));
        }
        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
      })
    );

    render(<App />);

    await waitFor(() => expect(screen.getByText(/Failed to load pokemon/)).toBeTruthy());
  });
});
