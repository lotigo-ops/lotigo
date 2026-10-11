import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";

const names = ["objets-hero-v3", "lampe-demo-v2", "appareil-demo-v2", "chaise-demo-v2"];
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage();
  for (const name of names) {
    const source = await readFile(`website/assets/${name}.png`);
    const encoded = await page.evaluate(async (base64) => {
      const image = new Image();
      image.src = "data:image/png;base64," + base64;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      canvas.getContext("2d").drawImage(image, 0, 0);
      return canvas.toDataURL("image/webp", 0.88).split(",")[1];
    }, source.toString("base64"));
    const webp = Buffer.from(encoded, "base64");
    await writeFile(`website/assets/${name}.webp`, webp);
    console.log(`${name}: ${Math.round(source.length / 1024)} KB -> ${Math.round(webp.length / 1024)} KB. Same dimensions and framing.`);
  }
} finally { await browser.close(); }
