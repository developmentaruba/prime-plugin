<?php
defined( 'ABSPATH' ) || exit;

// ---------------------------------------------------------------------------
// Admin menus
// ---------------------------------------------------------------------------
add_action( 'admin_menu', function () {
	add_menu_page(
		'Social Profile',
		'Social Profile',
		'manage_options',
		'social-profile',
		'spm_render_admin_page',
		'dashicons-id-alt',
		60
	);
	add_submenu_page(
		'social-profile',
		'Settings',
		'Settings',
		'manage_options',
		'social-profile',
		'spm_render_admin_page'
	);
	add_submenu_page(
		'social-profile',
		'Tabs & Cards',
		'Tabs & Cards',
		'manage_options',
		'social-profile-tabs',
		'spm_render_tabs_page'
	);
	add_submenu_page(
		'social-profile',
		'Subscribers',
		'Subscribers',
		'manage_options',
		'social-profile-subscribers',
		'spm_render_subscribers_page'
	);
} );

// ---------------------------------------------------------------------------
// Enqueue admin assets
// ---------------------------------------------------------------------------
add_action( 'admin_enqueue_scripts', function ( $hook ) {
	$pages = [ 'toplevel_page_social-profile', 'social-profile_page_social-profile-tabs', 'social-profile_page_social-profile-subscribers' ];
	if ( ! in_array( $hook, $pages, true ) ) return;

	wp_enqueue_media();
	wp_enqueue_style(  'spm-admin', SPM_URL . 'assets/css/admin.css', [], SPM_VERSION );
	wp_enqueue_script( 'spm-admin', SPM_URL . 'assets/js/admin.js', [], SPM_VERSION, true );

	$profile = function_exists( 'sp_get_profile' ) ? sp_get_profile() : get_option( 'sp_profile', [] );
	$tabs    = function_exists( 'sp_get_tabs' )    ? sp_get_tabs()    : get_option( 'sp_tabs', [] );

	wp_localize_script( 'spm-admin', 'spmData', [
		'ajaxUrl'    => admin_url( 'admin-ajax.php' ),
		'nonce'      => wp_create_nonce( 'spm_nonce' ),
		'previewUrl' => add_query_arg( 'sp_preview', '1', home_url( '/' ) ),
		'profile'    => $profile,
		'tabs'       => $tabs,
		'platforms'  => spm_social_platforms(),
	] );
} );

