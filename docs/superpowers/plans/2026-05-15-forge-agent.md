# Forge Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a parallel Python agent that autonomously implements the three remaining Forge features (food logger, meal planner, profile page) using three concurrent Claude-powered workers, each in its own git worktree, coordinated by a single orchestrator.

**Architecture:** An asyncio orchestrator spawns three worker coroutines in parallel, each running an independent Claude tool-use loop in its own git worktree. Workers enqueue questions through a shared asyncio.Queue; the orchestrator serializes user prompts and distributes answers. After all workers complete, the orchestrator runs the validation gate and merges the three feature branches.

**Tech Stack:** Python 3.13, Anthropic SDK (`anthropic`), `rich` for terminal UI, `filelock` for concurrent state writes, `asyncio` for parallelism, `pytest` + `pytest-asyncio` for tests.

---

## File Map

| File | Role |
|---|---|
| `forge/forge_agent/requirements.txt` | Python dependencies |
| `forge/forge_agent/state.py` | File-locked JSON state: feature statuses, decisions, validation log |
| `forge/forge_agent/context.py` | Builds Claude system prompt with prompt-cached static blocks |
| `forge/forge_agent/tools.py` | Tool implementations: read_file, list_directory, write_file, run_bash |
| `forge/forge_agent/worker.py` | Worker agentic loop: Claude API, tool dispatch, question queue integration |
| `forge/forge_agent/agent.py` | Orchestrator: worktree lifecycle, asyncio.gather, question poller, validation, merge |
| `forge/forge_agent/tests/test_state.py` | State concurrency tests |
| `forge/forge_agent/tests/test_tools.py` | Tool safety + behaviour tests |
| `forge/forge_agent/tests/test_worker.py` | Worker loop with mocked Claude API |
| `forge/forge_agent/tests/conftest.py` | Shared fixtures (tmp worktree, mock Claude client) |
| `forge/.gitignore` | Add `forge_agent/` entry |

---

## Task 1: Scaffold + .gitignore

**Files:**
- Create: `forge/forge_agent/requirements.txt`
- Create: `forge/forge_agent/__init__.py`
- Create: `forge/forge_agent/tests/__init__.py`
- Create: `forge/forge_agent/tests/conftest.py`
- Modify: `forge/.gitignore`

- [ ] **Step 1: Create the directory structure**

```bash
mkdir -p /Users/yashshah/Downloads/projects/forge/forge_agent/tests
touch /Users/yashshah/Downloads/projects/forge/forge_agent/__init__.py
touch /Users/yashshah/Downloads/projects/forge/forge_agent/tests/__init__.py
```

- [ ] **Step 2: Write requirements.txt**

Create `forge/forge_agent/requirements.txt`:

```
anthropic>=0.52.0
rich>=13.0.0
filelock>=3.16.0
pytest>=8.0.0
pytest-asyncio>=0.24.0
```

- [ ] **Step 3: Install dependencies**

```bash
cd /Users/yashshah/Downloads/projects/forge/forge_agent
pip install -r requirements.txt
```

Expected: all packages install without error.

- [ ] **Step 4: Write conftest.py**

Create `forge/forge_agent/tests/conftest.py`:

```python
import pytest
import json
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, AsyncMock


@pytest.fixture
def tmp_worktree(tmp_path):
    """A temporary directory that acts as a fake git worktree."""
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "app").mkdir(parents=True)
    return tmp_path


@pytest.fixture
def tmp_state_file(tmp_path, monkeypatch):
    """Redirect STATE_FILE and LOCK_FILE to a temp location."""
    state_file = tmp_path / "forge_agent_state.json"
    lock_file = tmp_path / "forge_agent_state.lock"
    import forge_agent.state as state_mod
    monkeypatch.setattr(state_mod, "STATE_FILE", state_file)
    monkeypatch.setattr(state_mod, "LOCK_FILE", lock_file)
    return state_file


@pytest.fixture
def mock_anthropic_client():
    """Mock Anthropic client that returns a single tool_use then end_turn."""
    client = MagicMock()

    def make_response(tool_name, tool_input, stop_reason="tool_use"):
        block = MagicMock()
        block.type = "tool_use"
        block.name = tool_name
        block.input = tool_input
        block.id = f"tu_{tool_name}"
        response = MagicMock()
        response.content = [block]
        response.stop_reason = stop_reason
        return response

    client.make_response = make_response
    return client
```

- [ ] **Step 5: Add forge_agent/ to .gitignore**

Open `forge/.gitignore` and append:

```
# forge agent (local dev tool, not part of the app)
forge_agent/
```

- [ ] **Step 6: Verify gitignore works**

```bash
cd /Users/yashshah/Downloads/projects/forge
git status forge_agent/
```

Expected: `forge_agent/` does not appear in git status output (it is ignored).

---

## Task 2: State Management (`state.py`)

**Files:**
- Create: `forge/forge_agent/state.py`
- Create: `forge/forge_agent/tests/test_state.py`

- [ ] **Step 1: Write the failing test**

Create `forge/forge_agent/tests/test_state.py`:

