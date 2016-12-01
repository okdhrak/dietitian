// -----------------------------------------------------------------------------
// モジュールのインポート
var express = require('express');
var app = express();

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
app.post('/webhook', function(req, res, next){
    res.status(200).end();//200を返す
    console.log(req.body);
});
