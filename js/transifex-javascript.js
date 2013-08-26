"use strict";
(function(window, $, undefined) {

// Let's check if the script has been interpreted with utf-8 charset
if(('è'.length !== 1) || ('è'.charCodeAt(0) !== 232)) {
	throw 'The script has not been interpreted as UTF-8!';
}
if(!(window.JSON && JSON.stringify)) {
	throw 'JSON.stringify() function not available';
}

/** The default base URL for the API calls.
* @constant
* @type {string}
*/
var DEFAULT_BASEURL = 'https://www.transifex.com/api/2';

var pluralNames = {
	'0': 'zero',
	'1': 'one',
	'2': 'two',
	'3': 'few',
	'4': 'many',
	'5': 'other'
};

function getPluralName(key, onInvalid) {
	return (key in pluralNames) ? pluralNames[key] : onInvalid;
};

function isString(v, allowZeroLength) {
	if($.type(v) === 'string') {
		if(v.length || allowZeroLength) {
			return true;
		}
	}
	return false;
}
function sameStringOrArray(a, b) {
	var type = $.type(a);
	if($.type(b) != type) {
		return false;
	}
	switch(type) {
		case 'string':
			return (a === b) ? true : false;
		case 'array':
			var length = a.length;
			if(length != b.length) {
				return false;
			}
			if(length > 0) {
				var a2 = [].concat(a), b2 = [].concat(b);
				a2.sort();
				b2.sort();
				for(var i = 0; i < length; i++) {
					if(a2[i] !== b2[i]) {
						return false;
					}
				}
			}
			return true;
		default:
			throw 'Unknown type: ' + (typeof(a));
	}
}
function sameDictionary(a, b) {
	if($.type(a) != 'object') {
		return false;
	}
	if($.type(b) != 'object') {
		return false;
	}
	for(var aKey in a) {
		if((!(aKey in b)) || (b[aKey] !== a[aKey])) {
			return false;
		}
	}
	for(var bKey in b) {
		if((!(bKey in a)) || (a[bKey] !== b[bKey])) {
			return false;
		}
	}
	return true;
}

/** Do an ajax call
* @param {Server} A Server instance.
* @param {object} info Contains:<ul>
*	<li>{string} path<li>
*	<li>{function} [success]</li>
*	<li>{function} [failure]</li>
*	<li>{object} [put]</li>
* </ul>
*/
function doRequest(server, info) {
	var options = {
		async: true,
		cache: false,
		url: server.host + info.path,
		beforeSend: function(xhr) {
			xhr.setRequestHeader('Authorization', 'Basic ' + window.btoa(server.username + ":" + server.password));
		}
	};
	if(info.put) {
		options.type = 'PUT';
		options.data = info.put;
	}
	else {
		options.type = 'GET';
	}
	if('contentType' in info) {
		options.contentType = info.contentType;
	}
	if(('decodeJSON' in info) && (!info.decodeJSON)) {
		options.dataType = 'text';
	}
	else {
		options.dataType = 'json';
	}
	$.ajax(options)
		.fail(function(jqXHR, textStatus, errorThrown) {
			if($.type(info.fail) === 'function') {
				var why;
				if((typeof(errorThrown) == 'object') && isString(errorThrown.message)) {
					why = errorThrown.message;
				}
				else if(isString(jqXHR.responseText)) {
					why = jqXHR.responseText;
				}
				else if(isString(errorThrown)) {
					why = errorThrown;
				}
				else if(isString(textStatus)) {
					if((textStatus == 'error') && (jqXHR.status == 404)) {
						why = 'Resource not found or not loaded';
					}
					else {
						why = textStatus;
					}
				}
				else {
					why = 'Unknown error';
				}
				info.fail(why);
			}
		})
		.success(function(data) {
			if($.type(info.success) === 'function') {
				info.success(data);
			}
		})
	;
}

/** Represents a Transifex server.
* @constructor
* @param {string} username - The username.
* @param {string} password - The password.
* @param {string} [baseURL] - The base URL for the API calls. Defaults to the standard one of transifex.com.
*/
function Server(username, password, baseURL) {
	this.username = username;
	this.password = password;
	this.host = isString(baseURL) ? baseURL.replace(/\/+$/, '') : DEFAULT_BASEURL;
	this._loadedProjects = {};
}
Server.prototype = {
	getProject: function(slug, success, fail, forceReload) {
		if((!forceReload) && (slug in this._loadedProjects)) {
			if($.type(success) === 'function') {
				success(this._loadedProjects[slug]);
			}
			return;
		}
		var server = this;
		doRequest(
			this,
			{
				path:'/project/' + slug + '/?details',
				success: function(data) {
					server._loadedProjects[slug] = new Project(server, data);
					if($.type(success) === 'function') {
						success(server._loadedProjects[slug]);
					}
				},
				fail: fail
			}
		);
	}
};

function Project(server, data) {
	var project = this;
	$.each(data.maintainers, function(i) {
		data.maintainers[i] = this.username;
	});
	project.teams = [];
	$.each(data.teams, function(i) {
		project.teams[i] = new Team(project, this, false);
	});
	delete data.teams;
	project.resources = [];
	$.each(data.resources, function(i) {
		project.resources[i] = new Resource(project, this, false);
	});
	project.resources.sort(function(a, b) {
		var an = a.name.toLowerCase(), bn = b.name.toLowerCase();
		if(an < bn) {
			return -1;
		}
		if(an > bn) {
			return 1;
		}
		return 0;
	});
	delete data.resources;
	data.organization = (data.organization && isString(data.organization.slug)) ? data.organization.slug : '';
	$.extend(true, this, data);
	this.server = server;
	this.fullTeamsDataLoaded = false;
}
Project.prototype = {
	getTeamByLanguageCode: function(language_code) {
		var found = null;
		$.each(this.teams, function() {
			if(this.language_code == language_code) {
				found = this;
				return false;
			}
		});
		return found;
	},
	getResourceBySlug: function(slug) {
		var found = null;
		$.each(this.resources, function() {
			if(this.slug == slug) {
				found = this;
				return false;
			}
		});
		return found;
	},
	loadFullTeamsData: function(success, fail, forceReload) {
		if((!forceReload) && this.fullTeamsDataLoaded) {
			if($.type(success) === 'function') {
				success(this);
			}
			return;
		}
		var project = this;
		doRequest(
			this.server,
			{
				path:'/project/' + this.slug + '/languages/',
				success: function(data) {
					$.each(data, function() {
						var team = project.getTeamByLanguageCode(this.language_code);
						if(team) {
							for(var key in this) {
								if(forceReload || (!(key in team))) {
									team[key] = this[key];
								}
							}
							team.fullDataLoaded = true;
						}
						else {
							project.teams.push(new Team(project, this, true));
						}
					});
					project.fullTeamsDataLoaded = true;
					if($.type(success) === 'function') {
						success(project);
					}
				},
				fail: fail
			}
		);
	},
	getTeamsTranslatableByBe: function() {
		return this.getTeamsTranslatableBy(this.server.username);
	},
	getTeamsTranslatableBy: function(username) {
		if(!this.fullTeamsDataLoaded) {
			throw "Before calling getTeamsTranslatableBy you have to call loadFullTeamsData";
		}
		if($.inArray(username, this.maintainers) >= 0) {
			return [].concat(this.teams);
		}
		var teams = [];
		$.each(this.teams, function() {
			if(
				($.inArray(username, this.coordinators) >= 0)
				||
				($.inArray(username, this.reviewers) >= 0)
				||
				($.inArray(username, this.translators) >= 0)
			) {
				teams.push(this);
			}
		});
		return teams;
	}
};
function Team(project, data, fullDataLoaded) {
	if(isString(data)) {
		this.language_code = data;
	}
	else {
		$.extend(true, this, data);
	}
	this.project = project;
	this.fullDataLoaded = !!fullDataLoaded;
}
Team.prototype = {
};
function Resource(project, data, detailsLoaded) {
	$.extend(true, this, data);
	this.project = project;
	this._detailsLoaded = !!detailsLoaded;
	this._loadedTranslations = {};
}
Resource.prototype = {
	loadDetails: function(success, fail, forceReload) {
		if((!forceReload) && this._detailsLoaded) {
			if($.type(success) === 'function') {
				success(this);
			}
		}
		var resource = this;
		doRequest(
			this.project.server,
			{
				path:'/project/' + this.project.slug + '/resource/' + this.slug + '/?details',
				success: function(data) {
					for(var key in data) {
						if(forceReload || (!(key in resource))) {
							switch(key) {
								case 'available_languages':
									$.each(data[key], function() {
										delete this._state;
									});
							}
							resource[key] = data[key];
						}
					}
					resource._detailsLoaded = true;
					if($.type(success) === 'function') {
						success(resource);
					}
				},
				fail: fail
			}
		);
	},
	getTranslations: function(language_code, success, fail, force_reload) {
		if((!force_reload) && (language_code in this._loadedTranslations)) {
			if($.type(success) === 'function') {
				success(this._loadedTranslations[language_code]);
			}
			return;
		}
		var resource = this;
		doRequest(
			this.project.server,
			{
				path:'/project/' + this.project.slug + '/resource/' + this.slug + '/translation/' + language_code + '/strings/',
				success: function(data) {
					resource._loadedTranslations[language_code] = new Translations(resource, language_code, data);
					if($.type(success) === 'function') {
						success(resource._loadedTranslations[language_code]);
					}
				},
				fail: fail
			}
		);
	}
};

function Translations(resource, language_code, data) {
	var translations = this;
	this.resource = resource;
	this.language_code = language_code;
	this.strings = [];
	$.each(data, function() {
		translations.strings.push(new Translation(translations, this));
	});
}
Translations.prototype = {
	getByHash: function(hash) {
		var found = null;
		if(isString(hash)) {
			$.each(this.strings, function() {
				if(this.hash == hash) {
					found = this;
				}
			});
		}
		return found;
	}
};

function Translation(translations, data) {
	this.translations = translations;
	var keys = [data.key];
	if($.isArray(data.context) && data.context.length) {
		keys = keys.concat(data.context);
	}
	else {
		keys.push(isString(data.context) ? data.context : '');
	}
	this.hash = md5(keys.join(':'));
	$.extend(true, this, data);
}
Translation.prototype = {
	sameSourceAs: function(that) {
		if(!sameStringOrArray(this.context, that.context)) {
			return false;
		}
		if(this.key !== that.key) {
			return false;
		}
		if(this.pluralized) {
			if((!that.pluralized) || (!sameDictionary(this.source_string, that.source_string))) {
				return false;
			}
		}
		else if(that.pluralized) {
			return false;
		}
		else {
			if(this.source_string !== that.source_string) {
				return false;
			}
		}
		return true;
	},
	sameTranslationAs: function(that) {
		if(this.pluralized) {
			if(!that.pluralized) {
				return false;
			}
			return sameDictionary(this.translation, that.translation);
		}
		else if(that.pluralized) {
			return false;
		}
		else {
			return (this.translation === that.translation) ? true : false;
		}
	},
	isTranslated: function() {
		if(this.pluralized) {
			var some = false;
			for(var key in this.translation) {
				some = true;
				if(!isString(this.translation[key])) {
					return false;
				}
			}
			return some;
		}
		else {
			return isString(this.translation);
		}
	},
	setTranslation: function(new_translation, success, fail) {
		var translationNormalized;
		if(this.pluralized) {
			if($.type(new_translation) != 'object') {
				if($.type(fail) === 'function') {
					fail('new_translation must be an object');
				}
				return;
			}
			translationNormalized = $.extend(true, {}, this.translation);
			for(var key in new_translation) {
				if(!(key in translationNormalized)) {
					if($.type(fail) === 'function') {
						fail('new_translation has a wrong dictionary key: ' + key);
					}
					return;
				}
				if($.type(new_translation[key]) !== 'string') {
					if($.type(fail) === 'function') {
						fail('new_translation has a wrong dictionary key vakye: ' + new_translation[key]);
					}
					return;
				}
				translationNormalized[key] = new_translation[key];
			}
		}
		else {
			if(!isString(new_translation, true)) {
				if($.type(fail) === 'function') {
					fail('new_translation must be a string');
				}
				return;
			}
			translationNormalized = new_translation;
		}
		var me = this;
		doRequest(
			this.translations.resource.project.server,
			{
				path:'/project/' + this.translations.resource.project.slug + '/resource/' + this.translations.resource.slug + '/translation/' + this.translations.language_code + '/string/' + this.hash + '/',
				contentType: 'application/json',
				put: JSON.stringify({
					translation: translationNormalized
				}),
				success: function(data) {
					if(data !== 'OK') {
						if($.type(fail) === 'function') {
							fail('Unexpected response: ' + data);
						}
						return;
					}
					me.translation = translationNormalized;
					if($.type(success) === 'function') {
						success(me);
					}
				},
				decodeJSON: false,
				fail: fail
			}
		);
	}
};

window.tx = {
	Server: Server,
	getPluralName: getPluralName
};

})(window, jQuery);
