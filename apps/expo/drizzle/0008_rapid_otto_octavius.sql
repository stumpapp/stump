ALTER TABLE `downloaded_files` ADD `library_id` text;
--> statement-breakpoint
UPDATE `downloaded_files`
SET `library_id` = (
	SELECT `library_id` FROM `series_refs`
	WHERE `series_refs`.`id` = `downloaded_files`.`series_id`
	AND `series_refs`.`server_id` = `downloaded_files`.`server_id`
);
