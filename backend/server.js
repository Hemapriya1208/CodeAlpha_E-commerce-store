const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require("path");

const app = express();
const PORT = 3000;

const db = new sqlite3.Database(path.join(__dirname, "store.db"));

app.use(express.json());

app.use(
    session({
        secret: "ecommerce-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 24 * 60 * 60 * 1000
        }
    })
);

app.use(express.static(path.join(__dirname, "../frontend")));

function runQuery(sql, values = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, values, function (error) {
            if (error) {
                reject(error);
            } else {
                resolve({
                    id: this.lastID,
                    changes: this.changes
                });
            }
        });
    });
}

function getQuery(sql, values = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, values, (error, row) => {
            if (error) {
                reject(error);
            } else {
                resolve(row);
            }
        });
    });
}

function allQuery(sql, values = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, values, (error, rows) => {
            if (error) {
                reject(error);
            } else {
                resolve(rows);
            }
        });
    });
}

async function createDatabase() {
    await runQuery(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    `);

    await runQuery(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            price REAL NOT NULL,
            image TEXT NOT NULL,
            stock INTEGER NOT NULL
        )
    `);

    await runQuery(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            total_amount REAL NOT NULL,
            status TEXT DEFAULT 'Placed',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    await runQuery(`
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    `);

    const productCount = await getQuery(
        "SELECT COUNT(*) AS count FROM products"
    );

    if (productCount.count === 0) {
        const products = [
            [
                "Wireless Headphones",
                "Comfortable wireless headphones with clear sound.",
                1499,
                "🎧",
                20
            ],
            [
                "Smart Watch",
                "Smart watch with fitness and notification features.",
                2499,
                "⌚",
                15
            ],
            [
                "Laptop Backpack",
                "Stylish and durable backpack for laptops.",
                999,
                "🎒",
                25
            ],
            [
                "Wireless Mouse",
                "Smooth and comfortable wireless mouse.",
                699,
                "🖱️",
                30
            ],
            [
                "Mechanical Keyboard",
                "Compact mechanical keyboard for work and gaming.",
                1799,
                "⌨️",
                18
            ],
            [
                "Bluetooth Speaker",
                "Portable speaker with good sound quality.",
                1299,
                "🔊",
                22
            ]
        ];

        for (const product of products) {
            await runQuery(
                `
                INSERT INTO products
                (name, description, price, image, stock)
                VALUES (?, ?, ?, ?, ?)
                `,
                product
            );
        }
    }

    console.log("Database is ready");
}

function checkLogin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({
            message: "Please login first"
        });
    }

    next();
}

app.get("/api/products", async (req, res) => {
    try {
        const products = await allQuery(
            "SELECT * FROM products ORDER BY id DESC"
        );

        res.json(products);
    } catch (error) {
        res.status(500).json({
            message: "Unable to get products"
        });
    }
});

app.get("/api/products/:id", async (req, res) => {
    try {
        const product = await getQuery(
            "SELECT * FROM products WHERE id = ?",
            [req.params.id]
        );

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.json(product);
    } catch (error) {
        res.status(500).json({
            message: "Unable to get product"
        });
    }
});

app.post("/api/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Please fill all fields"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must contain at least 6 characters"
            });
        }

        const existingUser = await getQuery(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (existingUser) {
            return res.status(400).json({
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await runQuery(
            `
            INSERT INTO users
            (username, email, password)
            VALUES (?, ?, ?)
            `,
            [username, email, hashedPassword]
        );

        res.json({
            message: "Registration successful"
        });
    } catch (error) {
        res.status(500).json({
            message: "Registration failed"
        });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await getQuery(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (!user) {
            return res.status(400).json({
                message: "Invalid email or password"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(400).json({
                message: "Invalid email or password"
            });
        }

        req.session.userId = user.id;

        res.json({
            message: "Login successful",
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Login failed"
        });
    }
});

app.get("/api/me", async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.json({
                user: null
            });
        }

        const user = await getQuery(
            "SELECT id, username, email FROM users WHERE id = ?",
            [req.session.userId]
        );

        res.json({
            user: user
        });
    } catch (error) {
        res.status(500).json({
            message: "Unable to get user"
        });
    }
});

app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({
            message: "Logout successful"
        });
    });
});

app.post("/api/orders", checkLogin, async (req, res) => {
    try {
        const items = req.body.items;

        if (!items || items.length === 0) {
            return res.status(400).json({
                message: "Cart is empty"
            });
        }

        let totalAmount = 0;
        const orderItems = [];

        for (const item of items) {
            const product = await getQuery(
                "SELECT * FROM products WHERE id = ?",
                [item.productId]
            );

            if (!product) {
                return res.status(400).json({
                    message: "Product not found"
                });
            }

            if (item.quantity > product.stock) {
                return res.status(400).json({
                    message: `${product.name} is out of stock`
                });
            }

            const quantity = Number(item.quantity);
            const itemTotal = product.price * quantity;

            totalAmount += itemTotal;

            orderItems.push({
                productId: product.id,
                quantity: quantity,
                price: product.price
            });
        }

        const order = await runQuery(
            `
            INSERT INTO orders
            (user_id, total_amount, status)
            VALUES (?, ?, ?)
            `,
            [req.session.userId, totalAmount, "Placed"]
        );

        for (const item of orderItems) {
            await runQuery(
                `
                INSERT INTO order_items
                (order_id, product_id, quantity, price)
                VALUES (?, ?, ?, ?)
                `,
                [
                    order.id,
                    item.productId,
                    item.quantity,
                    item.price
                ]
            );

            await runQuery(
                `
                UPDATE products
                SET stock = stock - ?
                WHERE id = ?
                `,
                [item.quantity, item.productId]
            );
        }

        res.json({
            message: "Order placed successfully",
            orderId: order.id,
            totalAmount: totalAmount
        });
    } catch (error) {
        res.status(500).json({
            message: "Unable to place order"
        });
    }
});

app.get("/api/orders", checkLogin, async (req, res) => {
    try {
        const orders = await allQuery(
            `
            SELECT
                orders.id,
                orders.total_amount,
                orders.status,
                orders.created_at
            FROM orders
            WHERE orders.user_id = ?
            ORDER BY orders.id DESC
            `,
            [req.session.userId]
        );

        for (const order of orders) {
            order.items = await allQuery(
                `
                SELECT
                    order_items.quantity,
                    order_items.price,
                    products.name
                FROM order_items
                JOIN products
                ON order_items.product_id = products.id
                WHERE order_items.order_id = ?
                `,
                [order.id]
            );
        }

        res.json(orders);
    } catch (error) {
        res.status(500).json({
            message: "Unable to get orders"
        });
    }
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

createDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.log("Database error:", error);
    });