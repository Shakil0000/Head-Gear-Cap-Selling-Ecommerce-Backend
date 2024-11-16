const express = require('express');
const multer = require('multer');
const path = require('path');
const mysql = require('mysql2');
const cors = require('cors'); // Import the CORS package
const app = express();

// Setup MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // Replace with your DB password
  database: 'headgear',
});

db.connect((err) => {
  if (err) {
    console.error('Could not connect to the database:', err);
  } else {
    console.log('Connected to MySQL');
  }
});

// Enable CORS to allow requests from frontend (localhost:3000)
app.use(cors({
  origin: 'http://localhost:3000', // Allow only your frontend to make requests
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// Middleware to parse incoming JSON requests
app.use(express.json());

// Setup file upload storage using multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });


// Serve images from the uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Route to handle product form submission
app.post('/addProduct', upload.fields([
  { name: 'pic', maxCount: 1 },
  { name: 'extraPic1', maxCount: 1 },
  { name: 'extraPic2', maxCount: 1 },
  { name: 'extraPic3', maxCount: 1 },
  { name: 'extraPic4', maxCount: 1 }
]), (req, res) => {
  const { title, price, category, stock, discount, afterDiscountPrice, description } = req.body;
  const pic = req.files.pic ? req.files.pic[0].filename : null;
  const extraPic1 = req.files.extraPic1 ? req.files.extraPic1[0].filename : null;
  const extraPic2 = req.files.extraPic2 ? req.files.extraPic2[0].filename : null;
  const extraPic3 = req.files.extraPic3 ? req.files.extraPic3[0].filename : null;
  const extraPic4 = req.files.extraPic4 ? req.files.extraPic4[0].filename : null;

  const query = 'INSERT INTO product (title, price, category, pic, stock, discount, afterDiscountPrice, description, extraPic1, extraPic2, extraPic3, extraPic4) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  db.query(query, [title, price, category, pic, stock, discount, afterDiscountPrice, description, extraPic1, extraPic2, extraPic3, extraPic4], (err, result) => {
    if (err) {
      console.error('Error inserting product:', err);
      res.status(500).send({ success: false, message: 'Error inserting product' });
    } else {
      res.send({ success: true, message: 'Product added successfully' });
    }
  });
});



// Endpoint to get products
app.get('/all/newArrival', (req, res) => {
  const query = 'SELECT id, Title, Pic, Price, AfterDiscountPrice FROM product where Category = "New Arrival"';
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});



app.get('/productDetails/:id', (req, res) => {
  const productId = req.params.id;
  const query = 'SELECT * FROM product WHERE id = ?';

  db.query(query, [productId], (err, result) => {
    if (err) {
      console.error('Error fetching product details:', err);
      res.status(500).json({ error: 'An error occurred while fetching product details' });
    } else {
      res.json(result[0]); // Send the product details as JSON
    }
  });
});



// Start the server
app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