```python
import pytest
import json
import threading
from pathlib import Path


def test_load_state_creates_default_when_missing(tmp_state_file, tmp_path):
    import forge_agent.state as s
    state = s.load_state()
    assert len(state["features"]) == 3
    assert state["features"][0]["name"] == "food_logger"
    assert state["features"][0]["status"] == "pending"
    assert tmp_state_file.exists()


def test_update_feature_status(tmp_state_file, tmp_path):
    import forge_agent.state as s
    s.load_state()  # initialise
    s.update_feature_status("food_logger", "in_progress")
    state = s.load_state()
    food = next(f for f in state["features"] if f["name"] == "food_logger")
    assert food["status"] == "in_progress"


def test_add_decision(tmp_state_file, tmp_path):
    import forge_agent.state as s
    s.load_state()
    s.add_decision("food_logger", "Full macros or kcal only?", "Full macros")
    decisions = s.get_decisions()
    assert len(decisions) == 1
    assert decisions[0]["answer"] == "Full macros"
    assert decisions[0]["feature"] == "food_logger"


def test_concurrent_writes_do_not_corrupt(tmp_state_file, tmp_path):
    import forge_agent.state as s
    s.load_state()

    errors = []

    def write_decision(i):
        try:
            s.add_decision("food_logger", f"Q{i}", f"A{i}")
        except Exception as e:
            errors.append(e)

    threads = [threading.Thread(target=write_decision, args=(i,)) for i in range(20)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert not errors
    decisions = s.get_decisions()
    assert len(decisions) == 20


def test_add_validation_log(tmp_state_file, tmp_path):
    import forge_agent.state as s
    s.load_state()
    s.add_validation_log("food_logger", "pass", "pass", "pass")
    state = s.load_state()
    assert state["validation_log"][0]["feature"] == "food_logger"
    assert state["validation_log"][0]["dev_server"] == "pass"
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/yashshah/Downloads/projects/forge/forge_agent
python -m pytest tests/test_state.py -v 2>&1 | head -30
```

Expected: `ModuleNotFoundError: No module named 'forge_agent.state'`

- [ ] **Step 3: Write state.py**

Create `forge/forge_agent/state.py`:

```python
import json
from datetime import datetime
from pathlib import Path
from typing import Literal

from filelock import FileLock

STATE_FILE = Path(__file__).parent / "forge_agent_state.json"
LOCK_FILE = STATE_FILE.with_suffix(".lock")

FeatureStatus = Literal["pending", "in_progress", "validated", "completed"]

_DEFAULT_FEATURES = [
    {"name": "food_logger",  "status": "pending", "worktree": "../forge-food",    "branch": "feat/food-logger"},
    {"name": "meal_planner", "status": "pending", "worktree": "../forge-meals",   "branch": "feat/meal-planner"},
    {"name": "profile_page", "status": "pending", "worktree": "../forge-profile", "branch": "feat/profile-page"},
]


def _default_state() -> dict:
    return {
        "features": [dict(f) for f in _DEFAULT_FEATURES],
        "decisions": [],
        "validation_log": [],
        "merge_log": [],
    }


def _read() -> dict:
    return json.loads(STATE_FILE.read_text())


def _write(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state, indent=2))


def load_state() -> dict:
    with FileLock(LOCK_FILE):
        if not STATE_FILE.exists():
            state = _default_state()
            _write(state)
            return state
        return _read()


def save_state(state: dict) -> None:
    with FileLock(LOCK_FILE):
        _write(state)


def update_feature_status(name: str, status: FeatureStatus) -> None:
    with FileLock(LOCK_FILE):
        state = _read()
        for f in state["features"]:
            if f["name"] == name:
                f["status"] = status
                break
        _write(state)


def add_decision(feature: str, question: str, answer: str) -> None:
    with FileLock(LOCK_FILE):
        state = _read()
        state["decisions"].append({
            "question": question,
            "answer": answer,
            "feature": feature,
            "timestamp": datetime.now().isoformat(timespec="seconds"),
        })
        _write(state)


def add_validation_log(feature: str, build: str, lint: str, dev_server: str) -> None:
    with FileLock(LOCK_FILE):
        state = _read()
        state["validation_log"].append({
            "feature": feature,
            "build": build,
            "lint": lint,
            "dev_server": dev_server,
            "timestamp": datetime.now().isoformat(timespec="seconds"),
        })
        _write(state)


def get_decisions() -> list[dict]:
    return load_state()["decisions"]


def get_pending_features(state: dict) -> list[dict]:
    return [f for f in state["features"] if f["status"] != "completed"]
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/yashshah/Downloads/projects/forge/forge_agent
python -m pytest tests/test_state.py -v
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/yashshah/Downloads/projects/forge/forge_agent
git -C .. add forge_agent/state.py forge_agent/tests/test_state.py forge_agent/tests/conftest.py forge_agent/__init__.py forge_agent/tests/__init__.py forge_agent/requirements.txt .gitignore
git -C .. commit -m "feat(agent): scaffold forge_agent with state management"
```

---

## Task 3: Context Loader (`context.py`)

**Files:**
- Create: `forge/forge_agent/context.py`
- Create: `forge/forge_agent/tests/test_context.py`

- [ ] **Step 1: Write the failing test**

Create `forge/forge_agent/tests/test_context.py`:

```python
import pytest
from pathlib import Path


def test_build_system_prompt_returns_two_blocks(tmp_path):
    from forge_agent.context import build_system_prompt
    # Provide fake CLAUDE.md and handoff.md
    claude_md = tmp_path / "CLAUDE.md"
    handoff_md = tmp_path / "handoff.md"
    claude_md.write_text("# CLAUDE")
    handoff_md.write_text("# Handoff")

    blocks = build_system_prompt(
        feature="food_logger",
        worktree=tmp_path,
        decisions=[],
        forge_root=tmp_path,
    )
    assert len(blocks) == 2


def test_first_block_has_cache_control(tmp_path):
    from forge_agent.context import build_system_prompt
    (tmp_path / "CLAUDE.md").write_text("# CLAUDE")
    (tmp_path / "handoff.md").write_text("# Handoff")

    blocks = build_system_prompt("food_logger", tmp_path, [], forge_root=tmp_path)
    assert blocks[0].get("cache_control") == {"type": "ephemeral"}


def test_decisions_appear_in_second_block(tmp_path):
    from forge_agent.context import build_system_prompt
    (tmp_path / "CLAUDE.md").write_text("# CLAUDE")
    (tmp_path / "handoff.md").write_text("# Handoff")

    decisions = [{"feature": "food_logger", "question": "Full macros?", "answer": "Yes"}]
    blocks = build_system_prompt("food_logger", tmp_path, decisions, forge_root=tmp_path)
    assert "Full macros?" in blocks[1]["text"]
    assert "Yes" in blocks[1]["text"]


def test_missing_file_returns_placeholder(tmp_path):
    from forge_agent.context import build_system_prompt
    # Only CLAUDE.md exists, handoff.md missing
    (tmp_path / "CLAUDE.md").write_text("# CLAUDE")

    blocks = build_system_prompt("food_logger", tmp_path, [], forge_root=tmp_path)
    assert "not found" in blocks[0]["text"]
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/yashshah/Downloads/projects/forge/forge_agent
python -m pytest tests/test_context.py -v 2>&1 | head -20
```

