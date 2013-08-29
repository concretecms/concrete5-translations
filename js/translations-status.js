(function() {
	var project = null, colors = ['#edc240', '#afd8f8', '#cb4b4b', '#4da74d', '#9440ed', '#ffa500', '#00ffff', '#ff1493', '#0000ff', '#00ff00'];

	function string2date(s) {
		var d;
		if((typeof(s) == 'string') && s.length) {
			d = new Date();
			d.setTime(Date.parse(s));
			return d;
		}
		return null;
	}
	function date2string(d, timeToo) {
		var t2, s;
		t2 = function(n) {
			return ((n < 10 ) ? '0' : '') + n;
		};
		s = d.getFullYear() + '-' + t2(d.getMonth() + 1) + '-' + t2(d.getDate());
		if(timeToo) {
			s += ' ' + t2(d.getHours()) + ':' + t2(d.getMinutes());
		}
		return s;
	}
	function getChildElements(parent) {
		var result, i = null;
		result = [];
		for(i in parent.childNodes) {
			if(parent.childNodes[i].nodeType == 1) {
				result.push(parent.childNodes[i]);
			}
		}
		return result;
	}
	function readData(current, history) {
		var project = {
			code: current[0].getAttribute('project'),
			updated: string2date(current[0].getAttribute('updated')),
			resources: []
		};
		var xResources = getChildElements(current[0]);
		for(var r in xResources) {
			var xResource = xResources[r];
			var resource = {
				code: xResource.getAttribute('name'),
				active: true,
				languages: []
			};
			var xLanguages = getChildElements(xResource);
			for(var l in xLanguages) {
				xLanguage = xLanguages[l];
				resource.languages.push({
					code: xLanguage.getAttribute('name'),
					current: {
						translated: parseInt(xLanguage.getAttribute('translated'), 10),
						untranslated: parseInt(xLanguage.getAttribute('untranslated'), 10),
						fuzzy: parseInt(xLanguage.getAttribute('fuzzy'), 10),
						total: parseInt(xLanguage.getAttribute('total'), 10),
						percentual: parseInt(xLanguage.getAttribute('percentual'), 10)
					},
					history: []
				});
			}
			project.resources.push(resource);
		}
		var xProjects = getChildElements(history[0]);
		for(var p in xProjects) {
			var xProject = xProjects[p];
			if(xProject.getAttribute('name') == project.code) {
				var xHistories = getChildElements(xProject);
				for(var h in xHistories) {
					var xHistory = xHistories[h];
					var timestamp = string2date(xHistory.getAttribute('timestamp'));
					var xResources = getChildElements(xHistory);
					for(var r in xResources) {
						var xResource = xResources[r];
						var resource = null;
						$.each(project.resources, function() {
							if(xResource.getAttribute('name') == this.code) {
								resource = this;
								return false;
							}
						});
						if(!resource) {
							project.resources.push(resource = {
								code: xResource.getAttribute('name'),
								active: false,
								languages: []
							});
						}
						var xLanguages = getChildElements(xResource);
						for(var l in xLanguages) {
							xLanguage = xLanguages[l];
							var language = null;
							$.each(resource.languages, function() {
								if(xLanguage.getAttribute('name') == this.code) {
									language = this;
									return false;
								}
							});
							if(!language) {
								resource.languages.push(language = {
									code: xLanguage.getAttribute('name'),
									current: null,
									history: []
								});
							}
							language.history.push({
								date: timestamp,
								translated: parseInt(xLanguage.getAttribute('translated'), 10),
								untranslated: parseInt(xLanguage.getAttribute('untranslated'), 10),
								fuzzy: parseInt(xLanguage.getAttribute('fuzzy'), 10),
								total: parseInt(xLanguage.getAttribute('total'), 10),
								percentual: parseInt(xLanguage.getAttribute('percentual'), 10)
							});
						}
					}
				}
			}
		}
		project.totalMax = 0;
		$.each(project.resources, function() {
			var resource = this;
			resource.totalMax = 0;
			$.each(this.languages, function() {
				var totalMax = 0;
				if(this.current) {
					totalMax = this.current.total;
				}
				$.each(this.history, function() {
					totalMax = Math.max(totalMax, this.total);
				});
				resource.totalMax = Math.max(resource.totalMax, totalMax);
			});
			project.totalMax = Math.max(project.totalMax, resource.totalMax);
		});
		return project;
	}
	function getResourceName(code) {
		switch(code) {
			case 'core':
				return 'concrete5 development';
		}
		var m;
		if(m = /^core-(\d{3,4})$/.exec(code)) {
			var s = 'concrete5 ';
			for(var i = 0; i < m[1].length; i++) {
				s += ((i > 0) ? '.' : '') + m[1].charAt(i);
			}
			return s;
		}
		return code;
	}
	function splitLanguages(name, list) {
		var LIMIT = 20;
		if(list.length <= LIMIT) {
			return [{
				name: name,
				list: list
			}];
		}
		var letters = {};
		$.each(list, function() {
			var letter = this.name.charAt(0).toUpperCase();
			if(!(letter in letters)) {
				letters[letter] = [];
			}
			letters[letter].push(this);
		});
		var result = [];
		$.each(letters, function(letter, list) {
			if((!result.length) || ((result[result.length-1].list.length + list.length) > LIMIT)) {
				result.push({
					from: letter,
					to: letter,
					list: list
				});
			}
			else {
				result[result.length - 1].to = letter;
				result[result.length - 1].list = result[result.length - 1].list.concat(list);
			}
		});
		$.each(result, function() {
			if(this.from == this.to) {
				this.name = name + ' [' + this.from + ']';
			}
			else {
				this.name = name + ' [' + this.from + '-' + this.to + ']';
			}
			delete this.from;
			delete this.to;
		});
		return result;
	}
	function setChecked($a, checked) {
		$a.data('checked', !!checked);
		$a.find('span.glyphicon').css('visibility', checked ? 'visible' : 'hidden');
	}
	function startup() {
		var $ul;
		if(!(startup.current && startup.history)) {
			return;
		}
		project = readData(startup.current, startup.history);
		$('#project').text(project.code);
		var languagesCurrent = {};
		$.each(project.resources, function() {
			$.each(this.languages, function() {
				if(this.current) {
					languagesCurrent[this.code] = true;
				}
			});
		});
		var languagesDismissed = {};
		$.each(project.resources, function() {
			$.each(this.languages, function() {
				if(!this.current) {
					if(!(this.code in languagesCurrent)) {
						languagesDismissed[this.code] = true;
					}
				}
			});
		});
		$("#menu").append($('<li class="dropdown"></li>')
			.append('<a href="#" class="dropdown-toggle" data-toggle="dropdown">Resource <b class="caret"></b></a>')
			.append($ul = $('<ul class="dropdown-menu" id="resources"></ul>'))
		);
		$.each(project.resources, function() {
			var $a;
			$ul.append($('<li></li>')
				.append($a = $('<a class="resource" href="javascript:;"></a>')
					.data('code', this.code)
					.text(' ' + getResourceName(this.code))
					.prepend('<span class="glyphicon glyphicon-chevron-down" style="visibility: hidden"></span>')
				)
			);
			if(this.code == 'core') {
				setChecked($a, true);
			}
		});
		var colorIndex = -1;
		$.each([languagesCurrent, languagesDismissed], function(dismissed) {
			var list = [];
			$.each(this, function(code) {
				list.push({code: code, name: locale.decode(code)});
			});
			if(list.length) {
				list.sort(function(o1, o2) {
					var n1 = o1.name.toLowerCase();
					var n2 = o2.name.toLowerCase();
					if(n1 < n2) {
						return -1;
					}
					if(n1 > n2) {
						return 1;
					}
					return 0;
				});
				$.each(splitLanguages(dismissed ? 'Dismissed languages' : 'Languages', list), function() {
					$("#menu").append($('<li class="dropdown"></li>')
						.append('<a href="#" class="dropdown-toggle" data-toggle="dropdown">' + this.name + ' <b class="caret"></b></a>')
						.append($ul = $('<ul class="dropdown-menu" id="languages"></ul>'))
					);
					$.each(this.list, function() {
						this.colorIndex = colorIndex = (colorIndex + 1) % colors.length;
						$ul.append($('<li></li>')
							.append($('<a class="language" href="javascript:;"></a>')
								.data('code', this.code)
								.data('colorIndex', this.colorIndex)
								.text(' ' + this.name)
								.prepend($('<span class="language-color"></span>').css("background-color", colors[this.colorIndex]))
								.prepend('<span class="glyphicon glyphicon-chevron-down" style="visibility: hidden"></span>')
							)
						);
					});
				});
			}
		});
		var previousPoint = null;
		$('#plot').on('plothover', function(event, pos, item) {
			if(item) {
				if((!previousPoint) || ((previousPoint.dataIndex != item.dataIndex) || (previousPoint.series != item.series))) {
					previousPoint = {dataIndex: item.dataIndex, series: item.series};
					$('#tooltip').remove();
					var dt = new Date(item.datapoint[0]);
					var $tt = $('<div id="tooltip"></div>')
						.text(locale.decode(item.series.label) + ' ')
						.append($('<span></span>').text(item.series.resourceName))
						.append('<br />' + date2string(dt, true) +  ': ' + item.datapoint[1])
						.appendTo('body')
						
					;
					var x, y;
					if((item.pageX + $tt.width()) >= ($(window).width() - 10)) {
						x = item.pageX - $tt.width() - 10;
					}
					else {
						x = Math.max(10, item.pageX - ($tt.width() >> 1));
					}
					if((item.pageY + $tt.height()) >= ($(window).height() - 10)) {
						y = item.pageY - $tt.height() - 20;
					}
					else {
						y = item.pageY + 5;
					}
					$tt
						.css({
							left: x,
							top: y
						})
						.fadeIn(200)
					;
				}
			}
			else {
				$('#tooltip').remove();
				previousPoint = null;            
			}
		});
		setChecked($("#draw a:first"), true);
		$("#header").show();
		viewChart();
		$('#draw a').on('click', function() {
			var $this = $(this);
			if(!$this.data('checked')) {
				setChecked($("#draw a"), false);
				setChecked($this, true);
				viewChart();
			}
		});
		$('a.resource').on('click', function() {
			var $this = $(this);
			setChecked($this, !$this.data('checked'));
			viewChart();
		});
		$('a.language').on('click', function() {
			var $this = $(this);
			setChecked($this, !$this.data('checked'));
			viewChart();
		});
		$(window).on('resize', function() {
			viewChart();
		});
	}
	function viewChart() {
		var draw = '';
		$.each($("#draw a"), function() {
			var $this = $(this);
			if($this.data('checked')) {
				draw = $this.attr('data-value');
				return false;
			}
		});
		var resourceCodes = [];
		$.each($('a.resource'), function() {
			var $this = $(this);
			if($this.data('checked')) {
				resourceCodes.push($this.data('code'));
			}
		});
		var selectedLanguages = [];
		$.each($('a.language'), function() {
			var $this = $(this);
			if($this.data('checked')) {
				selectedLanguages.push({code: $this.data('code'), colorIndex: $this.data('colorIndex')});
			}
		});
		var series = [], messages = [];
		if(!draw.length) {
			messages.push('Please specify what you want to draw.');
		}
		if(!resourceCodes.length) {
			messages.push('Please specify which resource you want to draw.');
		}
		if(!selectedLanguages.length) {
			messages.push('Please specify which language you want to draw.');
		}
		if(!messages.length) {
			$.each(resourceCodes, function(r, resourceCode) {
				$.each(project.resources, function() {
					var resource = this;
					if(resource.code == resourceCode) {
						$.each(selectedLanguages, function() {
							var languageCode = this.code;
							var languageColorIndex = this.colorIndex;
							$.each(resource.languages, function() {
								var language = this;
								if(language.code == languageCode) {
									var data = [];
									$.each(language.history, function() {
										data.push([this.date.getTime(), this[draw]]);
									});
									if(language.current) {
										data.push([project.updated.getTime(), language.current[draw]]);
									}
									if(data.length) {
										series.push({label: locale.decode(languageCode), resourceName: getResourceName(resourceCode), data: data, color: languageColorIndex});
									}
									return false;
								}
							});
						});
						return false;
					}
				});
			});
			if(!series.length) {
				messages.push('None of the selected languages is available for the selected resources.');
			}
		}
		if(messages.length) {
			$("#message").html('<p>' + messages.join('</p><p>') + '</p>').closest('div').show();
			$("#plot").hide();
		}
		else {
			$("#message").empty().closest('div').hide();
			$('#plot')
				.show()
				.css({
					width: Math.max(200, $(window).width() - 0),
					height: Math.max(200, $(window).height() - 50)
				})
			;
			var yMax;
			switch(draw) {
				case 'translated':
				case 'untranslated':
					yMax = project.totalMax;
					break;
				case 'percentual':
					yMax = 100;
					break;
				default:
					yMax = null;
					break;
			}
			$.plot(
				'#plot',
				series,
				{
					colors: colors,
					xaxis: {
						mode: 'time',
						timeformat: '%Y-%m-%d'
					},
					yaxis: {
						min: 0,
						max: yMax,
						tickDecimals: 0
					},
					lines: {show: true},
					points: {show: true},
					legend: {show: false},
					grid: {
						hoverable: true,
						clickable: true
					}
				}
			);
		}
	}
	$(document).ready(function() {
		var baseURL = 'http://i18n.concrete5.ch/get-translations-status-data.php?which='
		$.ajax({
			async: true,
			cache: false,
			dataType: 'xml',
			url: baseURL + 'current'
		}).done(function(data) {
			startup.current = getChildElements(data);
			startup();
		});
		$.ajax({
			async: true,
			cache: false,
			dataType: 'xml',
			url: baseURL + 'history'
		}).done(function(data) {
			startup.history = getChildElements(data);
			startup();
		});
	});
})();
