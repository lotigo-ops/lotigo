import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ImagePlus, Download, ArrowRight, ArrowUpRight, Check, Copy, Menu, X, Layers, History, FileSpreadsheet, ShieldCheck, KeyRound, Monitor, Maximize2, Sparkles, Github, ChevronDown, Play } from "lucide-react";
import { mkdir, writeFile, copyFile } from "node:fs/promises";

const icons = { image: ImagePlus, download: Download, arrow: ArrowRight, external: ArrowUpRight, check: Check,
  copy: Copy, menu: Menu, close: X, layers: Layers, history: History, export: FileSpreadsheet,
  shield: ShieldCheck, key: KeyRound, monitor: Monitor, expand: Maximize2, sparkle: Sparkles, github: Github,
  chevron: ChevronDown, play: Play };
await mkdir("website/assets/icons", { recursive: true });
for (const [name, Icon] of Object.entries(icons)) {
  for (const [suffix, color] of [["", "#203c35"], ["-white", "#ffffff"]]) {
    await writeFile(`website/assets/icons/${name}${suffix}.svg`, renderToStaticMarkup(createElement(Icon, { size: 24, color, strokeWidth: 1.8 })));
  }
}
await copyFile("node_modules/lucide-react/LICENSE", "website/assets/icons/LICENSE.txt");
console.log("Local Lucide icons generated for the buildless website.");
