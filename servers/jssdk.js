
var querystring = require('querystring');
var fs = require('fs');
var path = require("path");
var crypto = require("crypto");
var Url = require("url");
var WechatAPI = require('wechat-api');
var config = require("./config.js")();


function md5(data) {
    var Buffer = require("buffer").Buffer;
    var buf = new Buffer(data);
    var str = buf.toString("binary");
    return "md5_" + crypto.createHash("md5").update(str).digest("hex");
}

module.exports = function(app) {
     api = new WechatAPI(config.appid, config.appsecret);
    var cachedSignatures = {};
    // 输出数字签名对象
    var responseWithJson = function(res, data) {
        // 允许跨域异步获取
        res.set({
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST,GET",
            "Access-Control-Allow-Credentials": "true",
            "Content-Type": "text/javascript; charset=utf-8"
        });
        res.send(data);
    };

    // 2小时后过期，需要重新获取数据后计算签名
    var expireTime = 7200 - 100;
    // 时间戳产生函数
    var createTimeStamp = function() {
        return parseInt(new Date().getTime() / 1000) + '';
    };
    // 通过请求中带的index值来判断是公司运营的哪个公众平台
    function jssdk(req, res) {
        var getdata = function() {
            var data = req.query || {},
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

        url = path.normalize(url);


        var signatureObj = cachedSignatures[md5(url)] || null;
        var create = function() {
            api.getJsConfig({
                debug: false,
                jsApiList: [
                    'checkJsApi',
                    'onMenuShareTimeline',
                    'onMenuShareAppMessage',
                    'onMenuShareQQ',
                    'onMenuShareWeibo'
                ],
                url: url
            }, function(err, result) {
                result.ts = createTimeStamp();
                result.url = url;
                cachedSignatures[md5(url)] = result;
                responseWithJson(res, result);
            });
        };

        // 如果缓存中已存在签名，则直接返回签名
        if (signatureObj && signatureObj.ts) {
            var t = createTimeStamp() - signatureObj.ts;
            // 未过期，并且访问的是同一个地址
            // 判断地址是因为微信分享出去后会额外添加一些参数，地址就变了不符合签名规则，需重新生成签名
            if (t < expireTime && signatureObj.url == url) {
                return responseWithJson(res, signatureObj);
            } else {
                delete cachedSignatures[url];
                create();
            }
        }
        else{
            create();
        }

    };


    app.use('/wechat/jssdk',jssdk);
    console.log("config ready");
};