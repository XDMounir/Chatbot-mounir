'use strict';
const request = require('request')
const config = require('./config');
const pg = require('pg');
pg.defaults.ssl = true;

module.exports = function (callback, senderID) {
    request({
        uri: 'https://graph.facebook.com/v3.2/' + senderID,
        qs: {
            access_token: config.FB_PAGE_TOKEN
        }

    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var user = JSON.parse(body);
            if (user.first_name) {
                var pool = new pg.Pool(config.PG_CONFIG);
                pool.connect(function (err, client, done) {
                    if (err) {
                        return console.error('Error acquiring client', err.stack);
                    }
                    console.log('fetching user');
                    client.query(`SELECT id FROM users WHERE fb_id='${senderID}' LIMIT 1`,
                        function (err, result) {
                            console.log('query result ' + result);
                            if (err) {
                                console.log('Query error: ' + err);
                            } else {
                                console.log('rows: ' + result.rows.length);
                                if (result.rows.length === 0) {
                                    let sql = 'INSERT INTO users (fb_id, first_name, last_name, profile_pic, ' +
                                        'locale, timezone) VALUES ($1, $2, $3, $4, $5, $6)';
                                    console.log('sql: ' + sql);
                                    client.query(sql,
                                        [
                                            senderID,
                                            user.first_name,
                                            user.last_name,
                                            user.profile_pic,
                                            user.locale,
                                            user.timezone
                                        ]);
                                }
                            }
                        });
                    callback(user)
                });
                pool.end();
            }
        } else {
            console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
        }
    });
}