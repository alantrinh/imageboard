const pg = require('pg');
const express = require('express');
const app = express();
const multer = require('multer');
const hb = require(`express-handlebars`);
const fs = require("fs");
const bodyParser = require("body-parser");

app.engine("handlebars", hb());
app.set("view engine", "handlebars");

app.use(bodyParser.urlencoded({
    extended: false
}));

let dbURL = require('url').parse(require("./config/postgres_login.json").dbURL);

var dbConfig = { // limit connections to database to 10
    user: dbURL.auth.split(':')[0],
    database: dbURL.pathname.slice(1),
    password: dbURL.auth.split(':')[1],
    host: dbURL.hostname,
    port: 5432,
    max: 10,
    idleTimeoutMillis: 30000
};

let dbPool = new pg.Pool(dbConfig);
let imagesSql = fs.readFileSync(__dirname + "/config/images.sql").toString();

dbPool.on('error', function(err) {
    console.log(err);
});

if(!dbPool.query(`SELECT * FROM users;`)) { //Turn off initialise database
    dbPool.connect((err, client, done) => {
        if(!err) {
            client.query(imagesSql, (err) => {
                if(!err) {
                    console.log("created table");
                } else {
                    console.log(err);
                }
                done();
            });
        } else {
            console.log(err);
        }
    });
} //Turn off initialise database

var diskStorage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, __dirname + '/uploads');
    },
    filename: (req, file, callback) => {
        callback(null, Date.now() + '_' + Math.floor(Math.random() * 99999999) + '_' + file.originalname);
    }
});

var uploader = multer({
    storage: diskStorage,
    limits: {
        filesize: 2097152
    }
});

app.use('/static', express.static(`${__dirname}/public`));
app.use('/uploads', express.static(`${__dirname}/uploads`));

//Routes
app.get('/photos', (req, res) => { //get all photos

    dbPool.connect((err, client, done) => {
        if(!err) {
            client.query('SELECT * FROM images ORDER BY created_at DESC', (err, results) => {
                if(!err) {
                    res.send(results.rows);
                }
                done();
            });
        } else {
            console.log(err);
        }
    });
});

app.get('/photo/:id', (req, res) => { //get individual photo details
    dbPool.connect((err, client, done) => {
        if(!err) {
            client.query(`SELECT * FROM images WHERE id = $1;`, [req.params.id], (err, results) => {
                if(!err) {
                    res.send(results.rows);
                }
                done();
            });
        } else {
            console.log(err);
        }
    });
});

app.get('/hashtaggedImages/:hashtag', (req, res) => { //retrieve images with a particular hashtag
    dbPool.connect((err, client, done) => {
        if(!err) {
            client.query(`SELECT * FROM images WHERE description LIKE '%#' || $1 || '%'  ORDER BY created_at DESC;`, [req.params.hashtag], (err, results) => {
                if(!err) {
                    res.send(results.rows);
                } else {
                    console.log(err);
                }
                done();
            });
        } else {
            console.log(err);
        }
    });
});

app.get('/comments/:id', (req, res) => { //retrieve comments for a particular image
    dbPool.connect((err, client, done) => {
        if(!err) {
            client.query('SELECT * FROM comments WHERE photo_id = $1 ORDER by id DESC;', [req.params.id], (err, results) => {
                if(!err) {
                    res.send(results.rows);
                }
            });
            done();
        } else {
            console.log(err);
        }
    });
});

app.post('/uploadImage', uploader.single('file'), (req, res) => {
    // If nothing went wrong the file is already in the uploads directory
    if (req.file) {
        dbPool.connect((err, client, done) => {
            if(!err) {
                client.query(`INSERT INTO images (image, username, title, description) VALUES ($1, $2, $3, $4);`, [`/uploads/${req.file.filename}`, req.body.username, req.body.title, req.body.description], (err) => {
                    if (err) {
                        console.log(err);
                    } else {
                        done();
                    }
                });
            } else {
                console.log(err);
            }
        });

        res.json({
            success: true,
            file: `/uploads/${req.file.filename}`
        });
    } else {
        res.json({
            success: false
        });
    }
});

app.post('/comment', (req, res) => { //insert comment for an image
    dbPool.connect((err, client, done) => {
        if(!err) {
            client.query(`INSERT INTO comments (photo_id, name, comment) VALUES ($1, $2, $3) RETURNING *;`, [req.body.photoID, req.body.name, req.body.comment], (err, results) => {
                if(!err) {
                    console.log(results.rows[0]);
                    res.send(results.rows[0]);
                } else {
                    console.log(err);
                    res.json({
                        success: false
                    });
                }
                done();
            });
        } else {
            console.log(err);
        }
    });
});

app.post('/like/:imageID', (req, res) => { //record a like for an image
    dbPool.connect((err, client, done) => {
        if(!err) {
            client.query(`UPDATE images SET likes = coalesce(likes, 0) + 1 WHERE id = $1 RETURNING likes;`, [req.params.imageID], (err, results) => {
                if(!err) {
                    res.send(results.rows[0]);
                } else {
                    console.log(err);
                    res.json({
                        success: false
                    });
                }
                done();
            });
        } else {
            console.log(err);
        }
    });
});

app.get("*", (req, res) => {
    res.sendFile(`${__dirname}/public/index.html`);
});

app.listen(8080, () => {
    console.log("listening");
});
