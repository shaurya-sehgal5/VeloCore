class LogParser {
  parse(line) {
    if (!line) return null;

    const text = line
      .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "")
      .trim();

    if (!text) return null;

    /*
    ==========================================
    DOCKER BUILD INITIALIZATION
    ==========================================
    */

    if (/load build definition from dockerfile/i.test(text)) {
      return "Loading Dockerfile...";
    }

    if (/load .dockerignore/i.test(text)) {
      return "Loading .dockerignore...";
    }

    if (/load metadata for/i.test(text)) {
      const match = text.match(/load metadata for\s+(.+)/i);

      return match
        ? `Resolving base image: ${match[1]}`
        : "Resolving base image...";
    }

    if (
      /resolve image config/i.test(text) ||
      /pulling from/i.test(text)
    ) {
      return "Preparing base image...";
    }

    /*
    ==========================================
    FILE PREPARATION
    ==========================================
    */

    if (
      /\bCOPY\s+/i.test(text) ||
      /\bADD\s+/i.test(text)
    ) {
      return "Preparing application files...";
    }

    /*
    ==========================================
    NODE DEPENDENCIES
    ==========================================
    */

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

    /*
    ==========================================
    APPLICATION BUILD
    ==========================================
    */

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

    /*
    ==========================================
    PYTHON
    ==========================================
    */

    if (/pip install/i.test(text)) {
      return "Installing Python dependencies...";
    }

    if (/collecting\s+\w+/i.test(text)) {
      return "Resolving Python dependencies...";
    }

    /*
    ==========================================
    DOCKER IMAGE CREATION
    ==========================================
    */

    if (/exporting to image/i.test(text)) {
      return "Packaging Docker image...";
    }

    if (/exporting layers/i.test(text)) {
      return "Creating image layers...";
    }

    if (/exporting manifest/i.test(text)) {
      return "Creating image manifest...";
    }

    if (/exporting config/i.test(text)) {
      return "Finalizing image configuration...";
    }

    if (/writing image/i.test(text)) {
      return "Writing Docker image...";
    }

    if (/naming to/i.test(text)) {
      const match = text.match(/naming to\s+(.+)/i);

      return match
        ? `Tagging image: ${match[1]}`
        : "Tagging Docker image...";
    }

    /*
    ==========================================
    BUILD COMPLETION
    ==========================================
    */

    if (/exporting attestation/i.test(text)) {
      return "Finalizing image metadata...";
    }

    if (/\bDONE\b/i.test(text)) {
      return null;
    }

    if (/cached/i.test(text)) {
      return null;
    }

    /*
    ==========================================
    ERRORS
    ==========================================
    */

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