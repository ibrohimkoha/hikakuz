module.exports = {
  apps: [
    {
      name: "hikaku-api",
      cwd: "./backend",
      script: "./bin/server",
      env: {
        PORT: process.env.PORT || "8080",
        DB_HOST: process.env.DB_HOST || "127.0.0.1",
        DB_PORT: process.env.DB_PORT || "5432",
        DB_USER: process.env.DB_USER || "postgres",
        DB_PASSWORD: process.env.DB_PASSWORD || "",
        DB_NAME: process.env.DB_NAME || "nokori_go",
        B2_KEY_ID: process.env.B2_KEY_ID || "",
        B2_APPLICATION_KEY: process.env.B2_APPLICATION_KEY || "",
        B2_BUCKET_NAME: process.env.B2_BUCKET_NAME || "",
        B2_ENDPOINT: process.env.B2_ENDPOINT || "s3.us-east-005.backblazeb2.com",
      },
    },
    {
      name: "hikaku-web",
      cwd: "./frontend",
      script: "npm",
      args: "start",
      env: {
        PORT: process.env.PORT || "3000",
        NODE_ENV: "production",
      },
    },
    {
      name: "hikaku-bot",
      cwd: "./backend",
      script: "go run cmd/bot/main.go",
      env: {
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
      },
    },
  ],
};
