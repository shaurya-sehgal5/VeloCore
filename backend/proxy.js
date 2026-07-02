const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 8000;

const BASE_OUTPUT_DIR = path.join(__dirname, "outputs");

// =========================================================================
// 🔄 ROUTE 1: PRIMARY APPLICATION INTERCEPTOR (RegEx Driven)
// =========================================================================
app.use(/^\/visit(\/.*)?$/, (req, res) => {
    let deploymentId = null;
    
    const pathParts = req.originalUrl.split('?')[0].split('/');
    if (pathParts[2] && pathParts[2] !== 'assets') {
        deploymentId = pathParts[2];
    } else {
        const referer = req.headers.referer;
        if (referer) {
            try {
                const refererParts = new URL(referer).pathname.split('/');
                if (refererParts[2]) deploymentId = refererParts[2];
            } catch (e) {
                console.error("Error parsing referer URL:", e.message);
            }
        }
    }

    if (deploymentId && deploymentId.startsWith("deploy-")) {
        deploymentId = deploymentId.replace(/^deploy-/, "");
    }

    if (!deploymentId || deploymentId === 'assets') {
        return res.status(404).send("Deployment ID missing or invalid.");
    }

    let projectPath = path.join(BASE_OUTPUT_DIR, deploymentId);
    let distPath = path.join(projectPath, "dist");

    if (!fs.existsSync(projectPath)) {
        return res.status(404).send("Deployment folder not found.");
    }

    let requestedFile = req.originalUrl.split('?')[0].replace(`/visit/${deploymentId}`, '').replace('/visit', '');

    if (requestedFile === "/" || requestedFile === "") {
        requestedFile = "/index.html";
    }

    const filePath = path.join(distPath, requestedFile);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return res.sendFile(filePath);
    }

    const indexFile = path.join(distPath, "index.html");
    if (fs.existsSync(indexFile)) {
        return res.sendFile(indexFile);
    }

    res.status(404).send("Application resource not found.");
});

// =========================================================================
// 🌍 ROUTE 2: DEEP GLOBAL FALLBACK MIDDLEWARE
// Catches custom subdirectory patterns like /images/building4/img-5.jpeg
// =========================================================================
app.use((req, res, next) => {
    if (req.path === "/" || req.path === "") return next();

    const referer = req.headers.referer;
    if (!referer) {
        return res.status(404).send("Resource context missing.");
    }

    try {
        const refererParts = new URL(referer).pathname.split('/');
        let deploymentId = refererParts[2];

        if (deploymentId && deploymentId.startsWith("deploy-")) {
            deploymentId = deploymentId.replace(/^deploy-/, "");
        }

        if (!deploymentId) {
            return res.status(404).send("Context deployment not found.");
        }

        // Clean query parameters out of the incoming asset route path
        const cleanPath = req.path.split('?')[0];
        
        // 🎯 FIX: Combine the clean requested path directly onto the deployment's built dist root folder
        // For example: dist + /images/building4/img-5.jpeg
        const assetFilePath = path.join(BASE_OUTPUT_DIR, deploymentId, "dist", cleanPath);

        console.log(`📸 [Asset Routing Logs]: App [${deploymentId}] requesting asset -> ${cleanPath}`);
        console.log(`🔍 [Checking Location]: ${assetFilePath}`);

        if (fs.existsSync(assetFilePath) && fs.statSync(assetFilePath).isFile()) {
            console.log("✅ Asset Found! Serving file...");
            return res.sendFile(assetFilePath);
        }

        // Secondary nested folder safety fallback
        const fallbackPath = path.join(BASE_OUTPUT_DIR, deploymentId, "dist", "assets", cleanPath);
        if (fs.existsSync(fallbackPath) && fs.statSync(fallbackPath).isFile()) {
            return res.sendFile(fallbackPath);
        }

        console.log("❌ File missing at output targets.");
        res.status(404).send("Resource not found.");
    } catch (err) {
        console.error("Failed to parse fallback asset redirect:", err.message);
        res.status(500).send("Internal asset routing error.");
    }
});

app.get("/", (req, res) => {
    res.send("🚀 VeloCore Reverse Proxy Running");
});

app.listen(PORT, () => {
    console.log(`🚀 Proxy listening at http://localhost:${PORT}`);
});