# Kirana

Web de producción + (futuro) panel de gestión para **Kirana**, alojamiento
rural **solo adultos** a 1 km de Bermeo, en la Reserva de la Biosfera de
**Urdaibai** (Bizkaia). Marca: blanco, madera, luz, minimalismo, calma.
Lema: *«Silencio, naturaleza, Kirana.»*

> Memoria del proyecto y reglas en `CLAUDE.md`. Documento maestro completo en
> `referencia/kirana-traspaso-claude-code.md` (cuando se incorpore).

## Stack

Astro + Tailwind CSS v4 · multi-idioma con routing por locale (hreflang
pendiente, Fase 7) · PostgreSQL (Fase 3+) · Stripe (Fase 4) · channel manager
(Fase 5) · TicketBAI/Batuz (Fase 6) · deploy Vercel/Netlify.

## Estado: Fase 1 + Fase 2 (web pública completa)

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
- [ ] Pendiente i18n: traducir el `lema` y el `storytelling` Premium (ahora
      caen a ES en todos los idiomas); EU/DA/NO requieren traducción profesional
- [ ] Pendiente: galería de fotos completa (faltan `fotos-kirana/`; las
      tarjetas usan el CDN de la maqueta), favicon/logos, formulario de fechas
- [ ] Panel admin (Fase 3) · Reservas + Stripe (Fase 4) · Channel manager
      (Fase 5) · TicketBAI (Fase 6) · SEO/hreflang/RGPD/deploy (Fase 7)

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
npm run dev      # http://localhost:4321
npm run build    # genera dist/
npm run preview  # sirve dist/
```

## Estructura

```
referencia/                # maquetas + briefing maestro (SOLO LECTURA)
src/
├── data/rooms.json        # fuente única de las 10 habitaciones
├── i18n/
│   ├── i18n.json          # diccionario (clave = texto ES → 8 idiomas)
│   └── ui.ts              # tn(lang, 'texto ES'), getLangFromUrl, localizedPath
├── lib/rooms.ts           # helpers (getActiveRooms, …)
├── styles/global.css      # tokens de marca (Tailwind v4 @theme)
├── components/            # Header, Footer, Hero, RoomCard, RoomsSection
├── layouts/BaseLayout.astro
└── pages/                 # index.astro (ES) + [lang]/index.astro
```

## Datos pendientes de confirmar con el cliente

m² y precios reales · nº Registro de Turismo de Euskadi · precio media pensión ·
email profesional · ¿activar Lur (accesible)? · channel manager y software
TicketBAI · dominio canónico · traducción EU/DA/NO (traductor nativo).
