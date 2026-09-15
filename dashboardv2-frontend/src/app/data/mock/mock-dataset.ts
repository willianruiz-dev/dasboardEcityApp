import type { Client, Load, Machine, MachineStorageLine, Office, Subscription, Tonnage } from '../../core/models/machines.model';
import type { Permission, Role, RouteNode, User } from '../../core/models/security.model';
import type { Transaction, TransactionDetail, TransactionRating } from '../../core/models/transactions.model';

/**
 * Dataset determinista para `dataProvider: 'mock'`.
 *
 * Reproduce el contrato exacto de Api_DashboardV2 (DTOs camelCase, sobre todo
 * `TransactionDto`) para poder desarrollar y demostras el dashboard sin VPN ni
 * acceso a `DASHBOARD_PRODUCCION`. No es un stub: los totales cuadran porque se
 * derivan de las mismas transacciones que ve la grilla.
 */

const DAY = 86_400_000;
const DAYS_HISTORY = 120;

/** PRNG con semilla fija: mismos números en cada reload (útil para screenshots y tests). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const PRODUCTS = ['Recarga celular', 'Pago de servicios', 'Retiro de dinero', 'Envío de remesa', 'Pago de peaje', 'Recarga monedero'];
const PAYMENT_TYPES = ['Efectivo', 'Tarjeta débito', 'Tarjeta crédito', 'Nequi', 'PSE'];
const STATES = ['Completada', 'Completada', 'Completada', 'Completada', 'Pendiente', 'Anulada', 'Rechazada'];
const OPERATORS = ['lruiz', 'camila.perez', 'jandrade', 'sdiaz', 'mtorres', ' root'];

const OFFICE_SEED: Array<[number, string, string, number]> = [
  [1, 'Centro — Cl. 10 #43A-50', 'Medellín', 1],
  [2, 'Laureles — Cr 64 #50-12', 'Medellín', 1],
  [3, 'Envigado — Cl 37 #45-10', 'Envigado', 1],
  [4, 'Bello — Cra 50 #24-12', 'Bello', 2],
  [5, 'Itagüí — Cl 48 #50-20', 'Itagüí', 2],
  [6, 'Sabaneta — Cl 66 #7-35', 'Sabaneta', 3]
];

const CLIENT_SEED: Array<[number, string, string]> = [
  [1, 'Ecity Pay Colombia S.A.S.', '901234567-8'],
  [2, 'Transportes Al Sur S.A.S.', '830112233-4'],
  [3, 'Comercial La 70 E.U.', '900556677-1']
];

export const MOCK_CLIENTS: Client[] = CLIENT_SEED.map(([id, name, nit]) => ({
  id,
  name,
  nit,
  email: `contacto@${name.split(' ')[0].toLowerCase()}.com.co`,
  phone: '+57 604 444 0000',
  idRegion: 1,
  region: 'Antioquia',
  offices: []
}));

export const MOCK_OFFICES: Office[] = OFFICE_SEED.map(([id, name, address, idClient]) => ({
  id,
  name,
  address,
  idClient,
  client: MOCK_CLIENTS.find((c) => c.id === idClient)?.name ?? null
}));

const MACHINE_NAMES = [
  'PAYP-MED-001',
  'PAYP-MED-002',
  'PAYP-MED-003',
  'PAYP-LAURELES-01',
  'PAYP-ENV-001',
  'PAYP-ENV-002',
  'PAYP-BELLO-001',
  'PAYP-BELLO-002',
  'PAYP-ITAGUI-001',
  'PAYP-ITAGUI-002',
  'PAYP-SAB-001',
  'PAYP-SAB-002',
  'PAYP-MED-004',
  'PAYP-PARK-001'
];

export const MOCK_MACHINES: Machine[] = MACHINE_NAMES.map((username, index) => {
  const office = MOCK_OFFICES[index % MOCK_OFFICES.length] as Office;
  const random = rng(1000 + index);
  const inactive = index === 11 || index === 13;
  return {
    id: index + 1,
    username,
    description: `Pay+ ${office.name?.split(' — ')[0] ?? 'sucursal'} · unidad ${index + 1}`,
    longitude: (-75.6 + random() * 0.12).toFixed(6),
    latitude: (6.15 + random() * 0.16).toFixed(6),
    idCurrency: 1,
    currency: 'COP',
    status: inactive ? 0 : 1,
    idOffice: office.id,
    office: office.name ?? null,
    dateCreated: new Date(Date.UTC(2023, index % 12, 3 + (index % 20))).toISOString(),
    dateUpdated: new Date(Date.UTC(2025, (index * 3) % 11, 9 + (index % 12))).toISOString()
  };
});

export const MOCK_PERMISSIONS: Permission[] = (
  [
    'ReadTransactions',
    'ReadPayPads',
    'WritePayPads',
    'DelPayPads',
    'ReadTonnagesAndLoads',
    'WriteTonnagesAndLoads',
    'ReadUsers',
    'WriteUsers',
    'DelUsers',
    'ReadRoles',
    'WriteRoles',
    'DelRoles',
    'ReadRoutes',
    'WriteRoutes',
    'ReadClients',
    'WriteClients',
    'ReadOffices',
    'WriteOffices',
    'ReadMasters',
    'WriteMasters',
    'ReadSubs',
    'WriteSubs',
    'DelSubs'
  ] as const
).map((name, index) => ({
  id: index + 1,
  name,
  description: `${name.replace(/^(Read|Write|Del)/, '')} (${name.startsWith('Read') ? 'consulta' : name.startsWith('Write') ? 'escritura' : 'borrado'})`
}));

const names = (list: readonly string[]): Permission[] => list.map((n) => MOCK_PERMISSIONS.find((p) => p.name === n) as Permission).filter(Boolean);

const ROUTE_TREE: RouteNode[] = [
  { id: 1, idFather: null, title: 'Consulta por máquina', route: 'dashboard/sales', icon: 'receipt' },
  { id: 2, idFather: null, title: 'Panorama operativo', route: 'dashboard', icon: 'dashboard' },
  { id: 3, idFather: null, title: 'Analítica', route: 'dashboard/analytics', icon: 'chart' },
  { id: 4, idFather: null, title: 'Máquinas', route: 'dashboard/machines', icon: 'machine' },
  { id: 5, idFather: null, title: 'Operadores', route: 'dashboard/users', icon: 'users' },
  { id: 6, idFather: null, title: 'Roles y permisos', route: 'dashboard/security', icon: 'shield' }
];

export const MOCK_ROLES: Role[] = [
  {
    id: 1,
    role: 'Administrador',
    permissions: names(MOCK_PERMISSIONS.map((p) => p.name)),
    routes: ROUTE_TREE,
    dateCreated: '2023-01-10T14:20:00.000Z',
    userCreated: 'system'
  },
  {
    id: 2,
    role: 'Supervisor de red',
    permissions: names(['ReadTransactions', 'ReadPayPads', 'ReadTonnagesAndLoads', 'ReadUsers', 'ReadSubs', 'ReadMasters']),
    routes: ROUTE_TREE.filter((r) => r.id !== 6),
    dateCreated: '2023-02-02T09:00:00.000Z',
    userCreated: 'root'
  },
  {
    id: 3,
    role: 'Analista de pagos',
    permissions: names(['ReadTransactions', 'ReadPayPads']),
    routes: ROUTE_TREE.filter((r) => [1, 2, 3].includes(r.id)),
    dateCreated: '2023-04-18T16:40:00.000Z',
    userCreated: 'root'
  },
  {
    id: 4,
    role: 'Cajero / Carguista',
    permissions: names(['ReadTonnagesAndLoads', 'WriteTonnagesAndLoads', 'ReadPayPads']),
    routes: ROUTE_TREE.filter((r) => r.id === 4),
    dateCreated: '2023-05-05T11:05:00.000Z',
    userCreated: 'root'
  },
  {
    id: 5,
    role: 'Auditor externo',
    permissions: names(['ReadTransactions']),
    routes: ROUTE_TREE.filter((r) => [1, 3].includes(r.id)),
    dateCreated: '2024-01-12T08:30:00.000Z',
    userCreated: 'root'
  }
];

const USER_SEED: Array<[string, string, string, number, number]> = [
  ['lruiz', 'Willian', 'Ruiz', 1, 1],
  ['cperez', 'Camila', 'Pérez', 2, 1],
  ['jandrade', 'Julián', 'Andrade', 2, 1],
  ['sdiaz', 'Sofía', 'Díaz', 3, 1],
  ['mtorres', 'Mauricio', 'Torres', 3, 1],
  ['aestrada', 'Ana', 'Estrada', 4, 2],
  ['dgomez', 'Diego', 'Gómez', 4, 2],
  ['pmolina', 'Paula', 'Molina', 4, 3],
  ['r castsro', 'Ricardo', 'Castro', 5, 1],
  ['nvargas', 'Natalia', 'Vargas', 5, 2],
  ['fsanchez', 'Felipe', 'Sánchez', 2, 3],
  ['ccardona', 'Camilo', 'Cardona', 3, 4],
  ['jmunoz', 'Johana', 'Muñoz', 4, 4],
  ['ogutierrez', 'Óscar', 'Gutiérrez', 5, 1],
  ['trelano', 'Tatiana', 'Relaño', 5, 2]
];

export const MOCK_USERS: User[] = USER_SEED.map(([userName, name, lastName, idRole, idClient], index) => {
  const role = MOCK_ROLES.find((r) => r.id === idRole) as Role;
  const random = rng(500 + index);
  return {
    id: index + 1,
    document: String(43_000_000 + Math.floor(random() * 9_000_000)),
    idTypeDocument: 1,
    typeDocument: 'C.C.',
    userName,
    name,
    lastName,
    phone: `+57 3${Math.floor(random() * 4) + 0}0 ${Math.floor(random() * 9000000 + 1000000)}`,
    email: `${userName}@ecity.co`.replace(/\s/g, ''),
    idRole: role.id,
    role: role.role ?? null,
    status: index === 12 ? 0 : 1,
    idClient,
    client: MOCK_CLIENTS.find((c) => c.id === idClient)?.name ?? null,
    img: null,
    dateCreated: new Date(Date.UTC(2023, index % 12, 1 + ((index * 3) % 26))).toISOString(),
    userCreated: 'root'
  };
});

export const MOCK_ROUTES: RouteNode[] = ROUTE_TREE;

/** Subconjunto de cuentas demo que pueden autenticarse en modo mock. */
export const MOCK_DEMO_ACCOUNTS: Readonly<Record<string, { password: string; role: string }>> = {
  lruiz: { password: 'demo1234', role: 'Administrador' },
  cperez: { password: 'demo1234', role: 'Supervisor de red' },
  sdiaz: { password: 'demo1234', role: 'Analista de pagos' },
  'aestrada': { password: 'demo1234', role: 'Cajero / Carguista' },
  nvargas: { password: 'demo1234', role: 'Auditor externo' }
};

