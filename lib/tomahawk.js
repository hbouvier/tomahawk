module.exports = function () {
    var
        fs           = require('fs'),
        path         = require('path'),
        express      = require('express'),
        connect      = require('connect'),
        morgan       = require('morgan'),
        bodyparser   = require('body-parser'),
        errorhandler = require('errorhandler'),
        http         = require('http'),
        opts         = require('node-options'),
        baseConfig   = opts.readPackageConfig(path.join(__dirname, '..', 'package.json'));

    function Tomahawk(config) {
        var $this         = this,
            shutdownHooks = [];
            
        // Setup the configuration
        this.config  = opts.mergeEnvironment(opts.merge(config ? config : {}, baseConfig));
        this.meta    = this.config.meta ? this.config.meta : (this.config.name + '-Engine');
        if (this.config.logger) {
            this.logger = this.config.logger
        } else {
            var winston = require('winston'),
                meta = {
                    "module": $this.config.name || $this.meta,
                    "pid": process.pid
                };
            $this.logger = new (winston.Logger)({ transports: [
                new (winston.transports.Console)({
                    "level": $this.config.level || "info",
                    "json": false,
                    "colorize": true
                })
            ]});
        }
        
        if (!this.config.www) this.config.www = process.cwd();
        if (this.config.www.charAt(0) !== '/')
            this.config.www = path.join(process.cwd(), this.config.www);

        // Parse the http headers (provided)
        this.headers = _parseHTTPHeaders(this.config.headers, this.logger, this.meta);

        // The Express and the HTTP server
        this.app     = express();
        this.server  = http.Server(this.app);

        // Setup the Windson Logger
        $this.app.use(morgan('combined', {
            stream : {
                write : function (message, encoding) {
                    if ($this.logger && $this.logger.log) {
                        $this.logger.log('info', message.replace(/\n/, ''), $this.meta);
                    }
                }
            }
        }));

        // Setup the Body Parser
        $this.logger.log('info', 'Tomahawk loading express body-parser urlencoded (extended)"', $this.meta);
        $this.app.use(bodyparser.urlencoded({ extended: true }));
        var requestBodyParser = $this.config.bodyparser instanceof Array ? $this.config.bodyparser : (typeof($this.config.bodyparser) === 'string' ? [$this.config.bodyparser] : ['./bodyparser']);
        for (var i = 0 ; i < requestBodyParser.length ; ++i) {
            $this.logger.log('info', 'Tomahawk loading express body parser "%s"', requestBodyParser[i], $this.meta);
            require(requestBodyParser[i])($this.app, $this.config, $this);
        }

        // Setup Express to user the provided HTTP Headers
        $this.app.use(function(req, res, next) {
            for (var i = 0 ; i < $this.headers.length ; ++i) {
                $this.logger.log('info', 'Tomahawk registering http header "%s : %s"', $this.headers[i].name, $this.headers[i].value, $this.meta);
                res.setHeader($this.headers[i].name, $this.headers[i].value);
            }
            return next();
        });

        // Setup Express Static Content
        if ($this.config.context) {
            $this.logger.log('info', 'Tomahawk url map to static content: URL[%s] Path[%s]', $this.config.context, $this.config.www, $this.meta);
            $this.app.use($this.config.context, express.static($this.config.www));
        }

        // Setup Express ERROR handlers
        if ($this.level === 'error') {
            $this.app.use(errorhandler());
        } else {
            $this.app.use(errorhandler());
        }

        // Setup CTRL-C and "exit" hooks
        process.on('exit', function() {
            shutdownHooks.forEach(function (hook) {
                hook();
            });
            $this.logger.log('error', 'Tomahawk caught an EXIT', $this.meta);
        });
        process.on('SIGINT', function() {
            shutdownHooks.forEach(function (hook) {
                hook();
            });
            $this.logger.log('warn', 'Tomahawk caught a SIGINT', $this.meta);
            process.exit(0);
        });
        
        ////////////////////////////////////////////////////////////////////////
        // Load the Plugins
        var pluginPath = path.join($this.config.rootPath, "..");
        for (var prop in $this.config.plugins) {
            if ($this.config.plugins.hasOwnProperty(prop)) {
                var plugin = $this.config.plugins[prop];
                var thisPluginPath = (plugin.implementation.charAt(0) === '/') ? plugin.implementation : path.join(pluginPath, plugin.implementation);
                try {
                    var pluginPkgConfig = JSON.parse(fs.readFileSync(path.join(thisPluginPath, "package.json")));
                    var pluginImpl = require(path.join(thisPluginPath, pluginPkgConfig.main));
                    config[prop] = $this.config[prop] = pluginImpl($this.app, $this.config, $this);
                    if ($this.config[prop] && $this.config[prop].shutdown) {
                        shutdownHooks.push($this.config[prop].shutdown);
                    }
                    if ($this.config[prop] && $this.config[prop].constructor) {
                        $this.config[prop].constructor();
                    }
                    $this.logger.log('info', 'Tomahawk loading plugin %s version %s', thisPluginPath, pluginPkgConfig.version, $this.meta);
                } catch (e) {
                    $this.logger.log('error', 'Tomahawk plugin-path [%s] plugin %j [EXCEPTION: %s/%j]', pluginPath, plugin, e, e, $this.meta);
                }
            }
        }
    }

    Tomahawk.prototype.start = function() {
        var $this = this;
        $this.logger.log('info', 'Tomahawk version %s, starting http://%s:%s%s [%s]', 
            ($this.config.version ? $this.config.version : '0.0.0'), 
            $this.config.ip, $this.config.port,
            $this.config.context,
            $this.config.www,
            $this.meta);
        this.server.listen(this.config.port, this.config.ip);
        return this.app;
    }

    ///////////////////////////////////////////////////////////////////////////
    //
    function _parseHTTPHeaders(headers, logger, meta) {
        var regex  = /\s*([^\s:]*)\s*:\s*([^\s\n\r]*)/,
            parsedHeaders = [];
        headers = headers instanceof Array ? headers : [headers ? headers : ""];
        for (var i = 0 ; i < headers.length ; ++i) {
            var header = headers[i];
            var match = regex.exec(header);
            if (match && match.length === 3) {
                parsedHeaders.push({name:match[1], value:match[2]});
                logger.log('debug', 'http-header|%s : %s', match[1], match[2], meta);
            } else {
                logger.log('warn', 'http-header|IGNORING-INVALID-HEADER|%s|expecting=type : value', header, meta);
            }
        }
        return parsedHeaders;
    }

    function create(config) {
        return new Tomahawk(config);
    }

    return {
        create : create
    };
}();
