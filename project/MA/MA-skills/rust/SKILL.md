---
name: rust
description: Rust systems programmer — write, compile, test, and debug Rust projects. Gives the entity the ability to create performant, safe systems software using Cargo.
---

# Rust Skill

You can write Rust code, compile it, run it, and read compiler errors — all within the workspace. You have access to `cargo` and `rustc` via the `cmd_run` tool.

## What You Can Do

1. **Create Rust projects** — scaffold with `cargo init` or `cargo new`
2. **Write Rust source files** — create `.rs` files with `ws_write`
3. **Compile and check** — run `cargo build`, `cargo check`, `cargo clippy`
4. **Run programs** — execute with `cargo run`
5. **Run tests** — validate with `cargo test`
6. **Format code** — auto-format with `cargo fmt`
7. **Manage dependencies** — add crates with `cargo add`, remove with `cargo remove`
8. **Debug compiler errors** — read error output, fix the code, recompile

## Your Tools

### File tools (write code)
```
[TOOL:ws_mkdir path="my-project/src"]
[TOOL:ws_write path="my-project/src/main.rs" content="fn main() {\n    println!(\"Hello, world!\");\n}"]
[TOOL:ws_read path="my-project/src/main.rs"]
[TOOL:ws_list path="my-project/src"]
```

### Command tools (compile and run)
```
[TOOL:cmd_run cmd="cargo init my-project"]
[TOOL:cmd_run cmd="cargo build"]
[TOOL:cmd_run cmd="cargo run"]
[TOOL:cmd_run cmd="cargo test"]
[TOOL:cmd_run cmd="cargo check"]
[TOOL:cmd_run cmd="cargo clippy"]
[TOOL:cmd_run cmd="cargo fmt"]
[TOOL:cmd_run cmd="cargo add serde"]
[TOOL:cmd_run cmd="cargo add serde --features derive"]
[TOOL:cmd_run cmd="cargo remove some-crate"]
```

## CRITICAL RULES — Read These First

### Rule 1: Always write COMPLETE files
Never write partial `.rs` files. Write the full source code every time with `ws_write`.

### Rule 2: Read before editing
Before modifying any existing file:
```
[TOOL:ws_read path="src/main.rs"]
```
Then write the complete modified version back.

### Rule 3: Use cargo for everything
Do NOT call `rustc` directly unless the user specifically asks. Always prefer `cargo build`, `cargo run`, `cargo test`. Cargo handles dependencies, build profiles, and linking.

### Rule 4: Read compiler errors carefully
Rust's compiler gives excellent error messages. When a build fails:
1. Read the error output line by line
2. The error tells you the file, line number, and what's wrong
3. It often suggests the fix — follow the suggestion
4. Fix the code, then recompile

### Rule 5: One command per cmd_run call
Each `cmd_run` runs one command. Do NOT chain commands with `&&` or `;`.

## How to Build a Rust Project — Step by Step

### Starting a new project
```
Step 1: [TOOL:cmd_run cmd="cargo new my-project"]
Step 2: [TOOL:ws_list path="my-project/src"]
Step 3: [TOOL:ws_write path="my-project/src/main.rs" content="...your code..."]
Step 4: [TOOL:cmd_run cmd="cargo build"]
Step 5: [TOOL:cmd_run cmd="cargo run"]
```

### Starting a library
```
Step 1: [TOOL:cmd_run cmd="cargo new my-lib --lib"]
Step 2: [TOOL:ws_write path="my-lib/src/lib.rs" content="...your code..."]
Step 3: [TOOL:cmd_run cmd="cargo test"]
```

### Adding dependencies
```
Step 1: [TOOL:cmd_run cmd="cargo add serde --features derive"]
Step 2: [TOOL:cmd_run cmd="cargo add tokio --features full"]
Step 3: [TOOL:ws_read path="Cargo.toml"]
```

## Rust Patterns — What Good Code Looks Like

### Basic program structure
```rust
use std::io;

fn main() {
    println!("Enter your name:");
    let mut name = String::new();
    io::stdin().read_line(&mut name).expect("Failed to read line");
    let name = name.trim();
    println!("Hello, {name}!");
}
```

### Structs and implementations
```rust
#[derive(Debug, Clone)]
struct Point {
    x: f64,
    y: f64,
}

impl Point {
    fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }

    fn distance(&self, other: &Point) -> f64 {
        ((self.x - other.x).powi(2) + (self.y - other.y).powi(2)).sqrt()
    }
}
```

### Error handling with Result
```rust
use std::fs;
use std::io;

fn read_config(path: &str) -> Result<String, io::Error> {
    fs::read_to_string(path)
}

fn main() {
    match read_config("config.toml") {
        Ok(content) => println!("Config: {content}"),
        Err(e) => eprintln!("Error reading config: {e}"),
    }
}
```

### Using the ? operator
```rust
use std::fs;
use std::io;

fn process_file(path: &str) -> Result<usize, io::Error> {
    let content = fs::read_to_string(path)?;
    Ok(content.lines().count())
}
```

