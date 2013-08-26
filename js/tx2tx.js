var tx2tx = {
	project: null,
	step: null,
	setStep: function(step) {
		$('.tx2tx-step').hide();
		$('#tx2tx-step-' + (this.step = step)).show();
		switch(step) {
			case 'login':
				$('#tx2tx-topbar').hide();
				$('#tx2tx-step-login .tx2tx-alert').removeClass('alert-danger').addClass('alert-info').html('<span><b>Please note</b>: we will <b>not</b> save your Transifex login and password: they’ll be sent only to the Transifex server to work with translations data.');
				break;
			case 'options':
				$('#tx2tx-options').hide();
				$('#tx2tx-work-refresh').closest('li').hide();
				$('#tx2tx-topbar').show();
				$('#tx2tx-step-options .alert').hide();
				break;
			case 'work':
				$('#tx2tx-options').show();
				$('#tx2tx-work-refresh').closest('li').show();
				break;
		}
	},
	doLogin: function() {
		var username = $.trim($('#tx2tx-username').val());
		if(!username.length) {
			$('#tx2tx-username').val('').focus();
			return;
		}
		var password = $('#tx2tx-password').val();
		if(!password.length) {
			$('#tx2tx-password').focus();
			return;
		}
		var server = new tx.Server(username, password);
		var fail = function(why) {
			$('#tx2tx-step-login .tx2tx-alert').removeClass('alert-info').addClass('alert-danger').text(why);
			tx2tx.setWorking(false);
		};
		tx2tx.setWorking('Retrieving project info');
		server.getProject(
			'concrete5',
			function(project) {
				if(project.resources.length < 2) {
					fail('The ' + project.name + ' has less that two resources.');
				}
				else {
					tx2tx.setWorking('Retrieving teams data');
					project.loadFullTeamsData(
						function() {
							var myTeams = project.getTeamsTranslatableByBe();
							if(!myTeams.length) {
								fail('You don’t have access to any of the ' + project.name + ' project translation groups.');
							}
							else {
								tx2tx.project = project;
								tx2tx.myTeams = myTeams;
								$('#tx2tx-language').empty();
								if(myTeams.length == 1) {
									$('#tx2tx-language').append($('<option selected></option>').data('team', myTeams[0]).text(locale.decode(myTeams.language_code)));
								}
								else {
									$('#tx2tx-language').append('<option selected>Select a language team</option>');
									var preselectTeam = $.cookie('tx2tx_team');
									if(typeof(preselectTeam) !== 'string') {
										preselectTeam = '';
									}
									var list = [];
									$.each(myTeams, function() {
										list.push({name: locale.decode(this.language_code), team: this});
									});
									list.sort(function(a, b) {
										var an = a.name.toLowerCase(), bn = b.name.toLowerCase();
										if(an < bn) {
											return -1;
										}
										if(an > bn) {
											return 1;
										}
										return 0;
									});
									$.each(list, function() {
										var $o;
										$('#tx2tx-language').append($o = $('<option></option>').data('team', this.team).text(this.name));
										if(preselectTeam.length && (this.team.language_code === preselectTeam)) {
											$o.prop('selected', true);
											preselectTeam = '';
										}
									});
								}
								$('select.tx2tx-resource').empty();
								var $resources = [$('#tx2tx-resource-left'), $('#tx2tx-resource-right')];
								if(project.resources.length > 2) {
									$.each($resources, function() {
										this.append('<option selected>Please select a resource</option>');
									});
								}
								$.each(project.resources, function(i, resource) {
									$.each($resources, function(j) {
										this.append($('<option></option>').data('resource', resource).text(resource.name));
									});
								});
								if(project.resources.length == 2) {
									$resources[0].prop('selectedIndex', 0);
									$resources[1].prop('selectedIndex', 1);
								}
								$.cookie('tx2tx_username', username);
								$('#tx2tx-topbar .navbar-brand').text(project.name + ' - copy translations');
								tx2tx.setWorking(false);
								tx2tx.setStep('options');
							}
						},
						fail
					);
				}
			},
			fail
		);
	},
	setOptions: function() {
		var fail = function(msg) {
			tx2tx.setWorking(false);
			$('#tx2tx-step-options .alert').text(msg).show();
		};
		var team = $('#tx2tx-language option:selected').data('team');
		if(!team) {
			$('#tx2tx-language').focus();
			fail('Please select the language team');
			return;
		}
		var resources = {};
		resources.left = $('#tx2tx-resource-left option:selected').data('resource');
		if(!resources.left) {
			$('#tx2tx-resource-left').focus();
			fail('Please select the left resource');
			return;
		}
		resources.right = $('#tx2tx-resource-right option:selected').data('resource');
		if(!resources.right) {
			$('#tx2tx-resource-resource').focus();
			fail('Please select the right resource');
		}
		tx2tx.setWorking('Retrieving ' + locale.decode(team.language_code) + ' translations for ' + resources.left.name + '...');
		var translations = {};
		resources.left.getTranslations(
			team.language_code,
			function(t) {
				translations.left = t;
				tx2tx.setWorking('Retrieving ' + locale.decode(team.language_code) + ' translations for ' + resources.right.name + '...');
				resources.right.getTranslations(
					team.language_code,
					function(t) {
						translations.right = t;
						$.cookie('tx2tx_team', team.language_code);
						tx2tx.translations = translations;
						tx2tx.rebuildWorkList(function() {
							tx2tx.setStep('work');
						});
					},
					fail
				);
			},
			fail
		);
	},
	reloadTranslations: function() {
		var fail = function(why) {
			tx2tx.setWorking(false);
			alert(why);
			tx2tx.rebuildWorkList();
		};
		tx2tx.setWorking('Retrieving ' + locale.decode(tx2tx.translations.left.language_code) + ' translations for ' + tx2tx.translations.left.resource.name + '...');
		tx2tx.translations.left.resource.getTranslations(
			tx2tx.translations.left.language_code,
			function(t) {
				tx2tx.translations.left = t;
				tx2tx.setWorking('Retrieving ' + locale.decode(tx2tx.translations.right.language_code) + ' translations for ' + tx2tx.translations.right.resource.name + '...');
				tx2tx.translations.right.resource.getTranslations(
					tx2tx.translations.right.language_code,
					function(t) {
						tx2tx.translations.right = t;
						tx2tx.setWorking(false);
						tx2tx.rebuildWorkList();
					},
					fail,
					true
				);
			},
			fail,
			true
		);
	},
	rebuildWorkList: function(done) {
		$('#tx2tx-work-none').hide();
		$('#tx2tx-work-list').hide();
		$('#tx2tx-work-list thead tr th:nth-child(1)').text(tx2tx.translations.left.resource.name);
		$('#tx2tx-work-list thead tr th:nth-child(3)').text(tx2tx.translations.right.resource.name);
		$('#tx2tx-work-list tbody').empty();
		tx2tx.setWorking('Checking translations...');
		setTimeout(
			function() {
				var someDifference = false;
				$.each(tx2tx.translations.left.strings, function() {
					var left = this;
					var right = tx2tx.translations.right.getByHash(left.hash);
					if(!right) {
						return;
					}
					if(!left.sameSourceAs(right)) {
						console.log('Mismatching translations with same hash!\nLeft: ' + JSON.stringify(left) + '\nRight: ' + JSON.stringify(right));
						return;
					}
					if(left.sameTranslationAs(right)) {
						return;
					}
					if(!(left.isTranslated() || right.isTranslated())) {
						return;
					}
					new tx2tx.Difference(left, right);
					someDifference = true;
				});
				if(someDifference) {
					$('#tx2tx-work-list').show();
				}
				else {
					$('#tx2tx-work-none').show();
				}
				tx2tx.setWorking(false);
				if($.type(done) === 'function') {
					done();
				}
			},
			0
		);
	},
	setWorking: function(text) {
		if((typeof(text) == 'string') || (text === true)) {
			$('#tx2tx-working-text').text(((text === true)|| (!text.length)) ? 'Working... Please wait' : text);
			$('#tx2tx-working').show().focus();
		}
		else {
			$('#tx2tx-working').hide();
		}
	},
	logout: function() {
		delete tx2tx.translations;
		delete tx2tx.myTeams;
		delete tx2tx.project;
		tx2tx.setStep('login');
		$('#tx2tx-password').val('').focus();
	},
	Difference: function(left, right) {
		this.left = left;
		this.right = right;
		this.pluralized = left.pluralized;
		var $tb = $('#tx2tx-work-list tbody');
		var $cell = $('<td colspan="3"></td>');
		$tb.append(this.$headRow = $('<tr class="tx2tx-difference-head"></tr>').append($cell));
		var $row;
		if(this.pluralized) {
			var $st;
			this.$textRows = {};
			$cell.append('<strong>Source strings:</strong> ').append($st = $('<ul></ul>'));
			for(var key in left.source_string) {
				$st.append($('<li></li>').text(left.source_string[key]).prepend($('<strong></strong>').text(tx.getPluralName(key, key) + ': ')));
			}
			var count = 0;
			for(var key in left.translation) {
				count++;
			}
			var first = true;
			for(var key in left.translation) {
				$tb.append($row = $('<tr class="tx2tx-difference-text"></tr>'));
				$row.append($cell = $('<td class="tx2tx-string"></td>'));
				this.viewString($cell, left.translation[key], key);
				if(first) {
					$row.append($cell = $('<td class="tx2tx-copy" rowspan="' + count + '"></td>'));
					this.viewCopy($cell, left.isTranslated(), right.isTranslated());
				}
				$row.append($cell = $('<td class="tx2tx-string"></td>'));
				this.viewString($cell, right.translation[key], key);
				this.$textRows[key] = $row;
				first = false;
			}
		}
		else {
			$cell.text(left.source_string).prepend('<strong>Source string:</strong> ');
			$tb.append($row = $('<tr class="tx2tx-difference-text"></tr>'));
			$row.append($cell = $('<td class="tx2tx-string"></td>'));
			this.viewString($cell, left.translation);
			$row.append($cell = $('<td class="tx2tx-copy"></td>'));
			this.viewCopy($cell, left.isTranslated(), right.isTranslated());
			$row.append($cell = $('<td class="tx2tx-string"></td>'));
			this.viewString($cell, right.translation);
			this.$textRow = $row;
		}
	}
};
tx2tx.Difference.prototype = {
	viewString: function($cell, value, pluralKey) {
		if(typeof(value) != 'string') {
			throw 'Not a string: ' + value;
		}
		if(value.length) {
			$cell.text(value);
		}
		else {
			$cell.html('<i style="color:#777">not translated</i>');
		}
		var pluralName = tx.getPluralName(pluralKey, '');
		if(pluralName.length) {
			$cell.prepend($('<strong></strong>').text(pluralName + ': '));
		}
	},
	viewCopy: function($cell, leftTranslated, rightTranslated) {
		$cell
			.empty()
			.append($('<a href="javascript:;" class="btn btn-success btn-xs">copy &gt;</a>')
				.css('visibility', leftTranslated ? '' : 'hidden')
				.data('Difference', this)
				.data('from', 'left')
				.data('to', 'right')
				.on('click', function() {
					var $this = $(this);
					$this.data('Difference').copy($this.data('from'), $this.data('to'));
					return false;
				})
			)
			.append('<br />')
			.append($('<a href="javascript:;" class="btn btn-info btn-xs">&lt; copy</a>')
				.css('visibility', rightTranslated ? '' : 'hidden')
				.data('Difference', this)
				.data('from', 'right')
				.data('to', 'left')
				.on('click', function() {
					var $this = $(this);
					$this.data('Difference').copy($this.data('from'), $this.data('to'));
					return false;
				})
			)
		;
	},
	copy: function(fromKey, toKey) {
		if($('#tx2tx-options-confirm-copy span.glyphicon-ok').css('visibility') !== 'hidden') {
			var confirmed = window.confirm('Are you sure you want to copy this translation?');
			if(!confirmed) {
				return;
			}
		}
		var fail = function(why) {
			alert(why);
			tx2tx.setWorking(false);
		};
		var from = this[fromKey], to = this[toKey];
		var new_translation;
		tx2tx.setWorking('Updating destination translation...');
		if(this.pluralized) {
			new_translation = $.extend(true, {}, from.translation);
		}
		else {
			new_translation = from.translation;
		}
		var me = this;
		to.setTranslation(
			new_translation,
			function() {
				tx2tx.setWorking(false);
				me.remove();
			},
			fail
		);
	},
	remove: function() {
		if(this.pluralized) {
			$.each(this.$textRows, function() {
				this.remove();
			});
		}
		else {
			this.$textRow.remove();
		}
		var me = this;
		this.$headRow.hide('fast', function() {
			me.$headRow.remove();
			if(!$('#tx2tx-work-list tbody tr:first').length) {
				$('#tx2tx-work-list').hide();
				$('#tx2tx-work-none').show();
			}
		});
	}
};
$(document).ready(function() {
	$('#tx2tx-step-login form').on('submit', function() { tx2tx.doLogin(); return false; });
	$('#tx2tx-options-confirm-copy').on('click', function() {
		var $i = $('#tx2tx-options-confirm-copy span.glyphicon-ok');
		$i.css('visibility', ($i.css('visibility') === 'hidden') ? '' : 'hidden');
	});
	$('#tx2tx-options-change').on('click', function() { tx2tx.setStep('options'); });
	$('#tx2tx-logout').on('click', function() { tx2tx.logout(); });
	$('#tx2tx-step-options form').on('submit', function() { tx2tx.setOptions(); return false; });
	$('#tx2tx-work-refresh').on('click', function() { $('#tx2tx-modal-reloadhow').modal(); });
	$('#tx2tx-modal-reloadhow-viewonly').on('click', function() { $('#tx2tx-modal-reloadhow').modal('hide'); tx2tx.rebuildWorkList(); });
	$('#tx2tx-modal-reloadhow-full').on('click', function() { $('#tx2tx-modal-reloadhow').modal('hide'); tx2tx.reloadTranslations(); });
	tx2tx.setStep('login');
	var presetUsername = $.cookie('tx2tx_username');
	if(($.type(presetUsername) == 'string') && presetUsername.length) {
		$('#tx2tx-username').val(presetUsername);
		$('#tx2tx-password').focus();
	}
	else {
		$('#tx2tx-username').focus();
	}
});
