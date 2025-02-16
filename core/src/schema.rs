// @generated automatically by Diesel CLI.

diesel::table! {
	_LibraryToTag (rowid) {
		rowid -> Integer,
		A -> Text,
		B -> Text,
	}
}

diesel::table! {
	_LibraryToUser (rowid) {
		rowid -> Integer,
		A -> Text,
		B -> Text,
	}
}

diesel::table! {
	_MediaToTag (rowid) {
		rowid -> Integer,
		A -> Text,
		B -> Text,
	}
}

diesel::table! {
	_SeriesToTag (rowid) {
		rowid -> Integer,
		A -> Text,
		B -> Text,
	}
}

diesel::table! {
	_prisma_migrations (id) {
		id -> Text,
		checksum -> Text,
		finished_at -> Nullable<Timestamp>,
		migration_name -> Text,
		logs -> Nullable<Text>,
		rolled_back_at -> Nullable<Timestamp>,
		started_at -> Timestamp,
		applied_steps_count -> Integer,
	}
}

diesel::table! {
	age_restrictions (rowid) {
		rowid -> Integer,
		age -> Integer,
		restrict_on_unset -> Bool,
		user_id -> Text,
	}
}

diesel::table! {
	api_keys (id) {
		id -> Integer,
		name -> Text,
		short_token -> Text,
		long_token_hash -> Text,
		permissions -> Binary,
		created_at -> Timestamp,
		last_used_at -> Nullable<Timestamp>,
		expires_at -> Nullable<Timestamp>,
		user_id -> Text,
	}
}

diesel::table! {
	book_club_book_suggestion_likes (rowid) {
		rowid -> Integer,
		timestamp -> Timestamp,
		liked_by_id -> Text,
		suggestion_id -> Text,
	}
}

diesel::table! {
	book_club_book_suggestions (id) {
		id -> Text,
		title -> Nullable<Text>,
		author -> Nullable<Text>,
		url -> Nullable<Text>,
		notes -> Nullable<Text>,
		suggested_by_id -> Text,
		book_id -> Nullable<Text>,
	}
}

diesel::table! {
	book_club_books (id) {
		id -> Text,
		start_at -> Timestamp,
		end_at -> Timestamp,
		discussion_duration_days -> Nullable<Integer>,
		title -> Nullable<Text>,
		author -> Nullable<Text>,
		url -> Nullable<Text>,
		book_entity_id -> Nullable<Text>,
		book_club_schedule_book_club_id -> Nullable<Text>,
		image_url -> Nullable<Text>,
	}
}

diesel::table! {
	book_club_discussion_message_likes (id) {
		id -> Text,
		timestamp -> Timestamp,
		liked_by_id -> Text,
		message_id -> Text,
	}
}

diesel::table! {
	book_club_discussion_messages (id) {
		id -> Text,
		content -> Text,
		timestamp -> Timestamp,
		is_top_message -> Bool,
		deleted_at -> Nullable<Timestamp>,
		parent_message_id -> Nullable<Text>,
		discussion_id -> Text,
		member_id -> Nullable<Text>,
	}
}

diesel::table! {
	book_club_discussions (id) {
		id -> Text,
		is_locked -> Bool,
		book_club_book_id -> Text,
	}
}

diesel::table! {
	book_club_invitations (id) {
		id -> Text,
		role -> Integer,
		user_id -> Text,
		book_club_id -> Text,
	}
}

diesel::table! {
	book_club_member_favorite_books (id) {
		id -> Text,
		title -> Nullable<Text>,
		author -> Nullable<Text>,
		url -> Nullable<Text>,
		notes -> Nullable<Text>,
		member_id -> Text,
		book_id -> Nullable<Text>,
		image_url -> Nullable<Text>,
	}
}

diesel::table! {
	book_club_members (id) {
		id -> Text,
		display_name -> Nullable<Text>,
		is_creator -> Bool,
		hide_progress -> Bool,
		private_membership -> Bool,
		role -> Integer,
		user_id -> Text,
		book_club_id -> Text,
	}
}

diesel::table! {
	book_club_schedules (book_club_id) {
		default_interval_days -> Nullable<Integer>,
		book_club_id -> Text,
	}
}