// ---------------------------------------------------------------------------
// Settings page
// ---------------------------------------------------------------------------
function spm_render_admin_page() {
	$profile = function_exists( 'sp_get_profile' ) ? sp_get_profile() : get_option( 'sp_profile', [] );
	$tabs    = function_exists( 'sp_get_tabs' )    ? sp_get_tabs()    : get_option( 'sp_tabs', [] );
	$colors  = $profile['colors']  ?? [];
	$socials = $profile['socials'] ?? [];
	$platforms = spm_social_platforms();
	?>
	<div class="spm-wrap" id="spm-wrap">

		<div class="spm-header">
			<h1>Social Profile</h1>
			<div style="display:flex;align-items:center;gap:10px;">
				<button class="spm-theme-toggle" id="spm-theme-toggle" title="Toggle dark/light mode" aria-label="Toggle dark mode"><svg id="spm-theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></button>
				<button class="spm-save-btn" id="spm-save-btn">
					<span id="spm-save-label">Save Changes</span>
				</button>
			</div>
		</div>

		<div class="spm-layout">

			<!-- Settings Panel -->
			<div class="spm-panel" id="spm-panel">

				<nav class="spm-nav" id="spm-nav">
					<button class="spm-nav__btn is-active" data-section="profile">Profile</button>
					<button class="spm-nav__btn"           data-section="colors">Colors</button>
					<button class="spm-nav__btn"           data-section="socials">Socials</button>
					</nav>

				<!-- PROFILE -->
				<section class="spm-section is-active" id="spm-section-profile">

					<div class="spm-field">
						<label>Avatar / Profile Image</label>
						<div class="spm-media-row">
							<div class="spm-avatar-preview" id="spm-avatar-preview">
								<?php if ( ! empty( $profile['avatar'] ) ) : ?>
									<img src="<?php echo esc_url( $profile['avatar'] ); ?>" alt="">
								<?php else : ?>
									<span>No image</span>
								<?php endif; ?>
							</div>
							<div class="spm-media-btns">
								<button class="spm-btn spm-btn--sm" id="spm-avatar-upload">Upload / Select</button>
								<button class="spm-btn spm-btn--sm spm-btn--ghost" id="spm-avatar-remove">Remove</button>
							</div>
						</div>
						<input type="hidden" id="spm-avatar" value="<?php echo esc_attr( $profile['avatar'] ?? '' ); ?>">
					</div>

					<div class="spm-field">
						<label for="spm-name">Name</label>
						<input type="text" id="spm-name" value="<?php echo esc_attr( $profile['name'] ?? '' ); ?>" placeholder="Your Name">
					</div>

					<div class="spm-field">
						<label for="spm-subtitle">Subtitle / Title</label>
						<input type="text" id="spm-subtitle" value="<?php echo esc_attr( wp_strip_all_tags( $profile['subtitle'] ?? '' ) ); ?>" placeholder="DJ / Producer / Curator">
					</div>

					<div class="spm-field">
						<label for="spm-bio">Bio (optional secondary line)</label>
						<input type="text" id="spm-bio" value="<?php echo esc_attr( wp_strip_all_tags( $profile['bio'] ?? '' ) ); ?>" placeholder="@ginja.life founder">
					</div>

					<div class="spm-field">
						<label for="spm-location">Location</label>
						<input type="text" id="spm-location" value="<?php echo esc_attr( $profile['location'] ?? '' ); ?>" placeholder="New York">
					</div>

					<hr class="spm-divider">
					<h3 class="spm-subheading">Email Collection Button</h3>

					<div class="spm-field">
						<label for="spm-cta-text">Button Label</label>
						<input type="text" id="spm-cta-text" value="<?php echo esc_attr( $profile['cta_text'] ?? 'Join + Friends' ); ?>" placeholder="Join + Friends">
					</div>

					<div class="spm-field">
						<label for="spm-modal-subtitle">Modal Subtitle Text</label>
						<input type="text" id="spm-modal-subtitle" value="<?php echo esc_attr( $profile['modal_subtitle'] ?? 'Sign up for exclusive access to new mixes, events + more' ); ?>">
					</div>

					<div class="spm-field">
						<label for="spm-modal-btn-text">Modal Button Text</label>
						<input type="text" id="spm-modal-btn-text" value="<?php echo esc_attr( $profile['modal_btn_text'] ?? 'Sign Up' ); ?>">
					</div>

				</section>

				<!-- COLORS -->
				<section class="spm-section" id="spm-section-colors">
					<?php
					$color_fields = [
						'bg'       => 'Page Background',
						'accent'   => 'Accent Color (tabs &amp; card buttons)',
						'button'   => 'CTA Button Color',
						'card'     => 'Card Background',
						'text'     => 'Text Color',
						'btn_text' => 'Button Text Color (tabs &amp; card buttons)',
					];
					foreach ( $color_fields as $key => $label ) :
						$val = $colors[ $key ] ?? '#ffffff';
					?>
					<div class="spm-field spm-field--color">
						<label for="spm-color-<?php echo esc_attr( $key ); ?>"><?php echo esc_html( $label ); ?></label>
						<div class="spm-color-row">
							<input type="color" id="spm-color-<?php echo esc_attr( $key ); ?>" class="spm-color-picker" data-key="<?php echo esc_attr( $key ); ?>" value="<?php echo esc_attr( $val ); ?>">
							<input type="text"  class="spm-color-text" data-key="<?php echo esc_attr( $key ); ?>" value="<?php echo esc_attr( $val ); ?>" maxlength="7" placeholder="#000000">
						</div>
					</div>
					<?php endforeach; ?>
					<button class="spm-btn spm-btn--ghost spm-btn--sm" id="spm-reset-colors">Reset to Defaults</button>
				</section>

				<!-- SOCIALS -->
				<section class="spm-section" id="spm-section-socials">
					<?php foreach ( $platforms as $key => $label ) : ?>
					<div class="spm-field">
						<label for="spm-social-<?php echo esc_attr( $key ); ?>"><?php echo esc_html( $label ); ?></label>
						<input type="url" id="spm-social-<?php echo esc_attr( $key ); ?>" class="spm-social-input" data-social="<?php echo esc_attr( $key ); ?>" value="<?php echo esc_attr( $socials[ $key ] ?? '' ); ?>" placeholder="https://…">
					</div>
					<?php endforeach; ?>

					<hr class="spm-divider">
					<h3 class="spm-subheading">Custom Links</h3>
					<div id="spm-custom-links">
						<?php if ( ! empty( $profile['custom_links'] ) ) : ?>
							<?php foreach ( $profile['custom_links'] as $i => $link ) : ?>
								<div class="spm-custom-link-row" data-index="<?php echo (int) $i; ?>">
									<input type="text" class="spm-cl-label" placeholder="Label" value="<?php echo esc_attr( $link['label'] ?? '' ); ?>">
									<input type="url"  class="spm-cl-url"   placeholder="https://…" value="<?php echo esc_attr( $link['url'] ?? '' ); ?>">
									<button class="spm-btn spm-btn--icon spm-btn--ghost spm-remove-custom-link" title="Remove">✕</button>
								</div>
							<?php endforeach; ?>
						<?php endif; ?>
					</div>
					<button class="spm-btn spm-btn--sm" id="spm-add-custom-link">+ Add Custom Link</button>
				</section>

			</div><!-- .spm-panel -->

			<!-- Live Preview -->
			<div class="spm-preview" id="spm-preview">
				<div class="spm-preview__toolbar">
					<span>Live Preview</span>
					<div class="spm-preview__device-btns">
						<button class="spm-device-btn is-active" data-device="desktop" title="Desktop">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
						</button>
						<button class="spm-device-btn" data-device="mobile" title="Mobile">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>
						</button>
					</div>
				</div>
				<div class="spm-preview__frame-wrap" id="spm-frame-wrap">
					<iframe id="spm-preview-frame" src="" title="Live preview" scrolling="yes"></iframe>
				</div>
			</div>

		</div><!-- .spm-layout -->

		<div class="spm-toast" id="spm-toast" aria-live="polite"></div>
	</div>
	<?php
}

