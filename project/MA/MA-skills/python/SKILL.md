---
name: python
description: Python developer — write, run, test, and debug Python projects. Gives the entity the ability to create scripts, tools, data pipelines, and applications using Python and pip.
---

# Python Skill

You can write Python code, run it, install packages, and read output — all within the workspace. You have access to `python`, `pip`, and file tools.

## What You Can Do

1. **Write Python scripts** — create `.py` files with `ws_write`
2. **Run scripts** — execute with `cmd_run`
3. **Install packages** — use `pip install`
4. **Run tests** — execute test files or use pytest
5. **Create project structures** — scaffold with proper `__init__.py` files
6. **Debug errors** — read tracebacks, fix the code, re-run

## Your Tools

### File tools (write code)
```
[TOOL:ws_mkdir path="my-project/src"]
[TOOL:ws_write path="my-project/main.py" content="print('Hello, world!')"]
[TOOL:ws_read path="my-project/main.py"]
[TOOL:ws_list path="my-project"]
```

### Command tools (run and install)
```
[TOOL:cmd_run cmd="python main.py"]
[TOOL:cmd_run cmd="python -m pytest"]
[TOOL:cmd_run cmd="python -m pytest tests/ -v"]
[TOOL:cmd_run cmd="pip install requests"]
[TOOL:cmd_run cmd="pip install -r requirements.txt"]
[TOOL:cmd_run cmd="pip list"]
[TOOL:cmd_run cmd="pip freeze"]
```

## CRITICAL RULES — Read These First

### Rule 1: Always write COMPLETE files
Never write partial `.py` files. Write the full source code every time with `ws_write`.

### Rule 2: Read before editing
Before modifying any existing file:
```
[TOOL:ws_read path="src/app.py"]
```
Then write the complete modified version back.

### Rule 3: Use python (not python3) as default
Try `python` first. If it fails, fall back to `python3`. On most systems `python` works.

### Rule 4: Read tracebacks carefully
Python tracebacks read bottom-to-top. The last line is the actual error. The lines above show the call stack. Fix the code at the location shown.

### Rule 5: One command per cmd_run call
Each `cmd_run` runs one command. Do NOT chain commands with `&&` or `;`.

### Rule 6: Create requirements.txt for projects
If you use any `pip install`, also create a `requirements.txt` so the project is reproducible.

## How to Build a Python Project — Step by Step

### Simple script
```
Step 1: [TOOL:ws_write path="main.py" content="...your code..."]
Step 2: [TOOL:cmd_run cmd="python main.py"]
```

### Project with dependencies
```
Step 1: [TOOL:ws_mkdir path="my-project"]
Step 2: [TOOL:ws_write path="my-project/requirements.txt" content="requests>=2.28\nbeautifulsoup4>=4.12"]
Step 3: [TOOL:cmd_run cmd="pip install -r requirements.txt"]
Step 4: [TOOL:ws_write path="my-project/main.py" content="...your code..."]
Step 5: [TOOL:cmd_run cmd="python main.py"]
```

### Package with modules
```
Step 1: [TOOL:ws_mkdir path="my-project/src"]
Step 2: [TOOL:ws_write path="my-project/src/__init__.py" content=""]
Step 3: [TOOL:ws_write path="my-project/src/core.py" content="..."]
Step 4: [TOOL:ws_write path="my-project/src/utils.py" content="..."]
Step 5: [TOOL:ws_write path="my-project/main.py" content="from src.core import ..."]
Step 6: [TOOL:cmd_run cmd="python main.py"]
```

## Python Patterns — What Good Code Looks Like

### Basic script structure
```python
"""Brief description of what this script does."""

import sys
from pathlib import Path


def main():
    """Entry point."""
    if len(sys.argv) < 2:
        print("Usage: python main.py <input_file>")
        sys.exit(1)

    input_path = Path(sys.argv[1])
    if not input_path.exists():
        print(f"Error: {input_path} not found")
        sys.exit(1)

    process(input_path)


def process(path):
    """Process the input file."""
    content = path.read_text(encoding="utf-8")
    print(f"Processed {len(content)} characters")


if __name__ == "__main__":
    main()
```

### Classes
```python
class Config:
    """Application configuration."""

    def __init__(self, host="localhost", port=8080):
        self.host = host
        self.port = port

    def url(self):
        return f"http://{self.host}:{self.port}"

    def __repr__(self):
        return f"Config(host={self.host!r}, port={self.port})"
```

### Error handling
```python
def read_json(path):
    """Read and parse a JSON file."""
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: {path} not found")
        return None
    except json.JSONDecodeError as e:
        print(f"Error: invalid JSON in {path}: {e}")
        return None
```

### Working with files
```python
from pathlib import Path

# Read
content = Path("data.txt").read_text(encoding="utf-8")

# Write
Path("output.txt").write_text("Hello\n", encoding="utf-8")

# Iterate directory
for f in Path("src").glob("*.py"):
    print(f.name)

# Create directories
Path("output/reports").mkdir(parents=True, exist_ok=True)
```

### HTTP requests (with requests library)
```python
import requests

def fetch_data(url):
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    return response.json()
```

### Data processing with collections
```python
from collections import Counter, defaultdict

# Count words
words = text.lower().split()
counts = Counter(words)
top_10 = counts.most_common(10)

# Group items
groups = defaultdict(list)
for item in items:
    groups[item["category"]].append(item)
```

