import styled from '@emotion/styled';

const CARD_ACCENT = '#4f6df5';

const Card = styled.div<{ highlighted: boolean }>`
  cursor: pointer;
  border: 2px solid ${CARD_ACCENT};
  border-radius: 10px;
  padding: 10px 14px;
  background: ${(p) => (p.highlighted ? '#dff5d8' : '#fff')};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: transform 150ms ease, box-shadow 150ms ease;

  &:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 6px 14px rgba(79, 109, 245, 0.25);
  }
`;

const DexNumber = styled.span`
  color: #666;
  margin-right: 8px;
`;

interface Pokemon {
  id: string;
  pokedexNumber: number;
  name: string;
}

export function PokemonCard({
  pokemon,
  highlighted,
  onClick,
}: {
  pokemon: Pokemon;
  highlighted: boolean;
  onClick: () => void;
}) {
  return (
    <Card highlighted={highlighted} onClick={onClick}>
      <DexNumber>#{pokemon.pokedexNumber}</DexNumber>
      {pokemon.name}
    </Card>
  );
}