Expected: `ModuleNotFoundError: No module named 'forge_agent.context'`

- [ ] **Step 3: Write context.py**

Create `forge/forge_agent/context.py`:

```python
from pathlib import Path


def _read_safe(path: Path) -> str:
    try:
        return path.read_text()
    except FileNotFoundError:
        return f"[File not found: {path.name}]"


def build_system_prompt(
    feature: str,
    worktree: Path,
    decisions: list[dict],
    forge_root: Path | None = None,
) -> list[dict]:
    if forge_root is None:
        forge_root = Path(__file__).parent.parent  # forge_agent/../ = forge/

    claude_md = _read_safe(forge_root / ".claude" / "CLAUDE.md")
    handoff_md = _read_safe(forge_root / "handoff.md")

    decisions_text = ""
    if decisions:
        lines = "\n".join(
            f"- [{d['feature']}] Q: {d['question']}\n  A: {d['answer']}"
            for d in decisions
        )
        decisions_text = f"\n\n## Prior Decisions (do not contradict these)\n{lines}"

    return [
        {
            "type": "text",
            "text": f"# CLAUDE.md\n{claude_md}\n\n# Session Handoff\n{handoff_md}",
            "cache_control": {"type": "ephemeral"},
        },
        {
            "type": "text",
            "text": (
                f"## Your Assignment\n"
                f"You are a worker agent. Your task: implement the **{feature}** feature "
                f"for the Forge app.\n"
                f"Your working directory (worktree): `{worktree}`\n"
                f"All file reads and writes are scoped to this worktree.\n"
                f"You communicate ONLY via tool calls — never generate prose responses.\n"
                f"When implementation is complete and committed, call `mark_feature_complete`."
                f"{decisions_text}"
            ),
        },
    ]
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/yashshah/Downloads/projects/forge/forge_agent
python -m pytest tests/test_context.py -v
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git -C /Users/yashshah/Downloads/projects/forge add forge_agent/context.py forge_agent/tests/test_context.py
git -C /Users/yashshah/Downloads/projects/forge commit -m "feat(agent): add context loader with prompt caching"
```

---

## Task 4: Tool Implementations (`tools.py`)

**Files:**
- Create: `forge/forge_agent/tools.py`
- Create: `forge/forge_agent/tests/test_tools.py`

- [ ] **Step 1: Write the failing tests**

Create `forge/forge_agent/tests/test_tools.py`:

```python
import pytest
from pathlib import Path


# --- read_file ---

def test_read_file_returns_content(tmp_worktree):
    from forge_agent.tools import read_file
    (tmp_worktree / "hello.txt").write_text("hello world")
    assert read_file("hello.txt", tmp_worktree) == "hello world"


def test_read_file_missing_returns_error(tmp_worktree):
    from forge_agent.tools import read_file
    result = read_file("nonexistent.txt", tmp_worktree)
    assert "Error" in result


def test_read_file_outside_worktree_rejected(tmp_worktree, tmp_path):
    from forge_agent.tools import read_file
    outside = tmp_path / "outside.txt"
    outside.write_text("secret")
    result = read_file("../../outside.txt", tmp_worktree)
    assert "Error" in result


# --- list_directory ---

def test_list_directory_shows_files(tmp_worktree):
    from forge_agent.tools import list_directory
    (tmp_worktree / "a.txt").write_text("a")
    (tmp_worktree / "b.txt").write_text("b")
    result = list_directory(".", tmp_worktree)
    assert "a.txt" in result
    assert "b.txt" in result


def test_list_directory_outside_worktree_rejected(tmp_worktree):
    from forge_agent.tools import list_directory
    result = list_directory("../../etc", tmp_worktree)
    assert "Error" in result


# --- write_file ---

def test_write_file_creates_file(tmp_worktree):
    from forge_agent.tools import write_file
    result = write_file("new/nested/file.ts", "export const x = 1;", tmp_worktree)
    assert "OK" in result
    assert (tmp_worktree / "new" / "nested" / "file.ts").read_text() == "export const x = 1;"


def test_write_file_outside_worktree_rejected(tmp_worktree):
    from forge_agent.tools import write_file
    result = write_file("../../evil.ts", "bad", tmp_worktree)
    assert "Error" in result
    assert not Path("/tmp/evil.ts").exists()


# --- run_bash ---

def test_run_bash_returns_output(tmp_worktree):
    from forge_agent.tools import run_bash
    result = run_bash("echo hello", tmp_worktree)
    assert "hello" in result


def test_run_bash_blocked_command(tmp_worktree):
    from forge_agent.tools import run_bash
    result = run_bash("rm -rf /tmp/something", tmp_worktree)
    assert "blocked" in result.lower()


def test_run_bash_nonzero_exit_includes_code(tmp_worktree):
    from forge_agent.tools import run_bash
    result = run_bash("exit 1", tmp_worktree)
    assert "exit code" in result


def test_run_bash_truncates_long_output(tmp_worktree):
    from forge_agent.tools import run_bash
    # Generate 200 lines of output
    result = run_bash("for i in $(seq 1 200); do echo line$i; done", tmp_worktree)
    assert "truncated" in result


def test_run_bash_timeout(tmp_worktree):
    from forge_agent.tools import run_bash
    result = run_bash("sleep 10", tmp_worktree, timeout=1)
    assert "timed out" in result.lower()
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/yashshah/Downloads/projects/forge/forge_agent
python -m pytest tests/test_tools.py -v 2>&1 | head -20
```

