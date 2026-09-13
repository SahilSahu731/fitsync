export function metersToKilometers(meters: number): number {
  return meters / 1000;
}

export function kilometersToMeters(kilometers: number): number {
  return kilometers * 1000;
}

export function metersToMiles(meters: number): number {
  return meters / 1609.344;
}

export function milesToMeters(miles: number): number {
  return miles * 1609.344;
}

export function formatDistanceMeters(meters: number | null): string {
  if (meters === null) {
    return "";
  }

  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }

  return `${Math.round(meters)} m`;
}
