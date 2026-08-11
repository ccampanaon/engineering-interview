import styled from '@emotion/styled';
import { useEffect, useState } from 'react';
import type { SubmitEvent } from 'react';

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

const TEAM_CAP = 6;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
`;

const ListItem = styled.li<{ highlighted?: boolean }>`
  cursor: pointer;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px 12px;
  background: ${(p) => (p.highlighted ? '#dff5d8' : 'transparent')};
`;

const DexNumber = styled.span`
  color: #666;
  margin-right: 8px;
`;

const Section = styled.section`
  margin-bottom: 24px;
`;

const ProfileList = styled.ul`
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const ProfileItem = styled.li<{ active: boolean }>`
  cursor: pointer;
  padding: 6px 10px;
  border: 1px solid ${(p) => (p.active ? '#333' : '#ccc')};
  border-radius: 4px;
  background: ${(p) => (p.active ? '#eef' : 'transparent')};
`;

const CreateForm = styled.form`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const TeamControls = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
`;

const ErrorText = styled.p`
  color: #b00020;
`;

const HintText = styled.p`
  color: #555;
`;

export function App() {
  const [pokemon, setPokemon] = useState<Pokemon[] | null>(null);
  const [pokemonError, setPokemonError] = useState(false);

  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [profilesError, setProfilesError] = useState(false);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);

  // Working set for the active profile's team. Seeded from that profile's
  // persisted `pokemon` array on selection, then diverges as the user
  // toggles pokemon. profiles is never mutated by toggling — only a
  // successful submit writes back into it, with the server's response.
  const [draft, setDraft] = useState<string[] | null>(null);
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newProfileName, setNewProfileName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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
          setPokemonError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/profiles')
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((data: Profile[]) => {
        if (!cancelled) setProfiles(data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err);
          setProfilesError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function selectProfile(profile: Profile) {
    setActiveProfileId(profile.id);
    setDraft([...profile.pokemon]);
    setSelectionMessage(null);
    setSubmitError(null);
  }

  async function handleCreate(e: SubmitEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);

    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProfileName }),
      });
      const data = await res.json();

      if (!res.ok) {
        setCreateError(
          typeof data.message === 'string'
            ? data.message
            : 'Failed to create profile.'
        );
        return;
      }

      setProfiles((prev) => (prev ? [...prev, data] : [data]));
      selectProfile(data);
      setNewProfileName('');
    } catch (err) {
      console.error(err);
      setCreateError('Failed to create profile. Is the backend running?');
    } finally {
      setCreating(false);
    }
  }

  function togglePokemon(pokemonId: string) {
    if (activeProfileId === null || draft === null) {
      setSelectionMessage('Select a profile above to edit its team.');
      return;
    }

    const isSelected = draft.includes(pokemonId);
    if (!isSelected && draft.length >= TEAM_CAP) {
      setSelectionMessage(`A team can only hold ${TEAM_CAP} pokemon.`);
      return;
    }

    setSelectionMessage(null);
    setDraft(
      isSelected ? draft.filter((id) => id !== pokemonId) : [...draft, pokemonId]
    );
  }

  async function handleSubmitTeam() {
    if (activeProfileId === null || draft === null) return;

    setSubmitError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/profiles/${activeProfileId}/pokemon`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitError(
          typeof data.message === 'string'
            ? data.message
            : 'Failed to save team.'
        );
        return;
      }

      setProfiles((prev) =>
        prev ? prev.map((p) => (p.id === data.id ? data : p)) : prev
      );
      setDraft(data.pokemon);
    } catch (err) {
      console.error(err);
      setSubmitError('Failed to save team. Is the backend running?');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Section>
        <h2>Profiles</h2>
        {profilesError && (
          <ErrorText>Failed to load profiles. Is the backend running?</ErrorText>
        )}
        {!profilesError && profiles === null && <p>Loading profiles...</p>}
        {!profilesError && profiles !== null && (
          <>
            <ProfileList>
              {profiles.map((profile) => (
                <ProfileItem
                  key={profile.id}
                  active={profile.id === activeProfileId}
                  onClick={() => selectProfile(profile)}
                >
                  {profile.name}
                </ProfileItem>
              ))}
            </ProfileList>
            <CreateForm onSubmit={handleCreate}>
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Profile name"
              />
              <button type="submit" disabled={creating}>
                Create profile
              </button>
            </CreateForm>
            {createError && <ErrorText>{createError}</ErrorText>}
          </>
        )}
      </Section>

      <Section>
        <h2>Pokemon</h2>
        {pokemonError && (
          <ErrorText>Failed to load pokemon. Is the backend running?</ErrorText>
        )}
        {!pokemonError && pokemon === null && <p>Loading pokemon...</p>}
        {!pokemonError && pokemon !== null && (
          <>
            {activeProfileId === null && (
              <HintText>Select a profile above to edit its team.</HintText>
            )}
            {activeProfileId !== null && draft !== null && (
              <TeamControls>
                <span>
                  {draft.length}/{TEAM_CAP} selected
                </span>
                <button type="button" onClick={handleSubmitTeam} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save team'}
                </button>
              </TeamControls>
            )}
            {selectionMessage && <HintText>{selectionMessage}</HintText>}
            {submitError && <ErrorText>{submitError}</ErrorText>}
            <List>
              {pokemon.map((p) => (
                <ListItem
                  key={p.id}
                  highlighted={draft?.includes(p.id) ?? false}
                  onClick={() => togglePokemon(p.id)}
                >
                  <DexNumber>#{p.pokedexNumber}</DexNumber>
                  {p.name}
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Section>
    </div>
  );
}

export default App;