### List comprehensions and generators
```python
# Filter and transform
names = [user["name"] for user in users if user["active"]]

# Dictionary comprehension
lookup = {item["id"]: item for item in items}

# Generator for large data
lines = (line.strip() for line in open("big.txt", encoding="utf-8"))
```

### Context managers
```python
# File I/O
with open("data.csv", encoding="utf-8") as f:
    for line in f:
        process(line)

# Custom context manager
from contextlib import contextmanager

@contextmanager
def timer(label):
    import time
    start = time.time()
    yield
    print(f"{label}: {time.time() - start:.3f}s")

with timer("processing"):
    do_work()
```

## Common Packages by Use Case

| Need | Package | Install |
|------|---------|---------|
| HTTP requests | `requests` | `pip install requests` |
| HTML parsing | `beautifulsoup4` | `pip install beautifulsoup4` |
| JSON schema | `pydantic` | `pip install pydantic` |
| CLI arguments | `click` or `argparse` | `argparse` is built-in |
| Data analysis | `pandas` | `pip install pandas` |
| Math/arrays | `numpy` | `pip install numpy` |
| Plotting | `matplotlib` | `pip install matplotlib` |
| Testing | `pytest` | `pip install pytest` |
| Web server | `flask` or `fastapi` | `pip install flask` |
| Async HTTP | `aiohttp` or `httpx` | `pip install httpx` |
| Regex | `re` | Built-in |
| Date/time | `datetime` | Built-in |
| Path handling | `pathlib` | Built-in |
| JSON | `json` | Built-in |
| CSV | `csv` | Built-in |
| SQLite | `sqlite3` | Built-in |

## Testing

### Writing tests with unittest (built-in)
```python
import unittest
from src.core import add

class TestAdd(unittest.TestCase):
    def test_positive(self):
        self.assertEqual(add(2, 3), 5)

    def test_negative(self):
        self.assertEqual(add(-1, 1), 0)

    def test_zero(self):
        self.assertEqual(add(0, 0), 0)

if __name__ == "__main__":
    unittest.main()
```

### Writing tests with pytest
```python
from src.core import add

def test_positive():
    assert add(2, 3) == 5

def test_negative():
    assert add(-1, 1) == 0
```

### Running tests
```
[TOOL:cmd_run cmd="python -m pytest tests/ -v"]
[TOOL:cmd_run cmd="python -m unittest tests/test_core.py"]
[TOOL:cmd_run cmd="python -m pytest tests/test_core.py -v"]
```

## requirements.txt Patterns

### Pinned versions (production)
```
requests==2.31.0
beautifulsoup4==4.12.2
pydantic==2.5.0
```

### Minimum versions (libraries)
```
requests>=2.28
beautifulsoup4>=4.12
```

### With extras
```
fastapi[all]>=0.104
uvicorn[standard]>=0.24
```

## Debugging Workflow

When code fails:

1. **Read the traceback bottom-to-top** — the last line is the actual error
2. **Find the file and line number** — the traceback shows exactly where it failed
3. **Read the source file:**
   ```
   [TOOL:ws_read path="src/app.py"]
   ```
4. **Fix the specific issue** — change only what's broken
5. **Write the fixed file and re-run:**
   ```
   [TOOL:ws_write path="src/app.py" content="...fixed code..."]
   [TOOL:cmd_run cmd="python src/app.py"]
   ```

### Common error patterns

| Error | Meaning | Fix |
|-------|---------|-----|
| `NameError` | Variable/function not defined | Check spelling, add import |
| `TypeError` | Wrong type passed | Check function signature |
| `KeyError` | Dict key missing | Use `.get()` with default |
| `IndexError` | List index out of range | Check length before access |
| `ImportError` | Module not found | `pip install` the package |
| `FileNotFoundError` | File doesn't exist | Check path, create if needed |
| `AttributeError` | Object doesn't have that method | Check type, wrong variable |
| `IndentationError` | Wrong whitespace | Fix indentation (4 spaces) |

## Project Scaffolding Patterns

### Script
```
my-script/
  main.py
  requirements.txt
```

### CLI tool
```
my-tool/
  main.py
  requirements.txt          (click)
  src/
    __init__.py
    commands.py
    utils.py
```

### Web API (Flask)
```
my-api/
  requirements.txt          (flask)
  app.py
  routes/
    __init__.py
    health.py
    users.py
  models/
    __init__.py
    user.py
```

### Data pipeline
```
my-pipeline/
  requirements.txt          (pandas, numpy)
  main.py
  src/
    __init__.py
    extract.py
    transform.py
    load.py
  data/
    input/
    output/
```

## What NOT to Do

- **Do NOT write code in chat** — use `ws_write` to save it as a file
- **Do NOT write partial files** — always write the complete `.py` file
- **Do NOT guess what's in a file** — always `ws_read` first
- **Do NOT install packages without requirements.txt** — keep it reproducible
- **Do NOT use `os.system()` in code** — use `subprocess.run()` instead
- **Do NOT add features the user didn't ask for** — keep it focused
- **Do NOT skip the `if __name__ == "__main__":` guard** — always include it for scripts
- **Do NOT chain commands** — one `cmd_run` call per command
- **Do NOT hardcode file paths** — use `pathlib.Path` and relative paths
