-- CreateEnum
CREATE TYPE "PunchType" AS ENUM ('ENTRY', 'EXIT');

-- CreateEnum
CREATE TYPE "WorklogStatus" AS ENUM ('PENDING', 'PROCESSED', 'ERROR');

-- CreateEnum
CREATE TYPE "OccurrenceType" AS ENUM ('LATE', 'OVER', 'UNDER', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "OccurrenceStatus" AS ENUM ('OPEN', 'ACK', 'RESOLVED');

-- CreateEnum
CREATE TYPE "JustificationCategory" AS ENUM ('MEDICAL', 'PERSONAL', 'TRAFFIC', 'WORK_OFFSITE', 'MEETING', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('DM_EMPLOYEE', 'DM_MANAGER', 'HR');

-- CreateTable
CREATE TABLE "sectors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "managerSlackUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "solidesEmployeeId" TEXT NOT NULL,
    "slackUserId" TEXT,
    "sectorId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "punch_events" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "type" "PunchType" NOT NULL,
    "sourcePayloadJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "punch_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_worklogs" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "workedMinutes" INTEGER NOT NULL DEFAULT 0,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "extraMinutes" INTEGER NOT NULL DEFAULT 0,
    "underMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" "WorklogStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_worklogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "occurrences" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "OccurrenceType" NOT NULL,
    "minutes" INTEGER NOT NULL,
    "status" "OccurrenceStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "justifications" (
    "id" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "text" TEXT NOT NULL,
    "category" "JustificationCategory",
    "notifyHR" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "justifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "occurrenceId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "messageTs" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sectors_name_key" ON "sectors"("name");

-- CreateIndex
CREATE UNIQUE INDEX "employees_solidesEmployeeId_key" ON "employees"("solidesEmployeeId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_slackUserId_key" ON "employees"("slackUserId");

-- CreateIndex
CREATE INDEX "punch_events_employeeId_timestamp_idx" ON "punch_events"("employeeId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "daily_worklogs_employeeId_date_key" ON "daily_worklogs"("employeeId", "date");

-- CreateIndex
CREATE INDEX "occurrences_employeeId_date_idx" ON "occurrences"("employeeId", "date");

-- CreateIndex
CREATE INDEX "occurrences_status_idx" ON "occurrences"("status");

-- CreateIndex
CREATE UNIQUE INDEX "notification_logs_employeeId_occurrenceId_channel_key" ON "notification_logs"("employeeId", "occurrenceId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "sectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "punch_events" ADD CONSTRAINT "punch_events_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_worklogs" ADD CONSTRAINT "daily_worklogs_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "justifications" ADD CONSTRAINT "justifications_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "occurrences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "justifications" ADD CONSTRAINT "justifications_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "occurrences"("id") ON DELETE SET NULL ON UPDATE CASCADE;