// ---------------------------------------------------------------------------
// Tabs & Cards page
// ---------------------------------------------------------------------------
function spm_render_tabs_page() {
	?>
	<div class="spm-wrap" id="spm-wrap">
		<div class="spm-header">
			<h1>Tabs &amp; Cards</h1>
			<div style="display:flex;align-items:center;gap:10px;">
				<button class="spm-theme-toggle" id="spm-theme-toggle" title="Toggle dark/light mode" aria-label="Toggle dark mode"><svg id="spm-theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></button>
				<button class="spm-save-btn" id="spm-save-btn">
					<span id="spm-save-label">Save Changes</span>
				</button>
			</div>
		</div>

		<div class="spm-tabs-editor">

			<!-- Left: tab list -->
			<div class="spm-tabs-sidebar">
				<div class="spm-tabs-sidebar__inner" id="spm-tabs-list"></div>
				<button class="spm-btn spm-btn--sm" id="spm-add-tab" style="margin-top:10px;width:100%">+ Add Tab</button>
			</div>

			<!-- Right: selected tab's cards -->
			<div class="spm-tabs-content" id="spm-tabs-content">
				<div class="spm-tabs-placeholder" id="spm-tabs-placeholder">
					<p>← Select a tab on the left to edit its cards</p>
				</div>
			</div>

		</div>

		<div class="spm-toast" id="spm-toast" aria-live="polite"></div>
	</div>
	<?php
}