### Traits
```rust
trait Summary {
    fn summarize(&self) -> String;
}

struct Article {
    title: String,
    content: String,
}

impl Summary for Article {
    fn summarize(&self) -> String {
        format!("{}: {}...", self.title, &self.content[..50.min(self.content.len())])
    }
}
```

### Collections and iterators
```rust
let numbers = vec![1, 2, 3, 4, 5];
let doubled: Vec<i32> = numbers.iter().map(|n| n * 2).collect();
let sum: i32 = numbers.iter().sum();
let evens: Vec<&i32> = numbers.iter().filter(|n| *n % 2 == 0).collect();
```

### Enums with data
```rust
#[derive(Debug)]
enum Command {
    Quit,
    Echo(String),
    Move { x: i32, y: i32 },
    Count(i32),
}

fn execute(cmd: Command) {
    match cmd {
        Command::Quit => println!("Quitting"),
        Command::Echo(msg) => println!("{msg}"),
        Command::Move { x, y } => println!("Moving to ({x}, {y})"),
        Command::Count(n) => println!("Count: {n}"),
    }
}
```

## Cargo.toml Patterns

### Basic binary project
```toml
[package]
name = "my-project"
version = "0.1.0"
edition = "2021"

[dependencies]
```

### With dependencies
```toml
[package]
name = "my-project"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
clap = { version = "4", features = ["derive"] }
anyhow = "1"
```

### Library with dev-dependencies
```toml
[package]
name = "my-lib"
version = "0.1.0"
edition = "2021"

[dependencies]
thiserror = "1"

[dev-dependencies]
assert_matches = "1"
```

## Common Crates by Use Case

| Need | Crate | Feature |
|------|-------|---------|
| JSON serialization | `serde` + `serde_json` | `derive` |
| CLI argument parsing | `clap` | `derive` |
| Async runtime | `tokio` | `full` |
| HTTP client | `reqwest` | `json` |
| HTTP server | `axum` or `actix-web` | — |
| Error handling | `anyhow` (apps) or `thiserror` (libs) | — |
| Logging | `tracing` + `tracing-subscriber` | — |
| Regex | `regex` | — |
| Random numbers | `rand` | — |
| Date/time | `chrono` | — |
| File paths | `camino` | — |
| Environment vars | `dotenvy` | — |

## Debugging Workflow

When a build fails:

1. **Read the full error output** — Rust errors are specific and actionable
2. **Find the error code** — e.g., `E0308` (mismatched types)
3. **Look at the suggestion** — Rust often says "help: try this: ..."
4. **Read the source file:**
   ```
   [TOOL:ws_read path="src/main.rs"]
   ```
5. **Fix the specific issue** — change only what the compiler identified
6. **Write the fixed file and rebuild:**
   ```
   [TOOL:ws_write path="src/main.rs" content="...fixed code..."]
   [TOOL:cmd_run cmd="cargo build"]
   ```

### Common error patterns

| Error | Meaning | Fix |
|-------|---------|-----|
| `E0382` — use of moved value | Ownership transferred | Clone, borrow with `&`, or restructure |
| `E0308` — mismatched types | Wrong type | Check function signature, add conversion |
| `E0502` — cannot borrow as mutable | Aliasing violation | Restructure borrows, use `.clone()` |
| `E0433` — unresolved import | Missing `use` or dependency | Add `use` statement or `cargo add` |
| `E0599` — no method found | Missing trait import or impl | Add `use TraitName;` or implement the trait |

## Testing

### Writing tests in the same file
```rust
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        assert_eq!(add(2, 3), 5);
    }

    #[test]
    fn test_add_negative() {
        assert_eq!(add(-1, 1), 0);
    }
}
```

### Running tests
```
[TOOL:cmd_run cmd="cargo test"]
[TOOL:cmd_run cmd="cargo test test_add"]
```

## Project Scaffolding Patterns

### CLI tool
```
my-cli/
  Cargo.toml          (clap dependency)
  src/
    main.rs           (argument parsing + dispatch)
    commands/
      mod.rs
      run.rs
      build.rs
```

### Library
```
my-lib/
  Cargo.toml
  src/
    lib.rs            (public API + module declarations)
    core.rs           (internal logic)
    utils.rs          (helpers)
```

### Web API (axum)
```
my-api/
  Cargo.toml          (axum, tokio, serde, serde_json)
  src/
    main.rs           (server setup + routing)
    routes/
      mod.rs
      health.rs
      users.rs
    models/
      mod.rs
      user.rs
```

## What NOT to Do

- **Do NOT call `rustc` directly** — use `cargo build` instead
- **Do NOT write partial files** — always write the complete `.rs` file
- **Do NOT guess what's in a file** — always `ws_read` first
- **Do NOT ignore compiler warnings** — run `cargo clippy` and fix them
- **Do NOT use `unwrap()` in library code** — use `Result` and `?` instead
- **Do NOT add dependencies the user didn't ask for** — keep it minimal
- **Do NOT skip tests** — if the user asks for a project, include basic tests
- **Do NOT chain commands** — one `cmd_run` call per command
