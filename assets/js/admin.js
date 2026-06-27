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

		// — Cards list —
		var cardsList = document.createElement('div');
		cardsList.className = 'spm-tc-cards';
		renderCards(cardsList, ti);
		panel.appendChild(cardsList);

		// — Add item button —
		var addBtn = document.createElement('button');
		addBtn.type = 'button';
		addBtn.className = 'spm-btn spm-btn--sm spm-tc-add-btn';
		addBtn.textContent = '+ Add Item';
		addBtn.addEventListener('click', function () {
			var ct = tabs[ti].card_type;
			var newItem = ct === 'event'
				? { image: '', title: '', city: '', date: '', venue: '', btn_text: '', btn_url: '' }
				: { image: '', title: '', subtitle: '', btn_text: '', btn_url: '' };
			if (!tabs[ti].items) tabs[ti].items = [];
			tabs[ti].items.push(newItem);
			renderCards(cardsList, ti);
			updateSidebarMeta(ti);
			push();
		});
		panel.appendChild(addBtn);

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
		items.forEach(function (item, ii) {
			container.appendChild(buildCardRow(ti, ii, item, tab.card_type));
		});
	}

	function buildCardRow(ti, ii, item, ct) {
		var card = document.createElement('div');
		card.className = 'spm-tc-card';

		// Thumbnail
		var thumb = document.createElement('div');
		thumb.className = 'spm-tc-card__thumb';
		thumb.innerHTML = item.image
			? '<img src="' + esc(item.image) + '" alt="">'
			: '<span>+ Image</span>';
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

		// Fields
		var fields = document.createElement('div');
		fields.className = 'spm-tc-card__fields';

		if (ct === 'event') {
			var r1 = makeRow([
				makeField('Title',         'text', item.title  || '', function(v){ tabs[ti].items[ii].title = v; }),
				makeField('City/Location', 'text', item.city   || '', function(v){ tabs[ti].items[ii].city  = v; }),
			]);
			var r2 = makeRow([
				makeField('Date',          'date', item.date   || '', function(v){ tabs[ti].items[ii].date  = v; }),
				makeField('Venue/Details', 'text', item.venue  || '', function(v){ tabs[ti].items[ii].venue = v; }),
			]);
			fields.appendChild(r1);
			fields.appendChild(r2);
		} else {
			fields.appendChild(makeField('Title',       'text', item.title       || '', function(v){ tabs[ti].items[ii].title       = v; }));
			fields.appendChild(makeField('Subtitle',    'text', item.subtitle    || '', function(v){ tabs[ti].items[ii].subtitle    = v; }));
			fields.appendChild(makeField('YouTube URL', 'url',  item.youtube_url || '', function(v){ tabs[ti].items[ii].youtube_url = v; }));
		}

		var r3 = makeRow([
			makeField('Button Text', 'text', item.btn_text || '', function(v){ tabs[ti].items[ii].btn_text = v; }),
			makeField('Button URL',  'url',  item.btn_url  || '', function(v){ tabs[ti].items[ii].btn_url  = v; }),
		]);
		fields.appendChild(r3);

		// Delete
		var del = document.createElement('button');
		del.type = 'button';
		del.className = 'spm-tc-card__del';
		del.title = 'Remove item';
		del.innerHTML = '&#x2715;';
		del.addEventListener('click', function () {
			if (!confirm('Remove this item?')) return;
			tabs[ti].items.splice(ii, 1);
			var container = card.parentNode;
			card.remove();
			renderCards(container, ti);
			updateSidebarMeta(ti);
			push();
		});

		card.appendChild(thumb);
		card.appendChild(fields);
		card.appendChild(del);
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
