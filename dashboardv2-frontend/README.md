# Dashboard de consultas — transacciones por máquina (Angular 18)

Frente **de solo lectura** sobre `Api_DashboardV2`. Un Pay+ (máquina) + rango de fechas →
transacciones, KPIs, detalle de billetes, arqueos y exportación. No existe —ni se puede
agregar— ninguna pantalla que escriba en producción.

```
npm install
npm start              # ng serve (0.0.0.0:4200) · modo demo, sin backend
npm run start:api      # ídem, proxyeando /api y /Auth a http://localhost:5013
npm run smoke          # 9 aserciones de la lógica crítica (fecha, agregación, grilla)
npm run build:prod     # build real contra la API (environment.production.ts)
npm run preview        # build "demo" + server estático (lo que ves en el preview)
```

Cuentas del modo demo (mismo password `demo1234`, cada una con un rol distinto para ver
cómo cambian menú y accesos): `lruiz` (Administrador), `cperez` (Supervisor de red),
`sdiaz` (Analista de pagos), `aestrada` (Cajero/Carguista), `nvargas` (Auditor externo).

---

## 1. Lo que dice el análisis del backend

`dashboardv2-backend` es una Web API .NET en **cuatro capas** (`Api_DashboardV2` →
`Dashboard.Application` (BL) → `Dashboard.Domain` (DTOs/entidades/interfaces) →
`Dashboard.Persistence` (Dapper + procedimientos almacenados sobre SQL Server)).

### 1.1 Contrato de respuesta

Todos los controladores heredan de `BaseController`, que responde siempre con:

```json
{ "statusCode": 200, "message": "OK", "response": { } }
```

Detalles que condicionan el frente:

| Hecho | Consecuencia en el SPA |
| --- | --- |
| El HTTP status **es** el `statusCode` del envelope | Se desenvuelve en `ApiClientService.unfold()` |
| Cuando no hay datos devuelven **404** con `"No se encontró resultado"` | 404 se trata como *estado vacío*, no como error (`emptyValue: []` + `Resource.isEmpty`) |
| `AddControllers()` sin opciones → System.Text.Json con `CamelCase` | Los DTOs C# (`IdPayPad`, `TotalAmount`) llegan como `idPayPad`, `totalAmount` |
| `ExceptionMiddleware` valida el header `DashboardKeyId` contra `App:ExternalSaltKey` | El SPA lo envía en **todas** las peticiones (`authInterceptor`) |

### 1.2 Autenticación

* `POST api/Auth/Login` con `{ userName, password }`.
* `password` **no viaja en claro**: `AuthBL` llama `Encryption.DecryptRSA`, es decir
  `RSACryptoServiceProvider.Decrypt(bytes, true)` ⇒ **RSA-OAEP con SHA-1** + base64.
  El frente cifra con Web Crypto (`RsaCryptoService`); con SHA-256 el login falla siempre.
* El JWT (`TokenBL`) dura 1 día y sólo lleva las claims `Document` y `UserName`: **no
  trae el rol**, por eso hay que encadenar `User/Logged` → `Role/{idRole}` → `Route/GetLoggedRoutes`.
* `Auth/Logout` (GET) revoca la sesión en `security.Session`.
* Hay bloqueo por intentos (`AuthAttempts`) → el mensaje "Ha superado el número de intentos".

### 1.3 Modelo de seguridad (los "muchos roles")

`PermissionMiddleware` decide **por controlador + nombre de acción**, no por política:

```
ReadTransactions | WriteTransactions | ...   (Transactions)
ReadPayPads | WritePayPads | DelPayPads      (PayPads)
ReadTonnagesAndLoads | WriteTonnagesAndLoads (Arqueos y cargues)
ReadUsers | WriteUsers | DelUsers            (Usuarios)
ReadRoles | ReadRoutes | ReadClients | ReadOffices | ReadMasters | ReadSubs
```

* El usuario `root` **omite todos los checks**.
* Las acciones cuyo nombre no está en el `switch` lanzan `PermitException`
  (`"No existe la acción X en el controlador"`): añadir endpoints sin actualizar el
  middleware los deja **inaccesibles** (fail-closed, correcto).
* `Route/GetLoggedRoutes` devuelve el menú asignado al rol ⇒ el sidebar se construye con
  datos de la BD (`NavigationService`), filtrado por permisos de lectura y por las vistas
  realmente implementadas.
* Vías paralelas de autorización: `Transaction/Paypad*`, `PayPad/Validate` y
  `Transaction/{id}/Paypad` autentican **la máquina** (token de `Auth/LoginPayPad`), no al
  usuario. No se usan en este dashboard.

### 1.4 Endpoints usados (todos de lectura)