/** Curva de demanda por hora (pico en mediodía y tarde). */
const HOUR_WEIGHTS = [0.2, 0.1, 0.05, 0.05, 0.1, 0.5, 1.4, 2.6, 3.4, 3.1, 3.6, 4.4, 5.2, 4.6, 3.9, 4.1, 4.8, 5.5, 4.2, 3.1, 2.4, 1.8, 1.1, 0.5];

interface Generated {
  transactions: Transaction[];
  details: Map<number, TransactionDetail[]>;
  ratings: Map<number, TransactionRating>;
  byMachine: Map<number, Transaction[]>;
  storage: Map<number, MachineStorageLine[]>;
  tonnages: Map<number, Tonnage[]>;
  loads: Map<number, Load[]>;
  subs: Map<number, Subscription[]>;
}

let cache: Generated | null = null;

/** Genera el histórico completo una sola vez y lo indexa por máquina. */
export function dataset(): Generated {
  if (cache) return cache;

  const random = rng(20260914);
  const now = Date.UTC(2026, 8, 14, 15, 30, 0);
  const transactions: Transaction[] = [];
  const details = new Map<number, TransactionDetail[]>();
  const ratings = new Map<number, TransactionRating>();
  const byMachine = new Map<number, Transaction[]>();
  let id = 100_000;

  MOCK_MACHINES.forEach((machine) => {
    const machineList: Transaction[] = [];
    const activity = 0.35 + random() * 1.1;
    const baseTicket = [10_000, 20_000, 40_000][Math.floor(random() * 3)] as number;

    for (let day = DAYS_HISTORY - 1; day >= 0; day -= 1) {
      const dayDate = new Date(now - day * DAY);
      const weekday = dayDate.getUTCDay();
      const weekendFactor = weekday === 0 || weekday === 6 ? 0.55 : 1;
      const monthFactor = 1 + (dayDate.getUTCDate() > 25 ? 0.25 : 0);
      const expected = 8 * activity * weekendFactor * monthFactor;
      const count = Math.max(0, Math.round(expected + (random() - 0.5) * 5));

      for (let n = 0; n < count; n += 1) {
        const hour = pickHour(random);
        const minute = Math.floor(random() * 60);
        const when = Date.UTC(dayDate.getUTCFullYear(), dayDate.getUTCMonth(), dayDate.getUTCDate(), hour, minute, Math.floor(random() * 60));
        const state = STATES[Math.floor(random() * STATES.length)] as string;
        const settled = state === 'Completada' || state === 'Pendiente';
        const total = baseTicket * (1 + Math.floor(random() * 6));
        const returnAmount = settled ? 0 : total;
        const income = settled ? total - Math.floor(random() * 4) * 500 : 0;
        const reference = `${machine.username}-${when.toString(36).toUpperCase()}`;
        const operator = OPERATORS[Math.floor(random() * OPERATORS.length)] as string;

        const transaction: Transaction = {
          id: (id += 1),
          document: MOCK_USERS[Math.floor(random() * MOCK_USERS.length)]?.document ?? null,
          reference,
          product: PRODUCTS[Math.floor(random() * PRODUCTS.length)] as string,
          totalAmount: total,
          realAmount: settled ? total : 0,
          incomeAmount: income,
          returnAmount,
          description: settled ? `Operación ${reference}` : `${state.toLowerCase()} · ${reference}`,
          idStateTransaction: stateIndex(state),
          stateTransaction: state,
          idTypeTransaction: 1,
          typeTransaction: 'Autoventa',
          idTypePayment: 1 + Math.floor(random() * PAYMENT_TYPES.length),
          typePayment: PAYMENT_TYPES[Math.floor(random() * PAYMENT_TYPES.length)] as string,
          idPayPad: machine.id,
          payPad: machine.username,
          dateCreated: new Date(when).toISOString(),
          dateUpdated: new Date(when + 60_000).toISOString(),
          userCreated: operator
        };
        transactions.push(transaction);
        machineList.push(transaction);
        details.set(transaction.id, buildDetails(transaction, random));
        if (random() > 0.72) {
          ratings.set(transaction.id, {
            id: transaction.id * 2,
            idTransaction: transaction.id,
            rating: 3 + Math.floor(random() * 3),
            dateCreated: new Date(when + 120_000).toISOString()
          });
        }
      }
    }
    byMachine.set(machine.id, machineList.sort((a, b) => (a.dateCreated! < b.dateCreated! ? 1 : -1)));
  });

  cache = {
    transactions,
    details,
    ratings,
    byMachine,
    storage: buildStorage(random),
    tonnages: buildMovements(random, 'tonnage') as Map<number, Tonnage[]>,
    loads: buildMovements(random, 'load') as Map<number, Load[]>,
    subs: buildSubscriptions(random)
  };
  return cache;
}

