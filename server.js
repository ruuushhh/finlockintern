const express = require('express');
const app = express();
const helmet = require("helmet");
const cors = require("cors")
const BodyParser = require("body-parser");
var mysql = require('mysql');
var whois_json = require('whois-json');
const whois = require('whois');
const parseRawData = require('./rawToJson');

require("dotenv").config()

// mysql --host=finlockintern.mysql.database.azure.com --user=finlock@finlockintern -p
// CREATE DATABASE finlock;
// CREATE TABLE whois_domain (id int NOT NULL PRIMARY KEY AUTO_INCREMENT, url VARCHAR(255), domain VARCHAR(255), updated_date VARCHAR(255), creation_date VARCHAR(255), expiration_date VARCHAR(255), registrar VARCHAR(255), reg_country VARCHAR(255));

app.use(cors());

app.use(helmet());
app.use(express.json());

var conn = mysql.createConnection({host: "finlockintern.mysql.database.azure.com", 
                                    user: "finlock@finlockintern", 
                                    password: "Internship@123", 
                                    database: "finlock", 
                                    port: 3306});


app.listen(process.env.HOST_PORT, (error) =>{
    if(!error){
        conn.connect(function(err) {
            if (err) throw err;
            console.log("Connected!");
        });
    }
    else{ 
        console.log("Error occurred, server can't start", error);
    }
    
});

app.get('/', (req, res)=>{
    res.status(200);
    res.send("HELLO WORLD");
});


app.post('/whois', function (req, res) {  

    url = (req.body.url).toLowerCase(); 
    console.log(url);

    conn.query(`SELECT * FROM whois_domain WHERE url = '${url}'`, (err, result) => {
        if(err) return res.json(err);
        if(result.length ==0){
            (async function(){        
                _data = await whois_json(url);
                const domain = _data["domainName"]
                const updated_date = _data["updatedDate"]
                const creation_date = _data["creationDate"]
                const expiration_date = _data["registrarRegistrationExpirationDate"]
                const registrar = _data["registrar"]
                const reg_country = _data["registrantCountry"]
        
                const sql = `INSERT INTO whois_domain (url, domain, updated_date, creation_date, expiration_date, registrar, reg_country) VALUES ('${url}', '${domain}', '${updated_date}', '${creation_date}', '${expiration_date}', '${registrar}', '${reg_country}')`;        
                
                conn.query(sql, function (err, result) {
                    if (err) throw err;
                    console.log("1 record inserted");
                });
                conn.query(`SELECT * FROM whois_domain WHERE url = '${url}'`, (err, result) => {
                    res.json(result[0]);
                });
            })()
        }
        else{
            res.json(result[0])
        }
    });
 })  

app.post('/', function (req, res) {  

    url = (req.body.url).toLowerCase(); 
    var delimiterPattern = new RegExp(/(?:[^:]+:\/\/)(?:www\.)*([.a-z0-9]+)+/);
    var delimiterMatches = url.match(delimiterPattern) || [];
    conn.query(`SELECT * FROM whois_domain WHERE url = '${url}'`, (err, result) => {
        if(err) return res.json(err);
        if(result.length ==0){
            (async function(){        
                whois.lookup(delimiterMatches[1], function(err, data) {
                    _data = parseRawData(data)
                    const domain = _data["domainName"]
                    if(domain== undefined){
                        const reply_obj = {
                            status: 400,
                            message: "Invalid URL"
                        }
                        return res.json(reply_obj)
                    }
                    const updated_date = _data["updatedDate"]
                    const creation_date = _data["creationDate"]
                    const expiration_date = _data["registrarRegistrationExpirationDate"]
                    const registrar = _data["registrar"]
                    const reg_country = _data["registrantCountry"]
            
                    const sql = `INSERT INTO whois_domain (url, domain, updated_date, creation_date, expiration_date, registrar, reg_country) VALUES ('${url}', '${domain}', '${updated_date}', '${creation_date}', '${expiration_date}', '${registrar}', '${reg_country}')`;        
                    
                    conn.query(sql, function (err, result) {
                        if (err) return res.json(err);
                        console.log("1 record inserted");
                    });
                    conn.query(`SELECT * FROM whois_domain WHERE url = '${url}'`, (err, result) => {
                        if(err) return res.json(err)
                        res.json(result[0]);
                    });
                })
                
            })()
        }
        else{
            res.json(result[0])
        }
    });
 })  