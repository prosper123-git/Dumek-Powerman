import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AuthPage } from "./login.jsx";

const DEFAULT_PRODUCTS = [
  { id: 101, name: "GX390 Petrol Engine", category: "Engines", description: "GX390-series petrol engine. Visit the store to confirm specifications and compatibility.", image: "IMG-20261103-WA0012.jpg", images: ["IMG-20261103-WA0012.jpg", "IMG-20261103-WA0013.jpg", "IMG-20261103-WA0014.jpg", "IMG-20261103-WA0016.jpg"], price: null, available: null },
  { id: 102, name: "GX160 Petrol Engine", category: "Engines", description: "GX160-series petrol engine. Visit the store to confirm specifications and compatibility.", image: "IMG-20261103-WA0022.jpg", images: ["IMG-20261103-WA0022.jpg", "IMG-20261103-WA0025.jpg", "IMG-20261103-WA0025(1).jpg"], price: null, available: null },
  { id: 103, name: "190F 15HP Petrol Engine", category: "Engines", description: "190F-series 15HP petrol engine shown in the product photo. Confirm specifications at the store.", image: "IMG-20261103-WA0021.jpg", images: ["IMG-20261103-WA0021.jpg"], price: null, available: null },
  { id: 104, name: "WP30X Water Pump", category: "Water Pumps", description: "WP30X-series water pump. Visit the store to confirm specifications and included accessories.", image: "IMG-20261103-WA0018.jpg", images: ["IMG-20261103-WA0011.jpg", "IMG-20261103-WA0015.jpg", "IMG-20261103-WA0017.jpg", "IMG-20261103-WA0018.jpg", "IMG-20261103-WA0020.jpg", "IMG-20261103-WA0023.jpg"], price: null, available: null },
  { id: 105, name: "WP20X Water Pump", category: "Water Pumps", description: "WP20X-series water pump shown in the product photo. Confirm specifications at the store.", image: "IMG-20261103-WA0019.jpg", images: ["IMG-20261103-WA0019.jpg"], price: null, available: null },
  { id: 106, name: "Water Pump Hose", category: "Accessories", description: "Hose shown in the product photo. Visit the store to confirm size and compatibility.", image: "IMG-20261103-WA0026.jpg", images: ["IMG-20261103-WA0026.jpg"], price: null, available: null },
  { id: 107, name: "Super Dunek Super-Strong Engine Oil", category: "Lubricants", description: "Super Dunek Super-Strong engine oil. Confirm the grade and container size at the store.", image: "IMG-20261103-WA0024.jpg", images: ["IMG-20261103-WA0024.jpg"], price: null, available: null }
];

const money = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function formatMoney(amount) {
  return money.format(amount);
}

function roundAmount(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function loadDraftCart() {
  try {
    const stored = window.sessionStorage.getItem("dumek-pos-cart-v1");
    if (!stored) return { lines: [], error: "" };
    const lines = JSON.parse(stored);
    if (!Array.isArray(lines) || lines.some(line =>
      !line || typeof line.id !== "string" || typeof line.name !== "string"
      || typeof line.unit !== "string" || !Number.isSafeInteger(line.quantity) || line.quantity < 1
      || !Number.isFinite(line.unitPrice) || line.unitPrice < 0
      || (line.productId !== null && line.productId !== undefined && typeof line.productId !== "string")
    )) {
      throw new Error("Saved cart data is invalid.");
    }
    return { lines, error: "" };
  } catch (error) {
    console.error("Could not load the saved cashier cart.", error);
    return { lines: [], error: "The saved cart could not be loaded. Start a new sale." };
  }
}

function useDraftCart() {
  const [cartState, setCartState] = useState(loadDraftCart);

  useEffect(() => {
    try {
      window.sessionStorage.setItem("dumek-pos-cart-v1", JSON.stringify(cartState.lines));
    } catch (error) {
      console.error("Could not save the cashier cart.", error);
      setCartState(current => ({ ...current, error: "Your cart could not be saved in this browser session." }));
    }
  }, [cartState.lines]);

  function addLine(line) {
    setCartState(current => ({ ...current, lines: [...current.lines, line] }));
  }

  function removeLine(id) {
    setCartState(current => ({ ...current, lines: current.lines.filter(line => line.id !== id) }));
  }

  function updateQuantity(id, quantity) {
    setCartState(current => ({
      ...current,
      lines: current.lines.map(line => line.id === id ? { ...line, quantity } : line)
    }));
  }

  function clearCart() {
    setCartState(current => ({ ...current, lines: [] }));
  }

  return { ...cartState, addLine, removeLine, updateQuantity, clearCart };
}

function cartTotal(lines) {
  return roundAmount(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0));
}

function pageFromPath(pathname) {
  const filename = pathname.split("/").pop();
  const pages = {
    "index.html": "home",
    "shop.html": "shop",
    "about.html": "about",
    "contact.html": "contact",
    "cart.html": "cart",
    "pos.html": "pos",
    "manager.html": "manager",
    "login.html": "login",
    "product.html": "product"
  };
  return pages[filename] || null;
}

