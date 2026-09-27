CREATE TABLE `courses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`units` integer DEFAULT 6 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `courses_code_unique` ON `courses` (`code`);--> statement-breakpoint
CREATE TABLE `offerings` (
	`course_id` integer NOT NULL,
	`semester_id` integer NOT NULL,
	PRIMARY KEY(`course_id`, `semester_id`),
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`semester_id`) REFERENCES `semesters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `prerequisites` (
	`course_id` integer NOT NULL,
	`requires_course_id` integer NOT NULL,
	PRIMARY KEY(`course_id`, `requires_course_id`),
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requires_course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `requirements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`specialisation_id` integer,
	`course_id` integer NOT NULL,
	`category` text NOT NULL,
	FOREIGN KEY (`specialisation_id`) REFERENCES `specialisations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `semesters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`year` integer NOT NULL,
	`term` text NOT NULL,
	`label` text NOT NULL,
	`is_current` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `specialisations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`elective_units_required` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `specialisations_code_unique` ON `specialisations` (`code`);--> statement-breakpoint
CREATE TABLE `student_specialisation` (
	`id` integer PRIMARY KEY NOT NULL,
	`specialisation_id` integer NOT NULL,
	FOREIGN KEY (`specialisation_id`) REFERENCES `specialisations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `taken_courses` (
	`course_id` integer PRIMARY KEY NOT NULL,
	`completed_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
