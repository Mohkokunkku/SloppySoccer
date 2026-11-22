export interface AuditionLineup { outfield: string[]; keeper: string | null }
export interface PickResult { lineup: AuditionLineup; changed: boolean; notice: string }
const outfieldId = (id: unknown): id is string => typeof id === 'string' && /^(P0[1-9]|P10)$/.test(id);
const keeperId = (id: unknown): id is string => typeof id === 'string' && /^K0[12]$/.test(id);
export function emptyLineup(): AuditionLineup { return { outfield: [], keeper: null }; }
export function toggleCandidate(current: AuditionLineup, id: string): PickResult {
 const lineup = { outfield: [...current.outfield], keeper: current.keeper };
 if (outfieldId(id)) {
  if (lineup.outfield.includes(id)) lineup.outfield = lineup.outfield.filter(value => value !== id);
  else if (lineup.outfield.length < 4) lineup.outfield.push(id);
  else return { lineup, changed: false, notice: 'Choose four outfield players. Remove one before adding another.' };
 } else if (keeperId(id)) lineup.keeper = lineup.keeper === id ? null : id;
 else return { lineup, changed: false, notice: 'Unknown candidate. Choose a numbered model from this gallery.' };
 return { lineup, changed: true, notice: 'Draft saved in this browser only. The match squad has not changed.' };
}
export function restoreLineup(value: unknown): AuditionLineup {
 if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyLineup();
 const candidate = value as Record<string, unknown>;
 const players = candidate.outfield;
 if (!Array.isArray(players) || players.length > 4 || !players.every(outfieldId) || new Set(players).size !== players.length) return emptyLineup();
 if (candidate.keeper !== null && !keeperId(candidate.keeper)) return emptyLineup();
 return { outfield: [...players], keeper: candidate.keeper };
}
export function lineupReady(lineup: AuditionLineup): boolean { return lineup.outfield.length === 4 && keeperId(lineup.keeper); }
export function selectionText(lineup: AuditionLineup): string {
 return `Argentina audition picks — not applied to the game\nOutfield: ${lineup.outfield.join(', ') || 'Choose four'}\nGoalkeeper: ${lineup.keeper || 'Choose one'}\nReply with these IDs to confirm your choices.`;
}
