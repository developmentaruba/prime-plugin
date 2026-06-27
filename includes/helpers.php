<?php
defined( 'ABSPATH' ) || exit;

/**
 * All supported social platforms.
 */
function spm_social_platforms(): array {
	return [
		'instagram'  => 'Instagram',
		'tiktok'     => 'TikTok',
		'youtube'    => 'YouTube',
		'soundcloud' => 'SoundCloud',
		'facebook'   => 'Facebook',
		'whatsapp'   => 'WhatsApp',
		'telegram'   => 'Telegram',
		'patreon'    => 'Patreon',
		'twitter'    => 'X / Twitter',
		'spotify'    => 'Spotify',
		'apple'      => 'Apple Music',
		'twitch'     => 'Twitch',
	];
}

/**
 * Sanitize the full profile options array.
 */
function spm_sanitize_profile( array $raw ): array {
	$clean = [];

	$clean['avatar']          = isset( $raw['avatar'] )          ? esc_url_raw( $raw['avatar'] )                : '';
	$clean['name']            = isset( $raw['name'] )            ? sanitize_text_field( $raw['name'] )          : '';
	$clean['subtitle']        = isset( $raw['subtitle'] )        ? wp_kses_post( $raw['subtitle'] )             : '';
	$clean['bio']             = isset( $raw['bio'] )             ? wp_kses_post( $raw['bio'] )                  : '';
	$clean['location']        = isset( $raw['location'] )        ? sanitize_text_field( $raw['location'] )      : '';
	$clean['cta_text']        = isset( $raw['cta_text'] )        ? sanitize_text_field( $raw['cta_text'] )      : '';
	$clean['modal_subtitle']  = isset( $raw['modal_subtitle'] )  ? sanitize_text_field( $raw['modal_subtitle'] ): '';
	$clean['modal_btn_text']  = isset( $raw['modal_btn_text'] )  ? sanitize_text_field( $raw['modal_btn_text'] ): '';

	// Colors
	$color_keys = [ 'bg', 'accent', 'button', 'card', 'text', 'btn_text' ];
	$clean['colors'] = [];
	foreach ( $color_keys as $k ) {
		$clean['colors'][ $k ] = isset( $raw['colors'][ $k ] )
			? sanitize_hex_color( $raw['colors'][ $k ] )
			: '';
	}

	// Socials
	$clean['socials'] = [];
	foreach ( array_keys( spm_social_platforms() ) as $k ) {
		$clean['socials'][ $k ] = isset( $raw['socials'][ $k ] )
			? esc_url_raw( $raw['socials'][ $k ] )
			: '';
	}

	// Custom links
	$clean['custom_links'] = [];
	if ( ! empty( $raw['custom_links'] ) && is_array( $raw['custom_links'] ) ) {
		foreach ( $raw['custom_links'] as $link ) {
			$clean['custom_links'][] = [
				'label'    => sanitize_text_field( $link['label']    ?? '' ),
				'url'      => esc_url_raw( $link['url']              ?? '' ),
				'icon_url' => esc_url_raw( $link['icon_url']         ?? '' ),
			];
		}
	}

	return $clean;
}

/**
 * Sanitize the tabs options array.
 */
function spm_sanitize_tabs( array $raw ): array {
	$clean = [];
	$allowed_card_types = [ 'event', 'media' ];

	foreach ( $raw as $tab ) {
		$tab_clean = [
			'id'        => sanitize_key( $tab['id']   ?? wp_generate_uuid4() ),
			'name'      => sanitize_text_field( $tab['name']  ?? 'Tab' ),
			'slug'      => sanitize_title( $tab['slug']       ?? $tab['name'] ?? 'tab' ),
			'card_type' => in_array( $tab['card_type'] ?? '', $allowed_card_types, true )
							? $tab['card_type'] : 'media',
			'items'     => [],
		];

		if ( ! empty( $tab['items'] ) && is_array( $tab['items'] ) ) {
			foreach ( $tab['items'] as $item ) {
				$tab_clean['items'][] = spm_sanitize_card_item( $item, $tab_clean['card_type'] );
			}
		}

		$clean[] = $tab_clean;
	}

	return $clean;
}

function spm_sanitize_card_item( array $item, string $card_type ): array {
	$clean = [
		'image'    => esc_url_raw( $item['image']    ?? '' ),
		'title'    => sanitize_text_field( $item['title']    ?? '' ),
		'btn_text' => sanitize_text_field( $item['btn_text'] ?? '' ),
		'btn_url'  => esc_url_raw( $item['btn_url']          ?? '' ),
	];

	if ( $card_type === 'event' ) {
		$clean['city']  = sanitize_text_field( $item['city']  ?? '' );
		$clean['date']  = sanitize_text_field( $item['date']  ?? '' );
		$clean['venue'] = sanitize_text_field( $item['venue'] ?? '' );
	} else {
		$clean['subtitle']    = wp_kses_post( $item['subtitle']    ?? '' );
		$clean['youtube_url'] = esc_url_raw( $item['youtube_url'] ?? '' );
	}

	return $clean;
}
