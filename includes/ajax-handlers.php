<?php
defined( 'ABSPATH' ) || exit;

// ---------------------------------------------------------------------------
// Save all Social Profile settings
// ---------------------------------------------------------------------------
add_action( 'wp_ajax_spm_save_settings', 'spm_ajax_save_settings' );
function spm_ajax_save_settings() {
	check_ajax_referer( 'spm_nonce', 'nonce' );

	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error( [ 'message' => 'Unauthorized' ], 403 );
	}

	$raw_profile = isset( $_POST['profile'] ) ? wp_unslash( $_POST['profile'] ) : [];
	$raw_tabs    = isset( $_POST['tabs'] )    ? wp_unslash( $_POST['tabs'] )    : [];

	if ( is_string( $raw_profile ) ) $raw_profile = json_decode( $raw_profile, true ) ?? [];
	if ( is_string( $raw_tabs ) )    $raw_tabs    = json_decode( $raw_tabs,    true ) ?? [];

	update_option( 'sp_profile', spm_sanitize_profile( (array) $raw_profile ) );
	update_option( 'sp_tabs',    spm_sanitize_tabs( (array) $raw_tabs ) );

	// Clear LiteSpeed Cache so front-end shows changes immediately
	do_action( 'litespeed_purge_all' );

	wp_send_json_success( [ 'message' => 'Settings saved.' ] );
}

// ---------------------------------------------------------------------------
// SoundCloud oEmbed proxy (admin only — avoids browser CORS block)
// ---------------------------------------------------------------------------
add_action( 'wp_ajax_spm_soundcloud_oembed', 'spm_ajax_soundcloud_oembed' );
function spm_ajax_soundcloud_oembed() {
	check_ajax_referer( 'spm_nonce', 'nonce' );
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_send_json_error( [ 'message' => 'Unauthorized' ], 403 );
	}

	$url = esc_url_raw( wp_unslash( $_GET['url'] ?? '' ) );
	if ( ! $url ) {
		wp_send_json_error( [ 'message' => 'No URL provided' ] );
	}

	$endpoint = add_query_arg( [ 'url' => $url, 'format' => 'json' ], 'https://soundcloud.com/oembed' );
	$response = wp_remote_get( $endpoint, [ 'timeout' => 8 ] );

	if ( is_wp_error( $response ) ) {
		wp_send_json_error( [ 'message' => $response->get_error_message() ] );
	}

	$body = json_decode( wp_remote_retrieve_body( $response ), true );
	if ( empty( $body ) ) {
		wp_send_json_error( [ 'message' => 'Empty response from SoundCloud' ] );
	}

	wp_send_json_success( [
		'thumbnail_url' => $body['thumbnail_url'] ?? '',
		'title'         => $body['title']         ?? '',
	] );
}

// ---------------------------------------------------------------------------
// Public: collect email/phone subscriber
// ---------------------------------------------------------------------------
add_action( 'wp_ajax_spm_subscribe',        'spm_ajax_subscribe' );
add_action( 'wp_ajax_nopriv_spm_subscribe', 'spm_ajax_subscribe' );
function spm_ajax_subscribe() {
	check_ajax_referer( 'spm_subscribe_nonce', 'nonce' );

	$email     = isset( $_POST['email'] )        ? sanitize_email( wp_unslash( $_POST['email'] ) )             : '';
	$dial_code = isset( $_POST['dial_code'] )    ? sanitize_text_field( wp_unslash( $_POST['dial_code'] ) )    : '';
	$phone_num = isset( $_POST['phone_number'] ) ? sanitize_text_field( wp_unslash( $_POST['phone_number'] ) ) : '';

	$dial_code = preg_replace( '/[^\d+]/', '', trim( $dial_code ) );
	$phone_num = preg_replace( '/[^\d\s\-()+]/', '', trim( $phone_num ) );

	if ( $phone_num !== '' ) {
		$phone = $dial_code !== '' ? $dial_code . ' ' . $phone_num : $phone_num;
	} else {
		$phone = '';
	}

	if ( empty( $email ) || ! is_email( $email ) ) {
		wp_send_json_error( [ 'message' => 'Please enter a valid email address.' ] );
	}

	global $wpdb;
	$table = $wpdb->prefix . 'sp_subscribers';

	// Create table on the fly if it somehow doesn't exist yet
	if ( $wpdb->get_var( "SHOW TABLES LIKE '{$table}'" ) !== $table ) {
		spm_create_tables();
	}

	// Already subscribed?
	$exists = $wpdb->get_var( $wpdb->prepare(
		"SELECT id FROM {$table} WHERE email = %s LIMIT 1",
		$email
	) );

	if ( $exists ) {
		wp_send_json_success( [ 'message' => "You're already subscribed!" ] );
	}

	$ip = sanitize_text_field( $_SERVER['REMOTE_ADDR'] ?? '' );

	$inserted = $wpdb->insert(
		$table,
		[
			'email'      => $email,
			'phone'      => $phone,
			'ip_address' => $ip,
		],
		[ '%s', '%s', '%s' ]
	);

	if ( false === $inserted ) {
		wp_send_json_error( [ 'message' => 'Could not save your details: ' . $wpdb->last_error ] );
	}

	wp_send_json_success( [ 'message' => "You're in! We'll be in touch." ] );
}

