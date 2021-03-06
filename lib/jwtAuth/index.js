var jwt               = require('jsonwebtoken');
var SETTINGS          = require('../dfx_settings');
var credCrypt         = require('../auth/utils/credCrypt');
var Q                 = require('q');
var mdbw              = require('../mdbw')(SETTINGS.mdbw_options);
var repositoryPrefix  = SETTINGS.databases_tenants_name_prefix;
var tokenExpiresIn    = SETTINGS.TOKEN_EXPIRES_IN;


var auth = {};

auth.login = function(req, res) {
    var username    = req.body.username;
    var password    = req.body.password;
    var tenant      = req.body.tenant;
    var application = req.body.application;
    if (!username) {
        res.status(401).send('Username is required');
    } else if (!password) {
        res.status(401).send('Password is required');
    } else if (!application) {
        res.status(401).send('Application is required');
    }
    else if (!tenant) {
        res.status(401).send('Tenant is required');
    } else {
        var query = {
            "kind": "application",
            "application": application,
            "credentials.login": username
        }
        mdbw.get(repositoryPrefix + tenant, 'users', query).then(function (docs) {
            if (!docs.length) {
                res.status(401).send('User ' + username + ' not found');
            } else {
                Q.when(credCrypt.decrypt(docs[0].credentials.pass), function (truePass) {
                    query.tenant = tenant;
                    var secret = application + '_' + tenant;
                    if (password === truePass) {
                        var token = jwt.sign(query, secret, { expiresIn: tokenExpiresIn });
                        res.send(token);
                    } else {
                        res.status(401).send('Wrong password');
                    }
                });
            }
        });
    }
}

auth.appGate = function(req, res, cb) {
    var token = req.body.token || req.query.token || req.params.token;
    var appname   = req.body.appname || req.query.appname || req.params.appname;
    var tenantId  = req.body.tenantId || req.query.tenantId || req.params.tenantId;

    var query = {name:appname};
    mdbw.get(repositoryPrefix + tenantId, 'applications', query).then(function (docs) {
            var app_type = docs[0].security || 'public';
            if ((app_type === 'public') || (SETTINGS.studio)) {
                req.user = {};
                req.user.tenantid = tenantId;
                cb();
            } else {
                var secret = appname + '_' + tenantId;
                jwt.verify(token, secret, function(err, decoded) {
                    if (err) {
                        res.status(401).send('Unauthorized');
                    } else {
                        req.user = {};
                        req.user.tenantid = decoded.tenant;
                        cb();
                    }
                });
            }
    }).fail(function(err) {
        res.status(401).send("Error " + err);
    });
}

module.exports = auth;