function useProducts() {
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [inventoryState, setInventoryState] = useState("loading");

  useEffect(() => {
    let active = true;
    let stopWatching = () => {};
    const timeout = window.setTimeout(() => {
      if (active) setInventoryState(current => current === "loading" ? "error" : current);
    }, 10000);

    import("./catalog.js").then(catalog => {
      if (!active) return;
      stopWatching = catalog.watchProductInventory(inventory => {
        window.clearTimeout(timeout);
        setProducts(DEFAULT_PRODUCTS.map(product => {
          const stored = inventory[product.id] || {};
          return {
            ...product,
            name: typeof stored.name === "string" && stored.name.trim() ? stored.name : product.name,
            category: typeof stored.category === "string" && stored.category.trim() ? stored.category : product.category,
            description: typeof stored.description === "string" && stored.description.trim() ? stored.description : product.description,
            price: typeof stored.price === "number" && stored.price >= 0 ? stored.price : null,
            available: Number.isInteger(stored.available) && stored.available >= 0 ? stored.available : null
          };
        }));
        setInventoryState("ready");
      }, error => {
        window.clearTimeout(timeout);
        console.error("Could not load product availability from Firestore.", error);
        setInventoryState("error");
      });
    }).catch(error => {
      window.clearTimeout(timeout);
      console.error("Could not initialize Firestore inventory.", error);
      setInventoryState("error");
    });

    return () => {
      active = false;
      window.clearTimeout(timeout);
      stopWatching();
    };
  }, []);

  return { products, inventoryState };
}

function useAccount() {
  const [account, setAccount] = useState({ user: null, profile: null, loading: true });

  useEffect(() => {
    let active = true;
    let stopWatching = () => {};
    import("./auth.js").then(auth => {
      if (!active) return;
      stopWatching = auth.watchUser((user, profile, profileLoaded) => setAccount({ user, profile, loading: !profileLoaded }), error => {
        console.error("Could not load the signed-in user profile.", error);
        if (active) setAccount(current => ({ ...current, loading: false }));
      });
    }).catch(error => {
      console.error("Could not initialize account status.", error);
      if (active) setAccount({ user: null, profile: null, loading: false });
    });

    return () => {
      active = false;
      stopWatching();
    };
  }, []);

  return account;
}

function RevealSection({ className = "", children }) {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return <section ref={sectionRef} className={`${className} reveal-ready${visible ? " is-visible" : ""}`} data-reveal>{children}</section>;
}

function Header({ page, products, account, onLogout, logoutPending, cartCount }) {
  const firstName = account.profile?.firstName || account.user?.displayName?.split(" ")[0] || account.user?.email?.split("@")[0];
  const isStaff = ["cashier", "manager"].includes(account.profile?.role);
  const search = new URLSearchParams(window.location.search).get("q") || "";

  return <>
    <div className="promo">Visit our store in Uruagu, Nnewi — we do not offer delivery</div>
    <header className="site-header">
      <div className="wrap bar">
        <a className="logo" href="index.html">DUMEK <span>POWERMAN</span></a>
        <form className="search" action="shop.html" role="search">
          <input name="q" type="search" placeholder="Search generator parts..." aria-label="Search products" defaultValue={search} />
        </form>
        <a className="cartbtn" href={isStaff ? "cart.html" : "contact.html"}>
          {isStaff ? <>Cart <span className="cart-count">{cartCount}</span></> : "Visit store"}
        </a>
      </div>
      <nav className="menu" aria-label="Main">
        <div className="wrap">
          <a href="index.html" className={page === "home" ? "on" : undefined}>Home</a>
          <a href="shop.html" className={page === "shop" ? "on" : undefined}>Catalogue <span className="nav-count">{products.length}</span></a>
          <a href="about.html" className={page === "about" ? "on" : undefined}>About</a>
          {isStaff && <a href="pos.html" className={page === "pos" ? "on" : undefined}>Point of Sale</a>}
          {account.profile?.role === "manager" && <a href="manager.html" className={page === "manager" ? "on" : undefined}>Manager</a>}
          <span className="account-nav">
            {account.user
              ? <><span className="nav-auth nav-user">Hi, {firstName}</span><button className="nav-logout" type="button" disabled={logoutPending} onClick={onLogout}>{logoutPending ? "Logging out..." : "Log out"}</button></>
              : <a className="nav-auth" href="login.html" aria-current={page === "login" ? "page" : undefined}>Staff log in <span aria-hidden="true">↗</span></a>}
          </span>
        </div>
      </nav>
    </header>
  </>;
}

function Footer() {
  return <footer className="site-footer"><div className="wrap">
    <div><a className="logo" href="index.html">DUMEK <span>POWERMAN</span></a><p>Reliable power for homes and businesses.</p></div>
    <div><b style={{ color: "#fff" }}>Explore</b><a href="shop.html">Catalogue</a><a href="about.html">About us</a><a href="contact.html">Contact us</a></div>
    <div><b style={{ color: "#fff" }}>Visit us</b><a href="contact.html">Store address</a></div>
    <div>© 2026 Dumek Powerman</div>
  </div></footer>;
}

function Availability({ product, state }) {
  if (state === "error") return <div className="stock-level stock-error">Availability temporarily unavailable</div>;
  if (state === "loading") return <div className="stock-level">Loading availability…</div>;
  if (product.available === null) return <div className="stock-level stock-unset">Availability not set</div>;
  return <div className="stock-level"><span className="stock-dot" /><b>{product.available} available</b></div>;
}

function ProductCard({ product, inventoryState }) {
  const price = product.price === null ? "Contact for price" : `₦${product.price.toLocaleString("en-NG")}`;
  return <article className="card">
    <div className="product-art"><img src={`./assets/${product.image}`} alt={product.name} loading="lazy" /></div>
    <div className="info">
      <span className="product-category">{product.category}</span>
      <h3><a href={`product.html?id=${product.id}`}>{product.name}</a></h3>
      <p>{product.description}</p>
      <Availability product={product} state={inventoryState} />
      <div className="buy"><span className="price">{price}</span><a className="btn" href="contact.html">Visit store</a></div>
    </div>
  </article>;
}

function Trust({ items }) {
  return <section className="trust"><div className="wrap">{items.map(([title, description], index) =>
    <div key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{description}</p></div>
  )}</div></section>;
}

