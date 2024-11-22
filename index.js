const express = require("express");
const multer = require("multer");
const path = require("path");
const mysql = require("mysql2");
const cors = require("cors"); // Import the CORS package
const app = express();
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// Setup MySQL connection
const db = mysql.createConnection({
  host: "sql12.freemysqlhosting.net",
  user: "sql12746728",
  password: "KXJT8fCBsp", // Replace with your DB password
  database: "sql12746728",
});

db.connect((err) => {
  if (err) {
    console.error("Could not connect to the database:", err);
  } else {
    console.log("Connected to MySQL");
  }
});

// Enable CORS to allow requests from frontend (localhost:3000)
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000", // Allow only your frontend to make requests
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

// Middleware to parse incoming JSON requests
app.use(express.json());

// Setup file upload storage using multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Serve images from the uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Route to handle product form submission
app.post(
  "/addProduct",
  upload.fields([
    { name: "pic", maxCount: 1 },
    { name: "extraPic1", maxCount: 1 },
    { name: "extraPic2", maxCount: 1 },
    { name: "extraPic3", maxCount: 1 },
    { name: "extraPic4", maxCount: 1 },
  ]),
  (req, res) => {
    const {
      title,
      price,
      category,
      stock,
      discount,
      afterDiscountPrice,
      description,
    } = req.body;
    const pic = req.files.pic ? req.files.pic[0].filename : null;
    const extraPic1 = req.files.extraPic1
      ? req.files.extraPic1[0].filename
      : null;
    const extraPic2 = req.files.extraPic2
      ? req.files.extraPic2[0].filename
      : null;
    const extraPic3 = req.files.extraPic3
      ? req.files.extraPic3[0].filename
      : null;
    const extraPic4 = req.files.extraPic4
      ? req.files.extraPic4[0].filename
      : null;

    const query =
      "INSERT INTO product (title, price, category, pic, stock, discount, afterDiscountPrice, description, extraPic1, extraPic2, extraPic3, extraPic4) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    db.query(
      query,
      [
        title,
        price,
        category,
        pic,
        stock,
        discount,
        afterDiscountPrice,
        description,
        extraPic1,
        extraPic2,
        extraPic3,
        extraPic4,
      ],
      (err, result) => {
        if (err) {
          console.error("Error inserting product:", err);
          res
            .status(500)
            .send({ success: false, message: "Error inserting product" });
        } else {
          res.send({ success: true, message: "Product added successfully" });
        }
      }
    );
  }
);

// Endpoint to get products
app.get("/all/newArrival", (req, res) => {
  const query =
    'SELECT id, Title, Pic, Price, AfterDiscountPrice FROM product where Category = "New Arrival"';
  db.query(query, (error, results) => {
    if (error) throw error;
    res.json(results);
  });
});

app.get("/productDetails/:id", (req, res) => {
  const productId = req.params.id;
  const query = "SELECT * FROM product WHERE id = ?";

  db.query(query, [productId], (err, result) => {
    if (err) {
      console.error("Error fetching product details:", err);
      res
        .status(500)
        .json({ error: "An error occurred while fetching product details" });
    } else {
      res.json(result[0]); // Send the product details as JSON
    }
  });
});

app.post("/createOrder", (req, res) => {
  const { phoneNumber, orderTrackNumber, orderInformation } = req.body;

  const query = `INSERT INTO \`Order\` (phoneNumber, orderTrackNumber, orderInformation) VALUES (?, ?, ?)`;

  db.query(
    query,
    [phoneNumber, orderTrackNumber, JSON.stringify(orderInformation)],
    (err, result) => {
      if (err) {
        console.error("Error inserting order:", err);
        return res.status(500).json({ message: "Failed to create order." });
      }
      res
        .status(201)
        .json({
          message: "Order created successfully!",
          orderTrackNumber: orderTrackNumber,
        });
    }
  );
});

