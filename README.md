# Kirana

Web de producción + (futuro) panel de gestión para **Kirana**, alojamiento
rural **solo adultos** a 1 km de Bermeo, en la Reserva de la Biosfera de
**Urdaibai** (Bizkaia). Marca: blanco, madera, luz, minimalismo, calma.
Lema: *«Silencio, naturaleza, Kirana.»*

> Memoria del proyecto y reglas en `CLAUDE.md`. Documento maestro completo en
> `referencia/kirana-traspaso-claude-code.md` (cuando se incorpore).

## Stack

Astro (SSR, `output: 'server'` + adaptador `@astrojs/node`) + Tailwind CSS v4 ·
multi-idioma con routing por locale (hreflang pendiente, Fase 7) · PostgreSQL
(Fase 3+, hoy persistencia de fichero) · Stripe (Fase 4) · channel manager
(Fase 5) · TicketBAI/Batuz (Fase 6) · deploy Vercel/Netlify.

> SSR: la web pública y el panel leen `rooms.json` en cada petición, de modo
> que bloquear/activar una habitación en el panel se refleja **en vivo** en la
> web (regla #2). La persistencia es de fichero como stand-in; se sustituye por
> la BD cambiando solo `src/lib/roomsStore.ts`.

## Estado: Fase 1 + Fase 2 (web pública) + Fase 3 (panel)

- [x] Scaffold Astro + Tailwind + tokens de marca
- [x] `src/data/rooms.json` — fuente única de las 10 habitaciones
- [x] **Web pública completa**, portada de `kirana-web-paralela.html`:
      Hero · La casa · Los espacios · La idea · Habitaciones («¿Dónde te
      quieres alojar?», solo activas, con foto/specs/servicios) · Servicios +
      Horarios y normas · Banda · El entorno (14 lugares) · Actividades (3
      categorías + contactos) · La estancia · Opiniones · Ofertas · Reserva
- [x] **Propuesta Premium** del cliente: cada habitación con `lema` + nuevo
      `storytelling` (en `rooms.json`)
- [x] Diccionario `I18N` portado a `src/i18n/i18n.json` (clave = texto ES),
      helper `tn(lang, 'texto ES')` con fallback a ES. UI traducida en los 8
      idiomas (ES/EU/FR/EN/NL/DE/DA/NO/IT)
- [x] Maquetas de referencia en `referencia/` (solo lectura)
- [x] **Panel de gestión** (`/panel`, portado de `kirana-panel-control.html`):
      login por contraseña + middleware · **Habitaciones** bloquear/activar que
      persiste y se refleja en la web en vivo (regla #2) · Reservas (KPIs +
      calendario de ocupación + próximas) · Ingresos · Facturas (con aviso
      TicketBAI, sin reimplementar la firma) · Contabilidad
- [ ] Pendiente i18n: traducir el `lema` y el `storytelling` Premium (ahora
      caen a ES en todos los idiomas); EU/DA/NO requieren traducción profesional
- [ ] Pendiente: galería de fotos completa (faltan `fotos-kirana/`; las
      tarjetas usan el CDN de la maqueta), favicon/logos, formulario de fechas
- [ ] Panel sobre **datos de ejemplo** (`panel-sample.json`) salvo Habitaciones;
      auth y persistencia son stand-in (→ usuarios + BD en producción)
- [ ] Reservas reales + Stripe (Fase 4) · Channel manager (Fase 5) ·
      TicketBAI (Fase 6) · SEO/hreflang/RGPD/deploy (Fase 7)

## Reglas clave

1. `src/data/rooms.json` es la **fuente única** de las 10 habitaciones.
2. La web pública **solo muestra habitaciones activas** (`activa: true`).
3. **No reimplementar a mano** TicketBAI/Batuz ni la sincronización con OTAs
   (usar software homologado / channel manager).
4. Tono **solo adultos**: calma y naturaleza.
5. Claves en `.env` (ver `.env.example`), **nunca** en el código.

## Desarrollo local

```bash
npm install
cp .env.example .env           # define PANEL_PASSWORD
npm run dev                    # http://localhost:4321

# Producción (SSR Node, ejecutar desde la raíz del proyecto):
npm run build                  # genera dist/ (servidor Node)
PANEL_PASSWORD=… node ./dist/server/entry.mjs
```

El panel de gestión está en **`/panel`** (protegido por `PANEL_PASSWORD`).

## Estructura

```
referencia/                # maquetas + briefing maestro (SOLO LECTURA)
src/
├── data/
│   ├── rooms.json         # fuente única de las 10 habitaciones
│   └── panel-sample.json  # datos de ejemplo del panel (reservas/facturas/gastos)
├── i18n/
│   ├── i18n.json          # diccionario (clave = texto ES → 8 idiomas)
│   └── ui.ts              # tn(lang, 'texto ES'), getLangFromUrl, localizedPath
├── lib/
│   ├── rooms.ts           # tipos + helpers (amenList, bathWord, roomTag…)
│   ├── roomsStore.ts      # lectura/escritura de rooms.json (→ BD en prod)
│   └── auth.ts            # login del panel por contraseña (stand-in)
├── middleware.ts          # protege /panel y /api
├── styles/global.css      # tokens de marca (Tailwind v4 @theme)
├── components/            # Hero, RoomCard, RoomsSection, Seccion*…
├── layouts/               # BaseLayout (web) + PanelLayout (panel)
└── pages/
    ├── index.astro · [lang]/index.astro     # web pública (SSR)
    ├── api/rooms/[id].ts                     # bloquear/activar (POST)
    └── panel/                                # reservas, ingresos, habitaciones,
                                              # facturas, contabilidad, login
```

## Datos pendientes de confirmar con el cliente

m² y precios reales · nº Registro de Turismo de Euskadi · precio media pensión ·
email profesional · ¿activar Lur (accesible)? · channel manager y software
TicketBAI · dominio canónico · traducción EU/DA/NO (traductor nativo).