Expected: `ModuleNotFoundError: No module named 'forge_agent.tools'`

- [ ] **Step 3: Write tools.py**

Create `forge/forge_agent/tools.py`:

```python
import subprocess
from pathlib import Path

BLOCKLIST = [
    "rm -rf", "git reset", "git push", "git force",
    "drop ", "delete from", "truncate ",
]
BASH_TIMEOUT = 60
MAX_LINES = 150
HEAD_LINES = 75
TAIL_LINES = 75


def _safe_path(path_str: str, worktree: Path) -> Path | None:
    """Return resolved path only if it is inside worktree, else None."""
    try:
        target = (worktree / path_str).resolve()
    except Exception:
        return None
    if str(target).startswith(str(worktree.resolve())):
        return target
    return None


def _truncate(output: str) -> str:
    lines = output.splitlines()
    if len(lines) <= MAX_LINES:
        return output
    kept = HEAD_LINES + TAIL_LINES
    dropped = len(lines) - kept
    return (
        "\n".join(lines[:HEAD_LINES])
        + f"\n--- truncated {dropped} lines ---\n"
        + "\n".join(lines[-TAIL_LINES:])
    )


def read_file(path: str, worktree: Path) -> str:
    target = _safe_path(path, worktree)
    if target is None:
        return "Error: path is outside worktree"
    try:
        return target.read_text()
    except FileNotFoundError:
        return f"Error: file not found: {path}"
    except Exception as e:
        return f"Error: {e}"


def list_directory(path: str, worktree: Path) -> str:
    target = _safe_path(path, worktree)
    if target is None:
        return "Error: path is outside worktree"
    try:
        entries = sorted(target.iterdir(), key=lambda e: (e.is_file(), e.name))
        return "\n".join(f"{'D' if e.is_dir() else 'F'} {e.name}" for e in entries)
    except FileNotFoundError:
        return f"Error: directory not found: {path}"
    except Exception as e:
        return f"Error: {e}"


def write_file(path: str, content: str, worktree: Path) -> str:
    target = _safe_path(path, worktree)
    if target is None:
        return "Error: path is outside worktree"
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content)
        return f"OK: wrote {len(content)} chars to {path}"
    except Exception as e:
        return f"Error: {e}"


def run_bash(command: str, worktree: Path, timeout: int = BASH_TIMEOUT) -> str:
    for blocked in BLOCKLIST:
        if blocked.lower() in command.lower():
            return f"Error: command blocked (matched blocked pattern {blocked!r})"
    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=worktree,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        output = _truncate(result.stdout + result.stderr)
        if result.returncode != 0:
            output += f"\n[exit code: {result.returncode}]"
        return output
    except subprocess.TimeoutExpired:
        return f"Error: command timed out after {timeout}s"
    except Exception as e:
        return f"Error: {e}"
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/yashshah/Downloads/projects/forge/forge_agent
python -m pytest tests/test_tools.py -v
```

Expected: 13 tests pass.

- [ ] **Step 5: Commit**

```bash
git -C /Users/yashshah/Downloads/projects/forge add forge_agent/tools.py forge_agent/tests/test_tools.py
git -C /Users/yashshah/Downloads/projects/forge commit -m "feat(agent): add tool implementations with safety checks"
```

---

## Task 5: Worker Agentic Loop (`worker.py`)

**Files:**
- Create: `forge/forge_agent/worker.py`
- Create: `forge/forge_agent/tests/test_worker.py`

- [ ] **Step 1: Write the failing tests**

Create `forge/forge_agent/tests/test_worker.py`:

