import styled from '@emotion/styled';
import { useEffect, useState } from 'react';

interface Pokemon {
  id: string;
  pokedexNumber: number;
  name: string;
}

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
`;

const ListItem = styled.li`
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px 12px;
`;

const DexNumber = styled.span`
  color: #666;
  margin-right: 8px;
`;

export function App() {
  const [pokemon, setPokemon] = useState<Pokemon[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/pokemon')
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((data: Pokemon[]) => {
        if (!cancelled) setPokemon(data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err);
          setError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p>Failed to load pokemon. Is the backend running?</p>;
  }

  if (!pokemon) {
    return <p>Loading pokemon...</p>;
  }

  return (
    <List>
      {pokemon.map((p) => (
        <ListItem key={p.id}>
          <DexNumber>#{p.pokedexNumber}</DexNumber>
          {p.name}
        </ListItem>
      ))}
    </List>
  );
}

export default App;
