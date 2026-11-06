# AgriPharm web client

```bash
cd backend
uv run python server.py
```

Άνοιξε το http://localhost:8000. Το πρώτο τρέξιμο εγκαθιστά Flask και PuLP μόνο του.

Το backend διαβάζει τον φάκελο `crop_opt` δίπλα του. Για άλλον φάκελο: `CROP_OPT_DIR=/διαδρομή/crop_opt uv run python server.py`.

### Για αλλαγές στο React

Θέλει Node 20.19+ και δύο τερματικά:

```bash
# τερματικό 1
cd backend
uv run python server.py

# τερματικό 2
cd frontend
npm install
npm run dev
```

Άνοιξε το http://localhost:5173. Το Vite προωθεί κάθε κλήση `/api` στο Flask. Με `npm run build` ανανεώνεται το `frontend/dist`, που σερβίρει το Flask.

## API

| Κλήση | Σώμα | Επιστρέφει |
|---|---|---|
| `GET /api/config` | | φυτά, προεπιλεγμένη γη, κλίματα, πηγές |
| `POST /api/run` | `{ land, weights, region }` | `lp` και `sim` |
| `POST /api/sweep` | `{ weights }` | κάλυψη σε 16 τιμές γης, ένα τρέξιμο `crop.py` η καθεμία |

Τιμές τετραγώνου στο `sim.parcels[plant].cells[step][square]`: `0` έως `99` η ανάπτυξη σε ποσοστό, `-1` γυμνό χώμα, `-2` φρεσκοθερισμένο. Ένα step είναι περίπου μία εβδομάδα, 4 ανά μήνα, 144 στα τρία έτη.


## Στατικό demo χωρίς server

Για δημόσιο σύνδεσμο, π.χ. GitHub Pages:

```bash
cd frontend && npm run build
cd ../backend && uv run python export_snapshot.py
```

Ανέβασε το `frontend/dist` όπως είναι. Το `snapshot.json` κρατά αποτελέσματα ανά 100 στρέμματα και για όλα τα κλίματα. Εκεί οι προτεραιότητες είναι κλειδωμένες, γιατί δεν τρέχει Python.
