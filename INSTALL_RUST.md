### Setting up RUST and WASM

---

## 🧩 Step 1. Install Rust and WASM Toolchain

If you don’t already have Rust:

```bash
curl https://sh.rustup.rs -sSf | sh
```

Then install the WebAssembly target and helper tools:

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

---

## 📁 Step 2. Create a Rust Project for Your WASM Module

Inside your Next.js project root:

```bash
mkdir rust && cd rust
cargo new --lib rust_bridge
cd rust_bridge
```

This creates `rust/rust_bridge/src/lib.rs`.

---

## ✍️ Step 3. Write a Simple Rust Function

Open **`src/lib.rs`** and replace the contents with:

```rust
use wasm_bindgen::prelude::*;

// Export functions to JavaScript
#[wasm_bindgen]
pub fn echo_value(value: &str) -> String {
    web_sys::console::log_1(&format!("Rust received: {}", value).into());
    value.to_string()
}
```

This:

* Accepts a **string** from JS,
* Prints it to the browser’s **console (via `web_sys::console`)**,
* Returns the same string back.

---

## 🧱 Step 4. Update Cargo.toml

Edit `Cargo.toml` to include dependencies:

```toml
[package]
name = "rust_bridge"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
web-sys = { version = "0.3", features = ["console"] }
```

---

## ⚙️ Step 5. Build the WASM Module

From `rust/rust_bridge`:

```bash
wasm-pack build --target web
```

This creates a `pkg/` folder with:

* `rust_bridge_bg.wasm`
* JS glue code (`rust_bridge.js`)

---

## 📦 Step 6. Integrate with Next.js

Move or import your generated module into your Next.js app.
For example, copy the `/pkg` folder to `/public/rust/` or import directly.

### Example (using dynamic import)

In any Next.js client component (e.g., `/app/page.tsx`):

```tsx
'use client';
import { useEffect } from 'react';

export default function RustTest() {
  useEffect(() => {
    (async () => {
      const rust = await import('../../rust/rust_bridge/pkg/rust_bridge');
      const result = rust.echo_value('Hello from Next.js!');
      console.log('Returned from Rust:', result);
    })();
  }, []);

  return <div>🦀 Rust Integration Test</div>;
}
```

When you load the page:

* The browser console will show:

  ```
  Rust received: Hello from Next.js!
  Returned from Rust: Hello from Next.js!
  ```

---

## ✅ Summary

You now have:

* ✅ A Rust library that compiles to WebAssembly
* ✅ A function that logs and returns a value
* ✅ Integration with Next.js via dynamic import