function pickHour(random: () => number): number {
  const total = HOUR_WEIGHTS.reduce((a, b) => a + b, 0);
  let target = random() * total;
  for (let hour = 0; hour < 24; hour += 1) {
    target -= HOUR_WEIGHTS[hour] as number;
    if (target <= 0) return hour;
  }
  return 12;
}

function stateIndex(state: string): number {
  return ['Completada', 'Pendiente', 'Anulada', 'Rechazada'].indexOf(state) + 1;
}

const DENOMINATIONS = [100_000, 50_000, 20_000, 10_000, 5_000, 2_000, 1_000, 500, 200, 100, 50];

function buildDetails(transaction: Transaction, random: () => number): TransactionDetail[] {
  let remaining = transaction.totalAmount;
  const out: TransactionDetail[] = [];
  DENOMINATIONS.forEach((value, index) => {
    if (remaining <= 0 || value > remaining) return;
    const quantity = Math.min(Math.floor(remaining / value), value >= 50_000 ? 4 : 40) || (random() > 0.6 ? 1 : 0);
    if (quantity === 0) return;
    remaining -= quantity * value;
    out.push({
      id: transaction.id * 10 + index,
      idTransaction: transaction.id,
      idCurrencyDenomination: index + 1,
      currencyDenomination: value,
      idTypeOperation: transaction.returnAmount > 0 ? 2 : 1,
      typeOperation: transaction.returnAmount > 0 ? 'Dispensado' : 'Recibido',
      quantity,
      dateCreated: transaction.dateCreated
    });
  });
  if (out.length === 0 && remaining > 0) {
    out.push({
      id: transaction.id * 10 + 9,
      idTransaction: transaction.id,
      idCurrencyDenomination: DENOMINATIONS.length,
      currencyDenomination: remaining,
      idTypeOperation: 1,
      typeOperation: 'Recibido',
      quantity: 1,
      dateCreated: transaction.dateCreated
    });
  }
  return out;
}

