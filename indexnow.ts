/**
 * IndexNow: avvisa Bing (che alimenta Copilot e ChatGPT search), Yandex e gli altri
 * motori aderenti che le pagine sono cambiate. Google non aderisce: per Google basta
 * la sitemap con lastmod aggiornato.
 *
 * INDEXNOW_KEY: stringa 8-128 caratteri [a-zA-Z0-9-], pubblicata in /<key>.txt
 */
export async function pingIndexNow(publishBaseUrl: string, key: string, urls: string[]): Promise<void> {
  if (!key || urls.length === 0) {
    console.log("indexnow: chiave assente o nessun URL → salto");
    return;
  }
  const host = new URL(publishBaseUrl).host;
  // Con GitHub Pages in sottocartella la chiave vive nella stessa cartella delle pagine.
  const body = { host, key, keyLocation: `${publishBaseUrl.replace(/\/$/, "")}/${key}.txt`, urlList: urls.slice(0, 10_000) };
  const res = await fetch("https://api.indexnow.org/IndexNow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  console.log(`indexnow: ${res.status} ${res.statusText} (${urls.length} URL)`);
}