diesel::table! {
	book_clubs (id) {
		id -> Text,
		name -> Text,
		description -> Nullable<Text>,
		is_private -> Bool,
		member_role_spec -> Nullable<Binary>,
		created_at -> Timestamp,
		emoji -> Nullable<Text>,
	}
}

diesel::table! {
	bookmarks (id) {
		id -> Text,
		preview_content -> Nullable<Text>,
		epubcfi -> Nullable<Text>,
		page -> Nullable<Integer>,
		media_id -> Text,
		user_id -> Text,
	}
}

diesel::table! {
	collections (id) {
		id -> Text,
		name -> Text,
		description -> Nullable<Text>,
		updated_at -> Timestamp,
	}
}

diesel::table! {
	emailer_send_records (id) {
		id -> Integer,
		emailer_id -> Integer,
		recipient_email -> Text,
		attachment_meta -> Nullable<Binary>,
		sent_at -> Timestamp,
		sent_by_user_id -> Nullable<Text>,
	}
}

diesel::table! {
	emailers (id) {
		id -> Integer,
		name -> Text,
		is_primary -> Bool,
		sender_email -> Text,
		sender_display_name -> Text,
		username -> Text,
		encrypted_password -> Text,
		smtp_host -> Text,
		smtp_port -> Integer,
		tls_enabled -> Bool,
		max_attachment_size_bytes -> Nullable<Integer>,
		max_num_attachments -> Nullable<Integer>,
		last_used_at -> Nullable<Timestamp>,
	}
}

diesel::table! {
	finished_reading_sessions (id) {
		id -> Text,
		started_at -> Timestamp,
		completed_at -> Timestamp,
		media_id -> Text,
		user_id -> Text,
		device_id -> Nullable<Text>,
	}
}

diesel::table! {
	job_schedule_configs (id) {
		id -> Text,
		interval_secs -> Integer,
	}
}

diesel::table! {
	jobs (id) {
		id -> Text,
		name -> Text,
		description -> Nullable<Text>,
		status -> Text,
		save_state -> Nullable<Binary>,
		output_data -> Nullable<Binary>,
		ms_elapsed -> BigInt,
		created_at -> Timestamp,
		completed_at -> Nullable<Timestamp>,
	}
}

diesel::table! {
	last_library_visits (rowid) {
		rowid -> Integer,
		user_id -> Text,
		library_id -> Text,
		timestamp -> Timestamp,
	}
}

diesel::table! {
	libraries (id) {
		id -> Text,
		name -> Text,
		description -> Nullable<Text>,
		path -> Text,
		status -> Text,
		updated_at -> Timestamp,
		created_at -> Timestamp,
		emoji -> Nullable<Text>,
		config_id -> Text,
		job_schedule_config_id -> Nullable<Text>,
		last_scanned_at -> Nullable<Timestamp>,
	}
}

diesel::table! {
	library_configs (id) {
		id -> Text,
		convert_rar_to_zip -> Bool,
		hard_delete_conversions -> Bool,
		default_reading_dir -> Text,
		default_reading_mode -> Text,
		default_reading_image_scale_fit -> Text,
		generate_file_hashes -> Bool,
		generate_koreader_hashes -> Bool,
		process_metadata -> Bool,
		library_pattern -> Text,
		thumbnail_config -> Nullable<Binary>,
		ignore_rules -> Nullable<Binary>,
		library_id -> Nullable<Text>,
	}
}

diesel::table! {
	library_scan_records (id) {
		id -> Integer,
		options -> Nullable<Binary>,
		timestamp -> Timestamp,
		library_id -> Text,
		job_id -> Nullable<Text>,
	}
}

diesel::table! {
	logs (id) {
		id -> Integer,
		level -> Text,
		message -> Text,
		timestamp -> Timestamp,
		job_id -> Nullable<Text>,
		context -> Nullable<Text>,
	}
}

diesel::table! {
	media (id) {
		id -> Text,
		name -> Text,
		size -> BigInt,
		extension -> Text,
		pages -> Integer,
		updated_at -> Timestamp,
		created_at -> Timestamp,
		modified_at -> Nullable<Timestamp>,
		hash -> Nullable<Text>,
		path -> Text,
		status -> Text,
		series_id -> Nullable<Text>,
		deleted_at -> Nullable<Timestamp>,
		koreader_hash -> Nullable<Text>,
	}
}