function buildStorage(random: () => number): Map<number, MachineStorageLine[]> {
  const map = new Map<number, MachineStorageLine[]>();
  MOCK_MACHINES.forEach((machine) => {
    map.set(
      machine.id,
      DENOMINATIONS.map((value, index) => {
        const ap = Math.floor(random() * 90);
        const dp = Math.floor(random() * 30);
        const rj = random() > 0.85 ? Math.floor(random() * 4) : 0;
        const quantity = Math.max(0, ap - dp - rj);
        return {
          id: machine.id * 100 + index,
          idPayPad: machine.id,
          payPad: machine.username,
          idCurrencyDenomination: index + 1,
          denominationValue: value,
          apStored: ap,
          apTotal: ap * value,
          dpStored: dp,
          dpTotal: dp * value,
          rjStored: rj,
          rjTotal: rj * value,
          quantityStored: quantity,
          total: quantity * value,
          isDispensing: value >= 1000,
          minDpQuantity: value >= 20_000 ? 3 : 5
        } satisfies MachineStorageLine;
      })
    );
  });
  return map;
}

function buildMovements(random: () => number, kind: 'tonnage' | 'load'): Map<number, Array<Tonnage | Load>> {
  const map = new Map<number, Array<Tonnage | Load>>();
  MOCK_MACHINES.forEach((machine) => {
    const list: Array<Tonnage | Load> = [];
    for (let n = 0; n < 8; n += 1) {
      const when = new Date(Date.UTC(2026, 8, 14) - (n * 5 + Math.floor(random() * 3)) * DAY).toISOString();
      const details = DENOMINATIONS.slice(0, 7).map((value, index) => {
        const quantity = Math.floor(random() * (kind === 'load' ? 220 : 120));
        return { id: machine.id * 1000 + n * 10 + index, idCurrencyDenomination: index + 1, denominationValue: value, quantity, total: quantity * value };
      });
      const total = details.reduce((acc, d) => acc + d.total, 0);
      if (kind === 'load') {
        list.push({ id: 900_000 + machine.id * 100 + n, idPayPad: machine.id, totalLoaded: total, details, dateCreated: when, userCreated: 'aestrada' });
      } else {
        const ap = Math.round(total * 0.72);
        const dp = Math.round(total * 0.22);
        const rj = total - ap - dp;
        list.push({
          id: 800_000 + machine.id * 100 + n,
          idPayPad: machine.id,
          totalAp: ap,
          totalDp: dp,
          totalRj: rj,
          total: ap - dp - rj,
          details,
          dateCreated: when,
          userCreated: 'dgomez'
        });
      }
    }
    map.set(machine.id, list);
  });
  return map as Map<number, Tonnage[]>;
}

