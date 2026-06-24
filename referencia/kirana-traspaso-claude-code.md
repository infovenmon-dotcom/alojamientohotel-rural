# Kirana — Traspaso a Claude Code
### Resumen completo del proyecto + paso a paso para construir la web final

> **Qué es esto.** El documento único que necesitas para llevar el proyecto Kirana de *maqueta* a *web de producción* usando Claude Code. Reúne todo lo decidido, el modelo de datos, lo que ya está resuelto, lo que falta hacer en producción y, al final, las instrucciones exactas para arrancar en Claude Code.
>
> **Idioma de trabajo:** español. **Destino:** build de producción en Claude Code.

---

## 1. El proyecto en una frase

Rediseño de la web y creación de un panel de gestión para **Kirana**, alojamiento rural **solo adultos** a 1 km de Bermeo, dentro de la **Reserva de la Biosfera de Urdaibai** (Bizkaia). Cliente/anfitrión: **Fran Alamillo**. Hoy está en Lodgify + OTAs (Booking, Expedia/Vrbo). Marca: blanco, madera, luz, minimalismo y calma. Lema: *“Silencio, naturaleza, Kirana.”*

**Datos de contacto y operativos (confirmados):**
- Dirección: Barrio San Miguel 27, Bermeo (Bizkaia) 48370.
- Teléfono / WhatsApp: +34 689 352 391 → `https://wa.me/34689352391`.
- Dominios actuales: `kiranabermeo.es` y `alojamientokirana.com` → **consolidar en uno canónico + redirección 301**.
- Check‑in 14:00 · Check‑out 12:00 · Pago 50% al reservar + 50% catorce días antes · Cancelación gratis hasta 14 días antes · Sin fianza.
- Servicios: limpieza diaria incluida, desayuno casero incluido, **media pensión** (precio a confirmar), accesible para silla de ruedas, pago con tarjeta, no fumar, parking, jardín/porche compartidos, WiFi banda ancha, A/C + calefacción, TV cable, secador, sillas de playa, extintor.
- A 24 km del aeropuerto, 2 km del bus, 1 km del tren.

---

## 2. Archivos que entregas (la maqueta = fuente de verdad visual)

Todos en la carpeta de salida del proyecto. Súbelos al repo (ver Paso 3):

| Archivo | Qué es | Uso en Claude Code |
|---|---|---|
| `kirana-web-paralela.html` | **Maqueta de la web pública** (self‑contained, i18n de 10 idiomas, módulo de habitaciones por concepto + storytelling). | Referencia visual y de copy para portar la web. |
| `kirana-panel-control.html` | **Panel de gestión privado** (Reservas, Ingresos, Facturas TicketBAI/Batuz, Contabilidad, Habitaciones con bloqueo). | Referencia visual y funcional del admin. |
| `kirana-reserva-conectada.html` | Demo lado a lado web↔panel con disponibilidad real. | Referencia del flujo de reserva. |
| `fotos-kirana/` | Fotos reales recortadas (hab1, hab2, baño, salón, comedor, jardín). | Imágenes base para la web. |
| `kirana-logo-white.png` / `kirana-logo-dark.png` | Logo procesado. | Branding. |
| `kirana-entorno-guia.md` | Guía del entorno + contactos verificados de actividades. | Contenido de la sección Entorno/Actividades. |
| `kirana-images.json` + `descargar-imagenes.sh` | IDs/URLs de imágenes CDN Lodgify y script de descarga. | Para bajar las fotos originales del CDN. |
| `kirana-traspaso-claude-code.md` | **Este documento.** | Briefing maestro para Claude Code. |

> La **fuente de verdad visual** es la pareja `kirana-web-paralela.html` + `kirana-panel-control.html`. Ambas comparten el mismo modelo de datos de habitaciones; cualquier cambio debe propagarse a las dos.

---

## 3. Modelo de datos único — las 10 habitaciones

8 habitaciones dobles **arriba** (planta superior, baño privado) + **apartamento** y **habitación accesible** abajo (planta baja). Nombres en euskera con su significado y su “concepto” (la fórmula *“¿dónde te quieres alojar? En el mar…”*).

