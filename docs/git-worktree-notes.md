# Git worktree 原理与本仓库操作手册

> 起因：`main` 工作目录出现「140 个文件被删除」的假象，排查后确认是 worktree 错位导致，**没有任何东西丢失**。
> 本文把原理、本仓库的实测映射、修复步骤和日常操作流程固化下来，避免重复踩坑。
> 文中例子取自本仓库 2026-10-10 的实际状态。

---

## 1. 一句话模型

git 里最容易混的是三样**互相独立**的东西：

| 东西 | 是什么 | 存在哪 | 变了会怎样 |
|---|---|---|---|
| **内容仓库** | 所有文件的历史版本，按内容哈希存放 | `.git/objects/` | 几乎只增不减，不可变 |
| **书签（ref）** | 一个名字指向一个提交 | `.git/refs/` | 改了就"移动"，但**不动任何文件** |
| **工作台（worktree）** | 你眼睛看到的那些真实文件 | 各目录 | 只有在**这个目录里**跑命令才会变 |

**关键**：在 A 目录移动书签，B 目录的文件**不会有任何反应**——git 从不替别的目录改文件。

---

## 2. `.git` 里有什么

```
.git/
├── objects/                    ← 内容仓库：所有历史版本，按哈希寻址（全仓库共享一份）
├── refs/                       ← 书签（全仓库共享一份）
│   ├── heads/
│   │   ├── main                → 指向某个提交
│   │   └── claude/…            ← 分类子目录
│   └── remotes/origin/
│       └── main                → 远端 main 的快照
├── HEAD                        ← 主工作目录现在在哪个书签上
├── index                       ← 主工作目录的暂存区
└── worktrees/                  ← 附属工作台的账本，每个一份自己的 HEAD 和 index
    ├── <worktree-name>/
    │   ├── HEAD
    │   ├── index
    │   ├── logs/               ← 该工作台自己的 reflog
    │   ├── ORIG_HEAD / FETCH_HEAD / COMMIT_EDITMSG
    │   ├── gitdir              ← 反向指针：我的目录在哪
    │   └── commondir           ← 反向指针：公共对象库在哪
    └── …
```

**划分原则**：`objects/` 与 `refs/` **全仓库共享**；`HEAD` 与 `index` **每个工作台独占**。

---

## 3. 两套 `worktrees` 目录的关系

新手最容易困惑的一点：仓库里会同时看到两个带 `worktrees` 的路径，它们是**一对搭档、同名配对**：

```
<repo>/.claude/worktrees/<name>      ← 房子：你编辑文件、跑命令的地方
<repo>/.git/worktrees/<name>         ← 抽屉：git 给这房子记的账（HEAD / index / logs）
```

- **房子归你**，抽屉归 git。
- 两者**用名字配对**，但内容各自独立——**房子没了，抽屉可能还在**。实例：`git worktree list` 会把这类残留标成 `prunable`（`gitdir file points to non-existent location`），此时抽屉仍在 `.git/worktrees/` 下。
- 清理孤儿抽屉：`git worktree prune`

**为什么主目录是"主"**：它没有这一对。它的 `HEAD` 和 `index` 直接放在 `.git/` 根下，不在 `.git/worktrees/` 里。这是唯一的结构性区别。

**目录名 ≠ 分支名**。目录名是工作台的名字，分支是另一套命名。本仓库的实测映射里就有反例：某个叫 `fervent-hugle-a7b787` 的目录签出的其实是 `main`，而签出 `claude/fervent-hugle-a7b787` 的却是另一个叫 `goofy-sammet-2c1266` 的目录。**不要靠目录名猜分支**，一律用 `git worktree list` 查。

---

## 4. 对象层：blob / tree / commit

```
commit ddd86af
  ├─ 父提交: 989bfa9
  ├─ 提交信息: "feat: …"
  └─ 树（根目录）
       ├─ "README.md"   → blob 463e6b8a…   ← 文件的完整内容
       ├─ "babyGrowAi/" → tree …
       └─ "docs/"       → tree …
```

- **blob** = 一个文件的**内容**（不含文件名）
- **tree** = 一个目录（名字 → blob/tree 的映射）
- **commit** = 一次快照 + 父指针 + 提交信息

**哈希由内容算出**，所以同一个文件名在不同提交里可能是两个不同的 blob，两者同时存在，谁也覆盖不了谁。这就是"只要提交过就不会丢"的底层原因。

---

## 5. `index`：最容易被误解的东西

`index`（索引 / 暂存区）不是"缓存"，而是**一棵预备提交的树**——"下次提交就长这样"的目录快照。

`git status` 做的是**三方比较**：

```
      HEAD  ←── 第1列：已暂存的改动 ──→  index  ←── 第2列：未暂存的改动 ──→  磁盘文件
   (上次提交)                        (预备提交)                        (工作区)
```

- **HEAD ↔ index** 有差异 → 第一列出现 `M `/`D `/`A `
- **index ↔ 磁盘** 有差异 → 第二列出现 ` M`/` D`

