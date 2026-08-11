import styled from '@emotion/styled';
import { useEffect, useState } from 'react';
import type { SubmitEvent } from 'react';
import { Spinner } from './spinner.js';
import { VirtualizedPokemonGrid } from './virtualized-pokemon-grid.js';

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
const ACCENT = '#4f6df5';

// Team order isn't persisted (see CLAUDE.md), so "unchanged" is a set
// comparison, not an array-equality one — otherwise toggling a pokemon off
// and back on would read as still-dirty just because it moved to the end.
function sameTeam(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const bIds = new Set(b);
  return a.every((id) => bIds.has(id));
}

const Page = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #f4f6ff 0%, #eef1fb 100%);
  padding: 24px;
`;

const Section = styled.section`
  margin-bottom: 24px;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid #d7dbef;
  margin: 24px 0;
`;

const ProfileList = styled.ul`
  list-style: none;
  margin: 12px 0 0;
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

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid #c7cce3;
  border-radius: 6px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: ${ACCENT};
    box-shadow: 0 0 0 3px rgba(79, 109, 245, 0.15);
  }
`;

const Button = styled.button`
  padding: 8px 16px;
  border: 1px solid ${ACCENT};
  border-radius: 6px;
  background: ${ACCENT};
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: background 150ms ease, transform 150ms ease;

  &:hover:not(:disabled) {
    background: #3d59e0;
  }

  &:disabled {
    background: #a9b3e8;
    border-color: #a9b3e8;
    cursor: not-allowed;
  }
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
    // No-op when no profile is active: the static hint below the heading
    // already explains why, so there's nothing further to surface here —
    // setting selectionMessage to the same text would just render it twice.
    if (activeProfileId === null || draft === null) {
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

  const activeProfile = profiles?.find((p) => p.id === activeProfileId) ?? null;
  const isTeamDirty =
    activeProfile !== null && draft !== null && !sameTeam(draft, activeProfile.pokemon);

  return (
    <Page>
      <Section>
        <h2>Profiles</h2>
        {profilesError && (
          <ErrorText>Failed to load profiles. Is the backend running?</ErrorText>
        )}
        {!profilesError && profiles === null && <Spinner label="Loading profiles..." />}
        {!profilesError && profiles !== null && (
          <>
            <CreateForm onSubmit={handleCreate}>
              <Input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Profile name"
              />
              <Button type="submit" disabled={creating}>
                Create profile
              </Button>
            </CreateForm>
            {createError && <ErrorText>{createError}</ErrorText>}
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
          </>
        )}
      </Section>

      <Divider />

      <Section>
        <h2>Pokemon</h2>
        {pokemonError && (
          <ErrorText>Failed to load pokemon. Is the backend running?</ErrorText>
        )}
        {!pokemonError && pokemon === null && <Spinner label="Loading pokemon..." />}
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
                <Button
                  type="button"
                  onClick={handleSubmitTeam}
                  disabled={submitting || !isTeamDirty}
                >
                  {submitting ? 'Saving...' : isTeamDirty ? 'Save team' : 'Saved'}
                </Button>
              </TeamControls>
            )}
            {selectionMessage && <HintText>{selectionMessage}</HintText>}
            {submitError && <ErrorText>{submitError}</ErrorText>}
            <VirtualizedPokemonGrid
              pokemon={pokemon}
              isSelected={(id) => draft?.includes(id) ?? false}
              onToggle={togglePokemon}
            />
          </>
        )}
      </Section>
    </Page>
  );
}

export default App;
