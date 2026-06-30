/* Social Profile Manager — admin.js  v1.1 */
/* global spmData, wp */
(function () {
	'use strict';

	var D        = window.spmData || {};
	var profile  = D.profile  || {};
	var tabs     = D.tabs     || [];
	var frame    = null;
	var frameReady = false;

	var DEFAULT_COLORS = {
		bg:       '#0d0d0d',
		accent:   '#a3e635',
		button:   '#a3e635',
		card:     '#1a1a1a',
		text:     '#f0f0f0',
		btn_text: '#0d0d0d',
	};

	// -----------------------------------------------------------------------
	// Boot
	// -----------------------------------------------------------------------
	var isTabsPage = document.body.classList.contains('social-profile_page_social-profile-tabs');

	document.addEventListener('DOMContentLoaded', function () {
		initThemeToggle();
		if (!isTabsPage) {
			initSectionNav();
			initAvatarUpload();
			initColorPickers();
			initSocialInputs();
			initCustomLinks();
			initProfileFieldListeners();
			initPreviewFrame();
			initDeviceSwitcher();
		}
		renderTabsList();
		bindAddTab();
		initSaveButton();
	});

	// -----------------------------------------------------------------------
	// Section Nav
	// -----------------------------------------------------------------------
	function initSectionNav() {
		var btns = document.querySelectorAll('.spm-nav__btn');
		btns.forEach(function (btn) {
			btn.addEventListener('click', function () {
				btns.forEach(function (b) { b.classList.remove('is-active'); });
				btn.classList.add('is-active');
				document.querySelectorAll('.spm-section').forEach(function (s) { s.classList.remove('is-active'); });
				var t = document.getElementById('spm-section-' + btn.dataset.section);
				if (t) t.classList.add('is-active');
			});
		});
	}

	// -----------------------------------------------------------------------
	// Avatar
	// -----------------------------------------------------------------------
	function initAvatarUpload() {
		var uploadBtn = document.getElementById('spm-avatar-upload');
		var removeBtn = document.getElementById('spm-avatar-remove');
		var input     = document.getElementById('spm-avatar');
		var preview   = document.getElementById('spm-avatar-preview');
		var mf        = null;

		if (!uploadBtn) return;

		uploadBtn.addEventListener('click', function (e) {
			e.preventDefault();
			if (mf) { mf.open(); return; }
			mf = wp.media({ title: 'Select Avatar', button: { text: 'Use this image' }, multiple: false, library: { type: 'image' } });
			mf.on('select', function () {
				var url = mf.state().get('selection').first().toJSON().url;
				input.value = url;
				profile.avatar = url;
				preview.innerHTML = '<img src="' + esc(url) + '" alt="">';
				push();
			});
			mf.open();
		});

		removeBtn && removeBtn.addEventListener('click', function (e) {
			e.preventDefault();
			input.value = profile.avatar = '';
			preview.innerHTML = '<span>No image</span>';
			push();
		});
	}

	// -----------------------------------------------------------------------
	// Color Pickers
	// -----------------------------------------------------------------------
	function initColorPickers() {
		document.querySelectorAll('.spm-color-picker').forEach(function (picker) {
			var key  = picker.dataset.key;
			var text = document.querySelector('.spm-color-text[data-key="' + key + '"]');

			picker.addEventListener('input', function () {
				sync(key, picker.value, text);
			});
			text && text.addEventListener('input', function () {
				if (/^#[0-9a-fA-F]{6}$/.test(text.value.trim())) {
					picker.value = text.value.trim();
					sync(key, text.value.trim(), null);
				}
			});
		});

		var rb = document.getElementById('spm-reset-colors');
		rb && rb.addEventListener('click', function () {
			Object.keys(DEFAULT_COLORS).forEach(function (k) {
				var v  = DEFAULT_COLORS[k];
				var pc = document.querySelector('.spm-color-picker[data-key="' + k + '"]');
				var tc = document.querySelector('.spm-color-text[data-key="' + k + '"]');
				if (pc) pc.value = v;
				if (tc) tc.value = v;
				sync(k, v, null);
			});
		});

		function sync(key, val, textEl) {
			if (!profile.colors) profile.colors = {};
			profile.colors[key] = val;
			if (textEl) textEl.value = val;
			push();
		}
	}

	// -----------------------------------------------------------------------
	// Social Inputs
	// -----------------------------------------------------------------------
	function initSocialInputs() {
		document.querySelectorAll('.spm-social-input').forEach(function (inp) {
			inp.addEventListener('input', function () {
				if (!profile.socials) profile.socials = {};
				profile.socials[inp.dataset.social] = inp.value.trim();
				push();
			});
		});
	}

	// -----------------------------------------------------------------------
	// Custom Links
	// -----------------------------------------------------------------------
	function initCustomLinks() {
		var container = document.getElementById('spm-custom-links');
		var addBtn    = document.getElementById('spm-add-custom-link');
		if (!container || !addBtn) return;

		bindCustomRows();

		addBtn.addEventListener('click', function () {
			if (!profile.custom_links) profile.custom_links = [];
			var idx = profile.custom_links.length;
			profile.custom_links.push({ label: '', url: '', icon_url: '' });
			container.appendChild(buildCustomRow(idx, '', ''));
			bindCustomRows();
		});
	}

	function buildCustomRow(idx, label, url) {
		var d = document.createElement('div');
		d.className = 'spm-custom-link-row';
		d.dataset.index = idx;
		d.innerHTML = '<input type="text" class="spm-cl-label" placeholder="Label" value="' + esc(label) + '">'
			+ '<input type="url" class="spm-cl-url" placeholder="https://…" value="' + esc(url) + '">'
			+ '<button class="spm-btn spm-btn--icon spm-btn--ghost spm-remove-custom-link" title="Remove">✕</button>';
		return d;
	}

	function bindCustomRows() {
		document.querySelectorAll('.spm-custom-link-row').forEach(function (row) {
			var idx = parseInt(row.dataset.index, 10);
			var lbl = row.querySelector('.spm-cl-label');
			var url = row.querySelector('.spm-cl-url');
			var del = row.querySelector('.spm-remove-custom-link');

			lbl && lbl.addEventListener('input', function () { ensure(idx); profile.custom_links[idx].label = lbl.value; push(); });
			url && url.addEventListener('input', function () { ensure(idx); profile.custom_links[idx].url   = url.value; push(); });
			del && del.addEventListener('click', function () {
				if (!profile.custom_links) return;
				profile.custom_links.splice(idx, 1);
				row.parentNode.removeChild(row);
				push();
			});
		});
	}

	function ensure(idx) {
		if (!profile.custom_links) profile.custom_links = [];
		while (profile.custom_links.length <= idx) profile.custom_links.push({ label: '', url: '', icon_url: '' });
	}

	// -----------------------------------------------------------------------
	// Profile Field Listeners
	// -----------------------------------------------------------------------
	function initProfileFieldListeners() {
		var map = {
			'spm-name':           'name',
			'spm-subtitle':       'subtitle',
			'spm-bio':            'bio',
			'spm-location':       'location',
			'spm-cta-text':       'cta_text',
			'spm-modal-subtitle': 'modal_subtitle',
			'spm-modal-btn-text': 'modal_btn_text',
		};
		Object.keys(map).forEach(function (id) {
			var el = document.getElementById(id);
			if (!el) return;
			el.addEventListener('input', function () {
				profile[map[id]] = el.value;
				push();
			});
		});
	}

	// -----------------------------------------------------------------------
	// Tabs Editor — two-column layout
	// -----------------------------------------------------------------------
	var activeTabIndex = -1;
	var editingCard    = null; // { ti, ii } | null

	function renderTabsList() {
		var list = document.getElementById('spm-tabs-list');
		if (!list) return;
		list.innerHTML = '';

		tabs.forEach(function (tab, ti) {
			var item = document.createElement('div');
			item.className = 'spm-tl-item' + (ti === activeTabIndex ? ' is-active' : '');
			item.dataset.ti = ti;

			var info = document.createElement('div');
			info.className = 'spm-tl-item__info';

			var name = document.createElement('span');
			name.className = 'spm-tl-item__name';
			name.textContent = tab.name || 'Untitled';

			var meta = document.createElement('span');
			meta.className = 'spm-tl-item__meta';
			meta.textContent = (tab.card_type === 'event' ? 'Shows' : 'Media') + ' · ' + (tab.items || []).length + ' items';

			info.appendChild(name);
			info.appendChild(meta);

			var del = document.createElement('button');
			del.type = 'button';
			del.className = 'spm-tl-item__del';
			del.title = 'Delete tab';
			del.innerHTML = '&#x2715;';
			del.addEventListener('click', function (e) {
				e.stopPropagation();
				if (!confirm('Delete "' + (tab.name || 'this tab') + '" and all its items?')) return;
				tabs.splice(ti, 1);
				if (activeTabIndex === ti) activeTabIndex = -1;
				else if (activeTabIndex > ti) activeTabIndex--;
				renderTabsList();
				renderTabContent();
				push();
			});

			item.appendChild(info);
			item.appendChild(del);

			item.addEventListener('click', function () {
				activeTabIndex = ti;
				editingCard = null;
				renderTabsList();
				renderTabContent();
			});

			list.appendChild(item);
		});
	}

	function renderTabContent() {
		var content = document.getElementById('spm-tabs-content');
		var placeholder = document.getElementById('spm-tabs-placeholder');
		if (!content) return;

		// Clear previous content panel (keep placeholder)
		content.querySelectorAll('.spm-tc-panel').forEach(function (el) { el.remove(); });

		if (activeTabIndex < 0 || activeTabIndex >= tabs.length) {
			if (placeholder) placeholder.style.display = '';
			return;
		}
		if (placeholder) placeholder.style.display = 'none';

		var ti  = activeTabIndex;
		var tab = tabs[ti];

		var panel = document.createElement('div');
		panel.className = 'spm-tc-panel';

		// — Tab settings row —
		var settings = document.createElement('div');
		settings.className = 'spm-tc-settings';

		var nameInp = document.createElement('input');
		nameInp.type = 'text';
		nameInp.className = 'spm-tc-name-inp';
		nameInp.value = tab.name;
		nameInp.placeholder = 'Tab name';
		nameInp.addEventListener('input', function () {
			tabs[ti].name = nameInp.value;
			tabs[ti].slug = slugify(nameInp.value);
			// update sidebar label live
			var sideItem = document.querySelector('.spm-tl-item[data-ti="' + ti + '"] .spm-tl-item__name');
			if (sideItem) sideItem.textContent = nameInp.value || 'Untitled';
			push();
		});

		var typeLabel = document.createElement('label');
		typeLabel.className = 'spm-tc-type-label';
		typeLabel.textContent = 'Type:';

		var typeSelect = document.createElement('select');
		typeSelect.className = 'spm-tc-type-select';
		['event', 'media'].forEach(function (v) {
			var o = document.createElement('option');
			o.value = v;
			o.textContent = v === 'event' ? 'Shows' : 'Media';
			if (tab.card_type === v) o.selected = true;
			typeSelect.appendChild(o);
		});
		typeSelect.addEventListener('change', function () {
			tabs[ti].card_type = typeSelect.value;
			var sideItem = document.querySelector('.spm-tl-item[data-ti="' + ti + '"] .spm-tl-item__meta');
			if (sideItem) sideItem.textContent = (typeSelect.value === 'event' ? 'Shows' : 'Media') + ' · ' + (tabs[ti].items || []).length + ' items';
			renderCards(cardsList, ti);
			push();
		});

		settings.appendChild(nameInp);
		settings.appendChild(typeLabel);
		settings.appendChild(typeSelect);
		panel.appendChild(settings);

		// — Cards list or edit view —
		if (editingCard && editingCard.ti === ti) {
			panel.appendChild(buildCardEditView(ti, editingCard.ii, tab.card_type));
		} else {
			var cardsList = document.createElement('div');
			cardsList.className = 'spm-tc-cards';
			renderCards(cardsList, ti);
			panel.appendChild(cardsList);

			var addBtn = document.createElement('button');
			addBtn.type = 'button';
			addBtn.className = 'spm-btn spm-btn--sm spm-tc-add-btn';
			addBtn.textContent = '+ Add Item';
			addBtn.addEventListener('click', function () {
				var ct = tabs[ti].card_type;
				var newItem = ct === 'event'
					? { image: '', title: '', city: '', date: '', venue: '', btn_text: 'Get Tickets',
						ticket_options: { location: { enabled: false, items: [] }, payaw: { enabled: false }, rsvp: { enabled: false, whatsapp: '' }, vip: { enabled: false, phone: '' }, link: { enabled: false, url: '', label: '' } } }
					: { media_type: 'youtube', image: '', title: '', subtitle: '', youtube_url: '', soundcloud_url: '', soundcloud_thumb: '', btn_text: '', btn_url: '' };
				if (!tabs[ti].items) tabs[ti].items = [];
				tabs[ti].items.push(newItem);
				editingCard = { ti: ti, ii: tabs[ti].items.length - 1 };
				updateSidebarMeta(ti);
				push();
				renderTabContent();
			});
			panel.appendChild(addBtn);
		}

		content.appendChild(panel);
	}

	function updateSidebarMeta(ti) {
		var sideItem = document.querySelector('.spm-tl-item[data-ti="' + ti + '"] .spm-tl-item__meta');
		if (sideItem) {
			var tab = tabs[ti];
			sideItem.textContent = (tab.card_type === 'event' ? 'Shows' : 'Media') + ' · ' + (tab.items || []).length + ' items';
		}
	}

	function renderCards(container, ti) {
		container.innerHTML = '';
		var tab   = tabs[ti];
		var items = tab.items || [];
		if (items.length === 0) {
			var empty = document.createElement('p');
			empty.className = 'spm-tc-empty';
			empty.textContent = 'No items yet. Click "+ Add Item" to get started.';
			container.appendChild(empty);
			return;
		}
		items.forEach(function (item, ii) {
			container.appendChild(buildCardSummary(ti, ii, item, tab.card_type, container));
		});
	}

	function buildCardSummary(ti, ii, item, ct, container) {
		var card = document.createElement('div');
		card.className = 'spm-tc-summary';

		// Thumb / icon
		var thumbWrap = document.createElement('div');
		thumbWrap.className = 'spm-tc-summary__thumb';
		if (item.image) {
			thumbWrap.innerHTML = '<img src="' + esc(item.image) + '" alt="">';
		} else {
			thumbWrap.innerHTML = ct === 'event' ? '🎤' : '▶';
			thumbWrap.classList.add('spm-tc-summary__thumb--icon');
		}
		card.appendChild(thumbWrap);

		// Info
		var info = document.createElement('div');
		info.className = 'spm-tc-summary__info';
		var title = document.createElement('span');
		title.className = 'spm-tc-summary__title';
		title.textContent = item.title || '(Untitled)';
		var meta = document.createElement('span');
		meta.className = 'spm-tc-summary__meta';
		if (ct === 'event') {
			meta.textContent = [item.date, item.city].filter(Boolean).join(' · ') || 'No date set';
		} else {
			meta.textContent = (item.media_type === 'youtube' ? 'YouTube' : 'Custom') + (item.subtitle ? ' · ' + item.subtitle : '');
		}
		info.appendChild(title);
		info.appendChild(meta);
		card.appendChild(info);

		// Actions
		var actions = document.createElement('div');
		actions.className = 'spm-tc-summary__actions';

		var editBtn = document.createElement('button');
		editBtn.type = 'button';
		editBtn.className = 'spm-btn spm-btn--sm spm-btn--ghost';
		editBtn.textContent = 'Edit';
		editBtn.addEventListener('click', function () {
			editingCard = { ti: ti, ii: ii };
			renderTabContent();
		});

		var delBtn = document.createElement('button');
		delBtn.type = 'button';
		delBtn.className = 'spm-btn spm-btn--sm spm-btn--danger';
		delBtn.title = 'Delete';
		delBtn.innerHTML = '&#x2715;';
		delBtn.addEventListener('click', function () {
			if (!confirm('Remove this item?')) return;
			tabs[ti].items.splice(ii, 1);
			if (editingCard && editingCard.ti === ti) editingCard = null;
			updateSidebarMeta(ti);
			push();
			renderTabContent();
		});

		actions.appendChild(editBtn);
		actions.appendChild(delBtn);
		card.appendChild(actions);
		return card;
	}

	function buildCardEditView(ti, ii, ct) {
		var wrap = document.createElement('div');
		wrap.className = 'spm-card-edit-view';

		var hdr = document.createElement('div');
		hdr.className = 'spm-card-edit-view__header';

		var backBtn = document.createElement('button');
		backBtn.type = 'button';
		backBtn.className = 'spm-back-btn';
		backBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg> Back to list';
		backBtn.addEventListener('click', function () {
			editingCard = null;
			renderTabContent();
		});

		var hdrTitle = document.createElement('span');
		hdrTitle.className = 'spm-card-edit-view__title';
		hdrTitle.textContent = ct === 'event' ? 'Edit Show' : 'Edit Item';

		hdr.appendChild(backBtn);
		hdr.appendChild(hdrTitle);
		wrap.appendChild(hdr);

		var form = buildCardRow(ti, ii, tabs[ti].items[ii], ct);
		wrap.appendChild(form);
		return wrap;
	}

	function buildCardRow(ti, ii, item, ct) {
		var card = document.createElement('div');
		card.className = 'spm-tc-card';

		// Fields
		var fields = document.createElement('div');
		fields.className = 'spm-tc-card__fields';

		if (ct === 'event') {
			// Thumbnail for events
			var thumb = document.createElement('div');
			thumb.className = 'spm-tc-card__thumb';
			thumb.innerHTML = item.image ? '<img src="' + esc(item.image) + '" alt="">' : '<span>+ Image</span>';
			var mf = null;
			thumb.addEventListener('click', function () {
				if (mf) { mf.open(); return; }
				mf = wp.media({ title: 'Select Image', button: { text: 'Use this image' }, multiple: false, library: { type: 'image' } });
				mf.on('select', function () {
					var url = mf.state().get('selection').first().toJSON().url;
					tabs[ti].items[ii].image = url;
					thumb.innerHTML = '<img src="' + esc(url) + '" alt="">';
					push();
				});
				mf.open();
			});
			card.appendChild(thumb);

			var r1 = makeRow([
				makeField('Title',         'text', item.title  || '', function(v){ tabs[ti].items[ii].title = v; }),
				makeField('City/Location', 'text', item.city   || '', function(v){ tabs[ti].items[ii].city  = v; }),
			]);
			var r2 = makeRow([
				makeField('Date',          'date', item.date   || '', function(v){ tabs[ti].items[ii].date  = v; }),
				makeField('Venue/Details', 'text', item.venue  || '', function(v){ tabs[ti].items[ii].venue = v; }),
			]);
			var r3 = makeRow([
				makeField('Button Label', 'text', item.btn_text || 'Get Tickets', function(v){ tabs[ti].items[ii].btn_text = v; }),
			]);
			fields.appendChild(r1);
			fields.appendChild(r2);
			fields.appendChild(r3);

			// Ticket Options section
			var toSection = document.createElement('div');
			toSection.className = 'spm-ticket-options';
			var toTitle = document.createElement('p');
			toTitle.className = 'spm-ticket-options__title';
			toTitle.textContent = 'Ticket Options';
			toSection.appendChild(toTitle);

			var to = item.ticket_options || {};

			function makeTicketOption(key, label, extraFields) {
				var enabled = !!(to[key] && to[key].enabled);
				var wrap = document.createElement('div');
				wrap.className = 'spm-to-row';

				var header = document.createElement('div');
				header.className = 'spm-to-row__header';

				var toggle = document.createElement('label');
				toggle.className = 'spm-to-toggle';
				var chk = document.createElement('input');
				chk.type = 'checkbox';
				chk.checked = enabled;
				var slider = document.createElement('span');
				slider.className = 'spm-to-slider';
				toggle.appendChild(chk);
				toggle.appendChild(slider);

				var lbl = document.createElement('span');
				lbl.className = 'spm-to-label';
				lbl.textContent = label;

				header.appendChild(toggle);
				header.appendChild(lbl);
				wrap.appendChild(header);

				var body = document.createElement('div');
				body.className = 'spm-to-body';
				body.style.display = enabled ? '' : 'none';
				extraFields.forEach(function(f) { body.appendChild(f); });
				wrap.appendChild(body);

				if (!tabs[ti].items[ii].ticket_options) tabs[ti].items[ii].ticket_options = {};
				if (!tabs[ti].items[ii].ticket_options[key]) tabs[ti].items[ii].ticket_options[key] = {};

				chk.addEventListener('change', function() {
					tabs[ti].items[ii].ticket_options[key].enabled = chk.checked;
					body.style.display = chk.checked ? '' : 'none';
					push();
				});

				return wrap;
			}

			if (!tabs[ti].items[ii].ticket_options) tabs[ti].items[ii].ticket_options = {};
			var tkOpts = tabs[ti].items[ii].ticket_options;

			// Physical Locations (multiple)
			if (!tkOpts.location) tkOpts.location = { enabled: false, items: [] };
			if (!Array.isArray(tkOpts.location.items)) {
				// Migrate old single-location format
				var old = tkOpts.location;
				tkOpts.location = { enabled: !!old.enabled, items: (old.place_name || old.address) ? [{ place_name: old.place_name || '', address: old.address || '', maps_url: old.maps_url || '' }] : [] };
			}

			function buildLocationItems(container) {
				container.innerHTML = '';
				(tkOpts.location.items || []).forEach(function(loc, li) {
					var row = document.createElement('div');
					row.className = 'spm-loc-item';

					var removeBtn = document.createElement('button');
					removeBtn.type = 'button';
					removeBtn.className = 'spm-loc-item__remove';
					removeBtn.innerHTML = '&#x2715;';
					removeBtn.title = 'Remove';
					removeBtn.addEventListener('click', function() {
						tkOpts.location.items.splice(li, 1);
						buildLocationItems(container);
						push();
					});

					var pn = makeField('Place Name', 'text', loc.place_name || '', function(v){ tkOpts.location.items[li].place_name = v; push(); });
					var ad = makeField('Address', 'text', loc.address || '', function(v){ tkOpts.location.items[li].address = v; push(); });
					var mu = makeField('Google Maps Link (optional)', 'url', loc.maps_url || '', function(v){ tkOpts.location.items[li].maps_url = v; push(); });

					row.appendChild(removeBtn);
					row.appendChild(pn);
					row.appendChild(ad);
					row.appendChild(mu);
					container.appendChild(row);
				});

				var addLocBtn = document.createElement('button');
				addLocBtn.type = 'button';
				addLocBtn.className = 'spm-btn spm-btn--xs spm-btn--ghost spm-loc-add-btn';
				addLocBtn.textContent = '+ Add Location';
				addLocBtn.addEventListener('click', function() {
					tkOpts.location.items.push({ place_name: '', address: '', maps_url: '' });
					buildLocationItems(container);
					push();
				});
				container.appendChild(addLocBtn);
			}

			var locItemsWrap = document.createElement('div');
			locItemsWrap.className = 'spm-loc-items';
			buildLocationItems(locItemsWrap);

			toSection.appendChild(makeTicketOption('location', 'Physical Location', [ locItemsWrap ]));

			// Pay.aw
			toSection.appendChild(makeTicketOption('payaw', 'Pay.aw', []));

			// RSVP WhatsApp
			toSection.appendChild(makeTicketOption('rsvp', 'RSVP (WhatsApp)', [
				makeField('WhatsApp Number', 'text', (to.rsvp && to.rsvp.whatsapp) || '', function(v){
					if (!tkOpts.rsvp) tkOpts.rsvp = {};
					tkOpts.rsvp.whatsapp = v; push();
				})
			]));

			// VIP Tables
			toSection.appendChild(makeTicketOption('vip', 'VIP Tables', [
				makeField('Phone Number', 'text', (to.vip && to.vip.phone) || '', function(v){
					if (!tkOpts.vip) tkOpts.vip = {};
					tkOpts.vip.phone = v; push();
				})
			]));

			// Custom Link
			toSection.appendChild(makeTicketOption('link', 'Custom Link', [
				makeField('Label', 'text', (to.link && to.link.label) || '', function(v){
					if (!tkOpts.link) tkOpts.link = {};
					tkOpts.link.label = v; push();
				}),
				makeField('URL', 'url', (to.link && to.link.url) || '', function(v){
					if (!tkOpts.link) tkOpts.link = {};
					tkOpts.link.url = v; push();
				})
			]));

			fields.appendChild(toSection);

		} else {
			// Media card: YouTube | SoundCloud | Custom toggle
			var mediaType = item.media_type || 'youtube';

			var toggleWrap = document.createElement('div');
			toggleWrap.className = 'spm-tc-media-toggle';

			var btnYT = document.createElement('button');
			btnYT.type = 'button';
			btnYT.className = 'spm-tc-toggle-btn' + (mediaType === 'youtube' ? ' is-active' : '');
			btnYT.textContent = 'YouTube';

			var btnSC = document.createElement('button');
			btnSC.type = 'button';
			btnSC.className = 'spm-tc-toggle-btn' + (mediaType === 'soundcloud' ? ' is-active' : '');
			btnSC.textContent = 'SoundCloud';

			var btnCustom = document.createElement('button');
			btnCustom.type = 'button';
			btnCustom.className = 'spm-tc-toggle-btn' + (mediaType === 'custom' ? ' is-active' : '');
			btnCustom.textContent = 'Custom';

			toggleWrap.appendChild(btnYT);
			toggleWrap.appendChild(btnSC);
			toggleWrap.appendChild(btnCustom);
			fields.appendChild(toggleWrap);

			// Title always shown
			fields.appendChild(makeField('Title', 'text', item.title || '', function(v){ tabs[ti].items[ii].title = v; }));

			// YouTube section
			var ytSection = document.createElement('div');
			ytSection.className = 'spm-tc-media-section';
			ytSection.style.display = mediaType === 'youtube' ? '' : 'none';
			ytSection.appendChild(makeField('YouTube URL', 'url', item.youtube_url || '', function(v){ tabs[ti].items[ii].youtube_url = v; }));

			// SoundCloud section
			var scSection = document.createElement('div');
			scSection.className = 'spm-tc-media-section';
			scSection.style.display = mediaType === 'soundcloud' ? '' : 'none';

			var scThumbPreview = document.createElement('div');
			scThumbPreview.className = 'spm-sc-thumb-preview';
			if (item.soundcloud_thumb) {
				scThumbPreview.innerHTML = '<img src="' + esc(item.soundcloud_thumb) + '" alt="">';
				scThumbPreview.style.display = '';
			} else {
				scThumbPreview.style.display = 'none';
			}

			var scStatus = document.createElement('p');
			scStatus.className = 'spm-sc-status';
			scStatus.style.display = 'none';

			var scUrlField = makeField('SoundCloud URL', 'url', item.soundcloud_url || '', function(v){
				tabs[ti].items[ii].soundcloud_url = v;
				if (!v) { scThumbPreview.style.display = 'none'; tabs[ti].items[ii].soundcloud_thumb = ''; push(); return; }
				scStatus.textContent = 'Fetching thumbnail…';
				scStatus.style.display = '';
				var fd = new FormData();
				fd.append('action', 'spm_soundcloud_oembed');
				fd.append('nonce',  D.nonce);
				fd.append('url',    v);
				fetch(D.ajaxUrl + '?action=spm_soundcloud_oembed&nonce=' + encodeURIComponent(D.nonce) + '&url=' + encodeURIComponent(v))
					.then(function(r){ return r.json(); })
					.then(function(res){
						if (!res.success) { scStatus.textContent = 'Could not fetch thumbnail.'; return; }
						var data  = res.data;
						var thumb = data.thumbnail_url || '';
						tabs[ti].items[ii].soundcloud_thumb = thumb;
						if (thumb) {
							scThumbPreview.innerHTML = '<img src="' + esc(thumb) + '" alt="">';
							scThumbPreview.style.display = '';
						} else {
							scThumbPreview.style.display = 'none';
						}
						if (!tabs[ti].items[ii].title && data.title) {
							tabs[ti].items[ii].title = data.title;
							var titleInp = fields.querySelector('.spm-tc-field__input');
							if (titleInp) titleInp.value = data.title;
						}
						scStatus.style.display = 'none';
						push();
					})
					.catch(function(){ scStatus.textContent = 'Could not fetch thumbnail.'; });
			});

			scSection.appendChild(scUrlField);
			scSection.appendChild(scThumbPreview);
			scSection.appendChild(scStatus);

			// Custom section
			var customSection = document.createElement('div');
			customSection.className = 'spm-tc-media-section';
			customSection.style.display = mediaType === 'custom' ? '' : 'none';

			var customThumb = document.createElement('div');
			customThumb.className = 'spm-tc-card__thumb spm-tc-card__thumb--inline';
			customThumb.innerHTML = item.image ? '<img src="' + esc(item.image) + '" alt="">' : '<span>+ Image</span>';
			var mfCustom = null;
			customThumb.addEventListener('click', function () {
				if (mfCustom) { mfCustom.open(); return; }
				mfCustom = wp.media({ title: 'Select Image', button: { text: 'Use this image' }, multiple: false, library: { type: 'image' } });
				mfCustom.on('select', function () {
					var url = mfCustom.state().get('selection').first().toJSON().url;
					tabs[ti].items[ii].image = url;
					customThumb.innerHTML = '<img src="' + esc(url) + '" alt="">';
					push();
				});
				mfCustom.open();
			});
			customSection.appendChild(customThumb);
			customSection.appendChild(makeField('Subtitle', 'text', item.subtitle || '', function(v){ tabs[ti].items[ii].subtitle = v; }));
			customSection.appendChild(makeRow([
				makeField('Button Text', 'text', item.btn_text || '', function(v){ tabs[ti].items[ii].btn_text = v; }),
				makeField('Button URL',  'url',  item.btn_url  || '', function(v){ tabs[ti].items[ii].btn_url  = v; }),
			]));

			fields.appendChild(ytSection);
			fields.appendChild(scSection);
			fields.appendChild(customSection);

			function setMediaType(t) {
				tabs[ti].items[ii].media_type = t;
				btnYT.classList.toggle('is-active', t === 'youtube');
				btnSC.classList.toggle('is-active', t === 'soundcloud');
				btnCustom.classList.toggle('is-active', t === 'custom');
				ytSection.style.display     = t === 'youtube'     ? '' : 'none';
				scSection.style.display     = t === 'soundcloud'  ? '' : 'none';
				customSection.style.display = t === 'custom'      ? '' : 'none';
				push();
			}
			btnYT.addEventListener('click',    function(){ setMediaType('youtube'); });
			btnSC.addEventListener('click',    function(){ setMediaType('soundcloud'); });
			btnCustom.addEventListener('click', function(){ setMediaType('custom'); });
		}

		card.appendChild(fields);
		return card;
	}

	function makeRow(children) {
		var d = document.createElement('div');
		d.className = 'spm-tc-card__row';
		children.forEach(function (c) { d.appendChild(c); });
		return d;
	}

	function makeField(placeholder, type, value, onChange) {
		var wrap = document.createElement('div');
		wrap.className = 'spm-tc-field';
		var lbl = document.createElement('label');
		lbl.className = 'spm-tc-field__label';
		lbl.textContent = placeholder;
		var inp = document.createElement('input');
		inp.type = type;
		inp.value = value;
		inp.placeholder = placeholder;
		inp.className = 'spm-tc-field__input';
		inp.addEventListener('input', function () { onChange(inp.value); push(); });
		wrap.appendChild(lbl);
		wrap.appendChild(inp);
		return wrap;
	}

	function makeInput(placeholder, type, value, onChange) {
		var inp = document.createElement('input');
		inp.type = type;
		inp.value = value;
		inp.placeholder = placeholder;
		inp.addEventListener('input', function () { onChange(inp.value); push(); });
		return inp;
	}

	function bindAddTab() {
		var btn = document.getElementById('spm-add-tab');
		if (!btn) return;
		btn.addEventListener('click', function () {
			var id = 'tab_' + Date.now();
			tabs.push({ id: id, name: 'New Tab', slug: id, card_type: 'media', items: [] });
			activeTabIndex = tabs.length - 1;
			renderTabsList();
			renderTabContent();
			push();
		});
	}

	// -----------------------------------------------------------------------
	// Live Preview
	// -----------------------------------------------------------------------
	function initPreviewFrame() {
		frame = document.getElementById('spm-preview-frame');
		if (!frame) return;

		window.addEventListener('message', function (e) {
			if (e.origin !== window.location.origin) return;
			if (e.data && e.data.type === 'sp_preview_ready') {
				frameReady = true;
				sendPreview();
			}
		});

		setTimeout(function () { frame.src = D.previewUrl || ''; }, 300);
	}

	function push() { if (frameReady) sendPreview(); }

	function sendPreview() {
		if (!frame || !frame.contentWindow) return;
		frame.contentWindow.postMessage({ type: 'sp_preview', profile: profile, tabs: tabs }, window.location.origin);
	}

	function initDeviceSwitcher() {
		var btns = document.querySelectorAll('.spm-device-btn');
		var wrap = document.getElementById('spm-frame-wrap');
		btns.forEach(function (btn) {
			btn.addEventListener('click', function () {
				btns.forEach(function (b) { b.classList.remove('is-active'); });
				btn.classList.add('is-active');
				wrap && wrap.classList.toggle('is-mobile', btn.dataset.device === 'mobile');
			});
		});
	}

	// -----------------------------------------------------------------------
	// Save
	// -----------------------------------------------------------------------
	function initSaveButton() {
		var btn   = document.getElementById('spm-save-btn');
		var label = document.getElementById('spm-save-label');
		if (!btn) return;

		btn.addEventListener('click', function () {
			btn.disabled = true;
			if (label) label.textContent = 'Saving…';

			var fd = new FormData();
			fd.append('action',  'spm_save_settings');
			fd.append('nonce',   D.nonce);
			fd.append('profile', JSON.stringify(profile));
			fd.append('tabs',    JSON.stringify(tabs));

			fetch(D.ajaxUrl, { method: 'POST', body: fd, credentials: 'same-origin' })
				.then(function (r) { return r.json(); })
				.then(function (res) {
					btn.disabled = false;
					if (label) label.textContent = 'Save Changes';
					toast(res.success ? 'Settings saved!' : 'Error: ' + ((res.data && res.data.message) || ''), res.success ? 'success' : 'error');
				})
				.catch(function () {
					btn.disabled = false;
					if (label) label.textContent = 'Save Changes';
					toast('Network error — please try again.', 'error');
				});
		});
	}

	// -----------------------------------------------------------------------
	// Theme Toggle (light / dark)
	// -----------------------------------------------------------------------
	var MOON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
	var SUN_SVG  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';

	function initThemeToggle() {
		var wrap = document.getElementById('spm-wrap');
		var btn  = document.getElementById('spm-theme-toggle');
		if (!wrap || !btn) return;

		var STORAGE_KEY = 'spm_theme';
		var saved = localStorage.getItem(STORAGE_KEY);

		function applyTheme(isDark) {
			wrap.classList.toggle('is-dark', isDark);
			document.body.classList.toggle('spm-is-dark', isDark);
			btn.innerHTML = isDark ? SUN_SVG : MOON_SVG;
			btn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
		}

		// Apply saved preference (default = light)
		applyTheme(saved === 'dark');

		btn.addEventListener('click', function () {
			var isDark = !wrap.classList.contains('is-dark');
			applyTheme(isDark);
			localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
		});
	}

	// -----------------------------------------------------------------------
	// Toast
	// -----------------------------------------------------------------------
	function toast(msg, type) {
		var el = document.getElementById('spm-toast');
		if (!el) return;
		el.textContent = msg;
		el.className = 'spm-toast is-visible is-' + (type || 'success');
		clearTimeout(el._t);
		el._t = setTimeout(function () { el.classList.remove('is-visible'); }, 3000);
	}

	// -----------------------------------------------------------------------
	// Utils
	// -----------------------------------------------------------------------
	function esc(s) {
		return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
	}
	function slugify(s) {
		return String(s).toLowerCase().replace(/\s+/g,'-').replace(/[^\w-]/g,'');
	}

})();
