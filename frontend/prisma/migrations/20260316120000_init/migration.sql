-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productName" TEXT NOT NULL,
    "category" TEXT,
    "sellingPoints" TEXT,
    "targetAudience" TEXT,
    "scenesBusiness" TEXT,
    "scenesHome" TEXT,
    "modelProfile" TEXT,
    "aspectRatios" TEXT,
    "totalCount" INTEGER NOT NULL DEFAULT 25,
    "finishedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedImage" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "material" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedImage" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "promptId" TEXT,
    "url" TEXT NOT NULL,
    "aspectRatio" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Prompt_taskId_idx" ON "Prompt"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "Prompt_taskId_index_key" ON "Prompt"("taskId", "index");

-- CreateIndex
CREATE INDEX "UploadedImage_taskId_idx" ON "UploadedImage"("taskId");

-- CreateIndex
CREATE INDEX "GeneratedImage_taskId_idx" ON "GeneratedImage"("taskId");

-- CreateIndex
CREATE INDEX "GeneratedImage_promptId_idx" ON "GeneratedImage"("promptId");

-- AddForeignKey
ALTER TABLE "Prompt" ADD CONSTRAINT "Prompt_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedImage" ADD CONSTRAINT "UploadedImage_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedImage" ADD CONSTRAINT "GeneratedImage_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
