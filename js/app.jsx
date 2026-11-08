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
  const [account, setAccount] = useState({ user: null, profile: null });

  useEffect(() => {
    let active = true;
    let stopWatching = () => {};
    import("./auth.js").then(auth => {
      if (!active) return;
      stopWatching = auth.watchUser((user, profile) => setAccount({ user, profile }), error => {
        console.error("Could not load the signed-in user profile.", error);
      });
    }).catch(error => {
      console.error("Could not initialize account status.", error);
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

function Header({ page, products, account, onLogout, logoutPending }) {
  const firstName = account.profile?.firstName || account.user?.displayName?.split(" ")[0] || account.user?.email?.split("@")[0];
  const search = new URLSearchParams(window.location.search).get("q") || "";

  return <>
    <div className="promo">Visit our store in Uruagu, Nnewi — we do not offer delivery</div>
    <header className="site-header">
      <div className="wrap bar">
        <a className="logo" href="index.html">DUMEK <span>POWERMAN</span></a>
        <form className="search" action="shop.html" role="search">
          <input name="q" type="search" placeholder="Search generator parts..." aria-label="Search products" defaultValue={search} />
        </form>
        <a className="cartbtn" href="contact.html">Visit store</a>
      </div>
      <nav className="menu" aria-label="Main">
        <div className="wrap">
          <a href="index.html" className={page === "home" ? "on" : undefined}>Home</a>
          <a href="shop.html" className={page === "shop" ? "on" : undefined}>Catalogue <span className="nav-count">{products.length}</span></a>
          <a href="about.html" className={page === "about" ? "on" : undefined}>About</a>
          <span className="account-nav">
            {account.user
              ? <><span className="nav-auth nav-user">Hi, {firstName}</span><button className="nav-logout" type="button" disabled={logoutPending} onClick={onLogout}>{logoutPending ? "Logging out..." : "Log out"}</button></>
              : <a className="nav-auth" href="login.html" aria-current={page === "login" ? "page" : undefined}>Log in / Sign up <span aria-hidden="true">↗</span></a>}
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

function InStorePage() {
  return <main className="section"><div className="wrap"><div className="head"><h1>In-store purchases</h1></div><div className="empty">We do not offer delivery or online checkout. Please visit <strong>Number 10, Umeozulumba Street, Uruagu, Nnewi, Anambra State, Nigeria</strong> to confirm prices and purchase products.<p><a className="btn" href="shop.html">Browse the catalogue</a></p></div></div></main>;
}

function ContactPage() {
  return <main className="section"><div className="wrap"><div className="head"><h1>Visit our store</h1></div><div className="contact">
    <div><h3>Store address</h3><p>Number 10, Umeozulumba Street<br />Uruagu, Nnewi<br />Anambra State, Nigeria</p></div>
    <div><h3>Purchases</h3><p>Please visit the store to confirm product availability and prices.</p></div>
    <div><h3>Delivery</h3><p>We do not offer delivery. All purchases are in person at the store.</p></div>
  </div></div></main>;
}

function App() {
  const page = document.body.dataset.page || "home";
  const { products, inventoryState } = useProducts();
  const account = useAccount();
  const [toast, setToast] = useState("");
  const [logoutPending, setLogoutPending] = useState(false);

  useEffect(() => {
    const titles = { home: "Dumek Powerman | Engines & Water Pumps", shop: "Catalogue | Dumek Powerman", about: "About | Dumek Powerman", contact: "Visit us | Dumek Powerman", cart: "In-store purchases | Dumek Powerman", login: "Login or sign up | Dumek Powerman" };
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
    case "cart": content = <InStorePage />; break;
    case "contact": content = <ContactPage />; break;
    case "login": content = <main className="auth-page"><AuthPage /></main>; break;
    default: content = <HomePage products={products} inventoryState={inventoryState} />;
  }

  return <>
    <Header page={page} products={products} account={account} onLogout={handleLogout} logoutPending={logoutPending} />
    {content}
    <Footer />
    <div className={`toast${toast ? " on" : ""}`} role="status">{toast}</div>
  </>;
}

createRoot(document.getElementById("app")).render(<App />);