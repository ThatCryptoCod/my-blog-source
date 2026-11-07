---
title: "Pikachu靶场通关记录：暴力破解（Brute Force）全系列"
date: 2026-11-06 22:00:00
tags:
  - Web安全
  - 渗透测试
  - 暴力破解
  - Burp Suite
categories:
  - 靶场通关
---

## 🎯 前言
本次测试基于本地搭建的 Pikachu 漏洞练习平台，使用 Burp Suite 工具，针对 Web 应用中常见的“暴力破解”漏洞进行实战演练与源码分析。测试涵盖了**无防护、服务端验证码、客户端验证码以及动态 Token 防护**四种场景。

---

## 🚩 第一关：基于表单的暴力破解

### 1. 漏洞现象
登录框没有任何验证码或防护机制，允许无限次尝试。

### 2. 测试过程
1. 开启 Burp Suite 拦截，在登录框输入 `admin` 和任意密码，抓取 POST 请求。
2. 将请求发送至 `Intruder` 模块，选择 `Sniper` 模式。
3. 在 `Positions` 中清除所有标记，仅选中 `password` 的值加上 `§` 标记。
4. 在 `Payloads` 中加载常见弱口令字典（如 `123456`, `admin`, `password` 等）。
5. 点击 `Start attack`。
![屏幕截图 2026-11-06 214035](<https://cdn.jsdelivr.net/gh/ThatCryptoCod/blog-images@main/img/屏幕截图 2026-11-06 214035.png>)
![屏幕截图 2026-11-06 214134](<https://cdn.jsdelivr.net/gh/ThatCryptoCod/blog-images@main/img/屏幕截图 2026-11-06 214134.png>)
### 3. 结果分析
观察攻击结果中的 **`Length` (响应长度)** 列。大部分错误密码的返回长度一致（`35111`左右），而密码 **`123456`** 对应的返回长度明显变短（`35086`）。

![第一关-Intruder爆破结果]![屏幕截图 2026-11-06 215301](<>)

回到网页输入 `admin` / `123456`，页面显示 `login success`。

![第一关-登录成功]![屏幕截图 2026-11-06 21530](<https://cdn.jsdelivr.net/gh/ThatCryptoCod/blog-images@main/img/屏幕截图 2026-11-06 21530.png>)


---

## 🚩 第二关：验证码绕过 (on server)

### 1. 漏洞现象
登录表单增加了图形验证码，由服务端校验。

### 2. 测试过程
1. 输入正确的验证码，抓取请求包。
2. 发送至 `Intruder`，**关键操作**：仅将 `password` 设为爆破点 `§`，保留正确的 `vcode` 和 `Cookie`。

![第二关-固定vcode抓包]![pikachu-bruteforce-2026-11-07-12-06-52](https://cdn.jsdelivr.net/gh/ThatCryptoCod/blog-images@main/img/${mdFileName}/pikachu-bruteforce-2026-11-07-12-06-52.png)
1. 加载密码字典进行爆破。

### 3. 结果分析
密码 `123456` 的返回长度（`35347`）与错误密码（`35372`）不同。

![第二关-爆破结果]![pikachu-bruteforce-2026-11-07-12-07-31](https://cdn.jsdelivr.net/gh/ThatCryptoCod/blog-images@main/img/${mdFileName}/pikachu-bruteforce-2026-11-07-12-07-31.png)

**漏洞成因**：服务端验证验证码正确后，**没有立即销毁 Session 中的验证码**。只要不刷新页面，该验证码可被无限次重放使用。

---

## 🚩 第三关：验证码绕过 (on client)

### 1. 漏洞现象
前端存在验证码校验，但每次刷新不变。

### 2. 测试过程
1. 抓包后，在请求体中**直接删掉 `vcode` 参数**。

![第三关-删除vcode参数]![pikachu-bruteforce-2026-11-07-12-10-00](https://cdn.jsdelivr.net/gh/ThatCryptoCod/blog-images@main/img/${mdFileName}/pikachu-bruteforce-2026-11-07-12-10-00.png)

1. 发送至 `Intruder`，仅对 `password` 字段进行爆破。

### 3. 结果分析
密码 `123456` 的返回长度（`36559`）显著短于其他（`36584`）。

![第三关-爆破结果]![pikachu-bruteforce-2026-11-07-12-10-28](https://cdn.jsdelivr.net/gh/ThatCryptoCod/blog-images@main/img/${mdFileName}/pikachu-bruteforce-2026-11-07-12-10-28.png)

**漏洞成因**：前端验证永远不可信！服务端 PHP 代码根本没有校验验证码。使用 Burp 直接绕过前端 JS 发送请求即可。

---

## 🚩 第四关：Token 防爆破？

### 1. 漏洞现象
页面每次刷新都会生成一个随机的隐藏 `token`，直接重放会提示 Token 错误。

### 2. 测试过程 (Burp 高级配置)
使用 `Pitchfork` 模式 + `Recursive grep` 实现自动化：
1. **双参数爆破**：`Positions` 中给 `password` 和 `token` 的值分别加 `§`。

![第四关-双参数标记]![pikachu-bruteforce-2026-11-07-12-11-58](https://cdn.jsdelivr.net/gh/ThatCryptoCod/blog-images@main/img/${mdFileName}/pikachu-bruteforce-2026-11-07-12-11-58.png)

1. **Payload 1 (密码)**：加载简单字典。
2. **Payload 2 (动态 Token)**：选择 `Recursive grep`。在 `Settings` -> `Grep - Extract` 中添加正则：`name="token" value="(.*?)"`。

<!-- 在这里插入你配置正则提取 Token 的截图 -->
![第四关-正则提取Token配置]![pikachu-bruteforce-2026-11-07-12-12-54](https://cdn.jsdelivr.net/gh/ThatCryptoCod/blog-images@main/img/${mdFileName}/pikachu-bruteforce-2026-11-07-12-12-54.png)
![pikachu-bruteforce-2026-11-07-12-13-30](https://cdn.jsdelivr.net/gh/ThatCryptoCod/blog-images@main/img/${mdFileName}/pikachu-bruteforce-2026-11-07-12-13-30.png)

1. **单线程限制**：在 `Resource pool` 中新建池子，将 `Maximum concurrent requests` 设为 **`1`**。

<!-- 在这里插入你设置单线程的截图 -->
![第四关-单线程设置]![pikachu-bruteforce-2026-11-07-12-13-45](https://cdn.jsdelivr.net/gh/ThatCryptoCod/blog-images@main/img/${mdFileName}/pikachu-bruteforce-2026-11-07-12-13-45.png)

### 3. 结果分析
爆破结果显示，携带空 Token 的首个请求长度为 `34882`；正确密码 **`123456`** 的响应长度最短（**`34857`**），而其他错误密码（如 `admin`）长度为 `34902`。

<!-- 在这里插入第四关最终爆破结果的截图 -->
![第四关-最终爆破结果]![pikachu-bruteforce-2026-11-07-12-14-04](https://cdn.jsdelivr.net/gh/ThatCryptoCod/blog-images@main/img/${mdFileName}/pikachu-bruteforce-2026-11-07-12-14-04.png)

成功验证并登录。
**漏洞成因**：虽然使用了动态 Token，但服务端未限制请求频率。攻击者可通过工具自动提取并替换 Token，依然可以实现自动化爆破。

---

## 🛡️ 高阶源码分析与防御方案总结

通过分析 `vul/burteforce/` 目录下的源码，总结防御建议如下：

1. **永远不要相信客户端（前端）**：核心校验必须在服务端进行。
2. **验证码“阅后即焚”**：提交验证码后无论对错，服务端立刻销毁当前 Session 中的验证码。
3. **增加频率限制与账号锁定**：针对同一账号或 IP 限制登录频率，连续错误 N 次锁定账号。
4. **强制复杂密码**：增加爆破难度。

---
*免责声明：本文章仅供网络安全学习与交流，请勿用于非法用途。*