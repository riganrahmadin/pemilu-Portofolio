const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const session = require("express-session");
const bodyParser = require("body-parser");
const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

// Konfigurasi session
app.use(
  session({
    secret: "pemilu-secret",
    resave: false,
    saveUninitialized: true,
  })
);

// Koneksi ke MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "pemilu",
});

db.connect((err) => {
  if (err) throw err;
  console.log("Terhubung ke MySQL!");
});

// Middleware untuk cek autentikasi
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/login");
}

// Route: Halaman Utama
app.get("/", isAuthenticated, (req, res) => {
  res.render("index", { user: req.session.user });
});

// Route: Halaman Login
app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    (err, results) => {
      if (err) throw err;
      if (results.length > 0) {
        bcrypt.compare(password, results[0].password, (err, match) => {
          if (match) {
            req.session.user = results[0];
            res.redirect("/");
          } else {
            res.send("Password salah!");
          }
        });
      } else {
        res.send("Pengguna tidak ditemukan!");
      }
    }
  );
});

// Route: Halaman Register
app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  const { username, password } = req.body;
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) throw err;
    db.query(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hash],
      (err) => {
        if (err) throw err;
        res.redirect("/login");
      }
    );
  });
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Gagal logout:', err);
      return res.send('Gagal logout!');
    }
    res.redirect('/login');
  });
});


// Route: Form Tambah Pemilih
app.get("/add-voter", isAuthenticated, (req, res) => {
  res.render("add_voter");
});

app.post("/add-voter", (req, res) => {
  const { name, nik, address, gender, dob } = req.body;
  if (!name || !nik || !address) {
    return res.send("Semua field wajib diisi!");
  }
  db.query(
    "INSERT INTO voters (name, nik, address, gender, dob) VALUES (?, ?, ?, ?, ?)",
    [name, nik, address, gender, dob],
    (err) => {
      if (err) throw err;
      res.redirect("/voters");
    }
  );
});

// Route: Tampilkan Pemilih
app.get("/voters", isAuthenticated, (req, res) => {
  db.query("SELECT * FROM voters", (err, results) => {
    if (err) throw err;
    res.render("voters", { voters: results });
  });
});



// Jalankan Server
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
