<?php
/**
 * Plugin Name:       Social Profile Manager
 * Plugin URI:        https://example.com/social-profile-manager
 * Description:       Admin panel for the Social Profile theme. Edit your profile, colors, social links, tab sections, and collect subscriber emails.
 * Version:           1.1.0
 * Author:            Your Name
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       social-profile-manager
 */

defined( 'ABSPATH' ) || exit;

define( 'SPM_DIR',     plugin_dir_path( __FILE__ ) );
define( 'SPM_URL',     plugin_dir_url( __FILE__ ) );
define( 'SPM_VERSION', '1.1.0' );

require_once SPM_DIR . 'includes/helpers.php';
require_once SPM_DIR . 'includes/admin-page.php';
require_once SPM_DIR . 'includes/ajax-handlers.php';

// ---------------------------------------------------------------------------
// Create subscribers table on activation
// ---------------------------------------------------------------------------
register_activation_hook( __FILE__, 'spm_create_tables' );
function spm_create_tables() {
	global $wpdb;
	$table        = $wpdb->prefix . 'sp_subscribers';
	$charset      = $wpdb->get_charset_collate();

	$sql = "CREATE TABLE {$table} (
		id          BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
		email       VARCHAR(255)        NOT NULL DEFAULT '',
		phone       VARCHAR(50)         NOT NULL DEFAULT '',
		ip_address  VARCHAR(45)         NOT NULL DEFAULT '',
		created_at  DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY  (id),
		UNIQUE KEY   email (email)
	) {$charset};";

	require_once ABSPATH . 'wp-admin/includes/upgrade.php';
	dbDelta( $sql );
}