diesel::table! {
	media_annotations (id) {
		id -> Text,
		highlighted_text -> Nullable<Text>,
		epubcfi -> Nullable<Text>,
		page -> Nullable<Integer>,
		page_coordinates_x -> Nullable<Float>,
		page_coordinates_y -> Nullable<Float>,
		notes -> Nullable<Text>,
		user_id -> Text,
		media_id -> Text,
	}
}

diesel::table! {
	media_metadata (id) {
		id -> Text,
		title -> Nullable<Text>,
		series -> Nullable<Text>,
		number -> Nullable<Float>,
		volume -> Nullable<Integer>,
		summary -> Nullable<Text>,
		notes -> Nullable<Text>,
		genre -> Nullable<Text>,
		year -> Nullable<Integer>,
		month -> Nullable<Integer>,
		day -> Nullable<Integer>,
		writers -> Nullable<Text>,
		pencillers -> Nullable<Text>,
		inkers -> Nullable<Text>,
		colorists -> Nullable<Text>,
		letterers -> Nullable<Text>,
		cover_artists -> Nullable<Text>,
		editors -> Nullable<Text>,
		publisher -> Nullable<Text>,
		links -> Nullable<Text>,
		characters -> Nullable<Text>,
		teams -> Nullable<Text>,
		page_count -> Nullable<Integer>,
		media_id -> Nullable<Text>,
		age_rating -> Nullable<Integer>,
	}
}

diesel::table! {
	notifiers (id) {
		id -> Integer,
		#[sql_name = "type"]
		type_ -> Text,
		config -> Binary,
	}
}

diesel::table! {
	page_dimensions (id) {
		id -> Text,
		dimensions -> Text,
		metadata_id -> Text,
	}
}

diesel::table! {
	reading_list_items (rowid) {
		rowid -> Integer,
		display_order -> Integer,
		media_id -> Text,
		reading_list_id -> Text,
	}
}

diesel::table! {
	reading_list_rules (rowid) {
		rowid -> Integer,
		role -> Integer,
		user_id -> Text,
		reading_list_id -> Text,
	}
}

diesel::table! {
	reading_lists (id) {
		id -> Text,
		name -> Text,
		description -> Nullable<Text>,
		updated_at -> Timestamp,
		visibility -> Text,
		ordering -> Text,
		creating_user_id -> Text,
	}
}

diesel::table! {
	reading_sessions (id) {
		id -> Text,
		page -> Nullable<Integer>,
		percentage_completed -> Nullable<Float>,
		epubcfi -> Nullable<Text>,
		koreader_progress -> Nullable<Text>,
		started_at -> Timestamp,
		updated_at -> Timestamp,
		media_id -> Text,
		user_id -> Text,
		device_id -> Nullable<Text>,
	}
}

diesel::table! {
	registered_email_devices (id) {
		id -> Integer,
		name -> Text,
		email -> Text,
		forbidden -> Bool,
	}
}

diesel::table! {
	registered_reading_devices (id) {
		id -> Text,
		name -> Text,
		kind -> Nullable<Text>,
	}
}

diesel::table! {
	reviews (id) {
		id -> Text,
		rating -> Integer,
		content -> Nullable<Text>,
		is_private -> Bool,
		media_id -> Text,
		user_id -> Text,
	}
}

diesel::table! {
	series (id) {
		id -> Text,
		name -> Text,
		description -> Nullable<Text>,
		updated_at -> Timestamp,
		created_at -> Timestamp,
		path -> Text,
		status -> Text,
		library_id -> Nullable<Text>,
	}
}

diesel::table! {
	series_metadata (series_id) {
		meta_type -> Text,
		title -> Nullable<Text>,
		summary -> Nullable<Text>,
		publisher -> Nullable<Text>,
		imprint -> Nullable<Text>,
		comicid -> Nullable<Integer>,
		volume -> Nullable<Integer>,
		booktype -> Nullable<Text>,
		age_rating -> Nullable<Integer>,
		status -> Nullable<Text>,
		series_id -> Text,
	}
}

diesel::table! {
	server_config (id) {
		id -> Text,
		public_url -> Nullable<Text>,
		initial_wal_setup_complete -> Bool,
		job_schedule_config_id -> Nullable<Text>,
		encryption_key -> Nullable<Text>,
	}
}