function buildSubscriptions(random: () => number): Map<number, Subscription[]> {
  const map = new Map<number, Subscription[]>();
  const alerts = ['Baja disponibilidad de billetes', 'Arqueo sin cuadrar', 'Máquina sin transacciones', 'Intentos fallidos repetidos'];
  MOCK_MACHINES.forEach((machine, index) => {
    const count = Math.floor(random() * 3);
    map.set(
      machine.id,
      Array.from({ length: count }, (_, n) => ({
        id: machine.id * 10 + n,
        idPayPad: machine.id,
        paypad: machine.username,
        idAlert: n + 1,
        alert: alerts[(index + n) % alerts.length] as string,
        email: `ops${n + 1}@ecity.co`
      }))
    );
  });
  return map;
}

export const MOCK_CURRENCIES = [
  { id: 1, name: 'Peso colombiano', acronym: 'COP' },
  { id: 2, name: 'Dólar', acronym: 'USD' }
];

export const MOCK_REGIONS = [
  { id: 1, name: 'Antioquia', code: '05' },
  { id: 2, name: 'Santander', code: '68' }
];

export const MOCK_TYPE_DOCUMENTS = [
  { id: 1, typeDocument: 'C.C.' },
  { id: 2, typeDocument: 'C.E.' },
  { id: 3, typeDocument: 'NIT' }
];