```python
import asyncio
import pytest
from pathlib import Path
from unittest.mock import MagicMock, patch


@pytest.mark.asyncio
async def test_worker_calls_mark_complete_and_exits(tmp_worktree, tmp_state_file):
    """Worker should exit after Claude calls mark_feature_complete."""
    import forge_agent.state as s
    s.load_state()  # init

    # Two responses: first a write_file, then mark_feature_complete
    def make_block(name, input_data, id_):
        b = MagicMock()
        b.type = "tool_use"
        b.name = name
        b.input = input_data
        b.id = id_
        return b

    def make_response(blocks, stop_reason="tool_use"):
        r = MagicMock()
        r.content = blocks
        r.stop_reason = stop_reason
        return r

    responses = [
        make_response([make_block("write_file", {"path": "src/x.ts", "content": "export {}"}, "t1")]),
        make_response([make_block("mark_feature_complete", {"feature": "food_logger"}, "t2")]),
    ]
    call_count = 0

    def fake_create(**kwargs):
        nonlocal call_count
        r = responses[call_count]
        call_count += 1
        return r

    question_queue = asyncio.Queue()
    answer_futures = {}

    with patch("forge_agent.worker.client") as mock_client:
        mock_client.messages.create.side_effect = fake_create
        from forge_agent.worker import run_worker
        result = await run_worker(
            feature="food_logger",
            worktree=tmp_worktree,
            question_queue=question_queue,
            answer_futures=answer_futures,
        )

    assert result == "food_logger"


@pytest.mark.asyncio
async def test_worker_enqueues_ask_user_question(tmp_worktree, tmp_state_file):
    """When Claude calls ask_user, the question appears in question_queue."""
    import forge_agent.state as s
    s.load_state()

    def make_block(name, input_data, id_):
        b = MagicMock()
        b.type = "tool_use"
        b.name = name
        b.input = input_data
        b.id = id_
        return b

    def make_response(blocks, stop_reason="tool_use"):
        r = MagicMock()
        r.content = blocks
        r.stop_reason = stop_reason
        return r

    question_queue = asyncio.Queue()
    answer_futures = {}

    # First call: ask_user. We resolve it immediately in the test.
    # Second call: mark_feature_complete
    call_count = 0
    responses = [
        make_response([make_block("ask_user", {"question": "Full macros?", "options": ["Yes", "No"]}, "q1")]),
        make_response([make_block("mark_feature_complete", {"feature": "food_logger"}, "t2")]),
    ]

    async def answer_questions():
        item = await question_queue.get()
        assert item["question"] == "Full macros?"
        fut = answer_futures[item["id"]]
        fut.set_result("Yes")

    def fake_create(**kwargs):
        nonlocal call_count
        r = responses[call_count]
        call_count += 1
        return r

    with patch("forge_agent.worker.client") as mock_client:
        mock_client.messages.create.side_effect = fake_create
        from forge_agent.worker import run_worker
        await asyncio.gather(
            run_worker("food_logger", tmp_worktree, question_queue, answer_futures),
            answer_questions(),
        )

    decisions = s.get_decisions()
    assert any(d["question"] == "Full macros?" and d["answer"] == "Yes" for d in decisions)
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/yashshah/Downloads/projects/forge/forge_agent
python -m pytest tests/test_worker.py -v 2>&1 | head -20
```

Expected: `ModuleNotFoundError: No module named 'forge_agent.worker'`

- [ ] **Step 3: Add pytest-asyncio config**

Add `forge/forge_agent/pytest.ini`:

```ini
[pytest]
asyncio_mode = auto
testpaths = tests
```

- [ ] **Step 4: Write worker.py**

Create `forge/forge_agent/worker.py`:

```python
import asyncio
from pathlib import Path

from anthropic import Anthropic

import forge_agent.state as st
from forge_agent.context import build_system_prompt
from forge_agent.tools import read_file, list_directory, write_file, run_bash

client = Anthropic()
MODEL = "claude-sonnet-4-6"

TOOL_DEFS = [
    {
        "name": "read_file",
        "description": "Read a file inside the worktree.",
        "input_schema": {
            "type": "object",
            "properties": {"path": {"type": "string", "description": "Path relative to worktree root"}},
            "required": ["path"],
        },
    },
    {
        "name": "list_directory",
        "description": "List files and directories at a path inside the worktree.",
        "input_schema": {
            "type": "object",
            "properties": {"path": {"type": "string", "description": "Path relative to worktree root", "default": "."}},
            "required": [],
        },
    },
    {
        "name": "write_file",
        "description": "Create or overwrite a file inside the worktree.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "content": {"type": "string"},
            },
            "required": ["path", "content"],
        },
    },
    {
        "name": "run_bash",
        "description": "Run a shell command in the worktree directory. Destructive commands are blocked.",
        "input_schema": {
            "type": "object",
            "properties": {"command": {"type": "string"}},
            "required": ["command"],
        },
    },
    {
        "name": "ask_user",
        "description": (
            "Pause and ask the user a design or architectural decision. "
            "Use for: UX choices, new DB schema changes, new dependencies. "
            "Do NOT use for: implementation details, CSS vars, component naming."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "question": {"type": "string"},
                "options": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["question"],
        },
    },
    {
        "name": "mark_feature_complete",
        "description": "Signal that the feature is fully implemented and committed. Triggers validation.",
        "input_schema": {
            "type": "object",
            "properties": {"feature": {"type": "string"}},
            "required": ["feature"],
        },
    },
]

MAX_RETRIES = 3


async def run_worker(
    feature: str,
    worktree: Path,
    question_queue: asyncio.Queue,
    answer_futures: dict,
) -> str:
    st.update_feature_status(feature, "in_progress")
    decisions = st.get_decisions()
    system = build_system_prompt(feature, worktree, decisions)
    messages = [{"role": "user", "content": f"Begin implementing the {feature} feature."}]
    malformed_retries = 0

    while True:
        response = client.messages.create(
            model=MODEL,
            max_tokens=8096,
            system=system,
            tools=TOOL_DEFS,
            messages=messages,
        )

        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "end_turn":
            break

        tool_results = []
        done = False

        for block in response.content:
            if block.type != "tool_use":
                continue

            try:
                result = await _dispatch_tool(
                    block.name, block.input, block.id,
                    feature, worktree, question_queue, answer_futures,
                )
            except Exception as e:
                malformed_retries += 1
                if malformed_retries >= MAX_RETRIES:
                    raise RuntimeError(f"Worker {feature} exceeded max tool retries: {e}") from e
                result = f"Tool call malformed, try again. Error: {e}"

            if block.name == "mark_feature_complete":
                done = True

            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": result,
            })

        messages.append({"role": "user", "content": tool_results})

        if done:
            break

    return feature


async def _dispatch_tool(
    name: str,
    inp: dict,
    tool_id: str,
    feature: str,
    worktree: Path,
    question_queue: asyncio.Queue,
    answer_futures: dict,
) -> str:
    if name == "read_file":
        return read_file(inp["path"], worktree)
    elif name == "list_directory":
        return list_directory(inp.get("path", "."), worktree)
    elif name == "write_file":
        return write_file(inp["path"], inp["content"], worktree)
    elif name == "run_bash":
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, run_bash, inp["command"], worktree)
    elif name == "ask_user":
        return await _ask_user(tool_id, feature, inp["question"], inp.get("options"), question_queue, answer_futures)
    elif name == "mark_feature_complete":
        return "Feature marked complete. Awaiting validation."
    else:
        return f"Error: unknown tool {name!r}"


async def _ask_user(
    tool_id: str,
    feature: str,
    question: str,
    options: list[str] | None,
    question_queue: asyncio.Queue,
    answer_futures: dict,
) -> str:
    loop = asyncio.get_event_loop()
    fut: asyncio.Future = loop.create_future()
    qid = f"{feature}:{tool_id}"
    answer_futures[qid] = fut
    await question_queue.put({"id": qid, "feature": feature, "question": question, "options": options})
    answer = await fut
    st.add_decision(feature, question, answer)
    return answer
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
cd /Users/yashshah/Downloads/projects/forge/forge_agent
python -m pytest tests/test_worker.py -v
```

Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git -C /Users/yashshah/Downloads/projects/forge add forge_agent/worker.py forge_agent/tests/test_worker.py forge_agent/pytest.ini
git -C /Users/yashshah/Downloads/projects/forge commit -m "feat(agent): add worker agentic loop with tool dispatch"
```

---

## Task 6: Orchestrator — Worktree Setup + Question Poller (`agent.py` part 1)

**Files:**
- Create: `forge/forge_agent/agent.py`

- [ ] **Step 1: Write agent.py with worktree management and question poller**

Create `forge/forge_agent/agent.py`:

```python
import asyncio
import subprocess
import sys
from pathlib import Path