function HomePage({ products, inventoryState }) {
  const categories = [
    ["Engines", "Petrol engines", "GX160, GX390 and 190F models"],
    ["Water Pumps", "Water pumps", "WP20X and WP30X models"],
    ["Accessories", "Accessories", "Hoses and other essentials"],
    ["Lubricants", "Lubricants", "Engine oil and care essentials"]
  ];
  return <main>
    <section className="hero"><div className="wrap hero-content">
      <span className="eyebrow"><span className="pulse" /> Generator engines &amp; water pumps</span>
      <h1>Reliable equipment. <em>Right here in Nnewi.</em></h1>
      <p>Browse our engines, water pumps and accessories, then visit our store in Uruagu to check availability and prices.</p>
      <a className="btn" href="shop.html">Explore the catalogue <span aria-hidden="true">→</span></a><a className="btn ghost" href="contact.html">Talk to our team</a>
      <div className="hero-note"><span>01</span> Engines &amp; water pumps <i /><span>02</span> In-store purchases only</div>
    </div></section>
    <RevealSection className="section"><div className="wrap"><div className="head"><div><span className="eyebrow dark">Find what you need</span><h2>Shop by category</h2></div></div>
      <div className="tiles">{categories.map(([category, label, description], index) =>
        <a className="tile" href={`shop.html?cat=${encodeURIComponent(category)}`} key={category}><span className="tile-index">{String(index + 1).padStart(2, "0")}</span>{label}<small>{description}</small><span className="tile-arrow" aria-hidden="true">↗</span></a>
      )}</div>
    </div></RevealSection>
    <RevealSection className="section popular"><div className="wrap"><div className="head"><div><span className="eyebrow dark">Explore the range</span><h2>Featured products</h2></div><a href="shop.html">View full catalogue <span aria-hidden="true">→</span></a></div>
      <div className="grid">{products.slice(0, 4).map(product => <ProductCard key={product.id} product={product} inventoryState={inventoryState} />)}</div>
    </div></RevealSection>
    <Trust items={[["Engines & pumps", "Browse the products shown in our current catalogue."], ["Confirm in store", "Check product specifications, availability and prices with us in person."], ["Visit us in Nnewi", "Purchases are in person; we do not offer delivery."]]} />
  </main>;
}

function AboutPage() {
  return <main>
    <section className="about-hero"><div className="wrap"><span className="eyebrow"><span className="pulse" /> About Dumek Powerman</span><h1>Power should feel <em>dependable.</em></h1><p>We help homes and businesses keep their generators and power systems ready for the moments that matter.</p></div></section>
    <RevealSection className="section"><div className="wrap about-grid">
      <div><span className="eyebrow dark">What we do</span><h2>Parts, guidance and power you can count on.</h2></div>
      <div><p>From the small components that keep a generator running to backup power for your home, Dumek Powerman makes it easier to find the right equipment.</p><p>We believe a good buying experience means clear choices, reliable products and helpful people when you need advice.</p><a className="btn" href="shop.html">Browse the catalogue <span aria-hidden="true">→</span></a></div>
    </div></RevealSection>
    <Trust items={[["Practical expertise", "Guidance that helps you choose the right part for your setup."], ["Dependable products", "Useful generator parts and power essentials for daily needs."], ["Here to help", "Get in touch if you need help finding what fits."]]} />
    <RevealSection className="section about-contact"><div className="wrap"><div><span className="eyebrow dark">Need a hand?</span><h2>Let’s find the right part.</h2></div><a className="btn" href="contact.html">Contact our team <span aria-hidden="true">→</span></a></div></RevealSection>
  </main>;
}