| Uso | Endpoint | Permiso exigido |
| --- | --- | --- |
| Transacciones de una máquina | `GET api/Transaction/{idPaypad}` | `ReadTransactions` |
| **Consulta principal** (máquina + rango) | `POST api/Transaction/GetByDate` | `ReadTransactions` |
| Todas las máquinas (para panorama y "todas") | `GET api/Transaction` | `ReadTransactions` |
| Detalle de billetes/monedas | `GET api/Transaction/{id}/Details` | `ReadTransactions` |
| Calificación del usuario final | `GET api/Transaction/{id}/Rating` | `ReadTransactions` |
| Exportación oficial | `POST api/Transaction/ExcelDoc` | `ReadTransactions` |
| Evidencia en video | `GET api/Transaction/Video?idPaypad=&idTransaction=` | `ReadTransactions` |
| Catálogo de máquinas | `GET api/PayPad`, `GET api/PayPad/Status/{status}` | `ReadPayPads` |
| Contenido de caja | `GET api/PayPad/GetStorage/{idPaypad}` | `ReadTonnagesAndLoads` |
| Arqueos / cargues | `GET api/Tonnage/GetByPaypad/{id}`, `GET api/Load/GetByPaypad/{id}` | `ReadTonnagesAndLoads` |
| Alertas suscritas | `GET api/Alerts/Subscription/GetByPayPad/{id}` | `ReadSubs` |
| Directorio y seguridad | `GET api/User`, `api/User/Logged`, `api/Role`, `api/Permission`, `api/Route/GetLoggedRoutes` | `ReadUsers`, `ReadRoles` |

`GetByDate` exige exactamente `yyyy-MM-ddTHH:mm:ss.fffZ` en `from`/`to`
(`DateTime.ParseExact`); por eso existe `toApiDate()` y todos los rangos se calculan en UTC.

### 1.5 Riesgos detectados en el backend (merecen ticket aparte)

1. **`Resource/rsa_keys/private.pem` está en el repositorio** junto con el `appsettings.json`
   que contiene usuario/contraseña de BD (`sa`) y el `Jwt:Secret`. Con esos dos archivos se
   puede cifrar contraseñas, firmar JWT válidos y entrar a la BD. Rotar claves, sacarlas del
   repo (history incluido) y moverlas a variables de entorno/Key Vault.
2. **`[Authorize]` está comentado** en `TransactionController` (Get, GetByDate, Paypad,
   Details, ExcelDoc, Video). Hoy esas consultas se protegen **sólo** por el header
   `DashboardKeyId`, que es una clave estática compartida. Endurecer: activar `[Authorize]`.
3. `CorsConfig` usa `AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()`: cualquier origen
   puede llamar la API con el `DashboardKeyId` si lo conoce.
4. `AppSettings.IsProduction` está **fijado en `false`** en `Program.cs` (la línea real está
   comentada), de modo que `DB_CONNECTION` apunta a `DbConnectionDev` sin importar el entorno:
   revisar antes de publicar, porque "producción" puede estar leyendo la BD de pruebas.
5. `TransactionController.GetByPaypad(int idPaypad)` no filtra por el alcance del usuario:
   cualquier token con `ReadTransactions` puede leer la historia de **cualquier** Pay+.
   Si el requisito es "cada cliente ve sólo sus máquinas", hace falta un filtro por
   `IdClient` en el BL (una vez existe, este SPA lo usa sin cambios: está tras `TransactionsPort`).
6. `EventLogger` registra en MongoDB `localhost:27017` (config por defecto) y `VideoDownloadFtp`
   loguea usuario y **contraseña FTP** en claro.

Nada de esto se puede resolver desde el frente; este README los lista porque afectan la
decisión de exponer (o no) el dashboard a una red amplia.

---

## 2. Arquitectura

Arquitectura limpia con el **dominio en el centro** y la API como detalle intercambiable:

```
src/app/
├── core/                          ← política transversal, sin componentes
│   ├── config/                    · rutas del API, claves, clave pública RSA
│   ├── models/                    · DTOs tipados (espejo de Dashboard.Domain.DTOs) + view-models
│   ├── logic/                     · funciones puras: fechas, agregación, tabla, permisos, formato
│   ├── ports/                     · TRANSACCIONES/MACHINES/SECURITY (clases abstractas = tokens DI)
│   ├── http/                      · ApiClient, Resource<T>, interceptores (auth, solo lectura, errores)
│   ├── guards/                    · authGuard, guestGuard, permissionGuard(view)
│   └── services/                  · AuthService, AuthenticationService, PermissionService,
│                                    NavigationService, MachineCatalogService, RsaCrypto, Theme, Toasts
├── data/                          ← adapters (el único lugar que "conoce" el backend)
│   ├── http/                      · 3 adapters reales contra Api_DashboardV2
│   ├── mock/                      · dataset determinista con el mismo contrato
│   └── data.providers.ts          · elige el adapter según environment
├── shared/                        ← UI reutilizable, sin dominio
│   ├── ui/                        · stats-card, chart, data-table, panel, select, range-picker,
│   │                                badge, skeleton, empty/error-state, page-header, icon, toaster
│   └── pipes/                     · money, uiDate, relative
└── features/
    ├── auth/login                 · LoginForm
    ├── dashboard/                 · layout + sidebar + topbar + dashboard.routes.ts
    ├── overview/                  · OperationsOverviewComponent  (panorama de la red)
    ├── sales/                     · SalesDashboardComponent      (★ transacciones por máquina)
    ├── analytics/                 · AnalyticsDashboardComponent  (heatmap, mix, Pareto)
    ├── machines/                  · MachinesBoardComponent       (caja, arqueos, cargues)
    ├── users/                     · UserDashboardComponent       (operadores y actividad)
    ├── security/                  · AccessMatrixComponent        (matriz rol × permiso)
    └── not-found/
```