from rich.console import Console
from rich.panel import Panel

import forge_agent.state as st
from forge_agent.worker import run_worker

console = Console()

FORGE_ROOT = Path(__file__).parent.parent  # forge_agent/../ = forge/
WORKTREE_PARENT = FORGE_ROOT.parent        # Downloads/projects/

FEATURES = [
    {"name": "food_logger",  "worktree": WORKTREE_PARENT / "forge-food",    "branch": "feat/food-logger"},
    {"name": "meal_planner", "worktree": WORKTREE_PARENT / "forge-meals",   "branch": "feat/meal-planner"},
    {"name": "profile_page", "worktree": WORKTREE_PARENT / "forge-profile", "branch": "feat/profile-page"},
]

FEATURE_MAP = {f["name"]: f for f in FEATURES}


# ── Worktree lifecycle ────────────────────────────────────────────────────────

def setup_worktrees(pending_names: list[str]) -> None:
    for name in pending_names:
        f = FEATURE_MAP[name]
        worktree = f["worktree"]
        branch = f["branch"]
        if not worktree.exists():
            console.print(f"[dim]Creating worktree {worktree.name} on branch {branch}[/dim]")
            subprocess.run(
                ["git", "worktree", "add", str(worktree), "-b", branch],
                cwd=FORGE_ROOT, check=True, capture_output=True,
            )
        # Symlink node_modules to avoid reinstall
        nm_link = worktree / "node_modules"
        if not nm_link.exists():
            nm_link.symlink_to(FORGE_ROOT / "node_modules")


def teardown_worktrees() -> None:
    for f in FEATURES:
        worktree = f["worktree"]
        if worktree.exists():
            subprocess.run(
                ["git", "worktree", "remove", str(worktree), "--force"],
                cwd=FORGE_ROOT, capture_output=True,
            )
    # Prune stale worktree refs
    subprocess.run(["git", "worktree", "prune"], cwd=FORGE_ROOT, capture_output=True)


# ── Question poller ───────────────────────────────────────────────────────────

async def poll_questions(question_queue: asyncio.Queue, answer_futures: dict) -> None:
    """Serializes ask_user prompts from all workers onto the terminal."""
    loop = asyncio.get_event_loop()
    while True:
        try:
            item = await asyncio.wait_for(question_queue.get(), timeout=0.5)
        except asyncio.TimeoutError:
            continue

        if item is None:  # shutdown signal
            break

        qid = item["id"]
        question = item["question"]
        options = item.get("options") or []
        feature = item["feature"]

        options_text = (
            "\n\n" + "\n".join(f"  {i + 1}. {o}" for i, o in enumerate(options))
            if options else ""
        )

        console.print(Panel(
            f"[bold]{question}[/bold]{options_text}",
            title=f"[yellow]DECISION NEEDED[/yellow]  •  feature: [cyan]{feature}[/cyan]",
            border_style="yellow",
        ))

        # input() blocks — run in executor so the event loop stays alive
        answer = await loop.run_in_executor(None, lambda: input("Your answer: ").strip())
        console.print(f"[dim]Answer recorded: {answer}[/dim]\n")

        fut = answer_futures.pop(qid, None)
        if fut and not fut.done():
            fut.set_result(answer)


# ── Validation gate ───────────────────────────────────────────────────────────

def _run(cmd: str, cwd: Path, timeout: int = 120) -> tuple[int, str]:
    result = subprocess.run(
        cmd, shell=True, cwd=cwd,
        capture_output=True, text=True, timeout=timeout,
    )
    return result.returncode, (result.stdout + result.stderr)[-6000:]  # last 6k chars


