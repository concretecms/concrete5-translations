/* A slightly modified version of the md5() function by Joseph Myers - http://www.myersdaily.org/joseph/javascript/md5-text.html */
function md5(s, raw) {
	var n = s.length, state = [1732584193, -271733879, -1732584194, 271733878], i;
	for (i = 64; i <= s.length; i += 64) {
		md5.cycle(state, md5.blk(s.substring(i - 64, i)));
	}
	s = s.substring(i - 64);
	var tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	for(i = 0; i < s.length; i++) {
		tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
	}
	tail[i >> 2] |= 0x80 << ((i % 4) << 3);
	if(i > 55) {
		md5.cycle(state, tail);
		for(i = 0; i < 16; i++) {
			tail[i] = 0;
		}
	}
	tail[14] = n * 8;
	md5.cycle(state, tail);
	return raw ? state : md5.hex(state);
}
md5.cycle = function(x, k) {
	var a = x[0], b = x[1], c = x[2], d = x[3];

	a = md5.ff(a, b, c, d, k[0], 7, -680876936);
	d = md5.ff(d, a, b, c, k[1], 12, -389564586);
	c = md5.ff(c, d, a, b, k[2], 17, 606105819);
	b = md5.ff(b, c, d, a, k[3], 22, -1044525330);
	a = md5.ff(a, b, c, d, k[4], 7, -176418897);
	d = md5.ff(d, a, b, c, k[5], 12, 1200080426);
	c = md5.ff(c, d, a, b, k[6], 17, -1473231341);
	b = md5.ff(b, c, d, a, k[7], 22, -45705983);
	a = md5.ff(a, b, c, d, k[8], 7, 1770035416);
	d = md5.ff(d, a, b, c, k[9], 12, -1958414417);
	c = md5.ff(c, d, a, b, k[10], 17, -42063);
	b = md5.ff(b, c, d, a, k[11], 22, -1990404162);
	a = md5.ff(a, b, c, d, k[12], 7, 1804603682);
	d = md5.ff(d, a, b, c, k[13], 12, -40341101);
	c = md5.ff(c, d, a, b, k[14], 17, -1502002290);
	b = md5.ff(b, c, d, a, k[15], 22, 1236535329);

	a = md5.gg(a, b, c, d, k[1], 5, -165796510);
	d = md5.gg(d, a, b, c, k[6], 9, -1069501632);
	c = md5.gg(c, d, a, b, k[11], 14, 643717713);
	b = md5.gg(b, c, d, a, k[0], 20, -373897302);
	a = md5.gg(a, b, c, d, k[5], 5, -701558691);
	d = md5.gg(d, a, b, c, k[10], 9, 38016083);
	c = md5.gg(c, d, a, b, k[15], 14, -660478335);
	b = md5.gg(b, c, d, a, k[4], 20, -405537848);
	a = md5.gg(a, b, c, d, k[9], 5, 568446438);
	d = md5.gg(d, a, b, c, k[14], 9, -1019803690);
	c = md5.gg(c, d, a, b, k[3], 14, -187363961);
	b = md5.gg(b, c, d, a, k[8], 20, 1163531501);
	a = md5.gg(a, b, c, d, k[13], 5, -1444681467);
	d = md5.gg(d, a, b, c, k[2], 9, -51403784);
	c = md5.gg(c, d, a, b, k[7], 14, 1735328473);
	b = md5.gg(b, c, d, a, k[12], 20, -1926607734);

	a = md5.hh(a, b, c, d, k[5], 4, -378558);
	d = md5.hh(d, a, b, c, k[8], 11, -2022574463);
	c = md5.hh(c, d, a, b, k[11], 16, 1839030562);
	b = md5.hh(b, c, d, a, k[14], 23, -35309556);
	a = md5.hh(a, b, c, d, k[1], 4, -1530992060);
	d = md5.hh(d, a, b, c, k[4], 11, 1272893353);
	c = md5.hh(c, d, a, b, k[7], 16, -155497632);
	b = md5.hh(b, c, d, a, k[10], 23, -1094730640);
	a = md5.hh(a, b, c, d, k[13], 4, 681279174);
	d = md5.hh(d, a, b, c, k[0], 11, -358537222);
	c = md5.hh(c, d, a, b, k[3], 16, -722521979);
	b = md5.hh(b, c, d, a, k[6], 23, 76029189);
	a = md5.hh(a, b, c, d, k[9], 4, -640364487);
	d = md5.hh(d, a, b, c, k[12], 11, -421815835);
	c = md5.hh(c, d, a, b, k[15], 16, 530742520);
	b = md5.hh(b, c, d, a, k[2], 23, -995338651);

	a = md5.ii(a, b, c, d, k[0], 6, -198630844);
	d = md5.ii(d, a, b, c, k[7], 10, 1126891415);
	c = md5.ii(c, d, a, b, k[14], 15, -1416354905);
	b = md5.ii(b, c, d, a, k[5], 21, -57434055);
	a = md5.ii(a, b, c, d, k[12], 6, 1700485571);
	d = md5.ii(d, a, b, c, k[3], 10, -1894986606);
	c = md5.ii(c, d, a, b, k[10], 15, -1051523);
	b = md5.ii(b, c, d, a, k[1], 21, -2054922799);
	a = md5.ii(a, b, c, d, k[8], 6, 1873313359);
	d = md5.ii(d, a, b, c, k[15], 10, -30611744);
	c = md5.ii(c, d, a, b, k[6], 15, -1560198380);
	b = md5.ii(b, c, d, a, k[13], 21, 1309151649);
	a = md5.ii(a, b, c, d, k[4], 6, -145523070);
	d = md5.ii(d, a, b, c, k[11], 10, -1120210379);
	c = md5.ii(c, d, a, b, k[2], 15, 718787259);
	b = md5.ii(b, c, d, a, k[9], 21, -343485551);

	x[0] = md5.add32(a, x[0]);
	x[1] = md5.add32(b, x[1]);
	x[2] = md5.add32(c, x[2]);
	x[3] = md5.add32(d, x[3]);
};
md5.cmn = function(q, a, b, x, s, t) {
	a = md5.add32(md5.add32(a, q), md5.add32(x, t));
	return md5.add32((a << s) | (a >>> (32 - s)), b);
};
md5.ff = function(a, b, c, d, x, s, t) {
	return md5.cmn((b & c) | ((~b) & d), a, b, x, s, t);
};
md5.gg = function(a, b, c, d, x, s, t) {
	return md5.cmn((b & d) | (c & (~d)), a, b, x, s, t);
};
md5.hh = function(a, b, c, d, x, s, t) {
	return md5.cmn(b ^ c ^ d, a, b, x, s, t);
};
md5.ii = function(a, b, c, d, x, s, t) {
	return md5.cmn(c ^ (b | (~d)), a, b, x, s, t);
};
md5.blk = function(s) {
	var md5blks = [], i; /* Andy King said do it this way. */
	for (i = 0; i < 64; i += 4) {
		md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
	}
	return md5blks;
};
md5.hex = function(x) {
	for (var i = 0; i < x.length; i++) {
		x[i] = md5.hex.r(x[i]);
	}
	return x.join('');
};
md5.hex.r = function(n) {
	var s = '', j = 0;
	for (; j < 4; j++) {
		s += md5.hex.chr[(n >> (j * 8 + 4)) & 0x0F] + md5.hex.chr[(n >> (j * 8)) & 0x0F];
	}
	return s;
};
md5.hex.chr = '0123456789abcdef'.split('');
md5.add32 = function(a, b) {
	return (a + b) & 0xFFFFFFFF;
};
if(md5('hello') != '5d41402abc4b2a76b9719d911017c592') {
	md5.add32 = function(x, y) {
		var lsw = (x & 0xFFFF) + (y & 0xFFFF), msw = (x >> 16) + (y >> 16) + (lsw >> 16);
		return (msw << 16) | (lsw & 0xFFFF);
	};
}
