export const COUNTRIES: string[] = [
  "Ethiopia",
  "Algeria", "Angola", "Argentina", "Australia", "Austria",
  "Bahrain", "Bangladesh", "Belgium", "Brazil", "Bulgaria",
  "Canada", "Chile", "China", "Colombia", "Czech Republic",
  "Denmark", "Djibouti", "Egypt",
  "Finland", "France",
  "Germany", "Ghana", "Greece",
  "Hong Kong", "Hungary",
  "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kuwait",
  "Lebanon", "Libya",
  "Malaysia", "Mexico", "Morocco",
  "Netherlands", "New Zealand", "Nigeria", "Norway",
  "Oman",
  "Pakistan", "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saudi Arabia", "Singapore", "Somalia", "South Africa", "South Korea",
  "South Sudan", "Spain", "Sudan", "Sweden", "Switzerland",
  "Taiwan", "Tanzania", "Thailand", "Tunisia", "Turkey",
  "Uganda", "UAE", "United Kingdom", "USA",
  "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe",
];

export function countriesWith(extra?: string | null): string[] {
  const trimmed = (extra ?? "").trim();
  if (trimmed && !COUNTRIES.includes(trimmed)) {
    return [trimmed, ...COUNTRIES];
  }
  return COUNTRIES;
}
