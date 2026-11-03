export function characterIdFor(team: 'home' | 'away', role: 'outfield' | 'keeper', tacticalRole: 'attacker' | 'midfielder' | 'defender' | undefined): 'A1' | 'A2' | 'A3' | null {
  if (team === 'away' || role === 'keeper') return null;
  switch (tacticalRole) {
    case 'attacker': return 'A1';
    case 'midfielder': return 'A3';
    case 'defender': return 'A2';
    default: return null;
  }
}
