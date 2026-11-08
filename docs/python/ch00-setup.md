---
title: 第 0 章 环境与工具链
order: 0
date: 2026-11-08
---

# 第 0 章 环境与工具链

> 先搞清楚"我到底在跑哪个 Python、装了什么东西到哪儿"，后面 90% 的玄学报错都能自己定位。

## 为什么要先花这一章

JS 的依赖是**项目本地**的：`npm install` 落进 `node_modules`，天然隔离，你几乎不用想。

Python 不是。它的包默认装进**解释器所在的全局目录**，多个项目共用一份。于是：

- A 项目要 `requests 2.28`，B 项目要 `requests 2.32`，装一个坏一个；
- 半年前能跑的脚本今天跑不了，因为你顺手升级了全局环境；
- 报错信息和代码对不上，因为跑的其实是另一份库。

所以 Python 的第一课不是语法，是**隔离**。

## 三件套

| 角色 | 是什么 | 类比 JS 世界 |
| --- | --- | --- |
| 解释器 | `python.exe`，真正执行代码的程序 | Node.js 本体 |
| 虚拟环境 | 一份属于某个项目的独立包目录 | `node_modules` 的隔离效果 |
| 包管理器 | 下载、安装、记录依赖版本 | `npm` / `pnpm` |

三者的关系：**虚拟环境挂在某个解释器下面，包管理器往虚拟环境里装东西。**

## 和 npm 对照

| 想干的事 | JS | Python（uv） |
| --- | --- | --- |
| 初始化项目 | `npm init -y` | `uv init` |
| 装依赖 | `npm i requests` | `uv add requests` |
| 装开发依赖 | `npm i -D pytest` | `uv add --dev pytest` |
| 按锁文件还原 | `npm ci` | `uv sync` |
| 跑脚本 | `node main.js` | `uv run main.py` |
| 依赖清单 | `package.json` | `pyproject.toml` |
| 锁文件 | `package-lock.json` | `uv.lock` |
| 看装的版本 | `npm ls` | `uv tree` |

心智模型可以直接搬：**`uv` 就是 Python 的 pnpm**，而且更快。

## 你机器上现在是什么状态

| 项 | 值 | 含义 |
| --- | --- | --- |
| `python` | `D:\miniconda3\python.exe`，3.14.7 | 命中的是 conda 的 base 环境 |
| `uv` | 0.11.19 | 自带 Python 下载与虚拟环境管理 |
| 全局 site-packages | `D:\miniconda3\Lib\site-packages` | ⚠️ 不要往这里 `pip install` |

最后一行是关键：直接用 `pip install requests` 会装进 conda 的 base，把基础环境搞脏。**以后所有安装都走项目内的虚拟环境。**

::: warning 3.14 太新，可能装不上包
Python 3.14 是刚发布的版本，一些库（尤其是带 C 扩展的）还没出对应轮子，`uv add` 会卡在编译或直接失败。
遇到这种情况不用折腾编译器，直接在项目里指定低一档的版本：

```bash
uv venv --python 3.12
```

`uv` 会自己下载并管理这个解释器，不影响系统的 conda。
:::

## 三条命令跑通第一个项目

```bash
# 1. 建项目（生成 pyproject.toml + main.py + .venv）
uv init hello-py
cd hello-py

# 2. 装一个依赖，顺便验证网络和索引
uv add requests

# 3. 跑起来
uv run python -c "import requests; print(requests.__version__)"
```

预期输出：一行版本号，比如 `2.32.5`。

注意这里**没有激活虚拟环境这一步**——`uv run` 会自动用项目里的 `.venv`。这是它比 `venv + pip` 省事的地方。

## 如果坚持用原生 venv

不装 uv 也能做，命令长一点：

```bash
python -m venv .venv          # 建环境，目录名叫 .venv
.\.venv\Scripts\Activate.ps1  # PowerShell 激活
python -m pip install requests
python main.py
deactivate                     # 退出
```

注意是两个细节：激活脚本在 Windows 是 `Scripts\`，Linux/macOS 是 `bin/`；装包用 `python -m pip` 而不是裸 `pip`，能确保装进当前解释器。

## 常见坑

::: warning PowerShell 禁止运行脚本
执行 `Activate.ps1` 报「因为在此系统上禁止运行脚本」，是 Windows 默认执行策略拦的。执行一次即可：

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```
:::

::: warning 裸 `pip install` 的三种死法
1. 装进 base 环境，污染全局；
2. 装了但你跑的 `python` 是另一个解释器，`import` 还是找不到；
3. 装成功了，版本却和 `requirements.txt` 不一致，别人拉下来跑不了。

统一用 `uv add`（或 `python -m pip install` + 已激活环境），这三个问题一起消失。
:::

::: warning conda 和 uv 不要混着管同一个项目
用 `conda create` 建环境、又用 `uv add` 装包，会出现两套清单各说各话。
规则很简单：**一个项目只用一种工具管依赖**。conda 留着管需要系统库的科学计算环境，日常项目用 uv。
:::

::: warning `python` 和 `py` 不是一回事
Windows 上 `py` 是启动器，能挑版本；`python` 是 PATH 里的第一个。两者指向的解释器可能不同。
拿不准时永远看这个：

```bash
python -c "import sys; print(sys.executable)"
```
:::

## 自测三问

1. 为什么在 Python 里"能跑"这件事，比在 Node 里更容易是幻觉？
2. `uv run main.py` 和先 `Activate.ps1` 再 `python main.py`，在效果上等价吗？差别在哪？
3. 同事把项目发给你，只有 `pyproject.toml` 和 `uv.lock`，你用什么命令还原出他能跑的环境？
