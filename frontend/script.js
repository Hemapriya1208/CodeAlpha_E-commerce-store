const cartKey = "ecommerceCart";

function getCart() {
    return JSON.parse(localStorage.getItem(cartKey)) || [];
}

function saveCart(cart) {
    localStorage.setItem(cartKey, JSON.stringify(cart));
}

function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    const cartCount = document.getElementById("cart-count");

    if (cartCount) {
        cartCount.textContent = count;
    }
}

async function getUser() {
    const response = await fetch("/api/me");
    return await response.json();
}

async function updateNavigation() {
    const data = await getUser();

    const loginLink = document.getElementById("login-link");
    const registerLink = document.getElementById("register-link");
    const logoutLink = document.getElementById("logout-link");
    const ordersLink = document.getElementById("orders-link");
    const userName = document.getElementById("user-name");

    if (data.user) {
        if (loginLink) loginLink.style.display = "none";
        if (registerLink) registerLink.style.display = "none";
        if (logoutLink) logoutLink.style.display = "inline-block";
        if (ordersLink) ordersLink.style.display = "inline-block";
        if (userName) userName.textContent = "Hello, " + data.user.username;
    } else {
        if (loginLink) loginLink.style.display = "inline-block";
        if (registerLink) registerLink.style.display = "inline-block";
        if (logoutLink) logoutLink.style.display = "none";
        if (ordersLink) ordersLink.style.display = "none";
        if (userName) userName.textContent = "";
    }
}

async function logout() {
    await fetch("/api/logout", {
        method: "POST"
    });

    window.location.href = "index.html";
}

async function loadProducts() {
    const productList = document.getElementById("product-list");

    if (!productList) {
        return;
    }

    const response = await fetch("/api/products");
    const products = await response.json();

    productList.innerHTML = "";

    products.forEach(product => {
        const card = document.createElement("div");
        card.className = "product-card";

        card.innerHTML = `
            <div class="product-image">${product.image}</div>
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <div class="price">₹${product.price}</div>
            <p>Stock: ${product.stock}</p>
            <a href="product.html?id=${product.id}" class="product-button">View Details</a>
            <button class="product-button" onclick="addToCart(${product.id})">Add to Cart</button>
        `;

        productList.appendChild(card);
    });
}

async function addToCart(productId) {
    const response = await fetch(`/api/products/${productId}`);
    const product = await response.json();

    if (product.stock <= 0) {
        alert("Product is out of stock");
        return;
    }

    const cart = getCart();
    const existingItem = cart.find(item => item.productId === productId);

    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity++;
        } else {
            alert("Maximum available stock reached");
            return;
        }
    } else {
        cart.push({
            productId: productId,
            quantity: 1
        });
    }

    saveCart(cart);
    updateCartCount();

    alert("Product added to cart");
}

async function loadProductDetails() {
    const productDetails = document.getElementById("product-details");

    if (!productDetails) {
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("id");

    if (!productId) {
        productDetails.innerHTML = "<p>Product not found</p>";
        return;
    }

    const response = await fetch(`/api/products/${productId}`);
    const product = await response.json();

    productDetails.innerHTML = `
        <div class="product-details-image">${product.image}</div>

        <div class="product-details-content">
            <h1>${product.name}</h1>
            <p>${product.description}</p>
            <div class="price">₹${product.price}</div>
            <p>Available Stock: ${product.stock}</p>

            <button class="product-button" onclick="addToCart(${product.id})">
                Add to Cart
            </button>

            <a href="cart.html" class="product-button">
                Go to Cart
            </a>
        </div>
    `;
}

async function registerUser(event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const message = document.getElementById("message");

    const response = await fetch("/api/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username,
            email,
            password
        })
    });

    const data = await response.json();

    message.textContent = data.message;

    if (response.ok) {
        message.style.color = "green";

        setTimeout(() => {
            window.location.href = "login.html";
        }, 1000);
    } else {
        message.style.color = "red";
    }
}

async function loginUser(event) {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const message = document.getElementById("message");

    const response = await fetch("/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email,
            password
        })
    });

    const data = await response.json();

    message.textContent = data.message;

    if (response.ok) {
        message.style.color = "green";

        setTimeout(() => {
            window.location.href = "index.html";
        }, 1000);
    } else {
        message.style.color = "red";
    }
}

async function loadCart() {
    const cartList = document.getElementById("cart-list");
    const cartTotal = document.getElementById("cart-total");

    if (!cartList) {
        return;
    }

    const cart = getCart();

    if (cart.length === 0) {
        cartList.innerHTML = `
            <div class="empty-message">
                <h2>Your cart is empty</h2>
                <a href="index.html" class="product-button">Continue Shopping</a>
            </div>
        `;

        if (cartTotal) {
            cartTotal.textContent = "₹0";
        }

        return;
    }

    let total = 0;
    cartList.innerHTML = "";

    for (const item of cart) {
        const response = await fetch(`/api/products/${item.productId}`);
        const product = await response.json();

        const itemTotal = product.price * item.quantity;
        total += itemTotal;

        const div = document.createElement("div");
        div.className = "cart-item";

        div.innerHTML = `
            <div class="product-image">${product.image}</div>

            <div class="cart-item-info">
                <h3>${product.name}</h3>
                <p>Price: ₹${product.price}</p>
                <p>Item Total: ₹${itemTotal}</p>
            </div>

            <div class="quantity-controls">
                <button class="quantity-button"
                    onclick="changeQuantity(${product.id}, -1)">
                    -
                </button>

                <span>${item.quantity}</span>

                <button class="quantity-button"
                    onclick="changeQuantity(${product.id}, 1)">
                    +
                </button>
            </div>

            <button class="remove-button"
                onclick="removeFromCart(${product.id})">
                Remove
            </button>
        `;

        cartList.appendChild(div);
    }

    if (cartTotal) {
        cartTotal.textContent = "₹" + total;
    }
}

