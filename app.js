const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const os = require('os');

const app = express();
app.use(bodyParser.json());

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

app.get("/", async (req, res) => {
    const dbConnected = sql.connected;
    res.json({
        state: "online",
        port: PORT,
        dbConnection: dbConnected ? "Connected" : "Not Connected",
        database: config.database,
        server: config.server,
        os: os.type() + " " + os.release(),
        hostname: os.hostname(),
        uptime: process.uptime() + " seconds",
        timestamp: new Date().toISOString()
    });
});

const config = {
    user: 'sa',
    password: '',
    port: 1434,
    server: 'localhost',
    database: 'BibliotecaDB',
    options: {
        trustServerCertificate: true,
    }
};

sql.connect(config).then(pool => {
    console.log('Conexión exitosa a SQL Server');
}).catch(err => console.error('Error al conectar con SQL Server:', err));

app.get('/book', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query('SELECT * FROM books');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching books:', err);
        res.status(500).send(err.message);
    }
});

app.put('/book', async (req, res) => {
    const {id, title, author, isbn, copies_available } = req.body;


    if (!id || !title || !author || !isbn || !copies_available) {
        return throwGenericalResponse(res, 400, false, "Missing fields", { title, author, isbn, copies_available });
    }

    try {
        const pool = await sql.connect(config);
        await pool.request()
        .input("id", sql.Int, id)
            .input("title", sql.NVarChar, title)
            .input("author", sql.NVarChar, author)
            .input("isbn", sql.NVarChar, isbn)
            .input("copies_available", sql.Int, copies_available)
        .query("UPDATE books SET title = @title, author = @author, isbn = @isbn, copies_available = @copies_available WHERE id = @id");
        return throwGenericalResponse(res, 200, true, "Book added successfully", {});
    } catch (err) {
        console.error('Error modifying book:', err);
        return throwGenericalResponse(res, 500, false, err.message, {});
    }

})

app.post('/book', async (req, res) => {
    const { title, author, isbn, copies_available } = req.body;

    console.log(req.body)

    if (!title || !author || !isbn || !copies_available) {
        return throwGenericalResponse(res, 400, false, "Missing fields", { title, author, isbn, copies_available });
    }

    try {
        const pool = await sql.connect(config);
        await pool.request()
            .input("title", sql.NVarChar, title)
            .input("author", sql.NVarChar, author)
            .input("isbn", sql.NVarChar, isbn)
            .input("copies_available", sql.Int, copies_available)
            .input("created_at", sql.DateTime, new Date().toISOString().slice(0, 19).replace('T', ' ') + '.000')
            .query("INSERT INTO books (title, author, isbn, copies_available, created_at) VALUES (@title, @author, @isbn, @copies_available, @created_at)");
        return throwGenericalResponse(res, 200, true, "Book added successfully", {});
    } catch (err) {
        console.error('Error adding book:', err);
        return throwGenericalResponse(res, 500, false, err.message, {});
    }
});

const throwGenericalResponse = (res, status, success, message, data = null) => {
    if (!res.headersSent) {
        res.status(status).json({
            success,
            message,
            data
        });
    }
};
