//字符串加密处理
var crypto = require("crypto");
//个心信息配置
var config = require("./config.js")();

//字符串加密
function sha1(str){
  var md5sum = crypto.createHash("sha1");
  md5sum.update(str);
  str = md5sum.digest("hex");
  return str;
}
// http://wx.jsccok.cn/wechat/svonme
function main(app) {
	app.use('/wechat/svonme', function(req, res, next){
		// url 
	   	var query = req.query;
		var signature = query.signature;
		var echostr = query.echostr;
		var timestamp = query['timestamp'];
		var nonce = query.nonce;
		var oriArray = new Array();
		oriArray[0] = nonce;
		oriArray[1] = timestamp;
		//这里是你在微信开发者中心页面里填的token
		oriArray[2] = config.token;
		oriArray.sort(); // ASCII 排序
		var original = oriArray.join('');
		console.log("Original str : " + original);
		console.log("Signature : " + signature );

		var scyptoString = sha1(original);

		if(signature == scyptoString){
			res.send(echostr);
			console.log("Confirm and send echo back");
		}else {
			res.send(false);
			console.log("Failed!");
		}
	});
}
module.exports = main;
