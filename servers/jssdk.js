/**
 * 微信 jssdk API 前面算法
 */
// 文件 io 模块
var fs = require('fs');
// 处理路径的模块
var path = require("path");
// md5 一个字符串算法模块
var crypto = require("crypto");
// url location 对象模块
var Url = require("url");
// 微信 api 模块
var WechatAPI = require('wechat-api');
// 微信 个人信息配置模块
var config = require("./config.js")();

function md5(data) {
    var Buffer = require("buffer").Buffer;
    var buf = new Buffer(data);
    var str = buf.toString("binary");
    return "md5_" + crypto.createHash("md5").update(str).digest("hex");
}

function jssdk(app){
	//设置一个路由接口地址
	// 
//	app.use('/wechat/jssdk',function(req,res){
//		// req.query 获取到的是请求参数中的所有 get 形式的 参数
//		var callbackName = req.query['callback'];
//		var data = {
//			"success" : true,
//			"data" : [
//				{ "a" : 1 },
//				{ "b" : 2 }
//			]
//		};
//		res.send(`${callbackName}(${JSON.stringify(data)});`);
//	});
	
//	app.get()
//	app.post()
//	app.use() // post + get 两种都可以请求到这个接口

	// 2小时后过期，需要重新获取数据后计算签名
    var expireTime = 7200 - 100;
    // 时间戳产生函数
    var createTimeStamp = function() {
        return parseInt(new Date().getTime() / 1000) + '';
    };
    //缓存每一次签名的结果
	var cachedSignatures = {};

	//实例化 微信 api 模块
	var api = new WechatAPI(config.appid, config.appsecret);

	//获取签名权限
	function createSignature(res,query){
		console.log('create Signature');
		//需要获取的权限
		//没有指定获取什么签名就使用默认值
		var apilist = query.apilist || "";
		if(apilist){
			apilist = apilist.split(",");
		}else{
			apilist = [
			 	'onMenuShareTimeline',
                'onMenuShareAppMessage',
                'onMenuShareQQ',
                'onMenuShareWeibo'
		 	]
		}
		//签名权限配置
		var param = {
		 	debug: false,
		 	jsApiList: apilist,
		 	//需要做签名的 http url 地址
		 	url: query.url
		};
		api.getJsConfig(param, function(err,result){
			//添加本次签名的 http url 地址
			result.url = query.url;
			//把获取签名的结果返回去
			responseWithJson(res,query,result);
			//对 url 做 md5 算法, 以 url 做为 缓存数据的键值
	        var cacheKey = md5(query.url);
	        //缓存本次签名结果
	        cachedSignatures[cacheKey] = result;
		});
	}
	//返回签名权限
	function responseWithJson(res,query,result){
		// 允许跨域异步获取
        res.set({
        	//允许任意域名跨域
            "Access-Control-Allow-Origin": "*",
            //允许请求的形式 可以是 post 与 get
            "Access-Control-Allow-Methods": "POST,GET",
            "Access-Control-Allow-Credentials": "true",
            //字节流的编码格式
            "Content-Type": "text/javascript; charset=utf-8"
        });
        // query 获取到的是请求参数中的所有 get 形式的 参数
		var callbackName = query['callback'];
		
		//如果有 callback 就以 jsonp 形式返回数据
		if(callbackName){
			res.send(`${callbackName}(${JSON.stringify(result)});`);
		}else{
			//默认返回 json 数据
			res.send(result);
		}
	}
	
	app.use("/wechat/jssdk",function(req,res){
		//获取请求的数据
		var getdata = function() {
			//get 形式数据
            var data = req.query || {},
            	//posgt 数据
                body = req.body || {},
                params = req.params || {};
            for (var key in body) {
                data[key] = body[key];
            }
            for (var key in params) {
                data[key] = params[key];
            }
            return data;
        };
        var query = getdata();
        console.log(query);
        var headers = req.headers;
        //拿到请求的目标的地址
        //比如 浏览器访问 服务器，拿到的是发起请求的的域名或则 ip
        var referer = query['referer'] || headers['referer'];
        //如果获取不到，根据请求过来的 host 拼接地址
        if (!referer) {
            referer = "http://" + req.headers.host;
        }
        var location_param =  Url.parse(referer,true);
        var url = location_param.protocol +
            "//"+location_param.hostname +
            location_param.pathname + 
            location_param.path;
		//去重 比如有 // 类似的转换为 / 
        url = url.replace(/\/\//g,"/").replace(/:\//i,"://");
        
        query.url = url;
        //对 url 做 md5 算法, 以 url 做为 缓存数据的键值
        var cacheKey = md5(query.url);
        
        var signatureObj = cachedSignatures[cacheKey];
        
        // 如果缓存中已存在签名，则直接返回签名
        if (signatureObj && signatureObj.timestamp) {
            var t = createTimeStamp() - signatureObj.timestamp;
            // 未过期，并且访问的是同一个地址
            // 判断地址是因为微信分享出去后会额外添加一些参数，地址就变了不符合签名规则，需重新生成签名
            if (t < expireTime && signatureObj.url == query.url) {
                return responseWithJson(res, query, signatureObj);
            } else {
            	//删除过时的缓存数据
                delete cachedSignatures[cacheKey];
                //重新生成签名
                createSignature(res,query);
            }
        }
        else{
        	//没有签名数据,直接获取签名
            createSignature(res,query);
        }
	});
}


module.exports = jssdk;