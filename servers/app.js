var express = require("express");

var app = new express();

var path = require("path");

require("./token.js")(app);
require("./jssdk.js")(app);

var saticpath = path.join(__dirname , "../static");
app.use(express.static(saticpath));

app.listen(8000,function(){
	console.log("open http://127.0.0.1:80");
});
