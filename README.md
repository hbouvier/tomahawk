Tomahawk
========

Tomahawk provide you with a minimal http server, that can be started on the command line to serve static content.

## To install 

npm install -g tomahawk


## How to use the Tomahawk web server

- To serve the current directory using the default port 8080

    tomahawk

- To serve "web/public" from the current directory using the default port 8080

	tomahawk --www=web/public

- To use a different port (e.g. 3000)
	
	tomahawk --port=3000

- How can I prefix my static content with MyApp (e.g. http://localhost:8080/MyApp insead of the default http://localhost:8080/)

	tomahawk --context=/MyApp

- How about less logging?

	tomahawk --level=error

## How can I add CORS http headers

	tomahawk --config=config.development.json
or

    tomahawk --headers='["Access-Control-Allow-Origin:*","Access-Control-Allow-Methods:GET,PUT,POST,DELETE","Access-Control-Allow-Headers:Content-Type","X-Frame-Options:ALLOWALL"]'
    
## start a CGI
    tomahawk --cgi='[{"route":"/echo","method":"POST","command":"/bin/sh", "args":["-c", "read line ; echo $line"], "encoding":"utf8"}]'
    echo allo | curl -X POST -d @- http://localhost:8080/echo


- Can I save the configration, to avoid typing it every time?

	1) Either create a config.json and save it in the current working directory
	2) Create your configuration file (e.g. tommy.cfg) and :
		tomahawk --config=tommy.cfg
	or
		export CONFIG=tommy.cfg
		tomahawk

	Your configuration file should look like:

	    {
            "level"      : "error",
            "www"        : ".",
            "context"    : "/MyApp",
            "port"       : 9000,
            "headers"    : [
                "Access-Control-Allow-Origin:*",
                "X-Frame-Options:ALLOWALL"
            ],
            "cgi" : [
                {
                    "route"   : "/version",
                	"method"  : "GET",
                	"command" : "/bin/sh",
                	"args"    : ["-c",  "echo '{\"version\":\"1.0.0\"}'"]
                }
            ]
         }