def validate_feature(name: str, worktree: Path, retry_limit: int = 3) -> bool:
    """Run build → lint → dev server. Returns True on full pass."""
    for attempt in range(1, retry_limit + 1):
        console.print(f"[dim]Validating {name} (attempt {attempt}/{retry_limit})[/dim]")

        code, out = _run("npm run build 2>&1", worktree, timeout=180)
        if code != 0:
            console.print(f"[red]Build failed for {name}:[/red]\n{out[-2000:]}")
            if attempt == retry_limit:
                _ask_user_sync(f"Build for {name} failed {retry_limit} times. Error:\n{out[-1000:]}\nHow to proceed?")
            continue

        code, out = _run("npm run lint 2>&1", worktree)
        if code != 0:
            console.print(f"[red]Lint failed for {name}:[/red]\n{out[-2000:]}")
            if attempt == retry_limit:
                _ask_user_sync(f"Lint for {name} failed {retry_limit} times. Error:\n{out[-1000:]}\nHow to proceed?")
            continue

        # Dev server — serialized (only one runs at a time)
        code, out = _run(
            "npm run dev & sleep 4 && "
            "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 ; "
            "kill %1 2>/dev/null ; wait",
            worktree, timeout=25,
        )
        http_code = out.strip().splitlines()[-1].strip() if out.strip() else ""
        if http_code not in ("200", "307"):
            console.print(f"[red]Dev server check failed for {name} (got {http_code!r})[/red]")
            if attempt == retry_limit:
                _ask_user_sync(f"Dev server for {name} failed {retry_limit} times. Output:\n{out[-1000:]}\nHow to proceed?")
            continue

        st.add_validation_log(name, "pass", "pass", "pass")
        st.update_feature_status(name, "validated")
        console.print(f"[green]✓ {name} passed validation[/green]")
        return True

    return False


def _ask_user_sync(message: str) -> str:
    console.print(Panel(message, title="[red]ACTION REQUIRED[/red]", border_style="red"))
    return input("Your response (press Enter when resolved): ").strip()


# ── Merge strategy ────────────────────────────────────────────────────────────

def _read_file(path: Path) -> str:
    try:
        return path.read_text()
    except FileNotFoundError:
        return ""


def _merge_protected_routes(worktrees: list[Path]) -> None:
    """Union the protectedRoutes arrays from all worktree versions of middleware.ts."""
    import re
    middleware_path = FORGE_ROOT / "src" / "lib" / "supabase" / "middleware.ts"
    base = _read_file(middleware_path)

    all_routes: list[str] = []
    pattern = re.compile(r'protectedRoutes\s*=\s*\[(.*?)\]', re.DOTALL)

    for wt in worktrees:
        wt_middleware = wt / "src" / "lib" / "supabase" / "middleware.ts"
        content = _read_file(wt_middleware)
        m = pattern.search(content)
        if m:
            routes = [r.strip().strip("'\"") for r in m.group(1).split(",") if r.strip().strip("'\"")]
            all_routes.extend(routes)

    unique_routes = list(dict.fromkeys(all_routes))  # deduplicate, preserve order
    routes_str = ", ".join(f"'{r}'" for r in unique_routes)

    merged = pattern.sub(f"protectedRoutes = [{routes_str}]", base)
    middleware_path.write_text(merged)
    console.print(f"[dim]Merged middleware.ts with routes: {unique_routes}[/dim]")


def merge_branches(validated_features: list[str]) -> None:
    worktrees = [FEATURE_MAP[n]["worktree"] for n in validated_features]

    # Merge shared files first (additive-safe)
    _merge_protected_routes(worktrees)

    # Merge each feature branch
    for name in validated_features:
        branch = FEATURE_MAP[name]["branch"]
        console.print(f"[dim]Merging {branch}[/dim]")
        result = subprocess.run(
            ["git", "merge", "--no-ff", branch, "-m", f"feat: implement {name.replace('_', ' ')}"],
            cwd=FORGE_ROOT, capture_output=True, text=True,
        )
        if result.returncode != 0:
            console.print(f"[red]Merge conflict on {name}:[/red]\n{result.stdout}\n{result.stderr}")
            _ask_user_sync(
                f"Merge conflict for {name}. Resolve manually, then press Enter to continue."
            )
        else:
            st.update_feature_status(name, "completed")
            console.print(f"[green]✓ {name} merged[/green]")


# ── Entry point ───────────────────────────────────────────────────────────────

async def main() -> None:
    state = st.load_state()
    pending = st.get_pending_features(state)

    if not pending:
        console.print("[green]All features already completed.[/green]")
        return

    pending_names = [f["name"] for f in pending]
    console.print(f"[bold]Forge Agent starting.[/bold] Features to build: {', '.join(pending_names)}")

    setup_worktrees(pending_names)

    question_queue: asyncio.Queue = asyncio.Queue()
    answer_futures: dict = {}

    question_poller = asyncio.create_task(poll_questions(question_queue, answer_futures))

    worker_coros = [
        run_worker(name, FEATURE_MAP[name]["worktree"], question_queue, answer_futures)
        for name in pending_names
    ]

    results = await asyncio.gather(*worker_coros, return_exceptions=True)

    for name, result in zip(pending_names, results):
        if isinstance(result, Exception):
            console.print(f"[red]Worker {name} crashed: {result}[/red]")

    # Shutdown question poller
    await question_queue.put(None)
    await question_poller

    # Serialized dev server validation
    validated = []
    for name in pending_names:
        worktree = FEATURE_MAP[name]["worktree"]
        if validate_feature(name, worktree):
            validated.append(name)
        else:
            console.print(f"[red]Skipping merge for {name} — validation failed.[/red]")

    if validated:
        merge_branches(validated)

    teardown_worktrees()

    console.print("\n[bold green]Forge Agent complete.[/bold green]")
    state = st.load_state()
    completed = [f["name"] for f in state["features"] if f["status"] == "completed"]
    console.print(f"Completed features: {', '.join(completed)}")
    console.print(f"Decisions recorded: {len(state['decisions'])}")


