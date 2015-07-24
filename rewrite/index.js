/**
 *
 * HTML Injector
 *  - a BrowserSync.io plugin.
 *
 */
var config    = require("./config");
var utils     = require("./utils");
var Immutable = require("immutable");

/**
 * @param {Object} opts
 * @param {BrowserSync} bs
 */
module.exports["plugin"] = function (opts, bs) {

    var ui     = bs.ui

    opts       = opts       || {};
    opts.rules = opts.rules || [];

    opts.rules = bs.getOption("rewriteRules")
        .toJS()
        .map(utils.addId)
        .map(utils.decorateTypes)
        .map(utils.decorateInputs);

    // Get original BS snippet
    var builtin = bs.snippetMw.opts.rules
        .filter(function (item) {
            return item.id === 'bs-snippet';
        });

    bs.updateRewriteRules(opts.rules.concat(builtin));

    var logger   = bs.getLogger(config.PLUGIN_NAME).info("Running...");
    var rulePath = config.OPT_PATH.concat('rules');

    if (typeof opts.logLevel !== "undefined") {
        logger.setLevel(opts.logLevel);
    }

    ui.setOptionIn(config.OPT_PATH, Immutable.fromJS({
        name:  config.PLUGIN_SLUG,
        title: config.PLUGIN_NAME,
        active: true,
        tagline: 'Rewrite HTML on the fly',
        rules: opts.rules,
        opts: opts,
        ns: config.NS,
        config: config
    }));

    function setBsRules (rules) {
        bs.updateRewriteRules(
            rules.filter(function (item) {
                return item.get('active');
            })
            .toJS()
            .concat(builtin)
        )
    }

    function updateRules (fn) {
        var rules    = ui.getOptionIn(rulePath);
        var newRules = fn(rules);
        ui.setOptionIn(rulePath, newRules);
        setBsRules(newRules);
        ui.socket.emit(config.EVENT_UPDATE, {
            rules: newRules.toJS()
        });
    }

    ui.listen(config.NS, {
        removeRule: function (data) {
            updateRules(function (rules) {
                return rules.filter(function (item) {
                    return item.get('id') !== data.rule.id;
                });
            });
        },
        pauseRule: function (data) {
            updateRules(function (rules) {
                return rules.map(function (item) {
                    if (item.get('id') === data.rule.id) {
                        return item.set('active', data.rule.active);
                    }
                    return item;
                });
            });
        }
    });
};

/**
 * Plugin name.
 * @type {string}
 */
module.exports["plugin:name"] = config.PLUGIN_NAME;

