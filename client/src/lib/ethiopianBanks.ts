// Master list of Ethiopian banks with their published SWIFT/BIC codes.
// Used for auto-filling SWIFT addresses across settings, LC, and CAD forms.

export interface EthiopianBank {
  name: string;
  swift: string;
}

export const ETHIOPIAN_BANKS: EthiopianBank[] = [
  { name: "Commercial Bank of Ethiopia",     swift: "CBETETAA" },
  { name: "Awash Bank",                       swift: "AWINETAA" },
  { name: "Dashen Bank",                      swift: "DASHETAA" },
  { name: "Bank of Abyssinia",                swift: "ABYSETAA" },
  { name: "Wegagen Bank",                     swift: "WEGAETAA" },
  { name: "Nib International Bank",           swift: "NIBIETAA" },
  { name: "Hibret Bank",                      swift: "HBUKETAA" },
  { name: "Cooperative Bank of Oromia",       swift: "CBORETAA" },
  { name: "Lion International Bank",          swift: "LIBSETAA" },
  { name: "Zemen Bank",                       swift: "ZEMEETAA" },
  { name: "Oromia International Bank",        swift: "ORIRETAA" },
  { name: "Berhan International Bank",        swift: "BERHETAA" },
  { name: "Bunna International Bank",         swift: "BUNAETAA" },
  { name: "Abay Bank",                        swift: "ABAYETAA" },
  { name: "Addis International Bank",         swift: "ADISETAA" },
  { name: "Enat Bank",                        swift: "ENATETAA" },
  { name: "Amhara Bank",                      swift: "AMHRETAA" },
  { name: "Hijra Bank",                       swift: "HIJRETAA" },
  { name: "ZamZam Bank",                      swift: "ZAMZETAA" },
  { name: "Goh Betoch Bank",                  swift: "GOHBETAA" },
  { name: "Tsehay Bank",                      swift: "TSHYETAA" },
  { name: "Siinqee Bank",                     swift: "SIQEETAA" },
  { name: "Shabelle Bank",                    swift: "SHABETAA" },
  { name: "Gadaa Bank",                       swift: "GADAETAA" },
  { name: "Ahadu Bank",                       swift: "AHDUETAA" },
  { name: "Anbesa Bank",                      swift: "ANBSETAA" },
  { name: "Sidama Bank",                      swift: "SDMAETAA" },
  { name: "Tsedey Bank",                      swift: "TSEDETAA" },
  { name: "Global Bank Ethiopia",             swift: "GLBKETAA" },
  { name: "Siket Bank",                       swift: "SKETETAA" },
  { name: "Development Bank of Ethiopia",     swift: "DBETETAA" },
  { name: "National Bank of Ethiopia",        swift: "NBETETAA" },
];

export function swiftForBank(name: string): string {
  const hit = ETHIOPIAN_BANKS.find(b => b.name.toLowerCase() === name.toLowerCase().trim());
  return hit?.swift ?? "";
}