diesel::table! {
	server_invitations (id) {
		id -> Text,
		secret -> Text,
		email -> Nullable<Text>,
		granted_permissions -> Nullable<Text>,
		created_at -> Timestamp,
		expires_at -> Timestamp,
	}
}

diesel::table! {
	sessions (id) {
		id -> Text,
		created_at -> Timestamp,
		expiry_time -> Timestamp,
		data -> Binary,
		user_id -> Text,
	}
}

diesel::table! {
	smart_list_access_rules (rowid) {
		rowid -> Integer,
		role -> Integer,
		user_id -> Text,
		smart_list_id -> Text,
	}
}

diesel::table! {
	smart_list_views (rowid) {
		rowid -> Integer,
		name -> Text,
		list_id -> Text,
		data -> Binary,
	}
}

diesel::table! {
	smart_lists (id) {
		id -> Text,
		name -> Text,
		description -> Nullable<Text>,
		filters -> Binary,
		joiner -> Text,
		default_grouping -> Text,
		visibility -> Text,
		creator_id -> Text,
	}
}

diesel::table! {
	tags (id) {
		id -> Text,
		name -> Text,
	}
}

diesel::table! {
	user_login_activity (id) {
		id -> Text,
		ip_address -> Text,
		user_agent -> Text,
		authentication_successful -> Bool,
		timestamp -> Timestamp,
		user_id -> Text,
	}
}

diesel::table! {
	user_preferences (id) {
		id -> Text,
		preferred_layout_mode -> Text,
		locale -> Text,
		app_theme -> Text,
		app_font -> Text,
		primary_navigation_mode -> Text,
		layout_max_width_px -> Nullable<Integer>,
		show_query_indicator -> Bool,
		enable_live_refetch -> Bool,
		enable_discord_presence -> Bool,
		enable_compact_display -> Bool,
		enable_gradients -> Bool,
		enable_double_sidebar -> Bool,
		enable_replace_primary_sidebar -> Bool,
		enable_hide_scrollbar -> Bool,
		prefer_accent_color -> Bool,
		show_thumbnails_in_headers -> Bool,
		enable_job_overlay -> Bool,
		navigation_arrangement -> Nullable<Binary>,
		home_arrangement -> Nullable<Binary>,
		user_id -> Nullable<Text>,
	}
}

diesel::table! {
	users (id) {
		id -> Text,
		username -> Text,
		hashed_password -> Text,
		is_server_owner -> Bool,
		avatar_url -> Nullable<Text>,
		last_login -> Nullable<Timestamp>,
		created_at -> Timestamp,
		deleted_at -> Nullable<Timestamp>,
		is_locked -> Bool,
		max_sessions_allowed -> Nullable<Integer>,
		permissions -> Nullable<Text>,
		user_preferences_id -> Nullable<Text>,
	}
}

