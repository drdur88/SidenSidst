declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    CASE_EDITOR_USER_ID?: string;
    CASE_MONITORING_ENABLED?: string;
  }
}
