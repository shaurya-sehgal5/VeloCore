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
      text.includes("naming to")
    ) {
      return null;
    }

    // Docker build stages
    if (/RUN (npm|pnpm|yarn) install/i.test(text))
      return "📦 Installing dependencies...";

    if (/RUN (npm|pnpm|yarn).*(build)/i.test(text))
      return "⚙ Building application...";

    if (/COPY|ADD/i.test(text))
      return "📁 Copying project files...";

    if (/Successfully built/i.test(text))
      return null;

    if (/Successfully tagged/i.test(text))
      return null;

    // npm
    if (/added \d+ packages/i.test(text))
      return "📦 Dependencies installed.";

    if (/audited/i.test(text))
      return null;

    if (/npm notice/i.test(text))
      return null;

    if (/found 0 vulnerabilities/i.test(text))
      return null;

    // Vite
    if (/vite v/i.test(text))
      return "⚡ Building Vite project...";

    if (/built in/i.test(text))
      return "✅ Frontend build completed.";

    // Generic errors
    if (
      /ERR!/i.test(text) ||
      /Error:/i.test(text) ||
      /failed/i.test(text)
    ) {
      return `❌ ${text}`;
    }

    // Ignore empty
    if (text.length < 2)
      return null;

    if (text.length < 5) return null;

    return text;
  }
}

module.exports = new LogParser();