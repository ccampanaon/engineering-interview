import styled from '@emotion/styled';
import { VirtuosoGrid } from 'react-virtuoso';
import { PokemonCard } from './pokemon-card.js';

interface Pokemon {
  id: string;
  pokedexNumber: number;
  name: string;
}

const GridList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
`;

export function VirtualizedPokemonGrid({
  pokemon,
  isSelected,
  onToggle,
}: {
  pokemon: Pokemon[];
  isSelected: (id: string) => boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <VirtuosoGrid
      style={{ height: 600 }}
      data={pokemon}
      components={{ List: GridList }}
      computeItemKey={(_index, p) => p.id}
      itemContent={(_index, p) => (
        <PokemonCard pokemon={p} highlighted={isSelected(p.id)} onClick={() => onToggle(p.id)} />
      )}
    />
  );
}
