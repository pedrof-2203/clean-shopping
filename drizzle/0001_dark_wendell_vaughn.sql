ALTER TABLE "products" ALTER COLUMN "name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "description" text NOT NULL;