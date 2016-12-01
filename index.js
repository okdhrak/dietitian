// -----------------------------------------------------------------------------
// 定数の設定
const LINE_CHANNEL_ACCESS_TOKEN = 'P/1kDx8RI8KTNEU6EAY2PmLh0rWVTUVqNCeIMs05rbHwUJr25umCi98oGhBBYpY+zpY4XLwpuBPZIiL8Hs7PJf8uKL5OwpH/3SK3Xr2a2lKBRlqhhneEa7YFWxP5eLVNWv38AsQR7IAzkuhydZuCJgdB04t89/1O/w1cDnyilFU='; // 追加

// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// モジュールのインポート
var express = require('express');
var bodyParser = require('body-parser'); // 追加
var request = require('request'); // 追加
var mecab = require('mecabaas-client'); // 追加
var shokuhin = require('shokuhin-db'); // 追加
var app = express();

// -----------------------------------------------------------------------------
// ミドルウェア設定
app.use(bodyParser.json()); // 追加

// -----------------------------------------------------------------------------
// Webサーバー設定
var port = (process.env.PORT || 3000);
var server = app.listen(port, function() {
    console.log('Node is running on port ' + port);
});

// -----------------------------------------------------------------------------
// ルーター設定
app.get('/', function(req, res, next){
    res.send('Node is running on port ' + port);
});

// webhook
// LINEからのリクエストに対するレスポンス
/*app.post('/webhook', function(req, res, next){
    res.status(200).end();
    for (var event of req.body.events){
        if (event.type == 'message'){
            console.log(event.message);
        }
    }
});*/

/*app.post('/webhook', function(req, res, next){
    res.status(200).end();
    for (var event of req.body.events){
        if (event.type == 'message' && event.message.text == 'ハロー'){
            var headers = {//①
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
            }
            var body = {//②
                replyToken: event.replyToken,
                messages: [{
                    type: 'text',
                    text: 'しばくぞ！'
                }]
            }
            var url = 'https://api.line.me/v2/bot/message/reply';//③
            request({//④
                url: url,
                method: 'POST',
                headers: headers,
                body: body,
                json: true
            });
        }
    }
});*/

/*app.post('/webhook', function(req, res, next){
    res.status(200).end();
    for (var event of req.body.events){
        if (event.type == 'message' && event.message.text){
             // Mecabクラウドサービスでメッセージを解析
            mecab.parse(event.message.text)
            .then(
                function(response){
                      // 解析結果を出力
                    console.log(response);
                }
            );

        }
    }
});*/

app.post('/webhook', function(req, res, next){
    res.status(200).end();
    for (var event of req.body.events){
        if (event.type == 'message' && event.message.text){
            mecab.parse(event.message.text)
            .then(
                function(response){
                    var foodList = [];
                    for (var elem of response){
                        if (elem.length > 2 && elem[1] == '名詞'){
                            foodList.push(elem);
                        }
                    }
                    var gotAllNutrition = [];
                    if (foodList.length > 0){
                        for (var food of foodList){
                            gotAllNutrition.push(shokuhin.getNutrition(food[0]));
                        }
                        return Promise.all(gotAllNutrition);
                    }
                }
            ).then(
                function(response){
                    console.log(response);
                }
            );
        }
    }
});