if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 2: Verify the file is importable**

```bash
cd /Users/yashshah/Downloads/projects/forge/forge_agent
python -c "from forge_agent.agent import main; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git -C /Users/yashshah/Downloads/projects/forge add forge_agent/agent.py
git -C /Users/yashshah/Downloads/projects/forge commit -m "feat(agent): add orchestrator with worktree lifecycle, question queue, validation, and merge"
```

---

## Task 7: Smoke Test + Run Instructions

**Files:**
- Create: `forge/forge_agent/tests/test_smoke.py`

- [ ] **Step 1: Write a smoke test that verifies the full module graph imports cleanly**

Create `forge/forge_agent/tests/test_smoke.py`:

```python
def test_all_modules_import():
    import forge_agent.state as state
    import forge_agent.context as context
    import forge_agent.tools as tools
    import forge_agent.worker as worker
    import forge_agent.agent as agent

    assert hasattr(state, "load_state")
    assert hasattr(context, "build_system_prompt")
    assert hasattr(tools, "run_bash")
    assert hasattr(worker, "run_worker")
    assert hasattr(agent, "main")


def test_tool_defs_have_required_fields():
    from forge_agent.worker import TOOL_DEFS
    required_names = {"read_file", "list_directory", "write_file", "run_bash", "ask_user", "mark_feature_complete"}
    defined_names = {t["name"] for t in TOOL_DEFS}
    assert required_names == defined_names
    for tool in TOOL_DEFS:
        assert "description" in tool
        assert "input_schema" in tool


def test_blocklist_blocks_destructive_commands(tmp_path):
    from forge_agent.tools import run_bash
    dangerous = ["rm -rf /tmp/x", "git push origin main", "DROP TABLE users"]
    for cmd in dangerous:
        result = run_bash(cmd, tmp_path)
        assert "blocked" in result.lower(), f"Expected {cmd!r} to be blocked"
```

- [ ] **Step 2: Run the full test suite**

```bash
cd /Users/yashshah/Downloads/projects/forge/forge_agent
python -m pytest -v
```

Expected: all tests pass. Note the count — it should be 20+ tests.

- [ ] **Step 3: Verify the agent entry point works with --help dry run**

```bash
cd /Users/yashshah/Downloads/projects/forge/forge_agent
python -c "
import asyncio
from unittest.mock import patch
import forge_agent.state as s
# Patch load_state to return all-completed so main exits immediately
with patch.object(s, 'load_state', return_value={
    'features': [
        {'name': 'food_logger', 'status': 'completed'},
        {'name': 'meal_planner', 'status': 'completed'},
        {'name': 'profile_page', 'status': 'completed'},
    ],
    'decisions': [], 'validation_log': [], 'merge_log': []
}):
    from forge_agent.agent import main, get_pending_features
    # get_pending_features imported separately
"
echo "OK"
```

Expected: `OK` (no crash).

- [ ] **Step 4: Add run instructions as a comment block at the top of agent.py**

Open `forge/forge_agent/agent.py` and prepend:

```python
"""
Forge Agent — Parallel feature builder.

Usage:
    cd forge/forge_agent
    pip install -r requirements.txt          # first time only
    python -m forge_agent.agent              # run from forge/ root

The agent reads forge_agent_state.json to determine which features
are pending and resumes automatically after a crash.

To reset and start over:
    rm forge_agent_state.json
"""
```

- [ ] **Step 5: Final commit**

```bash
git -C /Users/yashshah/Downloads/projects/forge add forge_agent/tests/test_smoke.py forge_agent/agent.py
git -C /Users/yashshah/Downloads/projects/forge commit -m "feat(agent): add smoke tests and run instructions"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Python agent with Anthropic SDK tool loop | Task 5 (worker.py) |
| 6 tools: read_file, list_directory, write_file, run_bash, ask_user, mark_feature_complete | Task 4 + 5 |
| Prompt caching on CLAUDE.md + handoff.md | Task 3 (context.py) |
| Lazy file loading (no upfront injection) | Task 3 — system prompt has no file contents |
| Context reset between features | Worker starts fresh per feature; no shared message history |
| Truncated bash output (150 lines, head+tail) | Task 4 (tools.py `_truncate`) |
| claude-sonnet-4-6 model | Task 5 (worker.py MODEL constant) |
| File-locked state (concurrent writes) | Task 2 (state.py + test_state.py concurrent test) |
| Feature statuses: pending/in_progress/validated/completed | Task 2 |
| Resume from in_progress on restart | Task 6 (agent.py `setup_worktrees` + `get_pending_features`) |
| 3 parallel workers via asyncio.gather | Task 6 (agent.py `main`) |
| Git worktree setup + node_modules symlink | Task 6 |
| Question serialization via asyncio.Queue | Task 5 (`_ask_user`) + Task 6 (`poll_questions`) |
| run_bash blocklist | Task 4 |
| run_bash 60s timeout | Task 4 |
| write_file path safety | Task 4 |
| Build + lint validation (parallel per worktree) | Task 6 (`validate_feature`) |
| Dev server check serialized | Task 6 (`validate_feature` called sequentially in main) |
| 3-strike retry → ask_user escalation | Task 6 (`validate_feature` retry_limit) |
| Merge: --no-ff per feature branch | Task 6 (`merge_branches`) |
| middleware.ts protected routes auto-merge | Task 6 (`_merge_protected_routes`) |
| Merge conflict → ask_user | Task 6 (`merge_branches` conflict handler) |
| Worktree cleanup after merge | Task 6 (`teardown_worktrees`) |
| forge_agent/ in .gitignore | Task 1 |
| requirements.txt with anthropic, rich, filelock | Task 1 |