function ShopPage({ products, inventoryState }) {
  const params = new URLSearchParams(window.location.search);
  const category = params.get("cat") || "";
  const query = (params.get("q") || "").toLowerCase();
  const categories = [...new Set(products.map(product => product.category))];
  const filtered = products.filter(product => (!category || product.category === category) && `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query));

  return <main className="section catalogue"><div className="wrap">
    <div className="catalogue-intro"><div><span className="eyebrow dark">Find the right fit</span><h1>Engines &amp; water pumps</h1><p>Browse our products and visit the store to confirm prices and availability.</p></div><div className="stock-note">Availability updates live from our store inventory</div></div>
    <div className="chips"><a className={`chip${!category ? " on" : ""}`} href="shop.html">All</a>{categories.map(item => <a className={`chip${category === item ? " on" : ""}`} href={`shop.html?cat=${encodeURIComponent(item)}`} key={item}>{item}</a>)}</div>
    <p className="catalogue-count" aria-live="polite">{filtered.length} products</p>
    <div className="grid">{filtered.length ? filtered.map(product => <ProductCard key={product.id} product={product} inventoryState={inventoryState} />) : <div className="empty">No products found. Try another search or pick a different category.</div>}</div>
  </div></main>;
}

function ProductPage({ products, inventoryState }) {
  const id = Number(new URLSearchParams(window.location.search).get("id"));
  const product = products.find(item => item.id === id);
  useEffect(() => {
    document.title = product ? `${product.name} | Dumek Powerman` : "Product | Dumek Powerman";
  }, [product]);

  if (!product) return <main className="section"><div className="wrap"><div className="empty">Product not found. <a href="shop.html">Back to shop</a></div></div></main>;

  const related = products.filter(item => item.category === product.category && item.id !== product.id);
  const price = product.price === null ? "Contact for price" : `₦${product.price.toLocaleString("en-NG")}`;
  return <main className="section"><div className="wrap">
    <div className="detail">
      <div><div className="crumbs"><a href="shop.html">Catalogue</a> / <a href={`shop.html?cat=${encodeURIComponent(product.category)}`}>{product.category}</a></div><div className="product-art"><img src={`./assets/${product.image}`} alt={product.name} /></div><div className="detail-gallery">{product.images.slice(1).map(image => <img src={`./assets/${image}`} alt={product.name} loading="lazy" key={image} />)}</div></div>
      <div><span className="product-category">{product.category}</span><h1>{product.name}</h1><p>{product.description}</p><Availability product={product} state={inventoryState} /><span className="price">{price}</span><p>We do not offer delivery. Please visit our store in Uruagu, Nnewi to confirm availability and purchase.</p><a className="btn" href="contact.html">Store address</a><ul><li>Confirm compatibility and specifications in store</li><li>In-person purchases only; delivery is not available</li></ul></div>
    </div>
    {related.length > 0 && <><div className="head" style={{ marginTop: 56 }}><h2>More like this</h2></div><div className="grid">{related.map(item => <ProductCard key={item.id} product={item} inventoryState={inventoryState} />)}</div></>}
  </div></main>;
}

function PointOfSale({ products, cart, addLine, storageError }) {
  const [itemName, setItemName] = useState("");
  const [unit, setUnit] = useState("Piece");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const selectedProduct = products.find(item => item.name.toLocaleLowerCase() === itemName.trim().toLocaleLowerCase());

  function handleItemNameChange(event) {
    const value = event.target.value;
    setItemName(value);
    const product = products.find(item => item.name.toLocaleLowerCase() === value.trim().toLocaleLowerCase());
    setUnitPrice(product?.price === null || !product ? "" : String(product.price));
  }

  function addToCart(event) {
    event.preventDefault();
    const name = itemName.trim();
    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(unitPrice);
    const lineTotal = roundAmount(parsedQuantity * parsedPrice);
    if (!name || !Number.isSafeInteger(parsedQuantity) || parsedQuantity < 1 || !Number.isFinite(parsedPrice) || parsedPrice < 0
      || !Number.isFinite(lineTotal) || !Number.isFinite(roundAmount(cartTotal(cart) + lineTotal))) {
      setError("Enter an item, a whole-number quantity, and a valid price.");
      return;
    }

    addLine({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      unit,
      quantity: parsedQuantity,
      unitPrice: roundAmount(parsedPrice),
      productId: products.find(item => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())?.id.toString() || null
    });
    setItemName("");
    setUnit("Piece");
    setQuantity("1");
    setUnitPrice("");
    setError("");
    setNotice(`${name} added to cart.`);
  }

  return <main className="pos-page"><div className="pos-wrap">
    <div className="pos-heading"><span className="eyebrow dark">Cashier workspace</span><h1>Point of Sale</h1><p>Search for a generator part or enter a custom item and price, then review the cart before payment.</p></div>
    <div className="pos-grid">
      <section className="pos-panel" aria-labelledby="addItemHeading">
        <h2 id="addItemHeading">Add item</h2>
        <form className="pos-form" onSubmit={addToCart}>
          <label className="pos-field">Search product or enter item name
            <input list="pos-products" value={itemName} onChange={handleItemNameChange} placeholder="Search product..." autoComplete="off" required />
            <datalist id="pos-products">{products.map(product => <option value={product.name} key={product.id} />)}</datalist>
          </label>
          {selectedProduct && <p className={`pos-stock-note${selectedProduct.available === null ? " stock-unset" : ""}`}>
            {selectedProduct.available === null
              ? "Stock count unavailable"
              : `${selectedProduct.available} in stock${Number(quantity) > selectedProduct.available ? ` — only ${selectedProduct.available} available` : ""}`}
          </p>}
          <label className="pos-field">Unit
            <select value={unit} onChange={event => setUnit(event.target.value)}>
              {["Piece", "Unit", "Set", "Box", "Pack", "Litre"].map(option => <option key={option}>{option}</option>)}
            </select>
          </label>
          <div className="pos-form-row">
            <label className="pos-field">Quantity
              <input type="number" min="1" step="1" value={quantity} onChange={event => setQuantity(event.target.value)} required />
            </label>
            <label className="pos-field">Price per {unit.toLowerCase()} (₦)
              <input type="number" min="0" step="0.01" value={unitPrice} onChange={event => setUnitPrice(event.target.value)} placeholder="Enter price" required />
            </label>
          </div>
          <button className="btn pos-wide-button" type="submit">Add to cart</button>
          {notice && <p className="pos-success" role="status">{notice}</p>}
          {error && <p className="pos-error" role="alert">{error}</p>}
        </form>
      </section>

      <section className="pos-panel pos-cart" aria-labelledby="cartHeading">
        <h2 id="cartHeading">Cart <span>{cart.length} {cart.length === 1 ? "line" : "lines"}</span></h2>
        {!cart.length
          ? <p className="pos-empty">No items yet. Add an item to start the sale.</p>
          : <ul className="pos-cart-list">{cart.slice(-4).map(line => <li className="pos-cart-line" key={line.id}>
            <div><strong>{line.name}</strong><small>{line.quantity} {line.unit} × {formatMoney(line.unitPrice)}</small></div>
            <b>{formatMoney(roundAmount(line.quantity * line.unitPrice))}</b>
          </li>)}</ul>}
        {cart.length > 4 && <p className="pos-cart-more">And {cart.length - 4} more line{cart.length - 4 === 1 ? "" : "s"} in the cart.</p>}
        {storageError && <p className="pos-error" role="alert">{storageError}</p>}
        <div className="pos-total"><span>Sale total</span><strong>{formatMoney(cartTotal(cart))}</strong></div>
        <a className="btn pos-wide-button pos-review-button" href="cart.html">Review cart and checkout</a>
      </section>
    </div>
  </div></main>;
}

function CartPage({ cart, products, removeLine, updateQuantity, clearCart, cashierUser, cashierName, storageError }) {
  const [paymentType, setPaymentType] = useState("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");
  const [savingSale, setSavingSale] = useState(false);
  const total = cartTotal(cart);

  async function completeSale(event) {
    event.preventDefault();
    const isCredit = paymentType === "credit";
    const received = isCredit ? 0 : Number(amountReceived);
    if (!cart.length || (!isCredit && (!Number.isFinite(received) || received < total))) {
      setError("The amount received must be at least the cart total.");
      return;
    }
    if (isCredit && (!customerName.trim() || !customerPhone.trim())) {
      setError("Enter the customer's name and phone number for a credit sale.");
      return;
    }

    setSavingSale(true);
    setError("");
    try {
      const sales = await import("./sales.js");
      const saleLines = cart.map(line => {
        if (line.productId !== undefined) return { ...line };
        const product = products.find(item => item.name.toLocaleLowerCase() === line.name.toLocaleLowerCase());
        return { ...line, productId: product ? String(product.id) : null };
      });
      const sale = {
        cashierUid: cashierUser.uid,
        cashierEmail: cashierUser.email,
        cashierName,
        lines: saleLines,
        total,
        paymentType,
        amountReceived: roundAmount(received),
        balanceDue: isCredit ? total : 0,
        change: isCredit ? 0 : roundAmount(received - total)
      };
      if (isCredit) {
        sale.customerName = customerName.trim();
        sale.customerPhone = customerPhone.trim();
      }
      const savedSale = await sales.recordSale(sale);
      setReceipt({
        number: savedSale.saleNumber,
        issuedAt: new Date(),
        cashierName,
        lines: saleLines,
        total,
        received: roundAmount(received),
        change: isCredit ? 0 : roundAmount(received - total),
        paymentType,
        balanceDue: isCredit ? total : 0,
        customerName: isCredit ? customerName.trim() : "",
        customerPhone: isCredit ? customerPhone.trim() : ""
      });
      clearCart();
    } catch (saveError) {
      console.error("Could not save the sale.", saveError);
      setError(saveError.code?.startsWith("inventory/")
        ? saveError.message
        : "The sale and stock update could not be saved, so checkout is not complete. Check the connection and try again.");
    } finally {
      setSavingSale(false);
    }
  }

  if (receipt) {
    return <main className="pos-page"><div className="pos-wrap">
      <div className="pos-heading"><span className="eyebrow dark">Sale complete</span><h1>Receipt</h1><p>Review the receipt below. Print it only if the customer wants a copy.</p></div>
      <article className="receipt-preview" aria-label="Customer receipt">
        <header className="receipt-header">
          <strong>DUMEK POWERMAN</strong>
          <span>Number 10, Umeozulumba Street</span>
          <span>Uruagu, Nnewi, Anambra State, Nigeria</span>
          <b>{receipt.paymentType === "credit" ? "CREDIT SALE" : "SALES RECEIPT"}</b>
        </header>
        <dl className="receipt-meta">
          <div><dt>Receipt</dt><dd>{receipt.number}</dd></div>
          <div><dt>Date</dt><dd>{receipt.issuedAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</dd></div>
          <div><dt>Cashier</dt><dd>{receipt.cashierName}</dd></div>
          {receipt.paymentType === "credit" && <>
            <div><dt>Customer</dt><dd>{receipt.customerName}</dd></div>
            <div><dt>Phone</dt><dd>{receipt.customerPhone}</dd></div>
          </>}
        </dl>
        <div className="receipt-table-wrap"><table className="receipt-table">
          <thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead>
          <tbody>{receipt.lines.map(line => <tr key={line.id}>
            <td>{line.name}</td>
            <td>{line.quantity} {line.unit}</td>
            <td>{formatMoney(line.unitPrice)}</td>
            <td>{formatMoney(roundAmount(line.quantity * line.unitPrice))}</td>
          </tr>)}</tbody>
        </table></div>
        <dl className="receipt-totals">
          <div><dt>Total</dt><dd>{formatMoney(receipt.total)}</dd></div>
          {receipt.paymentType === "credit" ? <>
            <div><dt>Amount paid</dt><dd>{formatMoney(receipt.received)}</dd></div>
            <div className="receipt-change"><dt>Balance due</dt><dd>{formatMoney(receipt.balanceDue)}</dd></div>
          </> : <>
            <div><dt>Amount received</dt><dd>{formatMoney(receipt.received)}</dd></div>
            <div className="receipt-change"><dt>Change</dt><dd>{formatMoney(receipt.change)}</dd></div>
          </>}
        </dl>
        <p className="receipt-thanks">{receipt.paymentType === "credit" ? "Please keep this receipt for your credit balance." : "Thank you for shopping with us."}</p>
      </article>
      <div className="receipt-print-actions">
        <button className="btn" type="button" onClick={() => window.print()}>Print receipt</button>
        <a className="btn ghost" href="pos.html">Start new sale</a>
      </div>
    </div></main>;
  }

  return <main className="pos-page"><div className="pos-wrap">
    <div className="pos-heading"><span className="eyebrow dark">Cashier workspace</span><h1>Cart</h1><p>Review every item and the total before taking payment.</p></div>
    {storageError && <p className="pos-error" role="alert">{storageError}</p>}
    {!cart.length
      ? <section className="pos-panel pos-empty-cart"><h2>Your cart is empty</h2><p>Add generator parts in the Point of Sale to begin a sale.</p><a className="btn" href="pos.html">Go to Point of Sale</a></section>
      : <div className="pos-grid cart-checkout-grid">
        <section className="pos-panel" aria-labelledby="cartItemsHeading">
          <h2 id="cartItemsHeading">Selected items <span>{cart.length} {cart.length === 1 ? "line" : "lines"}</span></h2>
          <div className="cart-table-wrap"><table className="cart-table">
            <thead><tr><th>Item</th><th>Unit price</th><th>Quantity</th><th>Amount</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
            <tbody>{cart.map(line => <tr key={line.id}>
              <td><strong>{line.name}</strong><small>{line.unit}</small></td>
              <td>{formatMoney(line.unitPrice)}</td>
              <td><input className="cart-quantity" aria-label={`Quantity for ${line.name}`} type="number" min="1" step="1" value={line.quantity} onChange={event => {
                const quantity = Number(event.target.value);
                if (Number.isSafeInteger(quantity) && quantity > 0) updateQuantity(line.id, quantity);
              }} /></td>
              <td>{formatMoney(roundAmount(line.quantity * line.unitPrice))}</td>
              <td><button className="pos-remove" type="button" onClick={() => removeLine(line.id)} aria-label={`Remove ${line.name}`}>Remove</button></td>
            </tr>)}</tbody>
          </table></div>
          <div className="cart-actions"><button className="linkbtn" type="button" onClick={clearCart}>Clear cart</button><a className="linkbtn" href="pos.html">Add more items</a></div>
        </section>
        <section className="pos-panel" aria-labelledby="checkoutHeading">
          <h2 id="checkoutHeading">Checkout</h2>
          <div className="pos-total cart-total"><span>Total due</span><strong>{formatMoney(total)}</strong></div>
          <form className="pos-payment" onSubmit={completeSale}>
            <fieldset className="payment-choice">
              <legend>Payment type</legend>
              <label><input type="radio" name="paymentType" value="cash" checked={paymentType === "cash"} onChange={() => { setPaymentType("cash"); setError(""); }} disabled={savingSale} /> Cash</label>
              <label><input type="radio" name="paymentType" value="credit" checked={paymentType === "credit"} onChange={() => { setPaymentType("credit"); setError(""); }} disabled={savingSale} /> Credit</label>
            </fieldset>
            {paymentType === "credit" ? <>
              <label className="pos-field">Customer name
                <input type="text" value={customerName} onChange={event => setCustomerName(event.target.value)} maxLength="160" placeholder="Enter customer name" required disabled={savingSale} />
              </label>
              <label className="pos-field">Customer phone number
                <input type="tel" value={customerPhone} onChange={event => setCustomerPhone(event.target.value)} maxLength="30" placeholder="Enter phone number" required disabled={savingSale} />
              </label>
              <p className="pos-change">Balance due <strong>{formatMoney(total)}</strong></p>
            </> : <>
              <label className="pos-field">Amount received (₦)
                <input type="number" min={total} step="0.01" value={amountReceived} onChange={event => setAmountReceived(event.target.value)} placeholder="Enter amount received" required disabled={savingSale} />
              </label>
              <p className="pos-change">Change due <strong>{formatMoney(Math.max(0, roundAmount((Number(amountReceived) || 0) - total)))}</strong></p>
            </>}
              <button className="btn pos-wide-button" type="submit" disabled={savingSale}>{savingSale ? "Saving sale..." : "Complete sale"}</button>
            {error && <p className="pos-error" role="alert">{error}</p>}
          </form>
        </section>
      </div>}
  </div></main>;
}

function formatActivityTime(value) {
  if (!value) return "Waiting for server timestamp…";
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

function ManagerPage() {
  const [activity, setActivity] = useState({ sales: [], logins: [], loading: true, error: null });
  const [creatingCashier, setCreatingCashier] = useState(false);
  const [cashierNotice, setCashierNotice] = useState(null);

  useEffect(() => {
    let active = true;
    let stopWatching = () => {};
    import("./sales.js").then(sales => {
      if (!active) return;
      try {
        stopWatching = sales.watchManagerActivity(setActivity, error => {
          console.error("Could not load manager activity.", error);
        });
      } catch (error) {
        console.error("Could not start manager activity listeners.", error);
        setActivity(current => ({ ...current, loading: false, error }));
      }
    }).catch(error => {
      console.error("Could not load manager activity tools.", error);
      if (active) setActivity(current => ({ ...current, loading: false, error }));
    });

    return () => {
      active = false;
      stopWatching();
    };
  }, []);

  const salesTotal = roundAmount(activity.sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0));
  const creditSales = activity.sales.filter(sale => Number(sale.balanceDue) > 0);
  const creditBalance = roundAmount(creditSales.reduce((sum, sale) => sum + Number(sale.balanceDue), 0));

  async function handleCreateCashier(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setCreatingCashier(true);
    setCashierNotice(null);
    try {
      const auth = await import("./auth.js");
      const result = await auth.createCashierAccount({
        firstName: values.get("firstName"),
        surname: values.get("surname"),
        email: values.get("email"),
        password: values.get("password")
      });
      form.reset();
      setCashierNotice({ state: "success", message: `Cashier account created for ${result.email}. Share the temporary password securely.` });
    } catch (error) {
      console.error("Could not create cashier account.", error);
      const message = error.code === "auth/email-already-in-use"
        ? "That email already has a Firebase Authentication account."
        : ["permission-denied", "firestore/permission-denied"].includes(error.code)
          ? "Firebase denied the request. Publish the latest Firestore rules and confirm your account has role: manager."
          : error.code === "auth/weak-password"
            ? "Choose a stronger temporary password with at least 8 characters."
            : error.code === "auth/invalid-email"
              ? "Enter a valid email address."
              : error.code === "auth/operation-not-allowed"
                ? "Email/password sign-in is disabled. Enable it in Firebase Console under Authentication > Sign-in method."
                : error.message || "Could not create the cashier account. Check Firebase setup and try again.";
      setCashierNotice({ state: "error", message });
    } finally {
      setCreatingCashier(false);
    }
  }

  return <main className="manager-page"><div className="manager-wrap">
    <div className="pos-heading"><span className="eyebrow dark">Manager workspace</span><h1>Store activity</h1><p>Live sales records and successful sign-in times for store accounts.</p></div>
    <div className="manager-stats">
      <article className="manager-stat"><span>Recorded sales</span><strong>{activity.sales.length}</strong></article>
      <article className="manager-stat"><span>Sales value</span><strong>{formatMoney(salesTotal)}</strong></article>
      <article className="manager-stat"><span>Outstanding credit</span><strong>{formatMoney(creditBalance)}</strong></article>
      <article className="manager-stat"><span>Recorded sign-ins</span><strong>{activity.logins.length}</strong></article>
    </div>
    {activity.error && <p className="pos-error manager-error" role="alert">Manager activity could not be loaded. Confirm the published Firestore rules and your manager role, then refresh.</p>}
    {activity.loading && <p className="manager-loading" role="status">Loading store activity…</p>}
    <section className="pos-panel manager-panel" aria-labelledby="createCashierHeading">
      <h2 id="createCashierHeading">Add a cashier</h2>
      <p className="manager-form-help">Create an individual staff login. Give the temporary password to the cashier privately. They can change it with the password reset link on the sign-in page.</p>
      <form className="manager-cashier-form" onSubmit={handleCreateCashier}>
        <label className="pos-field">First name
          <input name="firstName" type="text" autoComplete="given-name" maxLength="80" required disabled={creatingCashier} />
        </label>
        <label className="pos-field">Surname
          <input name="surname" type="text" autoComplete="family-name" maxLength="80" required disabled={creatingCashier} />
        </label>
        <label className="pos-field">Email address
          <input name="email" type="email" autoComplete="off" maxLength="254" required disabled={creatingCashier} />
        </label>
        <label className="pos-field">Temporary password
          <input name="password" type="password" autoComplete="new-password" minLength="8" required disabled={creatingCashier} />
        </label>
        <button className="btn" type="submit" disabled={creatingCashier}>{creatingCashier ? "Creating account..." : "Create cashier account"}</button>
      </form>
      {cashierNotice && <p className={`manager-cashier-notice ${cashierNotice.state}`} role={cashierNotice.state === "error" ? "alert" : "status"}>{cashierNotice.message}</p>}
    </section>
    <section className="pos-panel manager-panel" aria-labelledby="salesHeading">
      <h2 id="salesHeading">Sales</h2>
      {activity.sales.length
        ? <div className="manager-table-wrap"><table className="manager-table">
          <thead><tr><th>Date and time</th><th>Receipt</th><th>Payment</th><th>Customer</th><th>Cashier</th><th>Items</th><th>Total</th><th>Paid</th><th>Balance / change</th></tr></thead>
          <tbody>{activity.sales.map(sale => <tr key={sale.id}>
            <td>{formatActivityTime(sale.createdAt)}</td>
            <td>{sale.saleNumber || sale.id}</td>
            <td>{sale.paymentType === "credit" ? "Credit" : "Cash"}</td>
            <td>{sale.paymentType === "credit" ? <>{sale.customerName}<small>{sale.customerPhone}</small></> : "—"}</td>
            <td>{sale.cashierName}<small>{sale.cashierEmail}</small></td>
            <td>{Array.isArray(sale.lines) ? sale.lines.map(line => `${line.name} × ${line.quantity}`).join(", ") : "—"}</td>
            <td>{formatMoney(Number(sale.total) || 0)}</td>
            <td>{formatMoney(Number(sale.amountReceived) || 0)}</td>
            <td>{formatMoney(Number(sale.balanceDue) || Number(sale.change) || 0)}</td>
          </tr>)}</tbody>
        </table></div>
        : !activity.loading && <p className="manager-empty">No sales have been recorded yet.</p>}
    </section>
    <section className="pos-panel manager-panel" aria-labelledby="creditHeading">
      <h2 id="creditHeading">Outstanding credit</h2>
      {creditSales.length
        ? <div className="manager-table-wrap"><table className="manager-table">
          <thead><tr><th>Date and time</th><th>Receipt</th><th>Customer</th><th>Phone</th><th>Balance due</th><th>Cashier</th></tr></thead>
          <tbody>{creditSales.map(sale => <tr key={sale.id}>
            <td>{formatActivityTime(sale.createdAt)}</td>
            <td>{sale.saleNumber || sale.id}</td>
            <td>{sale.customerName}</td>
            <td>{sale.customerPhone}</td>
            <td>{formatMoney(Number(sale.balanceDue) || 0)}</td>
            <td>{sale.cashierName}</td>
          </tr>)}</tbody>
        </table></div>
        : !activity.loading && <p className="manager-empty">There are no outstanding credit sales.</p>}
    </section>
    <section className="pos-panel manager-panel" aria-labelledby="loginsHeading">
      <h2 id="loginsHeading">User sign-ins</h2>
      {activity.logins.length
        ? <div className="manager-table-wrap"><table className="manager-table">
          <thead><tr><th>Date and time</th><th>User</th><th>Email</th></tr></thead>
          <tbody>{activity.logins.map(login => <tr key={login.id}>
            <td>{formatActivityTime(login.createdAt)}</td><td>{login.name}</td><td>{login.email}</td>
          </tr>)}</tbody>
        </table></div>
        : !activity.loading && <p className="manager-empty">No sign-ins have been recorded yet.</p>}
    </section>
  </div></main>;
}

function CashierPage({ page, account, products, cart, cartActions, onLogout, logoutPending }) {
  if (account.loading) {
    return <main className="pos-page"><div className="pos-wrap"><p className="pos-access-message">Checking staff access…</p></div></main>;
  }
  if (!account.user) {
    return <main className="pos-page"><div className="pos-wrap pos-access-message">
      <h1>Staff sign-in required</h1><p>Please sign in with an account provided by the store manager to use the point of sale.</p><a className="btn" href="login.html">Go to sign in</a>
    </div></main>;
  }
  if (!["cashier", "manager"].includes(account.profile?.role)) {
    return <main className="pos-page"><div className="pos-wrap pos-access-message">
      <h1>Store staff account required</h1><p>This account is not authorized for the point of sale. Ask the manager to add or authorize your cashier account.</p>
      <button className="btn" type="button" onClick={onLogout} disabled={logoutPending}>{logoutPending ? "Signing out..." : "Sign out"}</button>
    </div></main>;
  }
  if (page === "manager" && account.profile?.role !== "manager") {
    return <main className="pos-page"><div className="pos-wrap pos-access-message">
      <h1>Manager access only</h1><p>This page is only available to accounts with the manager role.</p>
      <button className="btn" type="button" onClick={onLogout} disabled={logoutPending}>{logoutPending ? "Signing out..." : "Sign out"}</button>
    </div></main>;
  }
  if (page === "manager") return <ManagerPage />;

  const cashierName = [account.profile.firstName, account.profile.surname].filter(Boolean).join(" ") || account.user.email || "Cashier";
  if (page === "cart") return <CartPage cart={cart} products={products} cashierUser={account.user} cashierName={cashierName} storageError={cartActions.error} {...cartActions} />;
  return <PointOfSale products={products} cart={cart} addLine={cartActions.addLine} storageError={cartActions.error} />;
}

function ContactPage() {
  return <main className="section"><div className="wrap"><div className="head"><h1>Visit our store</h1></div><div className="contact">
    <div><h3>Store address</h3><p>Number 10, Umeozulumba Street<br />Uruagu, Nnewi<br />Anambra State, Nigeria</p></div>
    <div><h3>Purchases</h3><p>Please visit the store to confirm product availability and prices.</p></div>
    <div><h3>Delivery</h3><p>We do not offer delivery. All purchases are in person at the store.</p></div>
  </div></div></main>;
}

function App() {
  const [page, setPage] = useState(() => pageFromPath(window.location.pathname) || document.body.dataset.page || "home");
  const { products, inventoryState } = useProducts();
  const account = useAccount();
  const cartActions = useDraftCart();
  const cart = cartActions.lines;
  const cartCount = cart.reduce((count, line) => count + line.quantity, 0);
  const [toast, setToast] = useState("");
  const [logoutPending, setLogoutPending] = useState(false);

  useEffect(() => {
    function navigate(url, replace = false) {
      if (replace) window.history.replaceState({}, "", url);
      else window.history.pushState({}, "", url);
      setPage(pageFromPath(window.location.pathname) || "home");
      window.scrollTo(0, 0);
    }

    function handleClick(event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest("a[href]");
      if (!link || link.target || link.hasAttribute("download")) return;

      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || !pageFromPath(url.pathname)) return;

      event.preventDefault();
      navigate(url);
    }

    function handleSubmit(event) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.getAttribute("role") !== "search") return;

      const url = new URL(form.action, window.location.href);
      if (url.origin !== window.location.origin || !pageFromPath(url.pathname)) return;

      event.preventDefault();
      const query = new URLSearchParams(new FormData(form));
      url.search = query.toString();
      navigate(url);
    }

    function handlePopState() {
      const nextPage = pageFromPath(window.location.pathname);
      if (nextPage) setPage(nextPage);
    }

    document.addEventListener("click", handleClick);
    document.addEventListener("submit", handleSubmit);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("submit", handleSubmit);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    document.body.dataset.page = page;
    const titles = { home: "Dumek Powerman | Engines & Water Pumps", shop: "Catalogue | Dumek Powerman", about: "About | Dumek Powerman", contact: "Visit us | Dumek Powerman", cart: "Cart | Dumek Powerman", pos: "Point of Sale | Dumek Powerman", manager: "Manager | Dumek Powerman", login: "Staff sign in | Dumek Powerman" };
    if (page !== "product") document.title = titles[page] || titles.home;
  }, [page]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function handleLogout() {
    setLogoutPending(true);
    try {
      const auth = await import("./auth.js");
      await auth.logout();
      cartActions.clearCart();
    } catch (error) {
      console.error("Could not sign out.", error);
      setToast("Could not sign out. Please try again.");
    } finally {
      setLogoutPending(false);
    }
  }

  let content;
  switch (page) {
    case "home": content = <HomePage products={products} inventoryState={inventoryState} />; break;
    case "about": content = <AboutPage />; break;
    case "shop": content = <ShopPage products={products} inventoryState={inventoryState} />; break;
    case "product": content = <ProductPage products={products} inventoryState={inventoryState} />; break;
    case "cart":
    case "pos":
    case "manager": content = <CashierPage page={page} account={account} products={products} cart={cart} cartActions={cartActions} onLogout={handleLogout} logoutPending={logoutPending} />; break;
    case "contact": content = <ContactPage />; break;
    case "login": content = <main className="auth-page"><AuthPage /></main>; break;
    default: content = <HomePage products={products} inventoryState={inventoryState} />;
  }

  return <>
    <Header page={page} products={products} account={account} onLogout={handleLogout} logoutPending={logoutPending} cartCount={cartCount} />
    {content}
    <Footer />
    <div className={`toast${toast ? " on" : ""}`} role="status">{toast}</div>
  </>;
}

createRoot(document.getElementById("app")).render(<App />);