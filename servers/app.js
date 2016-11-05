var express = require("express");
//post 请求处理模块
var bodyparser = require("body-parser");

var app = new express();
//处理 post 请求，将 post 请求的数据封装为 json 
app.use(bodyparser.urlencoded({
	extended: true
}));


var path = require("path");

require("./token.js")(app);
require("./jssdk.js")(app);

var saticpath = path.join(__dirname , "../static");
app.use(express.static(saticpath));

app.listen(9876,function(){
	console.log("open http://127.0.0.1:80");
});
