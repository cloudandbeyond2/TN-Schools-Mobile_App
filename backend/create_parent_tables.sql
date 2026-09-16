CREATE TABLE IF NOT EXISTS "public"."ParentStudentLink" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParentStudentLink_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ParentStudentLink_parentId_studentId_key" UNIQUE ("parentId", "studentId"),
    CONSTRAINT "ParentStudentLink_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."HeadmasterParent"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParentStudentLink_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ParentStudentLink_parentId_idx" ON "public"."ParentStudentLink"("parentId");
CREATE INDEX IF NOT EXISTS "ParentStudentLink_studentId_idx" ON "public"."ParentStudentLink"("studentId");

CREATE TABLE IF NOT EXISTS "public"."ParentNotification" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParentNotification_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ParentNotification_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."HeadmasterParent"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ParentNotification_parentId_idx" ON "public"."ParentNotification"("parentId");
CREATE INDEX IF NOT EXISTS "ParentNotification_parentId_isRead_idx" ON "public"."ParentNotification"("parentId", "isRead");
