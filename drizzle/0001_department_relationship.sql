-- Refuse narrowing conversions rather than truncate existing data.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM subjects WHERE length(description) > 255 OR length(department) > 50) THEN
    RAISE EXCEPTION 'Existing descriptions or department values exceed the new schema limits';
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "departments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "subjects" DROP CONSTRAINT "subjects_code_key";--> statement-breakpoint
ALTER TABLE "subjects" ALTER COLUMN "code" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "subjects" ALTER COLUMN "name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "subjects" ALTER COLUMN "description" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "subjects" ALTER COLUMN "description" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "subjects" ALTER COLUMN "description" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subjects" ALTER COLUMN "created_at" SET DATA TYPE timestamp USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "subjects" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "subjects" ALTER COLUMN "updated_at" SET DATA TYPE timestamp USING "updated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "subjects" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "department_id" integer;
--> statement-breakpoint
INSERT INTO "departments" ("code", "name") SELECT DISTINCT "department", "department" FROM "subjects";
--> statement-breakpoint
UPDATE "subjects" s SET "department_id" = d."id" FROM "departments" d WHERE d."code" = s."department";
--> statement-breakpoint
ALTER TABLE "subjects" ALTER COLUMN "department_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "level" varchar(50);--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "type" varchar(50);--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" DROP COLUMN "department";--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_code_unique" UNIQUE("code");