# Argentina gallery QA handoff

## Source critique

The incumbent match path and Spain showroom provide a useful baseline, but they are not evidence for the new audition acceptance criteria:

- `src/scene.ts` dispatches runtime figures through `characterIdFor` / `createAthleticFigure`, while its fallback Argentina figure is a shared generic rig with repeated stripe meshes and index-derived hair/skin. That existing fallback is not twelve separately authored adult candidate identities and should remain untouched by gallery audition.
- `src/squad-showcase.ts` renders three Spain/runtime characters (A1–A3) through `createFigure` and `poseFigure`, with a real WebGL canvas and three camera views. It is a squad presentation, not the required Argentina factory gallery, full-scale inspector, pose/comparison controls, or shortlist workflow.
- Consequently the new route must prove factory-backed unique portrait renders and inspector interactions independently; a card count, CSS silhouette, or metadata-only distinction cannot establish those requirements. Runtime match roster and Spain/Argentina dispatch are out of QA ownership and should be verified by integration separately.

References: `src/scene.ts:184-198`, `src/squad-showcase.ts:7-23`, `src/squad-showcase.ts:89-116`.

## Browser coverage

`tests/browser/argentina-gallery.spec.ts` follows the exact route and DOM contract in the audition brief. It checks all P01–P10/K01–K02 article identities, loaded non-zero image dimensions, and unique decoded thumbnail pixels; native inspect/pick/view/pose/select/copy/clear interactions; inspector attributes and comparison state; four-outfield rejection and keeper replacement; keyboard activation, 390px overflow, and visible inspector canvas; and absence of result POSTs and JavaScript/console errors. It reads match indicators if present to assert audition actions do not change them, without injecting simulation state or dispatching synthetic UI events.

## Not run / limitations

Per coordinator port ownership, no browser, build, server, or Playwright command was run. The route/source is in progress, so these checks may currently fail (RED) until integration supplies the documented selectors and working gallery. Pixel-distinct thumbnails validate distinct rendered images, not geometric uniqueness; the modeling worker's structural geometry unit tests and coordinator's real-browser visual review remain necessary. Reduced-motion behavior and screenshots are acceptance items from the brief but are not exercised here; coordinator owns final browser review and captures.
