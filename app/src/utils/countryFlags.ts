/**
 * Utility functions to convert country names to flag emojis
 * Uses Unicode regional indicator symbols
 */

// Map of country names to their ISO 3166-1 alpha-2 codes
const countryToCodeMap: Record<string, string> = {
  // Europe
  Portugal: "PT",
  Spain: "ES",
  France: "FR",
  Germany: "DE",
  Italy: "IT",
  "United Kingdom": "GB",
  Netherlands: "NL",
  Belgium: "BE",
  Switzerland: "CH",
  Austria: "AT",
  Poland: "PL",
  Greece: "GR",
  Sweden: "SE",
  Norway: "NO",
  Denmark: "DK",
  Finland: "FI",
  Ireland: "IE",
  Iceland: "IS",

  // Americas
  "United States": "US",
  Canada: "CA",
  Mexico: "MX",
  Brazil: "BR",
  Argentina: "AR",
  Chile: "CL",
  Colombia: "CO",
  Peru: "PE",

  // Asia
  Japan: "JP",
  China: "CN",
  "South Korea": "KR",
  India: "IN",
  Thailand: "TH",
  Vietnam: "VN",
  Singapore: "SG",
  Malaysia: "MY",
  Indonesia: "ID",
  Philippines: "PH",

  // Oceania
  Australia: "AU",
  "New Zealand": "NZ",

  // Africa
  "South Africa": "ZA",
  Egypt: "EG",
  Nigeria: "NG",
  Kenya: "KE",
  Morocco: "MA",

  // Middle East
  "Saudi Arabia": "SA",
  "United Arab Emirates": "AE",
  Israel: "IL",
  Turkey: "TR",
};

/**
 * Convert ISO 3166-1 alpha-2 country code to flag emoji
 * @param countryCode - Two-letter country code (e.g., "PT", "US")
 * @returns Flag emoji
 */
export const countryCodeToFlag = (countryCode: string): string => {
  // Regional indicator symbols start at 0x1F1E6 for 'A'
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65);

  return String.fromCodePoint(...codePoints);
};

/**
 * Convert country name to flag emoji
 * @param countryName - Full country name (e.g., "Portugal", "United States")
 * @returns Flag emoji or empty string if not found
 */
export const countryNameToFlag = (countryName: string): string => {
  const code = countryToCodeMap[countryName];

  if (!code) {
    console.warn(`No flag found for country: ${countryName}`);
    return "🌍"; // Return globe emoji as fallback
  }

  return countryCodeToFlag(code);
};

/**
 * Get country display with flag
 * @param countryName - Full country name
 * @returns String with flag emoji and country name (e.g., "🇵🇹 Portugal")
 */
export const getCountryWithFlag = (countryName: string): string => {
  const flag = countryNameToFlag(countryName);
  return `${flag} ${countryName}`;
};

/**
 * Get just the flag emoji for a country
 * @param countryName - Full country name
 * @returns Just the flag emoji
 */
export const getCountryFlag = (countryName: string): string => {
  return countryNameToFlag(countryName);
};