// ---------------------------------------------------------------------------
// Subscribers page
// ---------------------------------------------------------------------------
function spm_render_subscribers_page() {
	global $wpdb;
	$table = $wpdb->prefix . 'sp_subscribers';

	$total  = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table}" );
	$rows   = $wpdb->get_results( "SELECT * FROM {$table} ORDER BY id DESC LIMIT 500", ARRAY_A );
	$export = wp_nonce_url( admin_url( 'admin.php?page=social-profile-subscribers&spm_export_csv=1' ), 'spm_export_csv' );
	?>
	<div class="spm-wrap spm-subscribers-page">
		<div class="spm-header">
			<h1>Subscribers <span class="spm-count-badge"><?php echo number_format( $total ); ?></span></h1>
			<div style="display:flex;align-items:center;gap:10px;">
				<button class="spm-theme-toggle" id="spm-theme-toggle" title="Toggle dark/light mode" aria-label="Toggle dark mode"><svg id="spm-theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></button>
				<a href="<?php echo esc_url( $export ); ?>" class="spm-btn spm-btn--sm spm-btn--ghost">⬇ Export CSV</a>
			</div>
		</div>

		<?php if ( empty( $rows ) ) : ?>
			<div class="spm-empty-state">
				<p>No subscribers yet. Share your profile link to start collecting signups.</p>
			</div>
		<?php else : ?>
			<div class="spm-subscribers-table-wrap">
				<table class="spm-table" id="spm-sub-table">
					<thead>
						<tr>
							<th>#</th>
							<th>Email</th>
							<th>Phone</th>
							<th>IP</th>
							<th>Signed Up</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						<?php foreach ( $rows as $row ) : ?>
						<tr id="spm-row-<?php echo (int) $row['id']; ?>">
							<td><?php echo (int) $row['id']; ?></td>
							<td class="spm-cell-email">
								<span class="spm-cell-view"><?php echo esc_html( $row['email'] ); ?></span>
								<input class="spm-cell-edit spm-edit-email" type="email" value="<?php echo esc_attr( $row['email'] ); ?>" style="display:none">
							</td>
							<td class="spm-cell-phone">
								<span class="spm-cell-view"><?php echo esc_html( $row['phone'] ?: '—' ); ?></span>
								<input class="spm-cell-edit spm-edit-phone" type="text" value="<?php echo esc_attr( $row['phone'] ); ?>" style="display:none">
							</td>
							<td class="spm-muted"><?php echo esc_html( $row['ip_address'] ?: '—' ); ?></td>
							<td class="spm-muted"><?php echo esc_html( date_i18n( 'M j, Y g:i a', strtotime( $row['created_at'] ) ) ); ?></td>
							<td class="spm-cell-actions">
								<button class="spm-btn spm-btn--xs spm-sub-edit" data-id="<?php echo (int) $row['id']; ?>" title="Edit">Edit</button>
								<button class="spm-btn spm-btn--xs spm-btn--success spm-sub-save" data-id="<?php echo (int) $row['id']; ?>" title="Save" style="display:none">Save</button>
								<button class="spm-btn spm-btn--xs spm-btn--ghost spm-sub-cancel" data-id="<?php echo (int) $row['id']; ?>" title="Cancel" style="display:none">Cancel</button>
								<button class="spm-btn spm-btn--xs spm-btn--danger spm-sub-delete" data-id="<?php echo (int) $row['id']; ?>" title="Delete">Delete</button>
							</td>
						</tr>
						<?php endforeach; ?>
					</tbody>
				</table>
			</div>

			<script>
			(function () {
				var nonce = '<?php echo esc_js( wp_create_nonce( 'spm_subscriber_action' ) ); ?>';
				var ajax  = '<?php echo esc_js( admin_url( 'admin-ajax.php' ) ); ?>';

				document.getElementById('spm-sub-table').addEventListener('click', function (e) {
					var btn = e.target.closest('button');
					if (!btn) return;
					var id  = btn.dataset.id;
					var row = document.getElementById('spm-row-' + id);

					if (btn.classList.contains('spm-sub-edit')) {
						row.querySelectorAll('.spm-cell-view').forEach(function (el) { el.style.display = 'none'; });
						row.querySelectorAll('.spm-cell-edit').forEach(function (el) { el.style.display = ''; });
						row.querySelector('.spm-sub-edit').style.display   = 'none';
						row.querySelector('.spm-sub-save').style.display   = '';
						row.querySelector('.spm-sub-cancel').style.display = '';
						row.querySelector('.spm-sub-delete').style.display = 'none';
					}

					if (btn.classList.contains('spm-sub-cancel')) {
						row.querySelectorAll('.spm-cell-view').forEach(function (el) { el.style.display = ''; });
						row.querySelectorAll('.spm-cell-edit').forEach(function (el) { el.style.display = 'none'; });
						row.querySelector('.spm-sub-edit').style.display   = '';
						row.querySelector('.spm-sub-save').style.display   = 'none';
						row.querySelector('.spm-sub-cancel').style.display = 'none';
						row.querySelector('.spm-sub-delete').style.display = '';
					}

					if (btn.classList.contains('spm-sub-save')) {
						var email = row.querySelector('.spm-edit-email').value.trim();
						var phone = row.querySelector('.spm-edit-phone').value.trim();
						var body  = new FormData();
						body.append('action', 'spm_update_subscriber');
						body.append('nonce',  nonce);
						body.append('id',     id);
						body.append('email',  email);
						body.append('phone',  phone);
						btn.textContent = 'Saving…';
						fetch(ajax, { method: 'POST', body: body, credentials: 'same-origin' })
							.then(function (r) { return r.json(); })
							.then(function (res) {
								if (res.success) {
									row.querySelector('.spm-cell-email .spm-cell-view').textContent = email;
									row.querySelector('.spm-cell-phone .spm-cell-view').textContent = phone || '—';
									row.querySelector('.spm-sub-cancel').click();
								} else {
									alert(res.data && res.data.message ? res.data.message : 'Save failed.');
								}
								btn.textContent = 'Save';
							});
					}

					if (btn.classList.contains('spm-sub-delete')) {
						if (!confirm('Delete this subscriber? This cannot be undone.')) return;
						var body = new FormData();
						body.append('action', 'spm_delete_subscriber');
						body.append('nonce',  nonce);
						body.append('id',     id);
						fetch(ajax, { method: 'POST', body: body, credentials: 'same-origin' })
							.then(function (r) { return r.json(); })
							.then(function (res) {
								if (res.success) {
									row.remove();
									var badge = document.querySelector('.spm-count-badge');
									if (badge) badge.textContent = Math.max(0, parseInt(badge.textContent.replace(/,/g,''), 10) - 1).toLocaleString();
								} else {
									alert(res.data && res.data.message ? res.data.message : 'Delete failed.');
								}
							});
					}
				});
			})();
			</script>
		<?php endif; ?>
	</div>
	<?php
}
