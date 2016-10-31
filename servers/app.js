var express = require("express");

var app = new express();

var path = require("path");

var saticpath = path.join(__dirname , "../static");
app.use(express.static(saticpath));

app.listen(80,function(){
	console.log("open http://127.0.0.1:3000");
});
