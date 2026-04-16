# PQ Parser Add-In

An Office Task Pane add-in for Excel that inspects and injects Power Query queries in the workbook's DataMashup custom XML.

## Prerequisites

- [Node.js](https://nodejs.org/) v16 or later
- Microsoft Excel (desktop, Windows)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Install the development SSL certificate

Office Add-ins require HTTPS. You must install a trusted dev certificate so Excel (and your browser) accept the local server:

```bash
npx office-addin-dev-certs install
```

This generates and trusts a CA certificate called **"Developer CA for Microsoft Office Add-ins"**. You only need to run this once per machine. The certificates are stored in `~/.office-addin-dev-certs/`.

> **If you get a certificate prompt from Windows**, click **Yes** to allow the certificate to be installed in your Trusted Root store.

### 3. Start the dev server

```bash
npm start
```

The server runs at **https://localhost:3100/**. Verify it works by opening that URL in your browser — you should see the taskpane HTML without any certificate warnings.

### 4. Sideload the add-in into Excel

There are two ways to load the add-in into Excel:

#### Option A: Automatic sideloading (recommended)

```bash
npm run sideload
```

This uses `office-addin-debugging` to register the manifest and launch Excel automatically.

#### Option B: Manual sideloading

1. Open Excel.
2. Go to **Home** > **Add-ins** (or **Insert** > **My Add-ins** > **Upload My Add-in**).
3. Click **Upload My Add-in** at the bottom of the dialog.
4. Browse to the project folder and select **`manifest.xml`**.
5. Click **OK**.

The **PQ Parser** button will appear on the **Home** tab. Click it to open the task pane.

> **Note:** The dev server (`npm start`) must be running for the add-in to load. If you stop the server, the add-in will show a loading error.

### 5. (Optional) Shared network folder sideloading

For environments where the Upload dialog is unavailable:

1. Create a shared folder (e.g., `\\myshare\addin\`).
2. Copy `manifest.xml` into that folder.
3. In Excel, go to **File** > **Options** > **Trust Center** > **Trust Center Settings** > **Trusted Add-in Catalogs**.
4. Add the share path as a catalog URL and check **Show in Menu**.
5. Restart Excel. The add-in will appear under **My Add-ins** > **Shared Folder**.

## Build for production

```bash
npm run build
```

Output is written to the `dist/` folder.

## Other commands

| Command | Description |
|---|---|
| `npm run build:dev` | Development build (unminified, with source maps) |
| `npm run typecheck` | Run TypeScript type checking without emitting |
| `npm run validate` | Validate the Office manifest XML |

## Troubleshooting

### Certificate error / content blocked

If Excel or your browser blocks the add-in content due to an untrusted certificate:

1. Run `npx office-addin-dev-certs install` to regenerate and trust the certs.
2. Restart the dev server (`npm start`).
3. Clear the Excel web cache: delete contents of `%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\`.
4. Restart Excel.

### Add-in doesn't appear after sideloading

- Make sure the dev server is running at `https://localhost:3100/`.
- Open `https://localhost:3100/taskpane.html` in your browser to confirm it loads.
- Try clearing the Office cache and re-sideloading.

### "No DataMashup found" in Inspector

The workbook has no Power Query queries yet. Add at least one query via the Power Query Editor first, then use PQ Parser to inspect it.
