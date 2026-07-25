class LogParser {

  parse(line) {

    if (!line) return null;

    const text = line.trim();

    // Ignore BuildKit noise
    if (
      text.startsWith("#") ||
      text.startsWith("=>") ||
      text.includes("sha256:") ||
      text.includes("writing image") ||
      text.includes("exporting layers") ||
      text.includes("exporting manifest") ||
      text.includes("exporting config") ||
      text.includes("exporting attestation") ||
      text.includes("naming to") ||
      text.includes("DONE") ||
      text.includes("CACHED")
    ) {
      return null;
    }

    // Dependency install
    if (
      /npm install/i.test(text) ||
      /pnpm install/i.test(text) ||
      /yarn install/i.test(text)
    ) {
      return "Installing dependencies...";
    }

    // Application build
    if (
      /npm run build/i.test(text) ||
      /pnpm build/i.test(text) ||
      /yarn build/i.test(text)
    ) {
      return "Building application...";
    }

    // Copy files
    if (/COPY|ADD/i.test(text)) {
      return "Preparing application files...";
    }

    // Vite
    if (/vite v/i.test(text)) {
      return "Compiling frontend...";
    }

    // Next.js
    if (/Creating an optimized production build/i.test(text)) {
      return "Optimizing Next.js application...";
    }

    // Python
    if (/Collecting/i.test(text)) {
      return "Installing Python dependencies...";
    }

    // Fatal errors only
    if (
      /ERR!/i.test(text) ||
      /Error:/i.test(text) ||
      /failed/i.test(text)
    ) {
      return text;
    }

    return null;

  }

}



module.exports = new LogParser();