export interface Currency {
  id: number;
  name: string | null;
  acronym?: string | null;
}

export interface CurrencyDenomination {
  id: number;
  idCurrency: number;
  currency: string | null;
  value: number;
  img: string | null;
}

export interface TypeDocument {
  id: number;
  typeDocument: string | null;
}

export interface Region {
  id: number;
  name: string | null;
  code?: string | null;
}
