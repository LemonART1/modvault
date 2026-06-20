# ModVault editing guide

Use this file as a quick map when editing the site in VS Code.

## Add or edit mods

Edit `js/data/mods.js`.

The easier option is the local admin tool:

```powershell
.\START_LOCAL_ADMIN.bat
```

It opens `http://localhost:8787/local-admin.html`. This tool can write to your local project, so it automatically saves selected screenshots into `images/mods/`, updates `js/data/mods.js`, and regenerates the real mod pages in `mods/<game>/`.

The AI helper works inside this local admin too. Add your Google AI Studio key in the AI key field, or set `GEMINI_API_KEY` before starting the tool.

Each mod is one object inside the `MODS` array. The most important fields are:

- `game`: must match a key from `GAMES`, for example `beamng`, `ac`, `gta5`.
- `title`: mod name.
- `category`: must exist in `CATEGORIES` for that game.
- `version`, `size`, `image`, `images`, `downloadUrl`, `short`, `description`, `tags`.

Put mod images in `images/mods/` and reference them like `images/mods/example.jpg`.

Use `image` for one picture:

```js
image: "images/mods/example.jpg"
```

Use `images` for a gallery with 1 to 3 pictures:

```js
images: [
  "images/mods/example-1.jpg",
  "images/mods/example-2.jpg",
  "images/mods/example-3.jpg"
]
```

If both exist, the site uses `images` for the gallery.

## Generate individual mod pages

Each mod has a real SEO page in `mods/<game>/`.

After adding or renaming mods in `js/data/mods.js`, regenerate the pages:

```powershell
node tools/generate-mod-pages.js
```

This keeps the game lists and individual mod pages in sync.

## Add or edit game SEO text

Edit the `intro` field for each game inside `GAMES` in `js/data/mods.js`.

## Add news or guides

Edit `js/data/editorial.js`.

- Add news to `NEWS_POSTS`.
- Add guides to `GUIDE_POSTS`.

The `news.html` and `guides.html` listing pages update automatically from that file.

Each news or guide card should also link to a real HTML article:

- News articles live in `content/news/`.
- Guide articles live in `content/guides/`.

When you add a new article, create a matching `.html` file and set the `url` field in `js/data/editorial.js`.

## Main styles

- Shared layout, header, footer, cards and modal: `css/shared.css`
- Game listing pages: `css/gamepage.css`
- Animation effects: `css/effects.css`

## Code structure

- `js/data/` contains editable content data.
- `js/pages/` contains page rendering scripts.
- `content/news/` contains individual news pages.
- `content/guides/` contains individual guide pages.
- `mods/<game>/` contains generated individual mod pages.
- `tools/generate-mod-pages.js` regenerates individual mod pages from `js/data/mods.js`.
