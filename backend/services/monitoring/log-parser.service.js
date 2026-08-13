class LogParser {
  parse(line) {
    if (!line) return null;

    const text = line
      .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "")
      .trim();

    if (!text) return null;

    // Dockerfile loading
    if (
      /load build definition from dockerfile/i.test(text)
    ) {
      return "Loading Dockerfile...";
    }

    // Base image metadata
    if (
      /load metadata for/i.test(text)
    ) {
      const match = text.match(/load metadata for\s+(.+)/i);

      return match
        ? `Resolving base image: ${match[1]}`
        : "Resolving base image...";
    }

    // Dockerignore
    if (
      /load .dockerignore/i.test(text)
    ) {
      return "Loading .dockerignore...";
    }

    // Pulling base image
    if (
      /resolve image config/i.test(text) ||
      /pulling from/i.test(text)
    ) {
      return "Preparing base image...";
    }

    if (
      /npm (ci|install)/i.test(text) ||
      /pnpm install/i.test(text) ||
      /yarn install/i.test(text)
    ) {
      return "Installing dependencies...";
    }

    if (/npm audit/i.test(text)) {
      return "Running dependency audit...";
    }

    if (
      /npm run build/i.test(text) ||
      /pnpm build/i.test(text) ||
      /yarn build/i.test(text)
    ) {
      return "Building application...";
    }

    if (/vite v/i.test(text)) {
      return "Compiling frontend with Vite...";
    }

    if (/creating an optimized production build/i.test(text)) {
      return "Building optimized Next.js application...";
    }

    if (/next build/i.test(text)) {
      return "Building Next.js application...";
    }

    if (/pip install/i.test(text)) {
      return "Installing Python dependencies...";
    }

    if (/collecting\s+\w+/i.test(text)) {
      return "Resolving Python dependencies...";
    }

    if (/^\[.*\]\s*(copy|add)\s+/i.test(text)) {
      return "Preparing application files...";
    }

    if (/\bCOPY\s+/i.test(text) || /\bADD\s+/i.test(text)) {
      return "Preparing application files...";
    }

    if (/exporting layers/i.test(text)) {
      return "Exporting image layers...";
    }

    if (/exporting manifest/i.test(text)) {
      return "Creating image manifest...";
    }

    if (/exporting config/i.test(text)) {
      return "Finalizing image configuration...";
    }

    if (/naming to/i.test(text)) {
      const match = text.match(/naming to\s+(.+)/i);

      return match
        ? `Tagging image: ${match[1]}`
        : "Tagging Docker image...";
    }

    if (/writing image/i.test(text)) {
      return "Writing Docker image...";
    }

    if (/cached/i.test(text)) {
      return null;
    }

    if (
      /exporting to image/i.test(text)
    ) {
      return "Packaging Docker image...";
    }

    if (
      /npm err!/i.test(text) ||
      /\berror:/i.test(text) ||
      /\bfailed\b/i.test(text) ||
      /\bfatal\b/i.test(text)
    ) {
      return text;
    }

    return null;
  }
}

module.exports = new LogParser();