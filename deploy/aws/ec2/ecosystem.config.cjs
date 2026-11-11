/**
 * PM2 — menjalankan & menghidupkan ulang semua proses JanjiCare otomatis (juga setelah EC2 restart).
 *   EC2 app  : pm2 start deploy/aws/ec2/ecosystem.config.cjs --only auth,postgrest,backend
 *   EC2 queue: pm2 start deploy/aws/ec2/ecosystem.config.cjs --only queue
 */
const fs = require("fs");
const path = require("path");
const APP = path.resolve(__dirname, "../../..");
const CONF = "/opt/janjicare/config";

function envFile(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, "utf8").split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^(["'])(.*)\1$/, "$2")]));
}

const logs = (name) => ({ out_file: `/var/log/janjicare/${name}.log`, error_file: `/var/log/janjicare/${name}.log`, time: true });

module.exports = {
  apps: [
    { name: "auth", script: "/opt/janjicare/auth/auth", args: "serve", interpreter: "none",
      env: envFile(`${CONF}/gotrue.env`), ...logs("auth") },
    { name: "postgrest", script: "/opt/janjicare/bin/postgrest", args: `${CONF}/postgrest.conf`, interpreter: "none",
      ...logs("postgrest") },
    { name: "backend", cwd: `${APP}/backend`, script: "src/server.js", env: { NODE_ENV: "production" }, ...logs("backend") },
    { name: "queue", cwd: `${APP}/services/queue-service`, script: "src/server.js", env: { NODE_ENV: "production" }, ...logs("queue") },
  ],
};