**判读 `git status` 的口诀**：先看第二列有没有内容。第二列为空 = 磁盘与索引一致 = **没有尚未纳入索引的真实改动**，此时第一列的红字多半只是"索引比 HEAD 旧"的表现，不是被删除。

---

## 6. `HEAD` 与分支解析

`HEAD` 是个几行的文本文件，两种形态：

```
ref: refs/heads/main          ← 符号引用（"我站在 main 这本书签上"）
<40 位哈希>                    ← 裸哈希（detached HEAD，"我直接站在某个提交上"）
```

符号引用是**间接**的，要跳两次才落到提交：

```
HEAD ──"ref: refs/heads/main"──► refs/heads/main ──"ddd86af"──► commit
```

**这层间接性正是坑的来源**：书签被移动时，所有"指向它"的 HEAD 在**解析上**立刻跟着变，但**磁盘文件一个都不动**。

---

## 7. 事故复盘：主目录"文件变少"的完整因果链

**现象**：主工作目录 `git status` 报出 140 个已暂存删除 + 9 个修改，`babyGrowAi/` 从 129 个文件缩到 4 个。

**根因**：主目录**停在旧快照上**，不是被删除。

**证据**（可复现的判定方法）：拿同一个文件在两个提交里的 blob 哈希做比对——

```bash
git rev-parse 442f62e:README.md     # 旧提交里的 README
git rev-parse HEAD:README.md        # 当前 HEAD 里的 README
git hash-object README.md           # 磁盘上实际的 README
```

磁盘哈希 == 旧提交哈希 ≠ HEAD 哈希 → 断言成立：**磁盘内容整棵就是旧提交 `442f62e` 的树**。

**因果链**：

1. 两个工作台**同时签出 `main`**（git 正常会禁止，这是事后移动书签造成的错位）
2. 在另一个工作台里，`main` 书签被一路推进（reflog 里能看到 `branch: Reset to HEAD`，之后再接一串提交）
3. `main` 书签从旧位置移到了新位置
4. 主目录从未执行过任何同步命令，git 也从不替别的目录改文件 → 它的 index 与磁盘**冻结在原地**
5. 在主目录跑 `git status`：HEAD 已解析到新提交，index 还是旧的 → 一片"删除"

**结论**：全程没有任何一步是"删除"。全都是**书签移动 + 目录未同步**。

---

## 8. 修复步骤

> `git reset --hard` 属不可逆操作（会覆盖未提交改动），执行前**必须先确认第 1 步**。

**第 1 步 · 确认没有真实未提交改动**

```bash
git status --short
```

看第二列（未暂存列）是否全空。全空 = 可安全对齐。

**第 2 步 · 把索引与工作区对齐到 HEAD**

```bash
git reset --hard HEAD
```

`HEAD` 本身不动，所以它实际只干一件事：把 index 和磁盘文件拉回 HEAD 的样子。

**第 3 步 · 验证**

```bash
git status --short
```

应当干净。若原本有未跟踪文件，它们**仍在**（`reset --hard` 不删未跟踪文件）。

**第 4 步 · 追平远端**

```bash
git pull --ff-only origin main
```

先确认可快进：

```bash
git merge-base --is-ancestor main origin/main && echo "可快进"
```

`--ff-only` 保证只做快进，不满足会直接拒绝而非乱合。

---

## 9. 日常指令：「合并到 main 并推送到 GitHub」的六步

### 9.1 先说关键差异

> **多 worktree 环境下，`main` 通常被主目录签出着，git 不允许别处再切到 `main`。**
> 因此「合并到 main」在实际操作里往往不是 `switch main && merge`，而是
> **把当前分支直接推到远端 main**：`git push origin HEAD:main`。

### 9.2 步骤

**① 看状态**

```bash
git status --short
```

**② 看内容**

```bash
git diff
```

**③ 精确暂存（纪律所在）**

```bash
git add <具体文件路径>
```

**逐个文件加，不要用 `git add -A`。** 多 worktree 场景下，`-A` 会把当前目录里**所有**未跟踪文件一起卷进来（可能包含个人文档、临时产物），逐个加虽啰嗦但不会误伤。

**④ 提交**

```bash
git commit -m "feat: …"
```

**⑤ 与远端对表**

```bash
git fetch origin
```

```bash
git log --oneline origin/main..HEAD
```

- 输出为空 → 直接推
- 输出有内容 → 远端有别人推过的提交，需先合并，否则 push 被拒

**⑥ 推送 + 验证**

```bash
git push origin HEAD:main
```

```bash
git ls-remote origin refs/heads/main
```

**以 `ls-remote` 的实际返回为准，不以命令回显为准。** 推送是网络操作，超时或 `Everything up-to-date` 都可能让人误判；把返回的哈希与 `git rev-parse HEAD` 比对。

> 本地 `main` 书签可能仍落后于 `origin/main`，这不影响任何东西——它只是个书签，回主目录 `pull --ff-only` 即可同步。

---

## 10. objects 会无限膨胀吗？历史是怎么还原的

