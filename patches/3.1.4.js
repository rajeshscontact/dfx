const Q = require('q');

exports.description = 'it sets default ENV for all applications';

exports.run = function (cfg, opts) {
    const
        DB_TENANTS_PREFIX = opts.SETTINGS.databases_tenants_name_prefix,
        db = cfg.db;

    return db.get(
        'dreamface_sysdb',
        'tenants'
    )
        .then(function (tenants) {
            return Q.all(tenants.map(function ( tenant ) {
                db.get(DB_TENANTS_PREFIX + tenant.id,'applications').then(function( apps ){
                    return Q.all(apps.map(function ( app ) {
                        var default_env = {
                            "app_name" : app.name,
                            "content": [
                                {
                                    "name": "development",
                                    "data": {}
                                }
                            ]
                        }
                        return db.put(
                            DB_TENANTS_PREFIX + tenant.id,
                            'environments_map',
                            default_env
                        );
                    }));
                })

            }));
        });
};
