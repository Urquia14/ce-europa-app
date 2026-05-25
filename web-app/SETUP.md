# CE Europa — Posada en marxa (app web amb login i sincronització)

Aquesta guia et porta de zero a tenir l'app en línia, amb **login** i **dades sincronitzades a qualsevol dispositiu**.
Necessitaràs crear **dos comptes gratuïts**: **Supabase** (base de dades + login) i **Vercel** (allotjament).
No cal saber programar; segueix els passos en ordre.

> Consell: com que la teva xarxa de la universitat bloqueja molts dominis, si en algun pas una pàgina no carrega,
> prova-ho amb les **dades del mòbil** o una altra xarxa.

---

## PART 1 — Supabase (base de dades + login)

1. Ves a **https://supabase.com** i fes **Start your project** → crea un compte (pots entrar amb GitHub o amb correu).
2. **New project**: posa-li un nom (ex. `ce-europa`), una **contrasenya de base de dades** (apunta-la) i tria una regió propera (Europa). Crea'l i espera 1–2 minuts.
3. Quan estigui llest, ves a **SQL Editor** (icona `</>` al menú esquerre) → **New query**.
4. Obre el fitxer **`supabase-setup.sql`** d'aquesta carpeta, copia tot el contingut, enganxa'l a l'editor i prem **Run**. Hauria de dir *Success*.
5. (Recomanat per simplificar) Ves a **Authentication → Sign In / Providers → Email** i, si vols entrar sense haver de confirmar el correu cada cop, **desactiva "Confirm email"**. (Si ho deixes activat, al crear el compte hauràs de clicar un enllaç que t'arribarà per correu.)
6. Ves a **Project Settings → API** i apunta aquests dos valors:
   - **Project URL** → és el teu `VITE_SUPABASE_URL`
   - **anon public** (a "Project API keys") → és el teu `VITE_SUPABASE_ANON_KEY`

---

## PART 2 — Pujar el codi a GitHub

L'app que cal desplegar és **la carpeta `web-app`** (la que conté aquest fitxer).

1. Crea un compte a **https://github.com** si no en tens.
2. Crea un **repositori nou** (botó **New**), per exemple `ce-europa-web`. Deixa'l **Public** o **Private**, com vulguis.
3. A la pàgina del repositori buit, clica **uploading an existing file** (o **Add file → Upload files**).
4. Arrossega **tot el contingut de la carpeta `web-app`** (els fitxers i la carpeta `src`). 
   - Important: puja el **contingut** de `web-app` (package.json, index.html, la carpeta `src`, etc.), no la carpeta `web-app` sencera embolicada. Així el `package.json` queda a l'arrel del repositori.
   - **No** cal pujar `node_modules` (no existeix encara) ni el fitxer `.env`.
5. Clica **Commit changes**.

> Alternativa sense GitHub: pots fer servir **GitHub Desktop** (app d'escriptori) per pujar la carpeta sense tocar la línia d'ordres.

---

## PART 3 — Desplegar a Vercel

1. Ves a **https://vercel.com** i fes **Sign up** entrant **amb GitHub** (és el més senzill).
2. **Add New… → Project** → **Import** el repositori `ce-europa-web` que acabes de crear.
3. Vercel detectarà que és un projecte **Vite**. Abans de desplegar, obre **Environment Variables** i afegeix-ne dues:
   - `VITE_SUPABASE_URL` = (el Project URL de Supabase)
   - `VITE_SUPABASE_ANON_KEY` = (la clau anon public de Supabase)
4. (Només si vas pujar la carpeta `web-app` sencera en comptes del seu contingut) a **Root Directory** tria `web-app`. Si el `package.json` ja és a l'arrel, deixa-ho com està.
5. Clica **Deploy** i espera 1–2 minuts. Vercel instal·larà les llibreries als seus servidors i compilarà l'app.
6. Quan acabi, et donarà una **URL** tipus `https://ce-europa-web.vercel.app`. Aquesta és la teva app.

---

## PART 4 — Fer-la servir

1. Obre la URL de Vercel al navegador (qualsevol dispositiu).
2. **Crea el compte** (pestanya "Crear compte") amb correu i contrasenya. Després entra.
3. Comença a treballar: tot el que facis es desa automàticament al núvol (indicador "Desat" a dalt).
4. Des d'un altre dispositiu (mòbil, un altre ordinador): obre la mateixa URL, **entra amb el mateix correu i contrasenya**, i hi tindràs **les mateixes dades**.
5. Per sortir, el botó de la cantonada superior dreta (icona de sortida).

---

## Notes

- **Si la URL de Vercel o Supabase no carrega a la xarxa de la uni:** prova amb dades del mòbil. Si amb el mòbil va però amb el Wi-Fi de la uni no, és que la xarxa bloqueja aquests dominis; caldria demanar-ho a informàtica o fer servir una altra connexió.
- **Backup:** dins l'app tens igualment els botons **Exporta/Importa JSON** per descarregar una còpia quan vulguis.
- **Per canviar el codi més endavant:** edita els fitxers, torna'ls a pujar a GitHub i Vercel tornarà a desplegar sol.
- El fitxer `.env` (local) **no** s'ha de pujar mai a GitHub: conté les teves claus. Les claus de producció van a les *Environment Variables* de Vercel.
