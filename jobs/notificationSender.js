/* jobs/notificationSender.js */
const path     = require("path");
const cron     = require("node-cron");
const { pool } = require("../config/db");
const { sendMail } = require("../utils/mailer");
const { logAudit } = require("../utils/audit");

async function setStatus(jobId, status, note = "", by) {
  await pool.query("UPDATE notification_jobs SET status=? WHERE id=?", [status, jobId]);
  if (note) await logAudit("NOTIFY_JOB_"+status, note, by);  // by = job.created_by
}

cron.schedule("*/1 * * * *", async () => {
  try {
    const [jobs] = await pool.query(`
      SELECT * FROM notification_jobs
      WHERE status='PENDING' AND scheduled_at<=NOW()
    `);

    for (const job of jobs) {
      const [recips] = await pool.query(
        `SELECT u.email, u.id FROM notification_recipients nr
         JOIN users u ON u.id = nr.user_id
         WHERE nr.job_id = ?`, [job.id]);

      if (!recips.length) {
        await setStatus(job.id, "FAILED", `job#${job.id} has no recipients`, job.created_by);
        continue;
      }

      try {
        if (job.channel === "EMAIL") {
          const toList = recips.map(r => r.email).join(",");
          const html   = job.body;
          const text   = html.replace(/<[^>]+>/g,"");
          await sendMail(toList, job.subject, html, text, job.pdf_path);
        }
        /* TEXT channel: nothing more to store—UI already reads
           job+recipient rows and displays them in “My Notifications”.
           If you need a flag, you could update nr.is_read = 0 here. */

        await setStatus(job.id, "SENT", `job#${job.id} sent OK`, job.created_by);
      } catch (err) {
        console.error("Send failed for job", job.id, err);
        await setStatus(job.id, "FAILED",
                        `job#${job.id} error: ${err.message}`, job.created_by);
      }
    }

  } catch (err) {
    console.error("Cron query error:", err);
  }
});