// Search API Endpoint
app.get("/api/search", (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: "Query parameter is required." });
  }

  // SQL query to search for the title in the product table
  const sql = "SELECT * FROM product WHERE Title LIKE ?";
  const searchValue = `%${query}%`; // For partial match

  db.query(sql, [searchValue], (err, results) => {
    if (err) {
      console.error("Error fetching data:", err.message);
      return res.status(500).json({ error: "Failed to fetch data." });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "No products found." });
    }

    res.json(results);
  });
});

// API to create a new user
app.post("/createAccount", (req, res) => {
  const { name, email, password } = req.body;

  const sql = "INSERT INTO User (name, email, password) VALUES (?, ?, ?)";
  db.query(sql, [name, email, password], (err, result) => {
    if (err) {
      console.error("Error inserting data:", err);
      res.status(500).send("Error creating account");
    } else {
      res.status(200).send("Account created successfully");
    }
  });
});

// API for login
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT id, password FROM User WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error("Error fetching user:", err);
      res.status(500).send("An error occurred. Please try again.");
    } else if (results.length === 0) {
      res.status(404).send("User not found.");
    } else {
      const storedPassword = results[0].password;

      // Compare the plaintext passwords
      if (password === storedPassword) {
        const userId = results[0].id; // Retrieve the user's ID
        res.status(200).json({ email, id: userId });
      } else {
        res.status(401).send("Invalid email or password.");
      }
    }
  });
});


app.get("/orders/search", (req, res) => {
  const { phoneNumber, orderTrackNumber } = req.query;

  // Define SQL query based on the provided search type
  let sql = "";
  let searchValue = "";

  if (phoneNumber) {
    sql = "SELECT phoneNumber, orderTrackNumber, JSON_UNQUOTE(JSON_EXTRACT(orderInformation, '$.total')) AS total FROM `order` WHERE phoneNumber = ?";
    searchValue = phoneNumber;
  } else if (orderTrackNumber) {
    sql = "SELECT phoneNumber, orderTrackNumber, JSON_UNQUOTE(JSON_EXTRACT(orderInformation, '$.total')) AS total FROM `order` WHERE orderTrackNumber = ?";
    searchValue = orderTrackNumber;
  } else {
    return res.status(400).send("Invalid search query.");
  }

  // Execute the query
  db.query(sql, [searchValue], (err, results) => {
    if (err) {
      console.error("Error fetching order:", err);
      res.status(500).send("An error occurred.");
    } else if (results.length === 0) {
      res.status(404).send("No orders found.");
    } else {
      res.status(200).json(results[0]); // Return the first matched order
    }
  });
});


// Set up Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // Or any other email service you use
  auth: {
    user: 'mdshakiazzaman43@gmail.com',
    pass: 'dkzj hgnb rgfm foie', // Use App Password for Gmail
  },
});


// API endpoint for password reset
app.post('/api/reset-password', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  // Query the database to find the user by email
  db.query('SELECT * FROM user WHERE email = ?', [email], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database query failed' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = results[0];
    const password = user.password; // Extract the password (ensure security!)

    // Send the password to the user's email using Nodemailer
    const mailOptions = {
      from: 'mdshakiazzaman43@gmail.com',
      to: email,
      subject: 'Password Recovery',
      text: `Your password is: ${password}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({ message: 'Error sending email', error });
      }

      return res.status(200).json({ message: 'Password recovery email sent successfully' });
    });
  });
});


// Get orders for a specific user
app.get("/orders/:userId", (req, res) => {
  const { userId } = req.params;

  const query = 'SELECT phoneNumber, orderTrackNumber, orderInformation FROM `order` WHERE userId = ?';

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching orders:", err);
      return res.status(500).json({ error: "Failed to fetch orders." });
    }

    // Extract total from orderInformation
    const ordersWithTotal = results.map(order => {
      const orderInfo = JSON.parse(order.orderInformation); // Parse the JSON string
      const total = orderInfo.total; // Extract the total value

      return {
        phoneNumber: order.phoneNumber,
        orderTrackNumber: order.orderTrackNumber,
        total: total, // Include the total field
      };
    });

    res.json(ordersWithTotal); // Send the modified orders with total
  });
});




// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