async function changeQuantity(productId, change) {
    const cart = getCart();
    const item = cart.find(item => item.productId === productId);

    if (!item) {
        return;
    }

    const response = await fetch(`/api/products/${productId}`);
    const product = await response.json();

    item.quantity += change;

    if (item.quantity <= 0) {
        removeFromCart(productId);
        return;
    }

    if (item.quantity > product.stock) {
        alert("Maximum available stock reached");
        item.quantity = product.stock;
    }

    saveCart(cart);
    updateCartCount();
    loadCart();
}

function removeFromCart(productId) {
    let cart = getCart();

    cart = cart.filter(item => item.productId !== productId);

    saveCart(cart);
    updateCartCount();
    loadCart();
}

async function loadCheckout() {
    const checkoutList = document.getElementById("checkout-list");
    const checkoutTotal = document.getElementById("checkout-total");

    if (!checkoutList) {
        return;
    }

    const userData = await getUser();

    if (!userData.user) {
        alert("Please login before checkout");
        window.location.href = "login.html";
        return;
    }

    const cart = getCart();

    if (cart.length === 0) {
        checkoutList.innerHTML = `
            <div class="empty-message">
                <h2>Your cart is empty</h2>
                <a href="index.html" class="product-button">Shop Now</a>
            </div>
        `;
        return;
    }

    let total = 0;

    checkoutList.innerHTML = "";

    for (const item of cart) {
        const response = await fetch(`/api/products/${item.productId}`);
        const product = await response.json();

        const itemTotal = product.price * item.quantity;
        total += itemTotal;

        checkoutList.innerHTML += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h3>${product.name}</h3>
                    <p>Quantity: ${item.quantity}</p>
                    <p>Price: ₹${itemTotal}</p>
                </div>
            </div>
        `;
    }

    checkoutTotal.textContent = "₹" + total;
}

async function placeOrder() {
    const cart = getCart();

    if (cart.length === 0) {
        alert("Your cart is empty");
        return;
    }

    const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            items: cart
        })
    });

    const data = await response.json();

    if (response.ok) {
        localStorage.removeItem(cartKey);

        alert(
            "Order placed successfully! Order ID: " +
            data.orderId
        );

        window.location.href = "orders.html";
    } else {
        alert(data.message);
    }
}

async function loadOrders() {
    const ordersList = document.getElementById("orders-list");

    if (!ordersList) {
        return;
    }

    const userData = await getUser();

    if (!userData.user) {
        alert("Please login to view your orders");
        window.location.href = "login.html";
        return;
    }

    const response = await fetch("/api/orders");
    const orders = await response.json();

    if (orders.length === 0) {
        ordersList.innerHTML = `
            <div class="empty-message">
                <h2>No orders found</h2>
                <a href="index.html" class="product-button">Start Shopping</a>
            </div>
        `;
        return;
    }

    ordersList.innerHTML = "";

    orders.forEach(order => {
        let itemsHTML = "";

        order.items.forEach(item => {
            itemsHTML += `
                <p>
                    ${item.name} × ${item.quantity}
                    - ₹${item.price * item.quantity}
                </p>
            `;
        });

        const div = document.createElement("div");
        div.className = "order-card";

        div.innerHTML = `
            <h3>Order #${order.id}</h3>
            <p>Date: ${new Date(order.created_at).toLocaleString()}</p>
            <p>Total: ₹${order.total_amount}</p>
            <p>Status: <span class="status">${order.status}</span></p>
            <h4>Products</h4>
            ${itemsHTML}
        `;

        ordersList.appendChild(div);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    updateCartCount();
    updateNavigation();

    const logoutButton = document.getElementById("logout-link");

    if (logoutButton) {
        logoutButton.addEventListener("click", logout);
    }

    const registerForm = document.getElementById("register-form");

    if (registerForm) {
        registerForm.addEventListener("submit", registerUser);
    }

    const loginForm = document.getElementById("login-form");

    if (loginForm) {
        loginForm.addEventListener("submit", loginUser);
    }

    const page = document.body.dataset.page;

    if (page === "home") {
        loadProducts();
    }

    if (page === "product") {
        loadProductDetails();
    }

    if (page === "cart") {
        loadCart();
    }

    if (page === "checkout") {
        loadCheckout();
    }

    if (page === "orders") {
        loadOrders();
    }
});