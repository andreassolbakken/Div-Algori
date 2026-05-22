# Konsulentavtale – Digital Signatur

Enkel nettapp for sekvensiell digital signering av konsulentavtale mellom Evelyn Floan og Sara Endestad. Evelyn må signere først, deretter Sara. Etter begge har signert kan signert PDF lastes ned.

## Hva appen gjør

- Viser signeringsstatus på `/`
- Lar Evelyn signere på `/sign/evelyn?token=...`
- Lar Sara signere (etter Evelyn) på `/sign/sara?token=...`
- Genererer signert PDF tilgjengelig på `/download`
- Tilbyr revisjonslogg på `/audit?token=...`

**Merk:** Dette er ikke BankID-nivå signering. Det er en enkel digital signatur egnet for B2B-konsulentavtaler, med IP-adresse, tidsstempel og PDF-hash i revisjonsloggen.

## Generer tokens lokalt

```bash
openssl rand -hex 32   # kjør tre ganger — én for hver token
```

## Railway-oppsett

### 1. Miljøvariabler

Sett disse i Railway-prosjektets Variables-panel:

| Variabel | Beskrivelse |
|---|---|
| `EVELYN_TOKEN` | Token for Evelyns signeringslenke |
| `SARA_TOKEN` | Token for Saras signeringslenke |
| `ADMIN_TOKEN` | Token for `/audit`-endepunktet |
| `CONTRACT_START_DATE` | F.eks. `1. juni 2026` |
| `SARA_EMAIL` | Saras e-postadresse |
| `SARA_PHONE` | Saras mobilnummer |

### 2. Monter `/data`-volum

I Railway: gå til prosjektet → Volumes → Add Volume → mount path `/data`.  
Databasefilen `state.db` opprettes automatisk ved første oppstart.

### 3. Deploy

```bash
git push origin main
```

## URL-er

| Side | URL |
|---|---|
| Statusside | `https://[din-app].railway.app/` |
| Evelyns signeringslenke | `https://[din-app].railway.app/sign/evelyn?token=EVELYN_TOKEN` |
| Saras signeringslenke | `https://[din-app].railway.app/sign/sara?token=SARA_TOKEN` |
| Forhåndsvisning | `https://[din-app].railway.app/preview` |
| Last ned signert PDF | `https://[din-app].railway.app/download` |
| Revisjonslogg | `https://[din-app].railway.app/audit?token=ADMIN_TOKEN` |

## Verifiser signert kontrakt

```
GET /audit?token=ADMIN_TOKEN
```

Returnerer JSON med tidsstempel, IP-adresse og PDF-hash for begge signaturer.

## Teknisk stack

- Node.js 20+ med Express 4
- better-sqlite3 (lokal SQLite-database)
- pdfkit (PDF-generering, ingen Chromium)
- signature_pad@4 (frontend signaturinnsamling)
- Deployes på Railway med persistent `/data`-volum
