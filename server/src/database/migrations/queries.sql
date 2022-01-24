-- I'm not using this file for anything other than reference for using the seaorm api to construct these
-- queries I've written.

-- Query media and join library and series information
SELECT
	m.name as name,
	m.path as path,
	l.id as library_id,
	l.path as library_path,
	s.title as series_title,
	s.path as series_path
FROM 
	library l
INNER JOIN
	series s
ON
	l.id = s.library_id
INNER JOIN
	media m
ON
	m.series_id = s.id;

-- Query media and join library and series information version 2
SELECT
  `media`.`id`,
  `media`.`series_id`,
  `media`.`name`,
  `media`.`description`,
  `media`.`size`,
  `media`.`extension`,
  `media`.`pages`,
  `media`.`updated_at`,
  `media`.`downloaded`,
  `media`.`path`,
  `library`.`id` AS `library_id`,
  `library`.`path` AS `library_path`,
  `series`.`path` AS `series_path`
FROM
  `media`
  INNER JOIN `series` ON `media`.`series_id` = `series`.`id`
  INNER JOIN `library` ON `series`.`library_id` = `library`.`id`
GROUP BY
  `series`.`id`,
  `library`.`id`