diesel::joinable!(_LibraryToTag -> libraries (A));
diesel::joinable!(_LibraryToTag -> tags (B));
diesel::joinable!(_LibraryToUser -> libraries (A));
diesel::joinable!(_LibraryToUser -> users (B));
diesel::joinable!(_MediaToTag -> media (A));
diesel::joinable!(_MediaToTag -> tags (B));
diesel::joinable!(_SeriesToTag -> series (A));
diesel::joinable!(_SeriesToTag -> tags (B));
diesel::joinable!(age_restrictions -> users (user_id));
diesel::joinable!(api_keys -> users (user_id));
diesel::joinable!(book_club_book_suggestion_likes -> book_club_book_suggestions (suggestion_id));
diesel::joinable!(book_club_book_suggestion_likes -> book_club_members (liked_by_id));
diesel::joinable!(book_club_book_suggestions -> book_club_members (suggested_by_id));
diesel::joinable!(book_club_book_suggestions -> media (book_id));
diesel::joinable!(book_club_books -> book_club_schedules (book_club_schedule_book_club_id));
diesel::joinable!(book_club_books -> media (book_entity_id));
diesel::joinable!(book_club_discussion_message_likes -> book_club_discussion_messages (message_id));
diesel::joinable!(book_club_discussion_message_likes -> book_club_members (liked_by_id));
diesel::joinable!(book_club_discussion_messages -> book_club_discussions (discussion_id));
diesel::joinable!(book_club_discussion_messages -> book_club_members (member_id));
diesel::joinable!(book_club_discussions -> book_club_books (book_club_book_id));
diesel::joinable!(book_club_invitations -> book_clubs (book_club_id));
diesel::joinable!(book_club_invitations -> users (user_id));
diesel::joinable!(book_club_member_favorite_books -> book_club_members (member_id));
diesel::joinable!(book_club_member_favorite_books -> media (book_id));
diesel::joinable!(book_club_members -> book_clubs (book_club_id));
diesel::joinable!(book_club_members -> users (user_id));
diesel::joinable!(book_club_schedules -> book_clubs (book_club_id));
diesel::joinable!(bookmarks -> media (media_id));
diesel::joinable!(bookmarks -> users (user_id));
diesel::joinable!(emailer_send_records -> emailers (emailer_id));
diesel::joinable!(emailer_send_records -> users (sent_by_user_id));
diesel::joinable!(finished_reading_sessions -> media (media_id));
diesel::joinable!(finished_reading_sessions -> registered_reading_devices (device_id));
diesel::joinable!(finished_reading_sessions -> users (user_id));
diesel::joinable!(last_library_visits -> libraries (library_id));
diesel::joinable!(last_library_visits -> users (user_id));
diesel::joinable!(libraries -> job_schedule_configs (job_schedule_config_id));
diesel::joinable!(libraries -> library_configs (config_id));
diesel::joinable!(library_scan_records -> jobs (job_id));
diesel::joinable!(library_scan_records -> libraries (library_id));
diesel::joinable!(logs -> jobs (job_id));
diesel::joinable!(media -> series (series_id));
diesel::joinable!(media_annotations -> media (media_id));
diesel::joinable!(media_annotations -> users (user_id));
diesel::joinable!(media_metadata -> media (media_id));
diesel::joinable!(page_dimensions -> media_metadata (metadata_id));
diesel::joinable!(reading_list_items -> media (media_id));
diesel::joinable!(reading_list_items -> reading_lists (reading_list_id));
diesel::joinable!(reading_list_rules -> reading_lists (reading_list_id));
diesel::joinable!(reading_lists -> users (creating_user_id));
diesel::joinable!(reading_sessions -> media (media_id));
diesel::joinable!(reading_sessions -> registered_reading_devices (device_id));
diesel::joinable!(reading_sessions -> users (user_id));
diesel::joinable!(reviews -> media (media_id));
diesel::joinable!(reviews -> users (user_id));
diesel::joinable!(series -> libraries (library_id));
diesel::joinable!(series_metadata -> series (series_id));
diesel::joinable!(server_config -> job_schedule_configs (job_schedule_config_id));
diesel::joinable!(sessions -> users (user_id));
diesel::joinable!(smart_list_access_rules -> smart_lists (smart_list_id));
diesel::joinable!(smart_list_access_rules -> users (user_id));
diesel::joinable!(smart_list_views -> smart_lists (list_id));
diesel::joinable!(smart_lists -> users (creator_id));
diesel::joinable!(user_login_activity -> users (user_id));
diesel::joinable!(users -> user_preferences (user_preferences_id));

diesel::allow_tables_to_appear_in_same_query!(
	_LibraryToTag,
	_LibraryToUser,
	_MediaToTag,
	_SeriesToTag,
	_prisma_migrations,
	age_restrictions,
	api_keys,
	book_club_book_suggestion_likes,
	book_club_book_suggestions,
	book_club_books,
	book_club_discussion_message_likes,
	book_club_discussion_messages,
	book_club_discussions,
	book_club_invitations,
	book_club_member_favorite_books,
	book_club_members,
	book_club_schedules,
	book_clubs,
	bookmarks,
	collections,
	emailer_send_records,
	emailers,
	finished_reading_sessions,
	job_schedule_configs,
	jobs,
	last_library_visits,
	libraries,
	library_configs,
	library_scan_records,
	logs,
	media,
	media_annotations,
	media_metadata,
	notifiers,
	page_dimensions,
	reading_list_items,
	reading_list_rules,
	reading_lists,
	reading_sessions,
	registered_email_devices,
	registered_reading_devices,
	reviews,
	series,
	series_metadata,
	server_config,
	server_invitations,
	sessions,
	smart_list_access_rules,
	smart_list_views,
	smart_lists,
	tags,
	user_login_activity,
	user_preferences,
	users,
);
