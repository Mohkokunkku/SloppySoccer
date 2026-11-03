export function roleMarker(role: 'attacker' | 'midfielder' | 'defender' | 'keeper' | undefined): string {
  switch (role) {
    case 'attacker': return 'A';
    case 'midfielder': return 'M';
    case 'defender': return 'D';
    case 'keeper': return 'GK';
    default: return '?';
  }
}
