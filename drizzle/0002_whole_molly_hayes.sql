CREATE TABLE "para_wallets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"email" text NOT NULL,
	"wallet_id" text NOT NULL,
	"wallet_address" text NOT NULL,
	"user_share" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "para_wallets_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "para_wallets" ADD CONSTRAINT "para_wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;