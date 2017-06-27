DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS images;

CREATE TABLE images(
    id SERIAL PRIMARY KEY,
    image VARCHAR(300) NOT NULL,
    username VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    likes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO images (image, username, title, description) VALUES ('/uploads/reichstag.jpg', 'funkychicken', 'Welcome to Berlin and the future!', 'This photo brings back so many great memories.');
INSERT INTO images (image, username, title, description) VALUES ('/uploads/elvis.jpg', 'discoduck', 'Elvis', 'We can''t go on together with suspicious minds.');
INSERT INTO images (image, username, title, description) VALUES ('/uploads/helloberlin.jpg', 'discoduck', 'Hello Berlin', 'This is going to be worth a lot of money one day.');

CREATE TABLE comments(
    id SERIAL PRIMARY KEY,
    photo_id INTEGER NOT NULL REFERENCES images(id),
    name VARCHAR(255) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
