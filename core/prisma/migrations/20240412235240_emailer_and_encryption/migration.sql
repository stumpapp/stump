-- AlterTable
ALTER TABLE "server_config" ADD COLUMN "encryption_key" TEXT;

-- CreateTable
CREATE TABLE "registered_email_devices" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "forbidden" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "emailer_send_records" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "emailer_id" INTEGER NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "attachment_meta" BLOB,
    "sent_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_by_user_id" TEXT,
    CONSTRAINT "emailer_send_records_emailer_id_fkey" FOREIGN KEY ("emailer_id") REFERENCES "emailers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "emailer_send_records_sent_by_user_id_fkey" FOREIGN KEY ("sent_by_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "emailers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "sender_email" TEXT NOT NULL,
    "sender_display_name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "encrypted_password" TEXT NOT NULL,
    "smtp_host" TEXT NOT NULL,
    "smtp_port" INTEGER NOT NULL,
    "tls_enabled" BOOLEAN NOT NULL DEFAULT false,
    "max_attachment_size_bytes" INTEGER,
    "max_num_attachments" INTEGER,
    "last_used_at" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "registered_email_devices_name_key" ON "registered_email_devices"("name");

-- CreateIndex
CREATE UNIQUE INDEX "emailers_name_key" ON "emailers"("name");
