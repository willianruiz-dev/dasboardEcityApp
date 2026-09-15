/** Máquina de autoservicio (tabla `business.PayPad`, marca "Pay+"). */
export interface Machine {
  id: number;
  username: string | null;
  description: string | null;
  longitude: string | null;
  latitude: string | null;
  idCurrency: number;
  currency: string | null;
  /** 1 = activo, 0 = inactivo según `business.PayPad.Status`. */
  status: number;
  idOffice: number;
  office: string | null;
  dateCreated: string | null;
  dateUpdated: string | null;
}

export type MachineStatus = 'active' | 'inactive' | 'unknown';

/** Contenido de la máquina (arqueos / `PayPadStorageDto`). */
export interface MachineStorageLine {
  id: number;
  idPayPad: number;
  payPad: string | null;
  idCurrencyDenomination: number;
  denominationValue: number;
  apStored: number;
  apTotal: number;
  dpStored: number;
  dpTotal: number;
  rjStored: number;
  rjTotal: number;
  quantityStored: number;
  total: number;
  isDispensing: boolean;
  minDpQuantity: number;
}

export interface Office {
  id: number;
  name: string | null;
  address: string | null;
  idClient: number;
  client?: string | null;
}

export interface Client {
  id: number;
  name: string | null;
  nit: string | null;
  email: string | null;
  phone: string | null;
  idRegion: number;
  region: string | null;
  offices: Office[];
}

export interface DenominationLine {
  id: number;
  idCurrencyDenomination: number;
  denominationValue: number;
  quantity: number;
  total: number;
}

export interface Tonnage {
  id: number;
  idPayPad: number;
  totalAp: number;
  totalDp: number;
  totalRj: number;
  total: number;
  details: DenominationLine[];
  dateCreated: string | null;
  userCreated: string | null;
}

export interface Load {
  id: number;
  idPayPad: number;
  totalLoaded: number;
  details: DenominationLine[];
  dateCreated: string | null;
  userCreated: string | null;
}

export interface Subscription {
  id: number;
  idPayPad: number;
  paypad: string | null;
  idAlert: number;
  alert: string | null;
  email: string | null;
}