| # | Nombre | Significado | Concepto | Planta | Tipo | m² (aprox.) | Cama | Precio/noche | Estado por defecto |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Argia** | la luz | En la luz | Superior | Doble | 18 | 150×200 | 95 € | **Activa** |
| 2 | **Itsaso** | el mar | En el mar | Superior | Doble | 19 | 2×90×200 | 105 € | **Activa** |
| 3 | **Basoa** | el bosque | En el bosque | Superior | Doble | 16 | 150×200 | 95 € | **Activa** |
| 4 | **Lasai** | la calma | En calma | Superior | Doble | 15 | 140×200 | 90 € | **Activa** |
| 5 | **Izar** | la estrella | Bajo las estrellas | Superior | Doble | 17 | 150×200 | 95 € | **Activa** |
| 6 | **Haize** | la brisa | Con la brisa | Superior | Doble | 16 | 150×200 | 95 € | Bloqueada |
| 7 | **Ibai** | la ría | En la ría | Superior | Doble | 18 | 150×200 | 95 € | Bloqueada |
| 8 | **Aritz** | el roble | Bajo el roble | Superior | Doble | 20 | 150×200 | 100 € | Bloqueada |
| 9 | **Lorategia** | el jardín | En el jardín | Baja | Apartamento (4 pax) | 42 | Doble + sofá cama | 160 € | **Activa** |
| 10 | **Lur** | la tierra | En la tierra | Baja | Accesible | 24 | Doble adaptada | 95 € | Bloqueada |

- **Por defecto: 6 activas** (5 dobles + apartamento) y **4 bloqueadas** (3 dobles + accesible). El anfitrión activa las bloqueadas a medida que estén listas.
- **Regla clave:** la web pública **solo muestra las habitaciones activas**. Bloquear en el panel = desaparece de la web, del calendario y del modal de nueva reserva.
- m², camas y precios son **orientativos** → confirmar con Fran antes de producción.
- Storytelling de cada habitación: ver el array `RM` dentro de `kirana-web-paralela.html` y `ROOMINFO` en `kirana-panel-control.html` (textos ya redactados en español).

---

## 4. Qué hace la maqueta hoy (y hay que portar)

### Web pública (`kirana-web-paralela.html`)
- Intro cinematográfica → barra utilitaria → nav → hero → “La casa” → “Espacios”.
- **Módulo de habitaciones** con la pregunta **“¿Dónde te quieres alojar?”** y tarjetas por concepto (En el mar, En el bosque, Bajo las estrellas…), cada una con storytelling y **servicios** (baño privado, TV, A/C y calefacción, WiFi, secador, m², cama, precio “desde”). Renderizado por JS **solo de las activas**.
- Galería de fotos reales, Servicios, Normas, Políticas, Entorno (14 lugares), Actividades (contactos reales), Opiniones, Ofertas, Reserva directa (WhatsApp), footer.
- **i18n funcional en 10 idiomas** (ES, EU, FR, EN, NL, BE=NL, DE, DA, NO, IT): diccionario `I18N` (texto español→8 traducciones) + motor que sustituye los nodos de texto, y re‑render del grid de habitaciones al cambiar de idioma.
  - Conceptos, servicios y la pregunta: traducidos en los 8 idiomas.
  - **Storytelling largos**: traducidos en EN/FR/DE/IT/NL; **EU, DA y NO caen a español** (pendiente traducción profesional — el **euskera** debe hacerlo un traductor nativo).

### Panel de gestión (`kirana-panel-control.html`)
- **Reservas:** banner “Canales conectados · sincronizados” (Web, Booking, Expedia/Vrbo) explicando el anti‑overbooking vía channel manager; calendario de ocupación por habitación; KPIs; modal “+ Nueva reserva” **con disponibilidad real** (opciones ocupadas/sin cupo/bloqueadas deshabilitadas, aviso verde/rojo, guardar bloqueado si choca); etiqueta de canal por reserva.
- **Ingresos** y **Contabilidad.**
- **Facturas:** tarjeta de cumplimiento **TicketBAI · Batuz · Bizkaia** + plantilla de factura con código TBAI, QR y estado “Enviada a Hacienda Foral · Bizkaibai/LROE” (placeholders).
- **Habitaciones:** 10 tarjetas agrupadas por planta, con miniatura, significado, concepto, storytelling, m²/cap/precio, servicios, icono ♿ en la accesible, y botón **Bloquear/Activar** que oculta la habitación de calendario, reservas y web. Resumen “X de 10 en uso”.

---

## 5. Qué es de PRODUCCIÓN (no está en la maqueta) — y por qué

La maqueta replica el **mismo modelo de datos**, pero estas piezas necesitan backend real y se construyen en Claude Code:

1. **Sincronización real panel ↔ web.** Hoy son dos HTML separados. En producción comparten una **base de datos / motor de reservas**: activar o bloquear una habitación en el panel cambia la web en vivo, y una reserva resta disponibilidad en ambos.
2. **Channel manager (OTAs).** La sincronización real con **Booking.com y Expedia/Vrbo** (anti‑overbooking) requiere un channel manager — **Smoobu** u **Octorate** — o la **Connectivity API** de Booking. Es una integración de terceros, no se simula.
3. **TicketBAI / Batuz (Bizkaia).** Facturación **obligatoria desde el 1 de enero de 2026** en Bizkaia: factura con código TBAI + QR, firmada y encadenada, enviada telemáticamente, más el **LROE** (modelos 140 autónomos / 240 empresas) vía **Bizkaibai**. Requiere **software garante homologado + certificado digital**, o la app oficial gratuita **batuz.eus/haztufactura**. Sanciones desde 2.000 €/factura. → No reimplementar la firma: integrar software homologado o derivar a la app oficial.
4. **Pasarela de pago** para el 50% + 50% (p. ej. **Stripe** o Redsys), con la política de cancelación.
5. **Backend, base de datos y autenticación** del panel (admin privado).