### 10.1 纠正误解一：objects 存的不是"差异"

那是 SVN 的做法。git 的逻辑模型是：**每次提交存一份完整快照**（commit → tree → blob）。

磁盘放得下靠两道压缩：

| 机制 | 作用 |
|---|---|
| **内容寻址去重** | 内容相同的文件只存一份；没改的文件在新提交里直接复用旧 blob |
| **packfile + delta** | 打包时相似对象只存**增量**：同一文件改 100 次 = 1 份完整 + 99 份 diff |

所以增长是**亚线性**的：改一个文件只多一个 blob，外加几个 tree/commit。

### 10.2 纠正误解二：没有"从摘要还原"这回事

**哈希是门牌号，不是压缩包。** 它只用来**找**对象，不参与**重建**。

`commit` 里存的是**完整的 tree 指针**，不是"与父提交的差异"。还原任意一帧：

```
commit → tree → blob（若是 delta，沿 delta 链还原成完整内容）
```

全程都是"顺着指针读完整内容"。delta 是**存储层优化**，对读取方透明——拿到的永远是完整文件。

### 10.3 什么时候才需要担心

不是代码，而是**大二进制文件**（图片、PDF、误入库的 `node_modules`/`dist`）。`.gitignore` 是最要紧的防线。

### 10.4 查看与整理

```bash
git count-objects -vH
```

关注 `count`（松散对象数）、`packs`（包文件数）、`size`。`packs: 0` 说明从未跑过 gc——松散对象**不做 delta 压缩**，偏胖。

```bash
git gc
```

打包压缩。`git gc --aggressive` 更彻底但慢得多，一般不需要。

### 10.5 手滑保险：reflog

reflog 默认保留 90 天，记录"每个书签曾经指向哪"。即便 `reset --hard` 后悔了，也能找回：

```bash
git reflog
```

未打包、未 prune 的对象在保留期内都还在（prune 宽限期默认 2 周，见 `gc.pruneExpire`）。

---

## 11. 实用推论与检查清单

**三条推论**

1. **书签动 ≠ 文件动。** 任何合并/提交/移动书签之后，都要在**目标目录里**补一步 `checkout`/`reset`/`pull`，文件才会到位。
2. **一个分支只应被一个工作台签出。** 一旦重复，必然出现"那边在前进、这边在冻结"，然后 `git status` 一片红。
3. **真删文件的手段只有三类**：`rm`、`git clean`、`git reset --hard`（覆盖未提交改动）。`git status` 报的"删除"多数只是**比较基准不同**。

**排查"文件怎么变少了"的清单**

- [ ] `git status --short` —— 第二列是否为空？
- [ ] `git worktree list` —— 是否同一分支被多个工作台签出？
- [ ] `git hash-object <文件>` 与 `git rev-parse <提交>:<文件>` 比对 —— 磁盘到底停在哪一帧？
- [ ] `git reflog` —— 书签最近被挪过吗？

**安全红线**

- [ ] 提交前用 `git add` 逐个点名，不用 `-A`
- [ ] 提交前扫一遍将被纳入的文件，**任何个人文档、凭据、IP、第三方版权资料都不能入库**（本仓库是公开仓库）
- [ ] `reset --hard` / `clean` 之前先 `git status` 看清，必要时先打 WIP 提交或标签
- [ ] 推送后用 `git ls-remote` 复核，不以回显为准

---

## 12. 本仓库的已知遗留（2026-10-10 快照）

> 这些状态会随操作变化，复查用 `git worktree list`。

1. **`main` 被两个工作台同时签出**（主目录 + 一个附属工作台）。这是第 7 节事故的根源。建议把后者挪到独立分支以释放 `main`：
   ```bash
   git -C <附属工作台路径> switch -c <新分支名>
   ```
   注意 `switch` **不会删除未跟踪文件**。另需确认目标分支名未被其他工作台占用，否则 git 会拒绝。
2. **存在 prunable 的孤儿工作台**（其目录已被删除，账本仍在）。清理：
   ```bash
   git worktree prune
   ```
3. **有工作台里存放着与代码无关的个人文档**，而该工作台签出的正是 `main`。**只要在该目录误跑一次 `git add -A && git commit`，个人材料就会被推到公开仓库。** 建议把这些文件移到仓库目录之外，或至少先把该工作台切到独立分支。

---

## 13. 常用命令速查

| 目的 | 命令 |
|---|---|
| 列出所有工作台与它们的分支 | `git worktree list` |
| 清理目录已消失的工作台账本 | `git worktree prune` |
| 看完整历史（含被重置过的位置） | `git reflog` |
| 看某文件在指定提交里的哈希 | `git rev-parse <commit>:<path>` |
| 看磁盘某文件的实际哈希 | `git hash-object <path>` |
| 看对象库大小 | `git count-objects -vH` |
| 打包压缩对象库 | `git gc` |
| 确认 A 是否为 B 的祖先 | `git merge-base --is-ancestor A B` |
| 复核远端分支实际位置 | `git ls-remote origin refs/heads/<branch>` |
