/*
  Warnings:

  - A unique constraint covering the columns `[user_id]` on the table `user_preferences` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");