---

## 6. Stack recomendado

- **Framework:** Astro (contenido + islas interactivas) **o** Next.js si se prefiere full‑React. Astro encaja bien por SEO y velocidad.
- **Estilos:** Tailwind CSS con los **tokens de marca** ya definidos.
- **i18n:** routing por idioma con **hreflang** (`/es`, `/eu`, `/fr`, `/en`, `/nl`, `/de`, `/da`, `/no`, `/it`; `be`→contenido `nl`). Diccionarios portados desde `I18N`.
- **Base de datos:** PostgreSQL (p. ej. Supabase/Neon) o el motor del PMS si se externaliza.
- **Reservas/OTAs:** Smoobu u Octorate (channel manager) o API de Booking.
- **Pagos:** Stripe.
- **Facturación:** software TicketBAI/Batuz homologado (o app oficial).
- **Deploy:** Vercel o Netlify. **RGPD**: aviso de cookies, política de privacidad, formularios con consentimiento.

**Tokens de diseño (úsalos tal cual):**
```
--paper:#F2F3EE; --paper-2:#E7E9E0; --ink:#1E211B; --pine:#2B3A2E;
--moss:#5F6E52; --oak:#B49A72; --mist:#6C7065;
--serif:"Cormorant Garamond", Georgia, serif;
--sans:"Hanken Grotesk", system-ui, sans-serif;
```

---

## 7. Arquitectura objetivo (resumen)

```
Repositorio
├─ /referencia            ← los HTML de la maqueta + este documento (solo lectura)
├─ /src
│   ├─ /data/rooms.json   ← FUENTE ÚNICA de las 10 habitaciones
│   ├─ /i18n/*.json        ← diccionarios por idioma (portados de I18N)
│   ├─ /pages/[lang]/...   ← web pública multi-idioma
│   ├─ /pages/panel/...    ← admin privado (auth)
│   └─ /lib/…              ← disponibilidad, reservas, facturación
├─ CLAUDE.md              ← memoria del proyecto para Claude Code
└─ .env                   ← claves (Stripe, DB, channel manager, etc.)
```

---

## 8. PASO A PASO en Claude Code

> Verificado con la documentación oficial de Anthropic (jun. 2026). Claude Code es la herramienta de Anthropic que trabaja en tu terminal/escritorio sobre tu repositorio.

### Paso 0 · Requisitos
- Una cuenta de pago: **Claude Pro / Max / Team / Enterprise** o **Anthropic Console (API)**. El plan gratuito de Claude.ai **no** incluye Claude Code.
- **Git** instalado.
- **Node.js 18+** recomendado (necesario para servidores MCP vía `npx` y para Astro/Next).

### Paso 1 · Instalar Claude Code
Instalador nativo (recomendado, sin dependencias, se autoactualiza):
```bash
# macOS / Linux
curl -fsSL https://claude.ai/install.sh | bash
```
```powershell
# Windows (PowerShell)
irm https://claude.ai/install.ps1 | iex
```
Alternativa por npm (si ya usas npm o quieres fijar versión):
```bash
npm install -g @anthropic-ai/claude-code   # NUNCA con sudo
```
Comprobar e iniciar sesión:
```bash
claude --version          # debe imprimir una versión
cd ruta/a/tu-proyecto
claude                    # primer arranque: login en el navegador
# elige "Claude account with subscription" (o Console/API)
```
Dentro de Claude Code: `/doctor` para comprobar la instalación.

### Paso 2 · Crear el repositorio
```bash
mkdir kirana-web && cd kirana-web
git init
mkdir referencia
```

### Paso 3 · Meter la maqueta como referencia
Copia dentro de `/referencia`: `kirana-web-paralela.html`, `kirana-panel-control.html`, `kirana-reserva-conectada.html`, `kirana-entorno-guia.md`, `kirana-images.json`, la carpeta `fotos-kirana/`, los logos y **este documento** (`kirana-traspaso-claude-code.md`).

### Paso 4 · Inicializar la memoria del proyecto
Arranca `claude` en la carpeta y ejecuta:
```
/init
```
Esto crea un **CLAUDE.md**. Pégale dentro el contexto del proyecto (resumen del §1, el modelo de datos del §3, los tokens del §6 y las reglas de §5). Así Claude Code recuerda el proyecto en cada sesión.

