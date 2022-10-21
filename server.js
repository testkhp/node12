const express = require("express");
const MongoClient = require("mongodb").MongoClient;
const moment = require("moment");


const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');


const app = express();
const port = process.env.PORT || 5000;

app.set("view engine","ejs");
app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));
app.use(session({secret : 'secret', resave : true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());


MongoClient.connect("mongodb+srv://admin:qwer1234@testdb.bsly6wn.mongodb.net/?retryWrites=true&w=majority",function(err,result){
    //에러가 발생했을경우 메세지 출력(선택사항)
    if(err) { return console.log(err); }

    //위에서 만든 db변수에 최종연결 ()안에는 mongodb atlas 사이트에서 생성한 데이터베이스 이름
    db = result.db("testdb");

    //db연결이 제대로 됬다면 서버실행
    app.listen(port,function(){
        console.log("서버연결 성공");
    });

});


//메인페이지 get 요청
app.get("/",function(req,res){
    res.render("index",{userData:req.user}); //로그인시 회원정보데이터 ejs 파일로 전달
});


//게시글 목록 get 요청
app.get("/brdlist",function(req,res){
    db.collection("ex12_board").find().toArray(function(err,result){
        res.render("brdlist",{brdData:result,userData:req.user});
    });
    //db안에 게시글 콜렉션 찾아서 데이터 전부 꺼내오고 ejs파일로 응답
});

//게시글 작성 페이지 get 요청
app.get("/brdinsert",function(req,res){
    //게시글 작성페이지 ejs 파일 응답
    res.render("brdinsert",{userData:req.user});
});

//게시글 작성 후 데이터베이스에 넣는 작업 요청
app.post("/add",function(req,res){
    //moment 사용해서 현재시간 추가
    db.collection("ex12_count").findOne({name:"게시판"},function(err,result){
        db.collection("ex12_board").insertOne({
            brdid:result.totalBoard + 1,
            brdtitle:req.body.title,
            brdcontext:req.body.context,
            brdauther:req.user.joinnick,
            // brddate:한국현재시간
        },function(err,result){
            db.collection("ex12_count").updateOne({name:"게시판"},{$inc:{totalBoard:1}},function(err,result){
                res.redirect("/brdlist"); //게시글 작성 후 게시글 목록경로 요청
            });
        });
    });
});

//게시글 상세화면 get 요청  /:변수명  작명가능
//db안에 해당 게시글번호에 맞는 데이터만 꺼내오고 ejs파일로 응답
app.get("/brddetail/:no",function(req,res){
    db.collection("ex12_board").findOne({brdid:Number(req.params.no)},function(err,result){
        res.render("brddetail",{brdData:result,userData:req.user});
    });
});


//회원가입 페이지 get 요청
app.get("/join",function(req,res){
    res.render("join"); //회원가입 페이지로 응답
});

//회원가입 페이지에서 보내준 데이터를 db에 저장요청
app.post("/joindb",function(req,res){
    db.collection("ex12_join").findOne({joinid:req.body.userid},function(err,result){
        //db베이스에서 해당 회원아이디가 존재하는경우
        if(result){
            res.send("<script>alert('이미 가입된 아이디입니다'); location.href='/join'; </script>")
        }
        else{
                db.collection("ex12_count").findOne({name:"회원정보"},function(err,result){
                db.collection("ex12_join").insertOne({
                    joinno:result.joinCount + 1,
                    joinid:req.body.userid,
                    joinpass:req.body.userpass,
                    joinnick:req.body.usernick
                    //프로퍼티명 작명하고 값은 이메일,전화번호 값 추가
                },function(err,result){
                    db.collection("ex12_count").updateOne({name:"회원정보"},{$inc:{joinCount:1}},function(err,result){
                        res.send("<script>alert('회원가입 성공이 완료되었습니다.'); location.href='/login'; </script>")
                    });
                });
            });
        }
    });
});


//로그인 경로 get 요청
app.get("/login",function(req,res){
    res.render("login");
});

//로그아웃 경로 get 요청
app.get("/logout",function(req,res){
    req.session.destroy(function(err){ // 요청 -> 세션제거
        res.clearCookie("connect.sid"); // 응답 -> 본인접속 웹브라우저 쿠키 제거
        res.redirect("/");// 메인페이지 이동 
    });
});

//로그인 페이지에서 입력한 아이디 비밀번호 검증 처리 요청
app.post("/loginresult",passport.authenticate('local', {failureRedirect : '/fail'}),function(req,res){
    //실패시 /fail 경로로 요청
    res.redirect("/"); //로그인 성공시 메인페이지로 이동
});


//  /loginresult 경로 요청시 passport.autenticate() 함수구간이 아이디 비번 로그인 검증구간
passport.use(new LocalStrategy({
    usernameField: 'userid',
    passwordField: 'userpass',
    session: true,
    passReqToCallback: false,
  }, function (userid, userpass, done) {
    // console.log(userid, userpass);
    db.collection('ex12_join').findOne({ joinid: userid }, function (err, result) {
      if (err) return done(err)
  
      if (!result) return done(null, false, { message: '존재하지않는 아이디 입니다.' })
      if (userpass == result.joinpass) {
        return done(null, result)
      } else {
        return done(null, false, { message: '비번이 틀렸습니다' })
      }
    })
  }));


  //처음 로그인 했을 시 해당 사용자의 아이디를 기반으로 세션을 생성함
  //  req.user
  passport.serializeUser(function (user, done) {
    done(null, user.joinid) //서버에다가 세션만들어줘 -> 사용자 웹브라우저에서는 쿠키를 만들어줘
  });
  
  // 로그인을 한 후 다른 페이지들을 접근할 시 생성된 세션에 있는 회원정보 데이터를 보내주는 처리
  // 그전에 데이터베이스 있는 아이디와 세션에 있는 회원정보중에 아이디랑 매칭되는지 찾아주는 작업
  passport.deserializeUser(function (id, done) {
      db.collection('ex12_join').findOne({joinid:id }, function (err,result) {
        done(null, result);
      })
  }); 