Reglas que se respetan:

* Las features **no** hablan con `HttpClient`: consumen puertos (`TransactionsPort`, …) a
  través de servicios de caso de uso (`TransactionsQueryService`, `OverviewQueryService`,
  `AnalyticsQueryService`, `MachinesBoardService`).
* Todo el estado es **signal-based**: `signal()` para filtros, `computed()` para derivados
  (KPIs, series, filas), `Resource<T>` como envoltorio `idle|loading|success|error` con
  `switchMap` interno (cancela la consulta anterior al cambiar de máquina).
* `input()` / `output()` / `model()` en lugar de `@Input`/`@Output`; `inject()` en lugar de
  constructor injection; plantillas con `@if`/`@for` (con `track`)/`@switch`/`@defer`/`$any`.
* Cero CSS propio: un único `styles.css` con directivas Tailwind + `@layer`. Modo oscuro por
  clase (`ThemeService`) y diseño *mobile-first*.
* `chart.js` se carga con `import()` dinámico dentro de `ChartComponent`: vive en su propio
  chunk (≈205 kB) y sólo se descarga cuando el gráfico entra en viewport.

## 3. Cómo se garantiza el "solo consultas"

Tres capas, de arriba hacia abajo:

1. **No existe UI de escritura.** Ninguna vista renderiza formularios de alta/edición y los
   puertos no declaran métodos `create/update/delete` (ver `core/ports/*.port.ts`).
2. **`readOnlyGuardInterceptor`** (`core/http/readonly-guard.interceptor.ts`): si el método
   no es `GET/HEAD/OPTIONS`, o es un `POST` que no está en `READ_ONLY_QUERY_POST`
   (`Auth/Login`, `Auth/VerifyPwd`, `Transaction/GetByDate`, `Transaction/ExcelDoc`), la
   petición **no se envía**: se aborta con `ReadOnlyViolationError`, se loguea y se muestra
   un aviso. Los `POST` permitidos son búsquedas con cuerpo, no mutaciones.
3. **Guards por permiso** (`ReadTransactions`, `ReadPayPads`, `ReadUsers`, `ReadRoles`,
   `ReadTonnagesAndLoads`): un rol sin permiso no ve la ruta ni el item del menú; si intenta
   navegar, se le redirige a la primera vista que sí puede leer.

Y la última palabra la sigue teniendo el servidor (`PermissionMiddleware` + `[Authorize]`
cuando se reactive). El interceptor es defensa en profundidad y una prueba auditable de que
este SPA es inocuo.

## 4. Conectarlo a producción

1. `src/environments/environment.production.ts` ya apunta a `pathPrefix: 'api'` con `baseUrl: ''`
   (SPA y API en el mismo origen detrás de IIS). Si el API vive en otro host, poner el origen ahí.
2. `App:ExternalSaltKey` del `appsettings.json` del entorno → `api.dashboardKeyId`.
3. `Resource/rsa_keys/public.pem` del entorno → `core/config/rsa-public-key.ts` (si rotan el
   par de claves hay que actualizar este archivo; la pública es segura para publicar).
4. Build: `npm run build:prod` y desplegar `dist/dashboardv2-frontend/browser` como sitio estático.
   Sin rewrite de servidor no hay deep-links: en IIS agregar una regla SPA (o usar
   `tools/serve-dist.mjs`, que ya hace fallback a `index.html`).
5. Override sin recompilar: en `index.html`, antes de `main.js`,
   ```html
   <script>window.__DASHBOARD_CONFIG__ = { api: { baseUrl: 'https://api.intranet' } };</script>
   ```

Nota de despliegue: si el IIS publica las rutas **sin** prefijo `api` (el `AuthController`
declara `[Route("[controller]")]` además del `api/[controller]` heredado), basta con ajustar
`pathPrefix` o el mapa `core/config/api-paths.ts`. Es el único archivo que hay que tocar si
el enrutado cambia; confirmar contra el Swagger del entorno (`/swagger`).

## 5. Decisiones de producto que conviene revisar

* **Agregaciones en el navegador.** El API no expone totales por periodo ni contadores por
  estado; se calculan en memoria sobre la lista (`core/logic/aggregate.logic.ts`). Para
  `GET api/Transaction` con millones de filas esto no escala: la opción correcta es un SP de
  agregación (nuevo endpoint de lectura), no arreglarlo con parches en el frente.
* **"Todas las máquinas"** no está soportado por `GetByDate` (filtra por `idPayPad`), así que
  esa vista usa `GET api/Transaction` y recorta el rango en cliente. Con una máquina
  seleccionada sí se usa `GetByDate` (consultado y paginado por SQL Server).
* El video (`Transaction/Video`) exige `Authorization`, por eso se baja como blob y no como `<a href>`.