### Paso 5 · Prompt maestro (cópialo tal cual en Claude Code)
```
Lee /referencia/kirana-traspaso-claude-code.md y los dos HTML de maqueta
(kirana-web-paralela.html y kirana-panel-control.html). Vamos a construir la
web de producción de Kirana.

Stack: Astro + Tailwind CSS, multi-idioma (ES, EU, FR, EN, NL, DE, DA, NO, IT;
BE usa NL) con hreflang. Usa los tokens de marca del documento.

Empieza por la FASE 1 (scaffold + web pública). Antes de escribir código,
propón la estructura de carpetas y un rooms.json como fuente única de las 10
habitaciones (campos: id, significado, concepto, planta, tipo, m2, cama, precio,
activa, fotos, storytelling). Espera mi visto bueno antes de generar.
```

### Paso 6 · Construir por fases (un prompt por fase)
- **Fase 1 — Scaffold + web pública.** Estructura Astro+Tailwind, tokens, `rooms.json`, routing i18n con hreflang. Portar secciones de `kirana-web-paralela.html`, incluyendo el módulo **“¿Dónde te quieres alojar?”** que renderiza **solo las habitaciones activas** desde `rooms.json`.
- **Fase 2 — i18n completo.** Portar el diccionario `I18N` de la maqueta a `/src/i18n/*.json`. Marcar EU/DA/NO de los storytelling como “pendiente traducción profesional”.
- **Fase 3 — Panel admin.** Auth + UI del panel (`kirana-panel-control.html`): Habitaciones con **bloquear/activar** escribiendo en la BD, Reservas con calendario y disponibilidad real, Ingresos, Contabilidad.
- **Fase 4 — Motor de reservas + pagos.** Disponibilidad real (sin solapes), política 50% + 50% a 14 días, Stripe, emails de confirmación.
- **Fase 5 — Channel manager.** Integrar **Smoobu/Octorate** o la API de Booking para sincronizar Booking/Expedia y evitar overbooking.
- **Fase 6 — Facturación TicketBAI/Batuz.** Integrar software garante homologado (o derivar a `batuz.eus/haztufactura`); LROE vía Bizkaibai. No reimplementar la firma.
- **Fase 7 — SEO, RGPD y deploy.** `sitemap.xml`, `robots.txt`, hreflang, metadatos, cookies/consentimiento, analítica; deploy en Vercel/Netlify; **consolidar los dos dominios** en uno canónico con 301.

> Consejos en Claude Code: usa `/model` para elegir modelo, `/context` para vigilar el contexto, `/permissions` para los permisos de archivos/comandos y `/cost` para el gasto. Trabaja en ramas de Git y revisa cada fase antes de seguir.

### Paso 7 · Integraciones (MCP, opcional)
Para que Claude Code opere con servicios externos puedes añadir servidores MCP (p. ej. Stripe, la BD). Se añaden con `claude mcp add …` y requieren `npx` (Node.js). Guarda las claves en `.env`, nunca en el código.

---

## 9. Decisiones pendientes con Fran (cliente)

- [ ] Confirmar **m², camas y precios** reales de cada habitación.
- [ ] **Número de Registro de Turismo** de Euskadi (obligatorio mostrarlo en la web).
- [ ] Precio y régimen de la **media pensión**.
- [ ] Pasar el email personal (`fj.alam55@gmail.com`) a uno **profesional** (p. ej. `info@kiranabermeo.es`).
- [ ] ¿Activar **Lur** (accesible) desde el inicio para usar la accesibilidad como reclamo, o mantenerla bloqueada?
- [ ] Elegir **channel manager** (Smoobu vs Octorate) y **software TicketBAI** homologado.
- [ ] Elegir **dominio canónico** (`kiranabermeo.es` recomendado) y redirigir el otro.
- [ ] Encargar **traducción profesional al euskera** (y DA/NO) de los storytelling.

---

## 10. Checklist de lanzamiento

- [ ] Web pública multi‑idioma con hreflang y SEO.
- [ ] `rooms.json` como fuente única; web muestra solo activas; panel bloquea/activa en vivo.
- [ ] Panel con auth, reservas, disponibilidad real, ingresos y contabilidad.
- [ ] Motor de reservas + Stripe + política 50/50 y cancelación.
- [ ] Channel manager conectado (Booking/Expedia) sin overbooking.
- [ ] Facturación TicketBAI/Batuz operativa (software homologado).
- [ ] RGPD: cookies, privacidad, consentimiento.
- [ ] Dominio canónico + 301; email profesional; nº de registro turístico visible.
- [ ] Traducciones EU/DA/NO completadas.

---

*Marca y tono: blanco, madera, luz, minimalismo, calma. “Silencio, naturaleza, Kirana.” Todo el contenido, solo adultos, en plena Reserva de la Biosfera de Urdaibai.*
