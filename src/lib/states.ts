// Nigeria's 36 states + FCT, grouped by geopolitical zone with a colour each.

export type Zone =
  | 'North West'
  | 'North East'
  | 'North Central'
  | 'South West'
  | 'South East'
  | 'South South'

export const ZONE_COLORS: Record<Zone, string> = {
  'North West':    '#2563eb', // blue
  'North East':    '#7c3aed', // purple
  'North Central': '#ea580c', // orange
  'South West':    '#16a34a', // green
  'South East':    '#dc2626', // red
  'South South':   '#0d9488', // teal
}

export const STATE_ZONE: Record<string, Zone> = {
  // North West
  Jigawa: 'North West', Kaduna: 'North West', Kano: 'North West', Katsina: 'North West',
  Kebbi: 'North West', Sokoto: 'North West', Zamfara: 'North West',
  // North East
  Adamawa: 'North East', Bauchi: 'North East', Borno: 'North East', Gombe: 'North East',
  Taraba: 'North East', Yobe: 'North East',
  // North Central
  Benue: 'North Central', Kogi: 'North Central', Kwara: 'North Central', Nasarawa: 'North Central',
  Niger: 'North Central', Plateau: 'North Central', FCT: 'North Central',
  // South West
  Ekiti: 'South West', Lagos: 'South West', Ogun: 'South West', Ondo: 'South West',
  Osun: 'South West', Oyo: 'South West',
  // South East
  Abia: 'South East', Anambra: 'South East', Ebonyi: 'South East', Enugu: 'South East', Imo: 'South East',
  // South South
  'Akwa Ibom': 'South South', Bayelsa: 'South South', 'Cross River': 'South South',
  Delta: 'South South', Edo: 'South South', Rivers: 'South South',
}

export const NIGERIAN_STATES: string[] = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara',
]

export function zoneOf(state: string): Zone | null {
  return STATE_ZONE[state] ?? null
}
export function colorOf(state: string): string {
  const z = zoneOf(state)
  return z ? ZONE_COLORS[z] : '#71717a'
}
export function isNorth(state: string): boolean {
  const z = zoneOf(state)
  return z === 'North West' || z === 'North East' || z === 'North Central'
}