// ---------------------------------------------------------------------------
// Admin: update a subscriber
// ---------------------------------------------------------------------------
add_action( 'wp_ajax_spm_update_subscriber', 'spm_ajax_update_subscriber' );
function spm_ajax_update_subscriber() {
	check_ajax_referer( 'spm_subscriber_action', 'nonce' );
	if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( [ 'message' => 'Unauthorized' ], 403 );

	$id    = (int) ( $_POST['id'] ?? 0 );
	$email = sanitize_email( wp_unslash( $_POST['email'] ?? '' ) );
	$phone = sanitize_text_field( wp_unslash( $_POST['phone'] ?? '' ) );
	$phone = preg_replace( '/[^\d\s\-()+]/', '', $phone );

	if ( ! $id || ! is_email( $email ) ) {
		wp_send_json_error( [ 'message' => 'Invalid data.' ] );
	}

	global $wpdb;
	$table = $wpdb->prefix . 'sp_subscribers';
	$result = $wpdb->update( $table, [ 'email' => $email, 'phone' => $phone ], [ 'id' => $id ], [ '%s', '%s' ], [ '%d' ] );

	if ( false === $result ) {
		wp_send_json_error( [ 'message' => 'Could not update: ' . $wpdb->last_error ] );
	}
	wp_send_json_success( [ 'message' => 'Updated.' ] );
}

// ---------------------------------------------------------------------------
// Admin: delete a subscriber
// ---------------------------------------------------------------------------
add_action( 'wp_ajax_spm_delete_subscriber', 'spm_ajax_delete_subscriber' );
function spm_ajax_delete_subscriber() {
	check_ajax_referer( 'spm_subscriber_action', 'nonce' );
	if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( [ 'message' => 'Unauthorized' ], 403 );

	$id = (int) ( $_POST['id'] ?? 0 );
	if ( ! $id ) wp_send_json_error( [ 'message' => 'Invalid ID.' ] );

	global $wpdb;
	$table  = $wpdb->prefix . 'sp_subscribers';
	$result = $wpdb->delete( $table, [ 'id' => $id ], [ '%d' ] );

	if ( false === $result ) {
		wp_send_json_error( [ 'message' => 'Could not delete: ' . $wpdb->last_error ] );
	}
	wp_send_json_success( [ 'message' => 'Deleted.' ] );
}

// ---------------------------------------------------------------------------
// Admin: export subscribers as CSV
// ---------------------------------------------------------------------------
add_action( 'admin_init', 'spm_export_subscribers_csv' );
function spm_export_subscribers_csv() {
	if (
		! isset( $_GET['spm_export_csv'] ) ||
		! current_user_can( 'manage_options' ) ||
		! check_admin_referer( 'spm_export_csv' )
	) {
		return;
	}

	global $wpdb;
	$table = $wpdb->prefix . 'sp_subscribers';
	$rows  = $wpdb->get_results( "SELECT email, phone, ip_address, created_at FROM {$table} ORDER BY id DESC", ARRAY_A );

	header( 'Content-Type: text/csv; charset=utf-8' );
	header( 'Content-Disposition: attachment; filename="subscribers-' . date( 'Y-m-d' ) . '.csv"' );

	$out = fopen( 'php://output', 'w' );
	fputcsv( $out, [ 'Email', 'Phone', 'IP Address', 'Signed Up' ] );
	foreach ( $rows as $row ) {
		fputcsv( $out, $row );
	}
	fclose( $out );
	exit;
}
