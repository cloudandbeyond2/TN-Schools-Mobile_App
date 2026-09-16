-- Teacher approval gate for the Class Syllabus Board: a unit's AI-generated
-- detail content is only visible to students once a teacher publishes it.
ALTER TABLE "CentralUnit" ADD COLUMN "isApproved" BOOLEAN NOT NULL DEFAULT false;
