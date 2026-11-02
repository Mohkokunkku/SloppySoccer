export function roleHint(role: 'attacker' | 'midfielder' | 'defender' | undefined): string {
  switch (role) {
    case 'attacker':
      return 'Find space ahead for a pass.';
    case 'midfielder':
      return 'Support the carrier and block passing lanes.';
    case 'defender':
      return 'Stay goal-side and protect the space behind.';
    default:
      return 'Keep your shape and support the team.';
  }
}
