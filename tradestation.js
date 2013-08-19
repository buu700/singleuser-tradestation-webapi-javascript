#!/usr/bin/nodejs

/* Imports */
var $		= require('jquery');
var sugar	= require('sugar');
var exec	= require('child_process').exec;


var USER	= 'Your username';
var PASS	= 'Your password';
var KEY		= 'Your Web API public key';
var SECRET	= 'Your Web API secret';

var SECURITY_QUESTIONS	= [
	{question: '', answer: ''},
	{question: '', answer: ''},
	{question: '', answer: ''}
];


var BASEURL		= 'https://api.tradestation.com/v2/';
var JSONHEADER	= 'Content-Type: application/json';


var objectFormSerialize	= function (o) {
	return Object.keys(o).map(function (k) {
		return '{0}={1}'.assign({0: encodeURIComponent(k), 1: encodeURIComponent(o[k])});
	}).join('&');
};


var _authHeader;

var authorize	= function (callback) {
	if (_authHeader) {
		callback(_authHeader);
		return;
	}


	var authorizePage	= '{0}authorize/?client_id={1}&response_type=code'.assign({0: BASEURL, 1: KEY});

	$.get(authorizePage, function (data) {
		var $data	= $(data);

		exec('curl "{0}" --data "{1}" --compressed -s'.assign({
			0: authorizePage,
			1: objectFormSerialize({
				'__EVENTTARGET': '',
				'__EVENTARGUMENT': '',
				'__VIEWSTATE': $data.find('#__VIEWSTATE').val(),
				'__EVENTVALIDATION': $data.find('#__EVENTVALIDATION').val(),
				'username': USER,
				'password': PASS,
				'btnLogin': 'Login',
				'deviceTrustOption': ''
			})
		}), function (err, data) {
			var $data	= $(data);
			
			var question	= $data.find('#ucQuestionAndAnswer_lblQuestion').text().toLowerCase();
			
			var answer		= question.has(SECURITY_QUESTIONS[0].question.toLowerCase()) ?
				SECURITY_QUESTIONS[0].answer :
				question.has(SECURITY_QUESTIONS[1].question.toLowerCase()) ?
					SECURITY_QUESTIONS[1].answer :
					SECURITY_QUESTIONS[2].answer
			;
			
			exec('curl "{0}" --data "{1}" --compressed -D - -s -o /dev/null'.assign({
				0: authorizePage,
				1: objectFormSerialize({
					'__EVENTTARGET': '',
					'__EVENTARGUMENT': '',
					'__VIEWSTATE': $data.find('#__VIEWSTATE').val(),
					'__EVENTVALIDATION': $data.find('#__EVENTVALIDATION').val(),
					'ucQuestionAndAnswer$txtAnswer': answer,
					'ucQuestionAndAnswer$btnLogin': 'Login',
					'deviceTrustOption': false
				})
			}), function (err, data) {
				var authCode	= data.
					split('\n').
					filter(function (s) { return s.startsWith('Location: '); })[0].
					split('code=')[1]
				;

				exec('curl "{0}security/authorize" --data "{1}" --compressed -s'.assign({
					0: BASEURL,
					1: objectFormSerialize({
						'grant_type': 'authorization_code',
						'client_id': KEY,
						'client_secret': SECRET,
						'response_type': 'token',
						'code': authCode
					})
				}), function (err, data) {
					var o	= JSON.parse(data);

					var authHeader	= 'Authorization: Bearer {0}'.assign({0: o['access_token']});
					_authHeader		= authHeader;

					setTimeout(function () {
						if (_authHeader == authHeader) {
							_authHeader	= null;
						}
					},
					/* Convert seconds to milliseconds, but cut expire time by 10% to be safe */
					parseInt(o['expires_in'], 10) * 900);
					
					callback(authHeader);
				});
			});
		});
	});
};


exports.getAccount	= function (callback) {
	authorize(function (authHeader) {
		exec('curl "{0}users/{1}/accounts" -H "{2}" --compressed -s'.assign({
			0: BASEURL,
			1: USER,
			2: authHeader
		}), function (err, data) {
			var key	= JSON.parse(data)[0]['Key'];

			exec('curl "{0}accounts/{1}/balances" -H "{2}" --compressed -s'.assign({
				0: BASEURL,
				1: key,
				2: authHeader
			}), function (err, data) {
				callback({key: key, balance: parseFloat(JSON.parse(data)[0]['RealTimeAccountBalance'])});
			});
		});
	});
};
