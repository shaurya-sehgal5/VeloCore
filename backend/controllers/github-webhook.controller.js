const db = require("../config/db");
const { buildQueue } = require("../queues/build.queue");
const signatureService = require("../services/git/signature.service");
const { decrypt } = require("../utils/crypto");

exports.receive = async (req, res) => {
  try {
    if (req.header("X-GitHub-Event") !== "push") {
      return res.sendStatus(200);
    }

    const signature = req.header("X-Hub-Signature-256");

    const payload = req.body;

    const json = JSON.parse(payload.toString());

    const repo = json.repository.full_name;

    const branch = json.ref.replace("refs/heads/", "");

    /*
    -----------------------------
    Find Project
    -----------------------------
    */

    const { rows } = await db.query(
  `
SELECT
    p.*,
    u.github_token
FROM projects p
JOIN users u
    ON u.id = p.user_id
WHERE p.repo_url = $1
ORDER BY p.id DESC
LIMIT 1;
`,
  [json.repository.clone_url],
);

    if (!rows.length) {
      return res.sendStatus(200);
    }

    const project = rows[0];
    const githubToken = decrypt(project.github_token);
    if (!project.auto_deploy) {
      console.log("⚠ Auto Deploy Disabled");
      return res.sendStatus(200);
    }
    /*
    -----------------------------
    Verify Signature
    -----------------------------
    */

    const verified = signatureService.verify(
      project.webhook_secret,
      payload,
      signature,
    );
    console.log("Signature Header:", signature);
    console.log("Webhook Secret:", project.webhook_secret);
    if (!verified) {
      return res.status(401).json({
        error: "Invalid signature",
      });
    }
    console.log("Verified:", verified);

    console.log("✅ GitHub Webhook Verified");
    await db.query(
      `
  UPDATE projects
  SET
    last_commit_sha = $1,
    last_commit_message = $2,
    last_commit_author = $3
  WHERE id = $4
  `,
      [
        json.after,
        json.head_commit.message,
        json.head_commit.author.name,
        project.id,
      ],
    );
    console.log("Repository:", repo);

    console.log("Branch:", branch);

    console.log("Commit:", json.after);

    console.log("Author:", json.head_commit.author.name);

    console.log("Message:", json.head_commit.message);

    const { v4: uuidv4 } = require("uuid");

    const deploymentId = uuidv4();

    const deploymentUrl = `http://localhost:8000/visit/${deploymentId}`;

    await db.query(
      `
INSERT INTO deployments
(
id,
project_id,
user_id,
repo_name,
repo_url,
status,
deploy_url,
created_at,
updated_at
)
VALUES
(
$1,$2,$3,$4,$5,
'QUEUED',
$6,
NOW(),
NOW()
)
`,
      [
        deploymentId,
        project.id,
        project.user_id,
        project.name,
        project.repo_url,
        deploymentUrl,
      ],
    );

    await buildQueue.add("deployment", {
      deploymentId,
      cloneUrl: project.repo_url,
      githubToken,
      env: {},
    });

    console.log("");

    console.log("🚀 Auto Deployment Queued");

    console.log(deploymentId);

    res.sendStatus(200);
  } catch (err) {
    console.error(err);

    res.sendStatus(500);
  }
};
