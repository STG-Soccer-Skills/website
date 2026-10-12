# stgsoccerskills.com

The STG Soccer Skills website. Every change saved to `main` rebuilds and publishes the live site automatically in about 1 minute. There is no separate "draft" copy, so check your edit before you commit it. Every change is kept in the history (the clock icon on any file), so a mistake can always be undone.

Phone everywhere: **844-608-1116**. Email: **book@stgsoccerskills.com**.

## Where things live
- `src/pages/` — one file per page. The file name is the page address: `src/pages/schedule.html` → stgsoccerskills.com/schedule/
- `src/header.html` — the top menu shared by every page
- `src/footer.html` — the footer shared by every page
- `assets/uploads/` — photos and logos used on pages
- `assets/site.css` — colors, fonts and layout (rarely needs changing)

Ignore `build.py`, `dist/` and `.github/` — they run the site.

## Change text on a page
1. Open `src/pages/` and click the page's file.
2. Click the **pencil icon** (top right of the file).
3. Find the text with Ctrl+F / Cmd+F and edit it. Only change words between the `< >` tags, not the tags themselves.
4. Click **Commit changes**, write a short note (e.g. "Update fall league dates"), and click **Commit changes** again.
5. Wait about a minute and refresh the live page.

The first two lines of every page set the browser-tab title and the Google description:

```
<!--title: Page title | STG Soccer Skills-->
<!--desc: One-sentence description for Google.-->
```

## Add or replace a photo
1. Make the photo smaller than about 500 KB (under 2000 pixels wide is plenty).
2. Open `assets/uploads/`, click **Add file → Upload files**, drag the photo in, and commit.
3. On the page, use it like this (keep spaces out of file names):

```
<img src="/assets/uploads/your-photo.jpg" alt="Short description of the photo">
```

To swap an existing photo, upload the new one with exactly the same file name and folder as the old one.

## Add a new page
1. In `src/pages/`, click **Add file → Create new file**.
2. Name it after the address you want, e.g. `fall-camp.html` → stgsoccerskills.com/fall-camp/
3. Copy the top two lines from another page, then add your content. The easiest start is to copy a similar page's whole file and edit it.
4. To put it in the menu or footer, add a link in `src/header.html` or `src/footer.html`, e.g. `<li><a href="/fall-camp/">Fall Camp</a></li>`.

## Short links (like stgsoccerskills.com/waiver)
Short links live in `src/links.txt`, one per line: the short name, some spaces, then the address it goes to. For example:

```
waiver   https://api.leadconnectorhq.com/widget/form/xO22A7mEMlM8k0Ltxwkj
```

To add or change one, edit that file with the pencil icon and commit. Don't reuse the name of an existing page. Short links used in GoHighLevel automations, such as /waiver, should keep the same name; change only the address.

## Remove a page
Open the file in `src/pages/`, click the **⋯** menu → **Delete file**, and commit. Also remove any menu or footer link to it.

## Using an AI assistant (Claude, ChatGPT, etc.)
- **Easiest:** copy the page's whole file, paste it into the assistant with your request ("change the price to $199 and add a line about water bottles"), ask for the full updated file back, paste it over the old text in the GitHub editor, and commit.
- **Connected:** if your assistant can connect to GitHub (for example Claude with GitHub connected), give it the repository `stgsoccerskills/website`, tell it to read this README first, and ask for the change. It should commit to `main`.

## Undo a mistake
Open the file, click **History** (clock icon), open the last good version, copy its contents, paste them back in with the pencil editor, and commit.
