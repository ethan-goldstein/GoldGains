# GoldGains

A black-and-gold calorie, macro and workout tracker that installs on your iPhone home screen. Scan a barcode or snap a nutrition label, and the food fills itself in. Everything you log stays on your phone.

## What's in it

- **Today**: a calorie ring showing **Budget − Food + Exercise = Left**, and a protein/carbs/fat donut with grams and targets. Below that come Breakfast / Lunch / Dinner / Snacks cards, an exercise card, a water tracker, and every nutrient against its target. Nutrients include fiber, total and added sugar, sugar alcohols, net carbs, saturated and trans fat, "healthy" (mono + poly) fats, sodium, potassium and vitamins.
- **Gains score**: a 0–100 grade for the day: calories near budget, protein, fiber, and added sugar and sodium kept in check. There is also a daily logging streak.
- **Add food** has four sources:
  - about 300 everyday USDA foods, bundled and searchable offline;
  - Open Food Facts packaged foods;
  - recents and favorites;
  - saved meals.
  
  You can also quick-add or create your own food from the full label.
- **Scan**:
  - **Barcode** uses the live camera, decoded on the phone. It looks the product up in Open Food Facts. If the barcode is unknown, you snap the label and GoldGains remembers it.
  - **Label** takes a photo, which you crop. On-device text recognition reads it, and a parser handles common misreads like `O→0`, `l→1`, and `8g` read as `89`. It cross-checks against the printed %DV and the calories. Anything uncertain is highlighted for you to confirm.
- **Workouts**:
  - Cardio and sports draw on 60+ activities. Calories are estimated as active calories, (MET − 1) × kg × hours, the same measure as Apple Watch "Active". You can type in your watch's number instead.
  - Lifting logs sets × reps × weight. The last session prefills, and personal records are tracked by estimated 1RM.
- **Progress**:
  - A month calendar marks each day under or over budget; tap a day to open it.
  - Calorie trends against budget and the macro split cover 7, 30 or 90 days.
  - A weight chart shows your goal line.
- **Me**:
  - Personal info (height, weight, goal weight, activity, and a pace of lose/maintain/gain) sets the calorie budget. It uses the Mifflin-St Jeor equation, adjusted by pace × 500 kcal. You can override the budget.
  - Macro presets or custom splits, and nutrient limits.
  - Units.
  - Backup and restore.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (label parser, serving math, budget, backup)
npm run build      # production build in dist/
```

## Put it on your iPhone

1. Open the GitHub Pages URL in **Safari**.
2. Tap **Share**, then **Add to Home Screen**.
3. Open GoldGains from the home screen. It runs full-screen and works offline.

Use the home-screen app, not the Safari tab. They keep separate data, and deleting the icon deletes your logs. **Me → Back up** saves a JSON file to Files or iCloud Drive; **Restore** brings it back.

## Privacy & security

- No accounts, no backend, no API keys. Logs live in the phone's IndexedDB.
- The app makes two kinds of outside requests, both to Open Food Facts:
  - barcode lookups and packaged-food searches, sent to `world.openfoodfacts.org`;
  - product images, loaded from `images.openfoodfacts.org`.
  
  **Me → Offline only** turns both off.
- The production build ships a Content-Security-Policy that allows only those two hosts.
- The barcode decoder (ZXing WebAssembly) and text recognizer (Tesseract) are served from this site, never a CDN. The label photo never leaves the phone.
- Backup files are validated against a strict schema before anything is written.

## Rebuilding the everyday-foods list

`src/data/generic-foods.json` is generated from USDA FoodData Central SR Legacy (public domain).

1. Download `FoodData_Central_sr_legacy_food_csv_2018-04.zip` from https://fdc.nal.usda.gov/download-datasets/.
2. Unzip it into `data-raw/sr-legacy/`. This folder is gitignored.
3. Run `npm run foods`.

The curated food list is in `scripts/foods-curated.ts`.

## Layout

```
src/domain     nutrients, servings, budget (Mifflin-St Jeor), exercise METs, score, barcodes
src/db         Dexie schema, repository functions, live-query hooks, backup
src/sources    Open Food Facts client, local search
src/scan       camera, barcode decoder, OCR + label parser + validation
src/features   today · add · scan · workouts · progress · me · onboarding
src/ui         sheet, controls, charts (ring, donut, bars, line)
```

## Credits

- Packaged food data © Open Food Facts contributors, [ODbL](https://opendatacommons.org/licenses/odbl/1-0/).
- Everyday foods: USDA FoodData Central, SR Legacy (public domain).
- Exercise intensities: Compendium of Physical Activities (Ainsworth et al.).
- Libraries:
  - [zxing-wasm](https://github.com/Sec-ant/zxing-wasm) and barcode-detector (MIT);
  - [Tesseract.js](https://github.com/naptha/tesseract.js) (Apache-2.0);
  - Dexie (Apache-2.0), React (MIT), Tailwind CSS (MIT).

Not medical advice.
