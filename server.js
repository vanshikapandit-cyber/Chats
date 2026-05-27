require("dotenv").config();

const express = require("express");
const http = require("http");
const mysql = require("mysql2");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server,{
    cors:{
        origin:"*"
    }
});

const db = mysql.createConnection({

    host:process.env.DB_HOST,
    user:process.env.DB_USER,
    password:process.env.DB_PASSWORD,
    database:process.env.DB_NAME

});

db.connect((err)=>{

    if(err){

        console.log(err);

    }else{

        console.log("MySQL Connected");

    }

});

app.post("/register",(req,res)=>{

    const {
        name,
        email,
        password
    } = req.body;

    db.query(

        "INSERT INTO users(name,email,password) VALUES(?,?,?)",

        [name,email,password],

        (err,result)=>{

            if(err){

                return res.json({
                    success:false
                });

            }

            res.json({
                success:true
            });

        }

    );

});

app.post("/login",(req,res)=>{

    const {
        email,
        password
    } = req.body;

    db.query(

        "SELECT * FROM users WHERE email=? AND password=?",

        [email,password],

        (err,result)=>{

            if(result.length > 0){

                res.json({

                    success:true,
                    user:result[0]

                });

            }else{

                res.json({
                    success:false
                });

            }

        }

    );

});

io.on("connection",(socket)=>{

    console.log("User Connected");

    socket.on("join",(userId)=>{

        socket.join(`user_${userId}`);

    });

    socket.on("send_message",(data)=>{

        db.query(

            "INSERT INTO messages(sender_id,receiver_id,message) VALUES(?,?,?)",

            [
                data.sender_id,
                data.receiver_id,
                data.message
            ]

        );

        io.to(`user_${data.receiver_id}`)
        .emit("receive_message",data);

        

    });

});
  app.get("/users",(req,res)=>{

    db.query(

        "SELECT id,name,email FROM users",

        (err,result)=>{

            res.json(result);

        }

    );

});
app.get("/messages/:sender/:receiver",(req,res)=>{

    const sender =
        req.params.sender;

    const receiver =
        req.params.receiver;

    db.query(

        `SELECT * FROM messages
        WHERE
        (
            sender_id=? AND receiver_id=?
        )
        OR
        (
            sender_id=? AND receiver_id=?
        )
        ORDER BY id ASC`,

        [
            sender,
            receiver,
            receiver,
            sender
        ],

        (err,result)=>{

            res.json(result);

        }

    );

});

server.listen(process.env.PORT,"0.0.0.0",()=>{

    console.log(
        `Server Running On Port ${process.env.PORT}`
    );

});